import { EventEmitter } from 'events';
import { Socket } from 'socket.io';

interface SFURoom {
  roomId: string;
  participants: Map<number, SFUParticipant>;
  createdAt: Date;
  activeSpeakerId?: number;
  maxParticipants: number;
}

interface SFUParticipant {
  userId: number;
  socketId: string;
  producerIds: string[];
  consumerIds: string[];
  isConnected: boolean;
  lastActivity: Date;
  deviceInfo?: any;
  bandwidth?: number;
  connectionQuality: 'high' | 'medium' | 'low' | 'audio-only';
}

class SFUService extends EventEmitter {
  private static instance: SFUService;
  private rooms: Map<string, SFURoom> = new Map();
  private userRooms: Map<number, Set<string>> = new Map();
  private reconnectTimers: Map<string, NodeJS.Timeout> = new Map();
  private readonly PARTICIPANT_TIMEOUT_MS = 30000;
  private readonly MAX_PARTICIPANTS_DEFAULT = 50;
  private readonly BANDWIDTH_CHECK_INTERVAL_MS = 5000;

  private constructor() {
    super();
    this.startCleanupInterval();
  }

  public static getInstance(): SFUService {
    if (!SFUService.instance) {
      SFUService.instance = new SFUService();
    }
    return SFUService.instance;
  }

  createOrJoinRoom(roomId: string, userId: number, socketId: string, maxParticipants?: number): SFURoom {
    let room = this.rooms.get(roomId);
    
    if (!room) {
      room = {
        roomId,
        participants: new Map(),
        createdAt: new Date(),
        maxParticipants: maxParticipants || this.MAX_PARTICIPANTS_DEFAULT
      };
      this.rooms.set(roomId, room);
    }
    
    if (room.participants.size >= room.maxParticipants && !room.participants.has(userId)) {
      throw new Error(`Phòng ${roomId} đã đạt số lượng người tham gia tối đa (${room.maxParticipants})`);
    }

    if (!room.participants.has(userId)) {
      room.participants.set(userId, {
        userId,
        socketId,
        producerIds: [],
        consumerIds: [],
        isConnected: true,
        lastActivity: new Date(),
        connectionQuality: 'medium'
      });
      
      if (!this.userRooms.has(userId)) {
        this.userRooms.set(userId, new Set());
      }
      this.userRooms.get(userId)!.add(roomId);
    } else {
      const participant = room.participants.get(userId)!;
      participant.socketId = socketId;
      participant.isConnected = true;
      participant.lastActivity = new Date();
      
      const timerKey = `${roomId}:${userId}`;
      if (this.reconnectTimers.has(timerKey)) {
        clearTimeout(this.reconnectTimers.get(timerKey)!);
        this.reconnectTimers.delete(timerKey);
      }
    }
    
    return room;
  }

  leaveRoom(roomId: string, userId: number, temporary: boolean = false): void {
    const room = this.rooms.get(roomId);
    if (!room) return;
    
    const participant = room.participants.get(userId);
    if (!participant) return;
    
    if (temporary) {
      participant.isConnected = false;
      
      const timerKey = `${roomId}:${userId}`;
      this.reconnectTimers.set(timerKey, setTimeout(() => {
        this.leaveRoom(roomId, userId, false);
        this.reconnectTimers.delete(timerKey);
      }, this.PARTICIPANT_TIMEOUT_MS));
      
      this.emit('participant:disconnected', { roomId, userId });
    } else {
      room.participants.delete(userId);
      
      if (this.userRooms.has(userId)) {
        this.userRooms.get(userId)!.delete(roomId);
        if (this.userRooms.get(userId)!.size === 0) {
          this.userRooms.delete(userId);
        }
      }
      
      this.emit('participant:left', { roomId, userId });
      
      if (room.participants.size === 0) {
        this.rooms.delete(roomId);
        this.emit('room:closed', { roomId });
      } else if (room.activeSpeakerId === userId) {
        room.activeSpeakerId = undefined;
      }
    }
  }

  updateParticipantConnectionQuality(
    roomId: string, 
    userId: number, 
    connectionQuality: 'high' | 'medium' | 'low' | 'audio-only',
    bandwidth?: number
  ): void {
    const room = this.rooms.get(roomId);
    if (!room) return;
    
    const participant = room.participants.get(userId);
    if (!participant) return;
    
    participant.connectionQuality = connectionQuality;
    if (bandwidth) participant.bandwidth = bandwidth;
    participant.lastActivity = new Date();
    
    this.emit('participant:quality-changed', { 
      roomId, 
      userId, 
      connectionQuality,
      bandwidth 
    });
  }

