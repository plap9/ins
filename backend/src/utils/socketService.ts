// backend/src/services/socketService.ts
import { Server as HTTPServer } from 'http';
import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { ErrorCode } from '../types/errorCode';

interface UserSocket {
  userId: number;
  socketId: string;
  rooms: string[];
}

interface Room {
  roomId: string;
  users: number[];
  type: 'private' | 'group';
  rtcSessionId?: string;
}

class SocketService {
  private io: Server;
  private activeUsers: Map<number, UserSocket> = new Map();
  private activeRooms: Map<string, Room> = new Map();
  private rtcPeers: Map<string, Set<number>> = new Map();

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
        ],
        methods: ['GET', 'POST'],
        credentials: true
      }
    });

    this.initializeListeners();
  }

  private initializeListeners(): void {
    this.io.use(this.authMiddleware);
    this.io.on('connection', (socket: Socket) => {
      console.log(`[${new Date().toISOString()}] Người dùng đã kết nối: ${socket.id}`);
      
      const userId = socket.data.userId as number;
      this.addUser(userId, socket.id);
      
      this.notifyUserOnline(userId);

      socket.on('disconnect', () => {
        console.log(`[${new Date().toISOString()}] Người dùng ngắt kết nối: ${socket.id}`);
        this.removeUser(userId, socket.id);
        this.notifyUserOffline(userId);
      });

      this.setupChatListeners(socket, userId);
      
      this.setupWebRTCListeners(socket, userId);
      
      this.setupStatusListeners(socket, userId);
    });
  }

  private authMiddleware = (socket: Socket, next: (err?: Error) => void) => {
    const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return next(new Error('Không có token, quyền truy cập bị từ chối'));
    }
    
    if (!process.env.JWT_SECRET) {
      return next(new Error('Lỗi máy chủ: JWT_SECRET không được định nghĩa'));
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET) as { userId: number };
      socket.data.userId = decoded.userId;
      next();
    } catch (error: any) {
      let message = 'Token không hợp lệ hoặc đã hết hạn';
      if (error.name === 'TokenExpiredError') {
        message = 'Token đã hết hạn';
      } else if (error.name === 'JsonWebTokenError') {
        message = 'Token không hợp lệ';
      }
      return next(new Error(message));
    }
  };

  private addUser(userId: number, socketId: string): void {
    if (this.activeUsers.has(userId)) {
      const userSocket = this.activeUsers.get(userId)!;
      userSocket.socketId = socketId;
    } else {
      this.activeUsers.set(userId, { userId, socketId, rooms: [] });
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

    socket.on('chat:message', ({ roomId, message }: { roomId: string, message: any }) => {
      const room = this.activeRooms.get(roomId);
      
      if (room && room.users.includes(userId)) {
        this.io.to(roomId).emit('chat:message', {
          roomId,
          message: {
            ...message,
            senderId: userId,
            timestamp: new Date().toISOString()
          }
        });
      }
    });

    socket.on('chat:typing', ({ roomId, isTyping }: { roomId: string, isTyping: boolean }) => {
      const room = this.activeRooms.get(roomId);
      
      if (room && room.users.includes(userId)) {
        socket.to(roomId).emit('chat:typing', {
          roomId,
          userId,
          isTyping
        });
      }
    });

    socket.on('chat:mark-read', ({ roomId, messageId }: { roomId: string, messageId: number }) => {
      const room = this.activeRooms.get(roomId);
      
      if (room && room.users.includes(userId)) {
        socket.to(roomId).emit('chat:message-read', {
          roomId,
          messageId,
          userId
        });
      }
    });
  }

  private setupWebRTCListeners(socket: Socket, userId: number): void {
    socket.on('call:start', ({ roomId, mediaType }: { roomId: string, mediaType: 'audio' | 'video' }) => {
      const room = this.activeRooms.get(roomId);
      
      if (room) {
        const rtcSessionId = `rtc_${roomId}_${Date.now()}`;
        room.rtcSessionId = rtcSessionId;
        
        this.rtcPeers.set(rtcSessionId, new Set([userId]));
        
        socket.to(roomId).emit('call:incoming', {
          roomId,
          callerId: userId,
          rtcSessionId,
          mediaType
        });
      }
    });

    socket.on('call:accept', ({ roomId, rtcSessionId }: { roomId: string, rtcSessionId: string }) => {
      const room = this.activeRooms.get(roomId);
      const peers = this.rtcPeers.get(rtcSessionId);
      
      if (room && peers) {
        peers.add(userId);
        
        this.io.to(roomId).emit('call:user-joined', {
          roomId,
          userId,
          rtcSessionId
        });
      }
    });

    socket.on('call:reject', ({ roomId, rtcSessionId }: { roomId: string, rtcSessionId: string }) => {
      const room = this.activeRooms.get(roomId);
      
      if (room && room.rtcSessionId === rtcSessionId) {
        this.io.to(roomId).emit('call:rejected', {
          roomId,
          userId,
          rtcSessionId
        });
        
        this.cleanupRTCSession(rtcSessionId);
        room.rtcSessionId = undefined;
      }
    });

    socket.on('call:end', ({ roomId, rtcSessionId }: { roomId: string, rtcSessionId: string }) => {
      const room = this.activeRooms.get(roomId);
      
      if (room && room.rtcSessionId === rtcSessionId) {
        this.io.to(roomId).emit('call:ended', {
          roomId,
          endedBy: userId,
          rtcSessionId
        });
        
        this.cleanupRTCSession(rtcSessionId);
        room.rtcSessionId = undefined;
      }
    });

    socket.on('webrtc:offer', ({ roomId, targetId, sdp }: { roomId: string, targetId: number, sdp: any }) => {
      const targetUser = this.activeUsers.get(targetId);
      
      if (targetUser) {
        const targetSocket = this.io.sockets.sockets.get(targetUser.socketId);
        if (targetSocket) {
          targetSocket.emit('webrtc:offer', {
            roomId,
            senderId: userId,
            sdp
          });
        }
      }
    });

    socket.on('webrtc:answer', ({ roomId, targetId, sdp }: { roomId: string, targetId: number, sdp: any }) => {
      const targetUser = this.activeUsers.get(targetId);
      
      if (targetUser) {
        const targetSocket = this.io.sockets.sockets.get(targetUser.socketId);
        if (targetSocket) {
          targetSocket.emit('webrtc:answer', {
            roomId,
            senderId: userId,
            sdp
          });
        }
      }
    });

    socket.on('webrtc:ice-candidate', ({ roomId, targetId, candidate }: { roomId: string, targetId: number, candidate: any }) => {
      const targetUser = this.activeUsers.get(targetId);
      
      if (targetUser) {
        const targetSocket = this.io.sockets.sockets.get(targetUser.socketId);
        if (targetSocket) {
          targetSocket.emit('webrtc:ice-candidate', {
            roomId,
            senderId: userId,
            candidate
          });
        }
      }
    });

    socket.on('webrtc:media-state', ({ roomId, video, audio }: { roomId: string, video: boolean, audio: boolean }) => {
      const room = this.activeRooms.get(roomId);
      
      if (room && room.users.includes(userId)) {
        socket.to(roomId).emit('webrtc:media-state', {
          roomId,
          userId,
          video,
          audio
        });
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

  public broadcastEvent(event: string, data: any): void {
    this.io.emit(event, data);
  }
}

export default SocketService;