import socketService from './socketService';
import turnService from './turnService';

interface PeerConnection {
  connection: RTCPeerConnection;
  mediaStream: MediaStream | null;
  remoteStream: MediaStream;
  mediaType: 'audio' | 'video';
}

class WebRTCService {
  private peerConnections: Map<number, PeerConnection> = new Map();
  private localStream: MediaStream | null = null;
  private currentRoomId: string | null = null;
  private currentSessionId: string | null = null;
  private iceServers: RTCIceServer[] = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' }
  ];
  private iceServersInitialized: boolean = false;

  constructor() {
    this.setupSocketListeners();
    this.initializeIceServers();
  }

  private async initializeIceServers(): Promise<void> {
    try {
      this.iceServers = await turnService.getIceServers();
      this.iceServersInitialized = true;
      console.log('Ice servers initialized with TURN support');
    } catch (error) {
      console.error('Không thể khởi tạo TURN servers:', error);
    }
  }

  private setupSocketListeners() {
    socketService.onCall('rtc-offer', this.handleIncomingOffer.bind(this));
    socketService.onCall('rtc-answer', this.handleIncomingAnswer.bind(this));
    socketService.onCall('rtc-ice', this.handleIceCandidate.bind(this));
    socketService.onCall('user-joined', this.handleUserJoined.bind(this));
    socketService.onCall('user-left', this.handleUserLeft.bind(this));
    socketService.onCall('ended', this.handleCallEnded.bind(this));
    socketService.onCall('media-state', this.handleMediaStateChange.bind(this));

    socketService.onCall('config', (config: { iceServers: RTCIceServer[], iceTransportPolicy: RTCIceTransportPolicy }) => {
      if (config.iceServers && config.iceServers.length > 0) {
        this.iceServers = config.iceServers;
        this.iceServersInitialized = true;
        console.log('Đã nhận cấu hình ICE từ server:', config.iceServers);
      }
    });
  }

  public async startCall(roomId: string, mediaType: 'audio' | 'video' = 'audio'): Promise<boolean> {
    try {
      if (!this.iceServersInitialized) {
        await this.initializeIceServers();
      }

      this.currentRoomId = roomId;
      
      const constraints: MediaStreamConstraints = {
        audio: true,
        video: mediaType === 'video'
      };
      
      this.localStream = await navigator.mediaDevices.getUserMedia(constraints);
      
      socketService.startCall(roomId, mediaType);
      
      return true;
    } catch (error) {
      console.error('Lỗi khi bắt đầu cuộc gọi:', error);
      return false;
    }
  }

  public async acceptCall(roomId: string, rtcSessionId: string, mediaType: 'audio' | 'video' = 'audio'): Promise<boolean> {
    try {
      if (!this.iceServersInitialized) {
        await this.initializeIceServers();
      }

      this.currentRoomId = roomId;
      this.currentSessionId = rtcSessionId;
      
      const constraints: MediaStreamConstraints = {
        audio: true,
        video: mediaType === 'video'
      };
      
      this.localStream = await navigator.mediaDevices.getUserMedia(constraints);
      
      socketService.acceptCall(roomId, rtcSessionId);
      
      return true;
    } catch (error) {
      console.error('Lỗi khi chấp nhận cuộc gọi:', error);
      return false;
    }
  }

  public rejectCall(roomId: string, rtcSessionId: string): void {
    socketService.rejectCall(roomId, rtcSessionId);
  }

  public endCall(): void {
    if (this.currentRoomId && this.currentSessionId) {
      socketService.endCall(this.currentRoomId, this.currentSessionId);
      this.cleanupCall();
    }
  }

  private async handleUserJoined(data: { roomId: string, userId: number, rtcSessionId: string }): Promise<void> {
    if (this.currentRoomId !== data.roomId) return;
    
    this.currentSessionId = data.rtcSessionId;
    
    await this.createPeerConnection(data.userId);
    
    if (this.localStream) {
      this.createAndSendOffer(data.userId);
    }
  }

  private async createPeerConnection(userId: number): Promise<void> {
    try {
      if (!this.iceServersInitialized) {
        await this.initializeIceServers();
      }

      const peerConnection = new RTCPeerConnection({ iceServers: this.iceServers });
      
      const remoteStream = new MediaStream();
      
      if (this.localStream) {
        this.localStream.getTracks().forEach(track => {
          peerConnection.addTrack(track, this.localStream!);
        });
      }
      
      peerConnection.onicecandidate = (event) => {
        if (event.candidate && this.currentRoomId) {
          socketService.sendIceCandidate(this.currentRoomId, userId, event.candidate);
        }
      };
      
      peerConnection.ontrack = (event) => {
        event.streams[0].getTracks().forEach(track => {
          remoteStream.addTrack(track);
        });
      };

      peerConnection.oniceconnectionstatechange = () => {
        const connectionState = peerConnection.iceConnectionState;
        console.log(`ICE connection state với user ${userId}: ${connectionState}`);
        
        if (connectionState === 'failed') {
          console.warn(`Kết nối ICE với user ${userId} thất bại, thử khởi động lại`);
          
          if (this.currentRoomId && this.currentSessionId) {
            socketService.emit('call:ice-failed', {
              roomId: this.currentRoomId,
              rtcSessionId: this.currentSessionId,
              target: userId
            });
            
            this.restartIceConnection(userId);
          }
        }
      };
      
      this.peerConnections.set(userId, {
        connection: peerConnection,
        mediaStream: this.localStream,
        remoteStream,
        mediaType: 'audio'
      });
      
    } catch (error) {
      console.error('Lỗi khi tạo kết nối peer:', error);
    }
  }

  public async restartIceConnection(userId: number): Promise<void> {
    try {
      this.iceServers = await turnService.getIceServers();
      
      const peerData = this.peerConnections.get(userId);
      if (!peerData || !this.currentRoomId) return;
      
      const offer = await peerData.connection.createOffer({ iceRestart: true });
      await peerData.connection.setLocalDescription(offer);
      
      socketService.sendOffer(this.currentRoomId, userId, offer);
      
      console.log(`Đã khởi động lại kết nối ICE với user ${userId}`);
    } catch (error) {
      console.error('Lỗi khi khởi động lại kết nối ICE:', error);
    }
  }

  public async testTurnConnection(): Promise<{success: boolean, message: string}> {
    return turnService.testTurnConnection();
  }

  private async createAndSendOffer(userId: number): Promise<void> {
    try {
      const peerData = this.peerConnections.get(userId);
      if (!peerData || !this.currentRoomId) return;
      
      const offer = await peerData.connection.createOffer();
      await peerData.connection.setLocalDescription(offer);
      
      socketService.sendOffer(this.currentRoomId, userId, offer);
    } catch (error) {
      console.error('Lỗi khi tạo và gửi offer:', error);
    }
  }

  private async handleIncomingOffer(data: { roomId: string, senderId: number, sdp: RTCSessionDescription }): Promise<void> {
    if (this.currentRoomId !== data.roomId) return;
    
    try {
      if (!this.peerConnections.has(data.senderId)) {
        await this.createPeerConnection(data.senderId);
      }
      
      const peerData = this.peerConnections.get(data.senderId);
      if (!peerData) return;
      
      await peerData.connection.setRemoteDescription(new RTCSessionDescription(data.sdp));
      
      const answer = await peerData.connection.createAnswer();
      await peerData.connection.setLocalDescription(answer);
      
      socketService.sendAnswer(data.roomId, data.senderId, answer);
    } catch (error) {
      console.error('Lỗi khi xử lý offer đến:', error);
    }
  }

  private async handleIncomingAnswer(data: { roomId: string, senderId: number, sdp: RTCSessionDescription }): Promise<void> {
    if (this.currentRoomId !== data.roomId) return;
    
    try {
      const peerData = this.peerConnections.get(data.senderId);
      if (!peerData) return;
      
      await peerData.connection.setRemoteDescription(new RTCSessionDescription(data.sdp));
    } catch (error) {
      console.error('Lỗi khi xử lý answer đến:', error);
    }
  }

  private async handleIceCandidate(data: { roomId: string, senderId: number, candidate: RTCIceCandidate }): Promise<void> {
    if (this.currentRoomId !== data.roomId) return;
    
    try {
      const peerData = this.peerConnections.get(data.senderId);
      if (!peerData) return;
      
      await peerData.connection.addIceCandidate(new RTCIceCandidate(data.candidate));
    } catch (error) {
      console.error('Lỗi khi xử lý ice candidate:', error);
    }
  }

  private handleUserLeft(data: { roomId: string, userId: number }): void {
    if (this.currentRoomId !== data.roomId) return;
    
    this.cleanupPeerConnection(data.userId);
  }

  private handleCallEnded(data: { roomId: string, endedBy: number, rtcSessionId: string }): void {
    if (this.currentRoomId === data.roomId && this.currentSessionId === data.rtcSessionId) {
      this.cleanupCall();
    }
  }

  private cleanupPeerConnection(userId: number): void {
    const peerData = this.peerConnections.get(userId);
    if (peerData) {
      peerData.connection.close();
      this.peerConnections.delete(userId);
    }
  }

  private cleanupCall(): void {
    for (const userId of this.peerConnections.keys()) {
      this.cleanupPeerConnection(userId);
    }
    
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => {
        track.stop();
      });
      this.localStream = null;
    }
    
    this.currentRoomId = null;
    this.currentSessionId = null;
  }

  private handleMediaStateChange(data: { roomId: string, userId: number, video: boolean, audio: boolean }): void {
  }

  public toggleAudio(enable: boolean): void {
    if (this.localStream && this.currentRoomId) {
      const audioTracks = this.localStream.getAudioTracks();
      
      audioTracks.forEach(track => {
        track.enabled = enable;
      });
      
      const videoEnabled = this.localStream.getVideoTracks().some(track => track.enabled);
      socketService.updateMediaState(this.currentRoomId, videoEnabled, enable);
    }
  }

  public toggleVideo(enable: boolean): void {
    if (this.localStream && this.currentRoomId) {
      const videoTracks = this.localStream.getVideoTracks();
      
      videoTracks.forEach(track => {
        track.enabled = enable;
      });
      
      const audioEnabled = this.localStream.getAudioTracks().some(track => track.enabled);
      socketService.updateMediaState(this.currentRoomId, enable, audioEnabled);
    }
  }

  public getRemoteStream(userId: number): MediaStream | null {
    const peerData = this.peerConnections.get(userId);
    return peerData ? peerData.remoteStream : null;
  }

  public getLocalStream(): MediaStream | null {
    return this.localStream;
  }
}

export default new WebRTCService();