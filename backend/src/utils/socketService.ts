import { Server as HTTPServer } from 'http';
import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { ErrorCode } from '../types/errorCode';
import { Redis } from 'ioredis';
import SFUService from './sfuService';
import crypto from 'crypto';
import MediaService from './mediaService';
import MessageQueueService from './messageQueueService';
import { logError, emitErrorToClient, extractErrorInfo } from './errorUtils';

interface UserSocket {
  userId: number;
  socketId: string;
  rooms: string[];
  lastTypingEmit?: {[conversationId: string]: number};
  reconnectTimer?: NodeJS.Timeout;
  requestCount: {
    [action: string]: {
      count: number;
      resetTime: number;
    }
  };
}

interface Room {
  roomId: string;
  users: number[];
  type: 'private' | 'group';
  rtcSessionId?: string;
}

interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  message: string;
}

interface EphemeralMessageConfig {
  defaultTTL: number; 
  checkInterval: number;
}

interface RTCIceServer {
  urls: string | string[];
  username?: string;
  credential?: string;
}

class SocketService {
  private io: Server;
  private activeUsers: Map<number, UserSocket> = new Map();
  private activeRooms: Map<string, Room> = new Map();
  private rtcPeers: Map<string, Set<number>> = new Map();
  private customSocketHandlers: ((socket: Socket, userId: number) => void)[] = [];
  private redisClient: Redis | null = null;
  private redisSubscriber: Redis | null = null;
  private offlineUsers: Map<number, Date> = new Map();
  private readonly TYPING_THROTTLE_MS = 1000;
  private readonly RECONNECT_TIMEOUT_MS = 30000; 
  private sfuService: SFUService;
  private iceServers: RTCIceServer[] = []; 
  
  private rateLimits: Map<string, RateLimitConfig> = new Map();
  
  private ephemeralMessages: Map<string, {
    messageId: string | number,
    expiresAt: number,
    roomId: string
  }> = new Map();
  private ephemeralConfig: EphemeralMessageConfig = {
    defaultTTL: 24 * 60 * 60 * 1000, 
    checkInterval: 60 * 1000 
  };
  
  private readonly MEDIA_URL_EXPIRY = 30 * 60 * 1000; 
  private readonly MEDIA_SECRET_KEY = process.env.MEDIA_SECRET_KEY || 'default-secret-key-change-in-production';

  private mediaService: MediaService;
  private messageQueueService: MessageQueueService;

  constructor(server: HTTPServer) {
    this.io = new Server(server, {
      cors: {
        origin: [
          'http://localhost:8081',
          /\.exp\.host$/,
          'http://192.168.1.31:19000',
          'exp://192.168.1.31:19000',
          'http://localhost:5173',
          'http://localhost:3000',
          'http://localhost:19006',
          'exp://192.168.1.31:8081',
          /^http:\/\/192\.168\.\d+\.\d+:\d+$/,
        ],
        methods: ['GET', 'POST'],
        credentials: true
      },
      pingTimeout: 20000,
      pingInterval: 10000,
      perMessageDeflate: {
        threshold: 1024, 
        zlibDeflateOptions: {
          chunkSize: 16 * 1024, 
          level: 6,
          memLevel: 8 
        },
        zlibInflateOptions: {
          chunkSize: 16 * 1024,
          windowBits: 15
        },
        clientNoContextTakeover: true, 
        serverNoContextTakeover: true 
      },
      maxHttpBufferSize: 5e6 
    });

    this.sfuService = SFUService.getInstance();

    this.initializeIceServers();

    if (process.env.REDIS_URL) {
      try {
        this.redisClient = new Redis(process.env.REDIS_URL);
        this.redisSubscriber = new Redis(process.env.REDIS_URL);
        
        try {
          const { createAdapter } = require('@socket.io/redis-adapter');
          this.io.adapter(createAdapter(this.redisClient, this.redisSubscriber));
          console.log('Socket.IO Redis adapter đã được thiết lập (@socket.io/redis-adapter)');
        } catch (adapterError) {
          try {
            const redisAdapter = require('socket.io-redis');
            this.io.adapter(redisAdapter({ pubClient: this.redisClient, subClient: this.redisSubscriber }));
            console.log('Socket.IO Redis adapter đã được thiết lập (socket.io-redis)');
          } catch (legacyAdapterError) {
            logError('SocketService', legacyAdapterError, 'Không thể thiết lập Redis adapter, sử dụng bộ nhớ trong');
            console.log('Socket.IO sẽ hoạt động mà không có Redis adapter');
          }
        }
        
        this.redisClient.on('error', (err) => {
          logError('Redis', err, 'Lỗi kết nối Redis pubClient');
        });
        
        this.redisSubscriber.on('error', (err) => {
          logError('Redis', err, 'Lỗi kết nối Redis subClient');
        });
      } catch (error) {
        logError('SocketService', error, 'Lỗi khi thiết lập Redis adapter');
      }
    } else {
      console.log('Redis URL không được cấu hình, sử dụng bộ nhớ trong cho Socket.IO');
    }

    this.setupRateLimits();
    
    this.setupEphemeralMessagesCleanup();

    this.mediaService = new MediaService();
    
    this.messageQueueService = new MessageQueueService(this.redisClient || undefined);

    this.initializeListeners();
  }

