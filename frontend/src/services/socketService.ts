import { io, Socket } from 'socket.io-client';
import { useAuth } from '../app/context/AuthContext';

class SocketService {
  private socket: Socket | null = null;
  private messageListeners: Map<string, Set<Function>> = new Map();
  private statusListeners: Map<string, Set<Function>> = new Map();
  private callListeners: Map<string, Set<Function>> = new Map();
  private connectionListeners: Set<Function> = new Set();

  connect() {
    if (this.socket) return;

    const auth = useAuth();
    const getAuthToken = async () => {
      return await auth.getToken();
    };
    
    getAuthToken().then(token => {
      const baseUrl = process.env.REACT_APP_API_URL || 'http://localhost:5000';

      this.socket = io(baseUrl, {
        auth: { token },
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionAttempts: 5
      });

      this.setupConnectionHandlers();
    });
  }

  private setupConnectionHandlers() {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log('Socket connected!');
      this.connectionListeners.forEach(listener => listener(true));
    });

    this.socket.on('disconnect', () => {
      console.log('Socket disconnected!');
      this.connectionListeners.forEach(listener => listener(false));
    });

    this.socket.on('connect_error', (err) => {
      console.error('Socket connection error:', err.message);
      this.connectionListeners.forEach(listener => listener(false, err.message));
    });

    this.socket.on('chat:message', (data) => {
      const listeners = this.messageListeners.get(data.roomId) || new Set();
      listeners.forEach(listener => listener(data.message));
    });

    this.socket.on('chat:typing', (data) => {
      const listeners = this.messageListeners.get(data.roomId) || new Set();
      listeners.forEach(listener => listener({ type: 'typing', userId: data.userId, isTyping: data.isTyping }));
    });

    this.socket.on('chat:message-read', (data) => {
      const listeners = this.messageListeners.get(data.roomId) || new Set();
      listeners.forEach(listener => listener({ type: 'read', messageId: data.messageId, userId: data.userId }));
    });

    this.socket.on('message:delivered', (data) => {
      const eventKey = 'message:delivered';
      const listeners = this.statusListeners.get(eventKey) || new Set();
      listeners.forEach(listener => listener(data));
    });

    this.socket.on('message:read', (data) => {
      const eventKey = 'message:read';
      const listeners = this.statusListeners.get(eventKey) || new Set();
      listeners.forEach(listener => listener(data));
    });

    this.socket.on('user:online', (data) => {
      const listeners = this.statusListeners.get('online') || new Set();
      listeners.forEach(listener => listener(data));
    });

    this.socket.on('user:offline', (data) => {
      const listeners = this.statusListeners.get('offline') || new Set();
      listeners.forEach(listener => listener(data));
    });

    this.socket.on('status:updated', (data) => {
      const listeners = this.statusListeners.get('status') || new Set();
      listeners.forEach(listener => listener(data));
    });

    this.socket.on('call:incoming', (data) => {
      const listeners = this.callListeners.get('incoming') || new Set();
      listeners.forEach(listener => listener(data));
    });

    this.socket.on('call:user-joined', (data) => {
      const listeners = this.callListeners.get('user-joined') || new Set();
      listeners.forEach(listener => listener(data));
    });

    this.socket.on('call:rejected', (data) => {
      const listeners = this.callListeners.get('rejected') || new Set();
      listeners.forEach(listener => listener(data));
    });

    this.socket.on('call:ended', (data) => {
      const listeners = this.callListeners.get('ended') || new Set();
      listeners.forEach(listener => listener(data));
    });

    this.socket.on('call:user-left', (data) => {
      const listeners = this.callListeners.get('user-left') || new Set();
      listeners.forEach(listener => listener(data));
    });

    this.socket.on('webrtc:offer', (data) => {
      const listeners = this.callListeners.get('rtc-offer') || new Set();
      listeners.forEach(listener => listener(data));
    });

    this.socket.on('webrtc:answer', (data) => {
      const listeners = this.callListeners.get('rtc-answer') || new Set();
      listeners.forEach(listener => listener(data));
    });

    this.socket.on('webrtc:ice-candidate', (data) => {
      const listeners = this.callListeners.get('rtc-ice') || new Set();
      listeners.forEach(listener => listener(data));
    });

    this.socket.on('webrtc:media-state', (data) => {
      const listeners = this.callListeners.get('media-state') || new Set();
      listeners.forEach(listener => listener(data));
    });

    this.socket.on('webrtc:config', (data) => {
      console.log('Đã nhận cấu hình WebRTC từ server:', data);
      if (this.callListeners.has('config')) {
        const listeners = this.callListeners.get('config') || new Set();
        listeners.forEach(listener => listener(data));
      }
    });

    this.socket.on('call:initiated', (data) => {
      const listeners = this.callListeners.get('initiated') || new Set();
      listeners.forEach(listener => listener(data));
    });

    this.socket.on('call:accepted', (data) => {
      const listeners = this.callListeners.get('accepted') || new Set();
      listeners.forEach(listener => listener(data));
    });

    this.socket.on('call:missed', (data) => {
      const listeners = this.callListeners.get('missed') || new Set();
      listeners.forEach(listener => listener(data));
    });

    this.socket.on('call:signal', (data) => {
      const listeners = this.callListeners.get('signal') || new Set();
      listeners.forEach(listener => listener(data));
    });

    this.socket.on('call:status', (data) => {
      const listeners = this.callListeners.get('status') || new Set();
      listeners.forEach(listener => listener(data));
    });

    this.socket.on('call:user-muted', (data) => {
      const listeners = this.callListeners.get('user-muted') || new Set();
      listeners.forEach(listener => listener(data));
    });

    this.socket.on('call:user-camera', (data) => {
      const listeners = this.callListeners.get('user-camera') || new Set();
      listeners.forEach(listener => listener(data));
    });

    this.socket.on('call:recipient-offline', (data) => {
      const listeners = this.callListeners.get('recipient-offline') || new Set();
      listeners.forEach(listener => listener(data));
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  onConnectionChange(callback: (connected: boolean, error?: string) => void) {
    this.connectionListeners.add(callback);
    return () => this.connectionListeners.delete(callback);
  }

  joinRoom(roomId: string, type: 'private' | 'group' = 'private') {
    if (!this.socket) return;
    this.socket.emit('chat:join', { roomId, type });
  }

  leaveRoom(roomId: string) {
    if (!this.socket) return;
    this.socket.emit('chat:leave', { roomId });
  }

  sendMessage(roomId: string, message: any) {
    if (!this.socket) return;
    this.socket.emit('chat:message', { roomId, message });
  }

  sendTypingStatus(roomId: string, isTyping: boolean) {
    if (!this.socket) return;
    this.socket.emit('chat:typing', { roomId, isTyping });
  }

  markMessageAsRead(roomId: string, messageId: number) {
    if (!this.socket) return;
    this.socket.emit('chat:mark-read', { roomId, messageId });
  }

  onRoomMessage(roomId: string, callback: (message: any) => void) {
    if (!this.messageListeners.has(roomId)) {
      this.messageListeners.set(roomId, new Set());
    }
    const listeners = this.messageListeners.get(roomId)!;
    listeners.add(callback);
    return () => listeners.delete(callback);
  }

  onMessageEvent(eventName: string, callback: (data: any) => void) {
    if (!this.statusListeners.has(eventName)) {
      this.statusListeners.set(eventName, new Set());
    }
    const listeners = this.statusListeners.get(eventName)!;
    listeners.add(callback);
    return () => listeners.delete(callback);
  }

  updateStatus(status: 'online' | 'away' | 'busy' | 'offline') {
    if (!this.socket) return;
    this.socket.emit('status:update', { status });
  }

  onUserStatus(type: 'online' | 'offline' | 'status', callback: (data: any) => void) {
    if (!this.statusListeners.has(type)) {
      this.statusListeners.set(type, new Set());
    }
    const listeners = this.statusListeners.get(type)!;
    listeners.add(callback);
    return () => listeners.delete(callback);
  }

  startCall(roomId: string, mediaType: 'audio' | 'video') {
    if (!this.socket) return;
    this.socket.emit('call:start', { roomId, mediaType });
  }

  acceptCall(roomId: string, rtcSessionId: string) {
    if (!this.socket) return;
    this.socket.emit('call:accept', { roomId, rtcSessionId });
  }

  rejectCall(roomId: string, rtcSessionId: string) {
    if (!this.socket) return;
    this.socket.emit('call:reject', { roomId, rtcSessionId });
  }

  endCall(roomId: string, rtcSessionId: string) {
    if (!this.socket) return;
    this.socket.emit('call:end', { roomId, rtcSessionId });
  }

  sendCallSignal(callId: number, recipientId: number, signalData: any, signalType: 'offer' | 'answer' | 'ice-candidate') {
    if (!this.socket) return;
    this.socket.emit('call:signal', { 
      call_id: callId, 
      recipient_id: recipientId, 
      signal_data: signalData,
      signal_type: signalType
    });
  }

  updateCallStatus(callId: number, status: 'connecting' | 'connected' | 'reconnecting' | 'disconnected', recipientId?: number) {
    if (!this.socket) return;
    const data: any = { call_id: callId, status };
    if (recipientId) data.recipient_id = recipientId;
    this.socket.emit('call:status', data);
  }

  toggleMute(callId: number, muted: boolean) {
    if (!this.socket) return;
    this.socket.emit('call:mute', { call_id: callId, muted });
  }

  toggleCamera(callId: number, enabled: boolean) {
    if (!this.socket) return;
    this.socket.emit('call:camera', { call_id: callId, enabled });
  }

  onCall(type: 'incoming' | 'user-joined' | 'rejected' | 'ended' | 'user-left' | 'rtc-offer' | 'rtc-answer' | 'rtc-ice' | 'media-state' | 'config' | 'signal' | 'status' | 'user-muted' | 'user-camera' | 'initiated' | 'accepted' | 'missed' | 'recipient-offline', callback: (data: any) => void) {
    if (!this.callListeners.has(type)) {
      this.callListeners.set(type, new Set());
    }
    const listeners = this.callListeners.get(type)!;
    listeners.add(callback);
    return () => listeners.delete(callback);
  }

  sendOffer(roomId: string, targetId: number, sdp: any) {
    if (!this.socket) return;
    this.socket.emit('webrtc:offer', { roomId, targetId, sdp });
  }

  sendAnswer(roomId: string, targetId: number, sdp: any) {
    if (!this.socket) return;
    this.socket.emit('webrtc:answer', { roomId, targetId, sdp });
  }

  sendIceCandidate(roomId: string, targetId: number, candidate: any) {
    if (!this.socket) return;
    this.socket.emit('webrtc:ice-candidate', { roomId, targetId, candidate });
  }

  updateMediaState(roomId: string, video: boolean, audio: boolean) {
    if (!this.socket) return;
    this.socket.emit('webrtc:media-state', { roomId, video, audio });
  }

  emit(eventName: string, data: any): void {
    if (!this.socket) return;
    this.socket.emit(eventName, data);
  }

  isConnected(): boolean {
    return this.socket !== null && this.socket.connected;
  }

  getSocket(): Socket | null {
    return this.socket;
  }

  public requestReconnection(peerId: string): void {
    if (this.socket) {
      this.socket.emit('request-reconnection', { peerId });
      console.log('Đã gửi yêu cầu kết nối lại tới:', peerId);
    } else {
      console.error('Socket không khả dụng, không thể yêu cầu kết nối lại');
    }
  }

  public onReconnectionRequest(callback: (data: { peerId: string }) => void): void {
    if (this.socket) {
      this.socket.on('reconnection-request', callback);
    }
  }
}

export default new SocketService();