  getMediaConstraintsByConnectionQuality(
    connectionQuality: 'high' | 'medium' | 'low' | 'audio-only'
  ): MediaStreamConstraints {
    switch (connectionQuality) {
      case 'high':
        return {
          video: {
            width: { ideal: 1280, max: 1920 },
            height: { ideal: 720, max: 1080 },
            frameRate: { ideal: 30, max: 30 }
          },
          audio: true
        };
      case 'medium':
        return {
          video: {
            width: { ideal: 640, max: 1280 },
            height: { ideal: 480, max: 720 },
            frameRate: { ideal: 24, max: 30 }
          },
          audio: true
        };
      case 'low':
        return {
          video: {
            width: { ideal: 320, max: 640 },
            height: { ideal: 240, max: 480 },
            frameRate: { ideal: 15, max: 20 }
          },
          audio: true
        };
      case 'audio-only':
        return {
          video: false,
          audio: true
        };
      default:
        return {
          video: true,
          audio: true
        };
    }
  }

  setActiveSpeaker(roomId: string, userId: number): void {
    const room = this.rooms.get(roomId);
    if (!room || !room.participants.has(userId)) return;
    
    room.activeSpeakerId = userId;
    this.emit('room:active-speaker-changed', { roomId, activeSpeakerId: userId });
  }

  setupSocketHandlers(socket: Socket): void {
    const userId = socket.data.userId as number;
    
    socket.on('sfu:join', async ({ roomId, maxParticipants }: { roomId: string, maxParticipants?: number }) => {
      try {
        const room = this.createOrJoinRoom(roomId, userId, socket.id, maxParticipants);
        
        socket.join(roomId);
        
        const participants = Array.from(room.participants.values()).map(p => ({
          userId: p.userId,
          isConnected: p.isConnected,
          connectionQuality: p.connectionQuality
        }));
        
        socket.emit('sfu:room-info', {
          roomId,
          participants,
          activeSpeakerId: room.activeSpeakerId
        });
        
        socket.to(roomId).emit('sfu:participant-joined', {
          roomId,
          userId,
          connectionQuality: 'medium' 
        });
      } catch (error: any) {
        socket.emit('error', {
          code: 'SFU_ERROR',
          message: error.message
        });
      }
    });
    
    socket.on('sfu:leave', ({ roomId }: { roomId: string }) => {
      this.leaveRoom(roomId, userId);
      socket.leave(roomId);
      socket.to(roomId).emit('sfu:participant-left', { roomId, userId });
    });
    
    socket.on('sfu:connection-quality', ({ 
      roomId, 
      connectionQuality,
      bandwidth
    }: { 
      roomId: string, 
      connectionQuality: 'high' | 'medium' | 'low' | 'audio-only',
      bandwidth?: number
    }) => {
      this.updateParticipantConnectionQuality(roomId, userId, connectionQuality, bandwidth);
      socket.to(roomId).emit('sfu:participant-quality-changed', {
        roomId,
        userId,
        connectionQuality,
        bandwidth
      });
    });
    
    socket.on('sfu:speaking', ({ roomId, speaking }: { roomId: string, speaking: boolean }) => {
      if (speaking) {
        this.setActiveSpeaker(roomId, userId);
        socket.to(roomId).emit('sfu:active-speaker-changed', { roomId, activeSpeakerId: userId });
      }
    });
    
    socket.on('disconnect', () => {
      if (this.userRooms.has(userId)) {
        for (const roomId of this.userRooms.get(userId)!) {
          this.leaveRoom(roomId, userId, true);
          socket.to(roomId).emit('sfu:participant-disconnected', { roomId, userId });
        }
      }
    });
  }

  private startCleanupInterval(): void {
    setInterval(() => {
      const now = new Date();
      
      for (const [roomId, room] of this.rooms.entries()) {
        for (const [userId, participant] of room.participants.entries()) {
          const inactiveTime = now.getTime() - participant.lastActivity.getTime();
          if (!participant.isConnected && inactiveTime > this.PARTICIPANT_TIMEOUT_MS) {
            this.leaveRoom(roomId, userId, false);
          }
        }
        
        if (room.participants.size === 0) {
          this.rooms.delete(roomId);
        }
      }
    }, this.PARTICIPANT_TIMEOUT_MS / 2);
  }

  shouldUseSFU(participantCount: number): boolean {
    const maxP2P = parseInt(process.env.MAX_P2P_PARTICIPANTS || '4', 10);
    const enableSFU = process.env.ENABLE_SFU === 'true';
    
    return enableSFU && participantCount > maxP2P;
  }

  getRoomInfo(roomId: string): SFURoom | undefined {
    return this.rooms.get(roomId);
  }

  getUserRooms(userId: number): string[] {
    if (!this.userRooms.has(userId)) return [];
    return Array.from(this.userRooms.get(userId)!);
  }
}

export default SFUService; 