  private initializeIceServers(): void {
    this.iceServers = this.getIceServers();
  }

  private getIceServers(): RTCIceServer[] {
    const iceServers: RTCIceServer[] = [
      {
        urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302']
      }
    ];

    // Sử dụng TURN server nếu đã được cấu hình
    const turnServerUris = (process.env.TURN_SERVER_URIS || '').split(',').filter(Boolean);
    
    if (turnServerUris.length > 0) {
      // Tạo username theo định dạng timestamp + username
      const timestamp = Math.floor(Date.now() / 1000) + (parseInt(process.env.TURN_CREDENTIAL_TTL || '3600'));
      const username = `${timestamp}:socketio`;
      
      // Tạo credential (HMAC-SHA1)
      const crypto = require('crypto');
      const secret = process.env.STATIC_TURN_SECRET || '';
      const hmac = crypto.createHmac('sha1', secret);
      hmac.update(username);
      const credential = hmac.digest('base64');
      
      iceServers.push({
        urls: turnServerUris,
        username: username,
        credential: credential
      });
      
      console.log('TURN server đã được cấu hình');
      
      // Thêm log để hiển thị thông tin cụ thể cho việc test
      console.log('=== THÔNG TIN TURN CREDENTIALS CHO TESTING ===');
      console.log('TURN Server URLs:', turnServerUris);
      console.log('TURN Username:', username);
      console.log('TURN Credential:', credential);
      console.log('Hết hạn sau:', process.env.TURN_CREDENTIAL_TTL || '3600', 'giây');
      console.log('==========================================');
    }

    return iceServers;
  }

  createPeerConnectionConfig(): RTCConfiguration {
    return {
      iceServers: this.iceServers,
      iceTransportPolicy: 'all',
      iceCandidatePoolSize: 10,
      bundlePolicy: 'max-bundle',
      rtcpMuxPolicy: 'require'
    };
  }

  getVideoConstraintsByQuality(quality: 'high' | 'medium' | 'low' | 'audio-only'): MediaStreamConstraints {
    return this.sfuService.getMediaConstraintsByConnectionQuality(quality);
  }

  analyzeConnectionQuality(stats: RTCStatsReport): 'high' | 'medium' | 'low' | 'audio-only' {
    let packetLoss = 0;
    let roundTripTime = 0;
    let bandwidth = Infinity;
    let hasValidMetrics = false;

    stats.forEach(stat => {
      if (stat.type === 'inbound-rtp' && 'kind' in stat && stat.kind === 'video') {
        if ('packetsLost' in stat && 'packetsReceived' in stat && typeof stat.packetsLost === 'number' && typeof stat.packetsReceived === 'number') {
          const totalPackets = stat.packetsReceived + stat.packetsLost;
          if (totalPackets > 0) {
            packetLoss = (stat.packetsLost / totalPackets) * 100;
            hasValidMetrics = true;
          }
        }
      }
      
      if (stat.type === 'candidate-pair' && 'currentRoundTripTime' in stat && typeof stat.currentRoundTripTime === 'number') {
        roundTripTime = stat.currentRoundTripTime * 1000; 
        hasValidMetrics = true;
      }
    });

    if (!hasValidMetrics) {
      return 'medium'; 
    }

    if (packetLoss > 10 || roundTripTime > 300) {
      return 'audio-only';
    } else if (packetLoss > 5 || roundTripTime > 200) {
      return 'low';
    } else if (packetLoss > 2 || roundTripTime > 100) {
      return 'medium';
    } else {
      return 'high';
    }
  }

  private initializeListeners(): void {
    this.io.use(this.authMiddleware);
    this.io.on('connection', (socket: Socket) => {
      console.log(`[${new Date().toISOString()}] Người dùng đã kết nối: ${socket.id}`);
      
      const userId = socket.data.userId as number;

      const reconnected = this.offlineUsers.has(userId);
      if (reconnected) {
        console.log(`[${new Date().toISOString()}] Người dùng ${userId} đã kết nối lại`);
        this.offlineUsers.delete(userId);
        
        const existingUser = this.activeUsers.get(userId);
        if (existingUser && existingUser.reconnectTimer) {
          clearTimeout(existingUser.reconnectTimer);
          existingUser.reconnectTimer = undefined;
        }
        
        this.notifyUserReconnected(userId);
      }
      
      this.addUser(userId, socket.id);
      this.notifyUserOnline(userId);

      let lastPing = Date.now();
      socket.conn.on('packet', (packet) => {
        if (packet.type === 'pong') {
          const latency = Date.now() - lastPing;
          if (latency > 5000) { 
            logError('Connection', { userId, latency }, `Kết nối không ổn định, độ trễ cao: ${latency}ms`);
            socket.emit('connection:unstable', { latency });
          }
        } else if (packet.type === 'ping') {
          lastPing = Date.now();
        }
      });

      socket.on('disconnect', (reason) => {
        console.log(`[${new Date().toISOString()}] Người dùng ngắt kết nối: ${socket.id}, lý do: ${reason}`);
        
        this.handleTemporaryDisconnect(userId, socket.id);
        
        this.notifyUserOffline(userId);
      });

      socket.on('error', (error) => {
        logError('Socket', error, `Lỗi socket cho người dùng ${userId}`);
      });

      socket.on('recovery:join-rooms', async ({ rooms }: { rooms: string[] }) => {
        if (rooms && Array.isArray(rooms)) {
          for (const roomId of rooms) {
            socket.join(roomId);
            console.log(`[${new Date().toISOString()}] Người dùng ${userId} đã tham gia lại phòng ${roomId}`);
          }
        }
      });

      this.setupChatListeners(socket, userId);
      this.setupWebRTCListeners(socket, userId);
      this.setupStatusListeners(socket, userId);
      
      this.customSocketHandlers.forEach(handler => {
        try {
          handler(socket, userId);
        } catch (error) {
          logError('CustomHandler', error, `Lỗi trong trình xử lý tùy chỉnh cho người dùng ${userId}`);
        }
      });
    });
  }

  private handleTemporaryDisconnect(userId: number, socketId: string): void {
    const userSocket = this.activeUsers.get(userId);
    if (userSocket && userSocket.socketId === socketId) {
      this.offlineUsers.set(userId, new Date());
      
      userSocket.reconnectTimer = setTimeout(() => {
        console.log(`[${new Date().toISOString()}] Đã hết thời gian chờ kết nối lại cho người dùng ${userId}, xóa thông tin người dùng`);
        this.removeUser(userId, socketId);
      }, this.RECONNECT_TIMEOUT_MS);
    }
  }

  private notifyUserReconnected(userId: number): void {
    const rooms = Array.from(this.activeRooms.values())
      .filter(room => room.users.includes(userId))
      .map(room => room.roomId);
    
    for (const roomId of rooms) {
      this.io.to(roomId).emit('user:reconnected', { 
        userId, 
        online: true,
        timestamp: new Date().toISOString()
      });
    }
  }

  private authMiddleware = (socket: Socket, next: (err?: Error) => void) => {
    const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];
    
    if (!token) {
      logError('SocketAuth', { code: ErrorCode.MISSING_TOKEN }, 'Không có token xác thực');
      return next(new Error('Không có token, quyền truy cập bị từ chối'));
    }
    
    if (!process.env.JWT_SECRET) {
      logError('SocketAuth', { code: ErrorCode.SERVER_ERROR }, 'JWT_SECRET không được định nghĩa');
      return next(new Error('Lỗi máy chủ: JWT_SECRET không được định nghĩa'));
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET) as { userId: number };
      socket.data.userId = decoded.userId;
      next();
    } catch (error: any) {
      let errorCode = ErrorCode.INVALID_TOKEN;
      let message = 'Token không hợp lệ hoặc đã hết hạn';
      if (error.name === 'TokenExpiredError') {
        errorCode = ErrorCode.TOKEN_EXPIRED;
        message = 'Token đã hết hạn';
      } else if (error.name === 'JsonWebTokenError') {
        errorCode = ErrorCode.INVALID_TOKEN;
        message = 'Token không hợp lệ';
      }
      
      logError('SocketAuth', { code: errorCode, originalError: error }, message);
      return next(new Error(message));
    }
  };

  private addUser(userId: number, socketId: string): void {
    if (this.activeUsers.has(userId)) {
      const userSocket = this.activeUsers.get(userId)!;
      userSocket.socketId = socketId;
    } else {
      this.activeUsers.set(userId, { 
        userId, 
        socketId, 
        rooms: [],
        lastTypingEmit: {},
        requestCount: {} 
      });
    }
  }

  private removeUser(userId: number, socketId: string): void {
    const user = this.activeUsers.get(userId);
    if (user && user.socketId === socketId) {
      for (const roomId of user.rooms) {
        const room = this.activeRooms.get(roomId);
        if (room) {
          this.io.to(roomId).emit('user:left-room', { userId, roomId });
          
          if (room.rtcSessionId) {
            this.io.to(roomId).emit('call:user-left', { userId, roomId });
            this.cleanupRTCUser(room.rtcSessionId, userId);
          }
          
          room.users = room.users.filter(id => id !== userId);
          
          if (room.users.length === 0) {
            this.activeRooms.delete(roomId);
          }
        }
      }
      this.activeUsers.delete(userId);
    }
  }

  private notifyUserOnline(userId: number): void {
    const rooms = Array.from(this.activeRooms.values())
      .filter(room => room.users.includes(userId))
      .map(room => room.roomId);
    
    for (const roomId of rooms) {
      this.io.to(roomId).emit('user:online', { userId, online: true });
    }
  }

  private notifyUserOffline(userId: number): void {
    const rooms = Array.from(this.activeRooms.values())
      .filter(room => room.users.includes(userId))
      .map(room => room.roomId);
    
    for (const roomId of rooms) {
      this.io.to(roomId).emit('user:offline', { userId, online: false });
    }
  }

  private createOrJoinRoom(roomId: string, userId: number, type: 'private' | 'group'): Room {
    let room = this.activeRooms.get(roomId);
    if (!room) {
      room = {
        roomId,
        users: [userId],
        type
      };
      this.activeRooms.set(roomId, room);
    } else if (!room.users.includes(userId)) {
      room.users.push(userId);
    }
    
    const userSocket = this.activeUsers.get(userId);
    if (userSocket && !userSocket.rooms.includes(roomId)) {
      userSocket.rooms.push(roomId);
      const socket = this.io.sockets.sockets.get(userSocket.socketId);
      if (socket) {
        socket.join(roomId);
      }
    }
    
    return room;
  }

  private setupChatListeners(socket: Socket, userId: number): void {
    socket.on('chat:join', ({ roomId, type = 'private' }: { roomId: string, type: 'private' | 'group' }) => {
      const room = this.createOrJoinRoom(roomId, userId, type);
      
      socket.to(roomId).emit('chat:user-joined', { userId, roomId });
      
      socket.emit('chat:room-users', { 
        roomId, 
        users: room.users 
      });
      
      this.messageQueueService.loadQueueFromStorage(userId)
        .then(() => {
          const pendingMessages = this.messageQueueService.getPendingMessages(userId)
            .filter(msg => msg.conversationId === roomId);
          
          if (pendingMessages.length > 0) {
            console.log(`[${new Date().toISOString()}] Phát hiện ${pendingMessages.length} tin nhắn đang chờ gửi cho roomId ${roomId}`);
            
            socket.emit('message:pending', { 
              roomId,
              count: pendingMessages.length,
              messages: pendingMessages
            });
            
            pendingMessages.forEach(message => {
              this.messageQueueService.sendMessage(userId, message.id, async (msg) => {
                return this.sendQueuedMessage(socket, userId, msg);
              }).catch(err => {
                console.error(`Lỗi khi thử lại tin nhắn: ${err}`);
              });
            });
          }
        })
        .catch(err => console.error(`Lỗi khi tải hàng đợi tin nhắn: ${err}`));
    });

    socket.on('chat:leave', ({ roomId }: { roomId: string }) => {
      const room = this.activeRooms.get(roomId);
      const userSocket = this.activeUsers.get(userId);
      
      if (room && userSocket) {
        room.users = room.users.filter(id => id !== userId);
        
        userSocket.rooms = userSocket.rooms.filter(id => id !== roomId);
        
        socket.leave(roomId);
        
        socket.to(roomId).emit('chat:user-left', { userId, roomId });
        
        if (room.users.length === 0) {
          this.activeRooms.delete(roomId);
        }
      }
    });

    socket.on('chat:message', ({ roomId, message, ttl, clientId }: { 
      roomId: string, 
      message: any, 
      ttl?: number,
      clientId?: string 
    }) => {
      const limitResult = this.checkRateLimit(userId, 'chat:message');
      if (limitResult.limited) {
        emitErrorToClient(
          socket, 
          {
            code: ErrorCode.RATE_LIMIT_EXCEEDED,
            message: limitResult.message || 'Đã vượt quá giới hạn tỷ lệ gửi tin nhắn'
          }
        );
        return;
      }
      
      const room = this.activeRooms.get(roomId);
      
      if (room && room.users.includes(userId)) {
        const messageWithMeta = {
          ...message,
          senderId: userId,
          timestamp: new Date().toISOString()
        };
        
        if (ttl && ttl > 0) {
          const messageId = messageWithMeta.id || `${userId}_${Date.now()}`;
          
          messageWithMeta.ephemeral = true;
          messageWithMeta.expiresAt = Date.now() + (ttl || this.ephemeralConfig.defaultTTL);
          
          this.ephemeralMessages.set(messageId.toString(), {
            messageId,
            expiresAt: messageWithMeta.expiresAt,
            roomId
          });
        }
        
        if (messageWithMeta.mediaUrls && Array.isArray(messageWithMeta.mediaUrls)) {
          messageWithMeta.mediaUrls = messageWithMeta.mediaUrls.map((url: string) => {
            if (!url.startsWith('http')) {
              const mediaVariants = this.mediaService.getMediaVariants(url);
              
              const signedVariants = Object.entries(mediaVariants).reduce((acc, [size, path]) => {
                acc[size] = this.generateSignedMediaUrl(path, userId);
                return acc;
              }, {} as Record<string, string>);
              
              return {
                original: this.generateSignedMediaUrl(url, userId),
                variants: signedVariants,
                placeholder: this.mediaService.getPlaceholderUrl(url),
                type: this.mediaService.getMediaType(url),
                lazyLoad: true
              };
            }
            return url;
          });
        }
        
        const queuedMessage = this.messageQueueService.queueMessage(userId, {
          conversationId: roomId,
          senderId: userId,
          content: messageWithMeta.content,
          mediaUrls: messageWithMeta.mediaUrls,
          clientId: clientId || `${userId}_${Date.now()}`
        });
        
        socket.emit('message:queued', {
          messageId: queuedMessage.id,
          clientId: queuedMessage.clientId,
          timestamp: queuedMessage.timestamp
        });
        
        this.messageQueueService.sendMessage(userId, queuedMessage.id, async (msg) => {
          return this.sendQueuedMessage(socket, userId, msg);
        }).catch(err => {
          logError('SocketService', err, `Lỗi khi gửi tin nhắn cho userId ${userId} tại roomId ${roomId}`);
        });
      }
    });
    
    socket.on('message:retry', ({ messageId }: { messageId: string }) => {
      this.messageQueueService.sendMessage(userId, messageId, async (message) => {
        return this.sendQueuedMessage(socket, userId, message);
      }).then(success => {
        if (success) {
          socket.emit('message:retry-success', { messageId });
        } else {
          socket.emit('message:retry-failed', { messageId });
        }
      }).catch(err => {
        logError('SocketService', err, `Lỗi khi thử lại tin nhắn ${messageId} cho userId ${userId}`);
        emitErrorToClient(
          socket,
          err,
          ErrorCode.SERVER_ERROR,
          `Không thể thử lại tin nhắn: ${extractErrorInfo(err)}`
        );
      });
    });
    
    socket.on('message:sync', async ({ conversationIds }: { conversationIds?: string[] }) => {
      try {
        const result = await this.messageQueueService.syncMessages(userId, async (localMessages, lastSyncTimestamp) => {
          return []; // Thay thế bằng lệnh gọi API thực tế
        });
        
        socket.emit('message:sync-result', {
          syncedCount: result.synced.length,
          conflictsCount: result.conflicts.length,
          failedCount: result.failed.length,
          timestamp: Date.now()
        });
        
        if (result.conflicts.length > 0) {
          socket.emit('message:conflicts', {
            conflicts: result.conflicts
          });
        }
      } catch (error) {
        logError('SocketService', error, `Lỗi khi đồng bộ tin nhắn cho userId ${userId}`);
        emitErrorToClient(
          socket,
          error,
          ErrorCode.SERVER_ERROR,
          'Đồng bộ tin nhắn thất bại'
        );
      }
    });
    
    socket.on('message:resolve-conflict', ({ 
      messageId,
      resolution, 
      customMessage 
    }: { 
      messageId: string;
      resolution: 'local' | 'remote' | 'custom';
      customMessage?: any; 
    }) => {
      this.messageQueueService.resolveConflict(userId, messageId, resolution, customMessage);
      socket.emit('message:conflict-resolved', { messageId });
    });

    socket.on('message:typing', ({ conversation_id, is_typing }: { conversation_id: number, is_typing: boolean }) => {
      const limitResult = this.checkRateLimit(userId, 'message:typing');
      if (limitResult.limited) {
        return;
      }
      
      const user = this.activeUsers.get(userId);
      if (!user) return;
      
      const roomId = `conversation_${conversation_id}`;
      const now = Date.now();
      const lastTyping = user.lastTypingEmit?.[conversation_id] || 0;
      
      if (now - lastTyping >= this.TYPING_THROTTLE_MS) {
        socket.to(roomId).emit('message:typing', {
          conversation_id,
          user_id: userId,
          is_typing,
          timestamp: now
        });
        
        if (!user.lastTypingEmit) user.lastTypingEmit = {};
        user.lastTypingEmit[conversation_id] = now;
      }
    });

    socket.on('chat:mark-read', ({ roomId, messageId }: { roomId: string, messageId: number | string }) => {
      const room = this.activeRooms.get(roomId);
      
      if (room && room.users.includes(userId)) {
        socket.to(roomId).emit('chat:message-read', {
          roomId,
          messageId,
          userId
        });
        
        if (typeof messageId === 'string') {
          this.messageQueueService.markMessageRead(userId, messageId);
        }
      }
    });

    socket.on('chat:send-ephemeral', ({ 
      roomId, 
      message, 
      ttl = this.ephemeralConfig.defaultTTL 
    }: { 
      roomId: string, 
      message: any, 
      ttl?: number 
    }) => {
      this.setupChatListeners(socket, userId);
      socket.emit('chat:message', { roomId, message, ttl });
    });
    
    socket.on('chat:delete-message', ({ roomId, messageId }: { roomId: string, messageId: number | string }) => {
      const room = this.activeRooms.get(roomId);
      
      if (room && room.users.includes(userId)) {
        this.io.to(roomId).emit('chat:message-deleted', {
          roomId,
          messageId,
          deletedBy: userId,
          timestamp: new Date().toISOString()
        });
        
        this.ephemeralMessages.delete(messageId.toString());
      }
    });

    socket.on('media:chunk-upload-init', ({ fileId, fileName, fileSize, fileType, totalChunks }: { 
      fileId: string,
      fileName: string,
      fileSize: number,
      fileType: string,
      totalChunks: number
    }) => {
      const limitResult = this.checkRateLimit(userId, 'media:upload');
      if (limitResult.limited) {
        emitErrorToClient(
          socket,
          {
            code: ErrorCode.RATE_LIMIT_EXCEEDED,
            message: limitResult.message || 'Đã vượt quá giới hạn tỷ lệ tải lên'
          }
        );
        return;
      }

      try {
        const sessionId = this.mediaService.initializeChunkUpload(fileId, fileName, fileSize, fileType, totalChunks, userId);
        
        socket.emit('media:chunk-upload-ready', {
          sessionId,
          fileId,
          maxChunkSize: this.mediaService.getMaxChunkSize()
        });
      } catch (error) {
        logError('SocketService', error, `Lỗi khi khởi tạo tải lên chunk cho userId ${userId}, fileId ${fileId}`);
        emitErrorToClient(
          socket,
          error,
          ErrorCode.MEDIA_UPLOAD_ERROR,
          'Không thể khởi tạo tải lên'
        );
      }
    });
    
    socket.on('media:chunk-upload', ({ sessionId, fileId, chunkIndex, chunk }: {
      sessionId: string,
      fileId: string, 
      chunkIndex: number,
      chunk: Buffer
    }) => {
      this.mediaService.saveChunk(sessionId, fileId, chunkIndex, chunk, userId)
        .then(progress => {
          socket.emit('media:chunk-upload-progress', {
            sessionId,
            fileId,
            chunkIndex,
            progress
          });
          
          if (progress.completed) {
            this.mediaService.finalizeUpload(sessionId, fileId, userId)
              .then(mediaInfo => {
                if (mediaInfo) {
                  socket.emit('media:upload-complete', {
                    fileId,
                    url: this.generateSignedMediaUrl(mediaInfo.path, userId),
                    variants: Object.entries(mediaInfo.variants).reduce((acc, [size, path]) => {
                      acc[size] = this.generateSignedMediaUrl(path, userId);
                      return acc;
                    }, {} as Record<string, string>),
                    placeholder: mediaInfo.placeholder,
                    type: mediaInfo.type,
                    width: mediaInfo.width,
                    height: mediaInfo.height,
                    duration: mediaInfo.duration
                  });
                }
              })
              .catch(error => {
                logError('SocketService', error, `Lỗi khi xử lý media cho userId ${userId}, fileId ${fileId}`);
                emitErrorToClient(
                  socket,
                  error,
                  ErrorCode.MEDIA_PROCESSING_ERROR,
                  `Lỗi khi xử lý media: ${extractErrorInfo(error)}`
                );
              });
          }
        })
        .catch(error => {
          logError('SocketService', error, `Lỗi khi tải lên chunk cho userId ${userId}, fileId ${fileId}, chunkIndex ${chunkIndex}`);
          emitErrorToClient(
            socket,
            error,
            ErrorCode.UPLOAD_FAILED,
            `Tải lên chunk thất bại: ${extractErrorInfo(error)}`
          );
        });
    });
    
    socket.on('media:cancel-upload', ({ sessionId, fileId }: {
      sessionId: string,
      fileId: string
    }) => {
      this.mediaService.cancelUpload(sessionId, fileId, userId)
        .then(() => {
          socket.emit('media:upload-cancelled', {
            fileId
          });
        })
        .catch(error => {
          logError('SocketService', error, `Lỗi khi hủy tải lên cho userId ${userId}, fileId ${fileId}`);
          emitErrorToClient(
            socket,
            error,
            ErrorCode.CANCEL_FAILED,
            `Hủy tải lên thất bại: ${extractErrorInfo(error)}`
          );
        });
    });
  }

  private setupWebRTCListeners(socket: Socket, userId: number): void {
    const rtcConfig = this.createPeerConnectionConfig();
    
    socket.emit('webrtc:config', {
      iceServers: rtcConfig.iceServers,
      iceTransportPolicy: rtcConfig.iceTransportPolicy
    });
    
    socket.on('call:start', ({ roomId, mediaType, participantIds }: { 
      roomId: string, 
      mediaType: 'audio' | 'video', 
      participantIds: number[]
    }) => {
      const limitResult = this.checkRateLimit(userId, 'call:start');
      if (limitResult.limited) {
        socket.emit('error', {
          code: ErrorCode.RATE_LIMIT_EXCEEDED,
          message: limitResult.message
        });
        return;
      }
      
      const room = this.activeRooms.get(roomId);
      
      if (room) {
        const rtcSessionId = `rtc_${roomId}_${Date.now()}`;
        room.rtcSessionId = rtcSessionId;
        
        this.rtcPeers.set(rtcSessionId, new Set([userId]));
        
        const useP2P = !this.sfuService.shouldUseSFU(participantIds.length + 1);
        
        socket.to(roomId).emit('call:incoming', {
          roomId,
          callerId: userId,
          rtcSessionId,
          mediaType,
          useP2P
        });
        
        if (!useP2P) {
          this.sfuService.createOrJoinRoom(rtcSessionId, userId, socket.id);
          
          socket.emit('call:sfu-required', {
            roomId,
            rtcSessionId,
            mediaType
          });
        }
      }
    });

    socket.on('call:accept', ({ roomId, rtcSessionId, useP2P = true }: { 
      roomId: string, 
      rtcSessionId: string,
      useP2P: boolean 
    }) => {
      const room = this.activeRooms.get(roomId);
      const peers = this.rtcPeers.get(rtcSessionId);
      
      if (room && peers) {
        peers.add(userId);
        
        if (!useP2P) {
          this.sfuService.createOrJoinRoom(rtcSessionId, userId, socket.id);
        }
        
        this.io.to(roomId).emit('call:user-joined', {
          roomId,
          userId,
          rtcSessionId,
          useP2P
        });
      }
    });

    socket.on('call:reject', ({ roomId, rtcSessionId, reason }: { 
      roomId: string, 
      rtcSessionId: string,
      reason?: 'busy' | 'unavailable' | 'declined' | 'error'
    }) => {
      const room = this.activeRooms.get(roomId);
      
      if (room && room.rtcSessionId === rtcSessionId) {
        this.io.to(roomId).emit('call:rejected', {
          roomId,
          userId,
          rtcSessionId,
          reason: reason || 'declined',
          retryable: reason === 'busy' || reason === 'error' 
        });
        
        this.sfuService.leaveRoom(rtcSessionId, userId);
        
        this.cleanupRTCSession(rtcSessionId);
        room.rtcSessionId = undefined;
      }
    });

    socket.on('call:connection-state', ({ roomId, rtcSessionId, state }: { 
      roomId: string, 
      rtcSessionId: string, 
      state: 'checking' | 'connected' | 'disconnected' | 'failed' | 'reconnecting'
    }) => {
      switch (state) {
        case 'failed':
          socket.emit('call:connection-failed', {
            roomId,
            rtcSessionId,
            suggestion: 'retry',
            iceServers: this.getIceServers()
          });
          break;
        
        case 'disconnected':
          socket.to(roomId).emit('call:user-unstable', {
            roomId,
            userId,
            rtcSessionId
          });
          break;
        
        case 'reconnecting':
          socket.to(roomId).emit('call:user-reconnecting', {
            roomId,
            userId,
            rtcSessionId
          });
          break;
        
        case 'connected':
          socket.to(roomId).emit('call:user-connected', {
            roomId,
            userId,
            rtcSessionId
          });
          break;
      }
    });

    socket.on('call:connection-quality', ({ 
      roomId, 
      rtcSessionId, 
      stats,
      quality 
    }: { 
      roomId: string, 
      rtcSessionId: string, 
      stats: any,
      quality: 'high' | 'medium' | 'low' | 'audio-only'
    }) => {
      const room = this.activeRooms.get(roomId);
      
      if (room && room.rtcSessionId === rtcSessionId) {
        if (!quality && stats) {
          quality = this.analyzeConnectionQuality(stats);
        }
        
        socket.emit('call:adjust-quality', {
          roomId,
          rtcSessionId,
          quality,
          constraints: this.getVideoConstraintsByQuality(quality)
        });
        
        socket.to(roomId).emit('call:user-quality-changed', {
          roomId,
          userId,
          rtcSessionId,
          quality
        });
        
        if (!this.sfuService.shouldUseSFU(this.rtcPeers.get(rtcSessionId)?.size || 0)) {
          this.sfuService.updateParticipantConnectionQuality(
            rtcSessionId,
            userId,
            quality
          );
        }
      }
    });

    socket.on('call:ice-failed', ({ 
      roomId, 
      rtcSessionId, 
      target 
    }: { 
      roomId: string, 
      rtcSessionId: string,
      target: number
    }) => {
      socket.emit('call:ice-restart', {
        roomId,
        rtcSessionId,
        iceServers: this.getIceServers()
      });
      
      const targetUser = this.activeUsers.get(target);
      if (targetUser) {
        const targetSocket = this.io.sockets.sockets.get(targetUser.socketId);
        if (targetSocket) {
          targetSocket.emit('call:ice-restart-needed', {
            roomId,
            rtcSessionId,
            peerId: userId
          });
        }
      }
    });

  }

  private setupStatusListeners(socket: Socket, userId: number): void {
    socket.on('status:update', ({ status }: { status: 'online' | 'away' | 'busy' | 'offline' }) => {
      const rooms = Array.from(this.activeRooms.values())
        .filter(room => room.users.includes(userId))
        .map(room => room.roomId);
      
      for (const roomId of rooms) {
        this.io.to(roomId).emit('status:updated', {
          userId,
          status
        });
      }
    });
  }

  private cleanupRTCSession(rtcSessionId: string): void {
    this.rtcPeers.delete(rtcSessionId);
  }

  private cleanupRTCUser(rtcSessionId: string, userId: number): void {
    const peers = this.rtcPeers.get(rtcSessionId);
    if (peers) {
      peers.delete(userId);
      if (peers.size === 0) {
        this.rtcPeers.delete(rtcSessionId);
      }
    }
  }

  public notifyNewMessage(roomId: string, message: any): void {
    this.io.to(roomId).emit('chat:message', {
      roomId,
      message
    });
  }

  public getUserSocket(userId: number): Socket | null {
    const userSocket = this.activeUsers.get(userId);
    if (userSocket) {
      return this.io.sockets.sockets.get(userSocket.socketId) || null;
    }
    return null;
  }

  public notifyUserStatusChange(userId: number, status: 'online' | 'away' | 'busy' | 'offline'): void {
    const rooms = Array.from(this.activeRooms.values())
      .filter(room => room.users.includes(userId))
      .map(room => room.roomId);
    
    for (const roomId of rooms) {
      this.io.to(roomId).emit('status:updated', {
        userId,
        status
      });
    }
  }

  public registerSocketHandler(handler: (socket: Socket, userId: number) => void): void {
    this.customSocketHandlers.push(handler);
  }

  public broadcastEvent(event: string, data: any): void {
    this.io.emit(event, data);
  }

  private setupRateLimits(): void {
    this.rateLimits.set('chat:message', {
      windowMs: 60 * 1000,
      maxRequests: 30,
      message: 'Bạn đã gửi quá nhiều tin nhắn. Vui lòng thử lại sau ít phút.'
    });
    
    this.rateLimits.set('message:typing', {
      windowMs: 10 * 1000, 
      maxRequests: 5, 
      message: 'Bạn đã cập nhật trạng thái đang gõ quá nhiều lần.'
    });
    
    this.rateLimits.set('call:start', {
      windowMs: 60 * 1000, 
      maxRequests: 3,
      message: 'Bạn đã bắt đầu quá nhiều cuộc gọi. Vui lòng thử lại sau ít phút.'
    });

    this.rateLimits.set('media:upload', {
      windowMs: 60 * 1000,
      maxRequests: 10, 
      message: 'Bạn đã tải lên quá nhiều file. Vui lòng thử lại sau ít phút.'
    });
  }
  
  private setupEphemeralMessagesCleanup(): void {
    setInterval(() => {
      const now = Date.now();
      
      for (const [key, message] of this.ephemeralMessages.entries()) {
        if (message.expiresAt <= now) {
          this.ephemeralMessages.delete(key);
          
          this.io.to(message.roomId).emit('chat:message-expired', {
            roomId: message.roomId,
            messageId: message.messageId
          });
          
          if (this.redisClient) {
            this.redisClient.hdel(`messages:${message.roomId}`, message.messageId.toString())
              .catch(err => console.error(`Lỗi khi xóa tin nhắn tạm thời: ${err}`));
          }
        }
      }
    }, this.ephemeralConfig.checkInterval);
  }

  private checkRateLimit(userId: number, action: string): { limited: boolean, message?: string } {
    const config = this.rateLimits.get(action);
    if (!config) return { limited: false };
    
    const user = this.activeUsers.get(userId);
    if (!user) return { limited: false };
    
    if (!user.requestCount[action]) {
      user.requestCount[action] = {
        count: 0,
        resetTime: Date.now() + config.windowMs
      };
    }
    
    if (Date.now() > user.requestCount[action].resetTime) {
      user.requestCount[action] = {
        count: 0,
        resetTime: Date.now() + config.windowMs
      };
    }
    
    user.requestCount[action].count++;
    
    if (user.requestCount[action].count > config.maxRequests) {
      return { 
        limited: true, 
        message: config.message 
      };
    }
    
    return { limited: false };
  }
  
  public generateSignedMediaUrl(mediaPath: string, userId: number): string {
    const expires = Date.now() + this.MEDIA_URL_EXPIRY;
    const stringToSign = `${mediaPath}${userId}${expires}`;
    
    const signature = crypto
      .createHmac('sha256', this.MEDIA_SECRET_KEY)
      .update(stringToSign)
      .digest('hex');
    
    return `/media/${mediaPath}?signature=${signature}&expires=${expires}&userId=${userId}`;
  }

  public getMediaWithVariants(mediaPath: string, userId: number): {
    original: string,
    variants: Record<string, string>,
    placeholder: string,
    type: string
  } {
    const mediaVariants = this.mediaService.getMediaVariants(mediaPath);
    
    const signedVariants = Object.entries(mediaVariants).reduce((acc, [size, path]) => {
      acc[size] = this.generateSignedMediaUrl(path, userId);
      return acc;
    }, {} as Record<string, string>);
    
    return {
      original: this.generateSignedMediaUrl(mediaPath, userId),
      variants: signedVariants,
      placeholder: this.mediaService.getPlaceholderUrl(mediaPath),
      type: this.mediaService.getMediaType(mediaPath)
    };
  }

  private async sendQueuedMessage(socket: Socket, userId: number, message: any): Promise<boolean> {
    const roomId = message.conversationId;
    const room = this.activeRooms.get(roomId);
    
    if (!room || !room.users.includes(userId)) {
      return false;
    }
    
    try {
      const messageToSend = {
        id: message.id,
        senderId: userId,
        content: message.content,
        mediaUrls: message.mediaUrls,
        timestamp: new Date(message.timestamp).toISOString(),
        clientId: message.clientId,
        version: message.version
      };
      
      this.io.to(roomId).emit('chat:message', {
        roomId,
        message: messageToSend
      });
      
      return true;
    } catch (error) {
      logError('MessageQueue', error, `Lỗi khi gửi tin nhắn từ hàng đợi: ${message.id} cho userId ${userId}`);
      return false;
    }
  }
}

export default SocketService;