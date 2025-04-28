import socketService from './socketService';
import turnService from './turnService';
import messageService from './messageService';
import { Platform, Alert, Linking, PermissionsAndroid } from 'react-native';
import { Camera } from 'expo-camera';
import * as MediaLibrary from 'expo-media-library';
import { RTCView, mediaDevices } from 'react-native-webrtc';

let mediaDevicesRN: any;
let RTCPeerConnection: any;
try {
    const WebRTC = require('react-native-webrtc');
  mediaDevicesRN = WebRTC.mediaDevices;
    RTCPeerConnection = WebRTC.RTCPeerConnection;
  console.log('[WebRTC] Khởi tạo WebRTC thành công');
  console.log('[WebRTC] mediaDevices có sẵn:', !!mediaDevicesRN);
  console.log('[WebRTC] RTCPeerConnection có sẵn:', !!RTCPeerConnection);
  
  if (mediaDevicesRN && mediaDevicesRN.enumerateDevices) {
    mediaDevicesRN.enumerateDevices().then((devices: any[]) => {
      console.log('[WebRTC] Các thiết bị đa phương tiện được phát hiện:');
      let hasAudio = false;
      let hasVideo = false;
      devices.forEach(device => {
        console.log(`[WebRTC] - ${device.kind}: ${device.label || 'Không có nhãn'}`);
        if (device.kind === 'audioinput') hasAudio = true;
        if (device.kind === 'videoinput') hasVideo = true;
      });
      console.log(`[WebRTC] Tóm tắt: Có microphone=${hasAudio}, Có camera=${hasVideo}`);
    }).catch((err: any) => {
      console.error('[WebRTC] Lỗi khi liệt kê thiết bị:', err);
    });
  } else {
    console.warn('[WebRTC] Không thể kiểm tra thiết bị vì enumerateDevices không khả dụng');
  }
} catch (e) {
  console.error('[WebRTC] *** LỖI KHI KHỞI TẠO WEBRTC ***', e);
}

interface MediaStreamAdapter {
  getUserMedia(constraints: MediaStreamConstraints): Promise<MediaStream>;
  releaseStream(stream: MediaStream | null): void;
  checkPermissions(): Promise<{ audio: boolean, video: boolean }>;
  requestNativePermissions(mediaType: 'audio' | 'video'): Promise<void>;
}

class WebMediaStreamAdapter implements MediaStreamAdapter {
  async getUserMedia(constraints: MediaStreamConstraints): Promise<MediaStream> {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      throw new Error('Trình duyệt này không hỗ trợ WebRTC');
    }
    try {
      return await navigator.mediaDevices.getUserMedia(constraints);
    } catch (error) {
      console.error('Web getUserMedia error:', error);
      throw error;
    }
  }

  releaseStream(stream: MediaStream | null): void {
    if (stream) {
      stream.getTracks().forEach(track => {
        track.stop();
      });
    }
  }

  async checkPermissions(): Promise<{ audio: boolean, video: boolean }> {
    return { audio: true, video: true };
  }

  async requestNativePermissions(mediaType: 'audio' | 'video'): Promise<void> {
    console.log('Web environment - permissions will be requested by browser');
  }
}

class NativeMediaStreamAdapter implements MediaStreamAdapter {
  private micPermissionGranted: boolean = false;
  private cameraPermissionGranted: boolean = false;

  async requestNativePermissions(mediaType: 'audio' | 'video'): Promise<void> {
    console.log(`[WebRTC Permissions] BẮT ĐẦU XIN QUYỀN CHO: ${mediaType}`);
    console.log(`[WebRTC Permissions] Platform: ${Platform.OS}, Version: ${Platform.Version}`);
    console.log(`[WebRTC Permissions] Trạng thái quyền hiện tại: Mic=${this.micPermissionGranted}, Camera=${this.cameraPermissionGranted}`);
    
    if (Platform.OS === 'android') {
      try {
        console.log('[WebRTC Permissions] Android: Yêu cầu quyền microphone...');
        const micResult = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
          {
            title: "Yêu cầu quyền Microphone",
            message: "Ứng dụng cần quyền truy cập microphone để thực hiện cuộc gọi",
            buttonPositive: "Đồng ý",
          }
        );
        
        console.log(`[WebRTC Permissions] Android: Kết quả quyền microphone: ${micResult}`);
        this.micPermissionGranted = micResult === PermissionsAndroid.RESULTS.GRANTED;
        
        if (!this.micPermissionGranted) {
          console.error('[WebRTC Permissions] ANDROID: QUYỀN MICROPHONE BỊ TỪ CHỐI');
          Alert.alert(
            "Cần quyền truy cập microphone",
            "Để thực hiện cuộc gọi, bạn cần cho phép ứng dụng truy cập microphone. Vui lòng vào Cài đặt > Quyền > Microphone để bật quyền.",
            [
              { text: "Hủy", style: "cancel" },
              { text: "Mở Cài đặt", onPress: () => Linking.openSettings() }
            ]
          );
          throw new Error('ANDROID: Quyền microphone bị từ chối');
        }
        
        if (mediaType === 'video') {
          console.log('[WebRTC Permissions] Android: Yêu cầu quyền camera...');
          const camResult = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.CAMERA,
            {
              title: "Yêu cầu quyền Camera",
              message: "Ứng dụng cần quyền truy cập camera để thực hiện cuộc gọi video",
              buttonPositive: "Đồng ý",
            }
          );
          
          console.log(`[WebRTC Permissions] Android: Kết quả quyền camera: ${camResult}`);
          this.cameraPermissionGranted = camResult === PermissionsAndroid.RESULTS.GRANTED;
          
          if (!this.cameraPermissionGranted) {
            console.error('[WebRTC Permissions] ANDROID: QUYỀN CAMERA BỊ TỪ CHỐI');
            Alert.alert(
              "Cần quyền truy cập camera",
              "Để thực hiện cuộc gọi video, bạn cần cho phép ứng dụng truy cập camera. Vui lòng vào Cài đặt > Quyền > Camera để bật quyền.",
              [
                { text: "Hủy", style: "cancel" },
                { text: "Mở Cài đặt", onPress: () => Linking.openSettings() }
              ]
            );
            throw new Error('ANDROID: Quyền camera bị từ chối');
          }
        }
      } catch (error) {
        console.error('[WebRTC Permissions] Lỗi khi xin quyền Android:', error);
        throw error;
      }
    } else {
      console.log('[WebRTC Permissions] Sử dụng expo-camera cho iOS...');
      
      try {
        console.log('[WebRTC Permissions] iOS: Yêu cầu quyền microphone...');
      const micPermission = await Camera.requestMicrophonePermissionsAsync();
        console.log('[WebRTC Permissions] iOS: Kết quả quyền microphone:', micPermission);
          
      this.micPermissionGranted = micPermission.status === 'granted';
      
      if (!this.micPermissionGranted) {
          console.error('[WebRTC Permissions] iOS: QUYỀN MICROPHONE BỊ TỪ CHỐI');
        Alert.alert(
            "Cần quyền truy cập microphone",
            "Để thực hiện cuộc gọi, bạn cần cho phép ứng dụng truy cập microphone trong Cài đặt.",
          [
            { text: "Hủy", style: "cancel" },
            { text: "Mở Cài đặt", onPress: () => Linking.openSettings() }
          ]
        );
          throw new Error('iOS: Quyền microphone bị từ chối');
    }

        if (mediaType === 'video') {
          console.log('[WebRTC Permissions] iOS: Yêu cầu quyền camera...');
      const cameraPermission = await Camera.requestCameraPermissionsAsync();
          console.log('[WebRTC Permissions] iOS: Kết quả quyền camera:', cameraPermission);
          
      this.cameraPermissionGranted = cameraPermission.status === 'granted';
      
      if (!this.cameraPermissionGranted) {
            console.error('[WebRTC Permissions] iOS: QUYỀN CAMERA BỊ TỪ CHỐI');
        Alert.alert(
              "Cần quyền truy cập camera",
              "Để thực hiện cuộc gọi video, bạn cần cho phép ứng dụng truy cập camera trong Cài đặt.",
          [
            { text: "Hủy", style: "cancel" },
            { text: "Mở Cài đặt", onPress: () => Linking.openSettings() }
          ]
        );
            throw new Error('iOS: Quyền camera bị từ chối');
          }
        }
      } catch (error) {
        console.error('[WebRTC Permissions] Lỗi khi xin quyền iOS:', error);
        throw error;
      }
    }
    
    console.log(`[WebRTC Permissions] ĐÃ NHẬN ĐƯỢC TẤT CẢ QUYỀN CẦN THIẾT CHO ${mediaType}`);
    console.log(`[WebRTC Permissions] Trạng thái quyền cuối cùng: Mic=${this.micPermissionGranted}, Camera=${this.cameraPermissionGranted}`);
  }

  async getUserMedia(constraints: MediaStreamConstraints): Promise<MediaStream> {
    console.log(`[WebRTC getUserMedia] BẮT ĐẦU TRUY CẬP MEDIA VỚI:`, JSON.stringify(constraints));
    
    if (!mediaDevicesRN) {
      const error = new Error('react-native-webrtc không được khởi tạo đúng cách');
      console.error('[WebRTC getUserMedia] LỖI NGHIÊM TRỌNG:', error);
      Alert.alert(
        "Không thể truy cập media",
        "Chức năng gọi video không khả dụng trên thiết bị này do thư viện WebRTC không được khởi tạo đúng cách.",
        [{ text: "OK" }]
      );
      throw error;
    }

    try {
      console.log('[WebRTC getUserMedia] Bắt đầu xin quyền thiết bị...');
      await this.requestNativePermissions(constraints.video ? 'video' : 'audio');
      console.log('[WebRTC getUserMedia] Đã xin quyền thành công');
    } catch (permError) {
      console.error('[WebRTC getUserMedia] Lỗi xin quyền:', permError);
      throw permError;
    }
    
    console.log('[WebRTC getUserMedia] Bắt đầu gọi native getUserMedia...');
    try {
      const simplifiedConstraints = {
        audio: true,
        video: constraints.video ? true : false
      };
      
      console.log('[WebRTC getUserMedia] Thử với các ràng buộc đơn giản:', simplifiedConstraints);
      const stream = await mediaDevicesRN.getUserMedia(simplifiedConstraints);
      console.log('[WebRTC getUserMedia] ĐÃ NHẬN ĐƯỢC STREAM THÀNH CÔNG!');
      
      const audioTracks = stream.getAudioTracks();
      const videoTracks = stream.getVideoTracks();
      
      console.log(`[WebRTC getUserMedia] Stream có ${audioTracks.length} audio tracks và ${videoTracks.length} video tracks`);
      
      audioTracks.forEach((track: MediaStreamTrack, index: number) => {
        console.log(`[WebRTC getUserMedia] Audio track ${index}: enabled=${track.enabled}, id=${track.id}`);
      });
      
      videoTracks.forEach((track: MediaStreamTrack, index: number) => {
        console.log(`[WebRTC getUserMedia] Video track ${index}: enabled=${track.enabled}, id=${track.id}`);
      });
      
      return stream;
    } catch (error: any) {
      console.error('[WebRTC getUserMedia] LỖI KHI LẤY STREAM:', error);
      
      try {
        console.log('[WebRTC getUserMedia] Thử lại với cấu hình tối thiểu...');
        const minimalConstraints = { audio: true };
        const stream = await mediaDevicesRN.getUserMedia(minimalConstraints);
        console.log('[WebRTC getUserMedia] Đã nhận được stream audio-only!');
        
        Alert.alert(
          "Video không khả dụng",
          "Không thể truy cập camera. Cuộc gọi sẽ tiếp tục với chỉ âm thanh.",
          [{ text: "OK" }]
        );
        
        return stream;
      } catch (finalError: any) {
        console.error('[WebRTC getUserMedia] THẤT BẠI HOÀN TOÀN:', finalError);
        
        const detailedError = new Error(`Không thể truy cập thiết bị media: ${finalError.message || 'Không rõ nguyên nhân'}. Vui lòng đảm bảo ứng dụng có quyền truy cập camera và microphone.`);
        
        Alert.alert(
          "Không thể truy cập thiết bị",
          "Không thể truy cập camera hoặc microphone. Vui lòng kiểm tra các quyền trong cài đặt ứng dụng và thử lại.",
          [
            { text: "Đóng" },
            { text: "Mở cài đặt", onPress: () => Linking.openSettings() }
          ]
        );
        
        throw detailedError;
      }
    }
  }

  async checkPermissions(): Promise<{ audio: boolean, video: boolean }> {
    console.log('Đang kiểm tra quyền thiết bị...');
    if (Platform.OS === 'android') {
      try {
        const mic = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.RECORD_AUDIO);
        const cam = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.CAMERA);
        this.micPermissionGranted = mic;
        this.cameraPermissionGranted = cam;
        console.log(`Kết quả kiểm tra quyền Android: mic=${mic}, camera=${cam}`);
        return { audio: mic, video: cam };
      } catch (err) {
        console.error('Lỗi khi kiểm tra quyền Android:', err);
        return { audio: false, video: false };
      }
    } else {
      try {
        const micPermission = await Camera.getMicrophonePermissionsAsync();
        const cameraPermission = await Camera.getCameraPermissionsAsync();
        this.micPermissionGranted = micPermission.status === 'granted';
        this.cameraPermissionGranted = cameraPermission.status === 'granted';
        console.log(`Kết quả kiểm tra quyền iOS: mic=${this.micPermissionGranted}, camera=${this.cameraPermissionGranted}`);
        return {
          audio: this.micPermissionGranted,
          video: this.cameraPermissionGranted
        };
      } catch (err) {
        console.error('Lỗi khi kiểm tra quyền iOS:', err);
        return { audio: false, video: false };
      }
    }
  }

  releaseStream(stream: MediaStream | null): void {
    if (stream) {
      stream.getTracks().forEach(track => {
        track.stop();
      });
    }
  }
}

function createMediaStreamAdapter(): MediaStreamAdapter {
  if (Platform.OS === 'android' || Platform.OS === 'ios') {
    return new NativeMediaStreamAdapter();
  } else {
    return new WebMediaStreamAdapter();
  }
}

interface PeerConnection {
  connection: RTCPeerConnection;
  mediaStream: MediaStream | null;
  remoteStream: MediaStream;
  mediaType: 'audio' | 'video';
}

interface CallConfig {
  callId: number;
  conversationId: number;
  initiatorId: number;
  participantIds: number[];
  callType: 'audio' | 'video';
  isGroup: boolean;
}

interface ConnectionStateChangeInfo {
  peerId: string;
  state: 'connecting' | 'connected' | 'reconnecting' | 'disconnected' | 'failed';
  message?: string;
}

class WebRTCService {
  private peerConnections: Map<number, PeerConnection> = new Map();
  private localStream: MediaStream | null = null;
  private callConfigs: Map<number, CallConfig> = new Map();
  private activeCallId: number | null = null;
  private iceServers: RTCIceServer[] = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' }
  ];
  private iceServersInitialized: boolean = false;
  private audioEnabled: boolean = true;
  private videoEnabled: boolean = true;
  private callStatus: 'connecting' | 'connected' | 'disconnected' | 'ended' | null = null;
  private statusListeners: Set<(status: string) => void> = new Set();
  private participantStatusListeners: Set<(data: any) => void> = new Set();
  private connectionStateListeners: Set<(data: ConnectionStateChangeInfo) => void> = new Set();
  private reconnectAttempts: Map<string, number> = new Map();
  private readonly MAX_RECONNECT_ATTEMPTS = 3;
  private static isInitiatingCall: boolean = false;
  private callTimeoutId: NodeJS.Timeout | null = null;
  
  private mediaStreamAdapter: MediaStreamAdapter;

  constructor() {
    this.mediaStreamAdapter = createMediaStreamAdapter();
    this.setupSocketListeners();
    this.initializeIceServers();
    this.checkPermissions();
  }

  private async checkPermissions(): Promise<void> {
    try {
      const permissions = await this.mediaStreamAdapter.checkPermissions();
      console.log('Trạng thái quyền hiện tại:', permissions);
    } catch (error) {
      console.error('Lỗi khi kiểm tra quyền:', error);
    }
  }

  private async initializeIceServers(): Promise<void> {
    try {
      console.log('Bắt đầu lấy cấu hình TURN/STUN servers...');
      const iceServers = await turnService.getIceServers();
      
      if (iceServers && iceServers.length > 0) {
        this.iceServers = iceServers;
        iceServers.forEach((server, index) => {
          console.log(`ICE Server ${index + 1}:`, 
            typeof server.urls === 'string' 
              ? server.urls 
              : Array.isArray(server.urls) 
                ? server.urls.join(', ') 
                : 'unknown'
          );
          
          if (server.username) {
            console.log(`Thông tin xác thực: ${server.username} / ${server.credential ? '****' : 'none'}`);
          }
        });
        
        this.iceServersInitialized = true;
        console.log('Đã khởi tạo ICE servers thành công');
      } else {
        throw new Error('Không nhận được cấu hình ICE servers hợp lệ');
      }
    } catch (error) {
      console.error('Không thể khởi tạo TURN servers, sử dụng STUN:', error);
      this.iceServers = [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' },
        { urls: 'stun:stun3.l.google.com:19302' },
        { urls: 'stun:stun4.l.google.com:19302' }
      ];
      this.iceServersInitialized = true;
    }
  }

  private setupSocketListeners() {
    socketService.onCall('signal', this.handleSignal.bind(this));
    socketService.onCall('user-joined', this.handleUserJoined.bind(this));
    socketService.onCall('user-left', this.handleUserLeft.bind(this));
    socketService.onCall('ended', this.handleCallEnded.bind(this));
    socketService.onCall('user-muted', this.handleUserMuted.bind(this));
    socketService.onCall('user-camera', this.handleUserCamera.bind(this));
    socketService.onCall('status', this.handlePeerStatus.bind(this));
    
    socketService.onCall('config', (config: { iceServers: RTCIceServer[], iceTransportPolicy: RTCIceTransportPolicy }) => {
      if (config.iceServers && config.iceServers.length > 0) {
        this.iceServers = config.iceServers;
        this.iceServersInitialized = true;
        console.log('Đã nhận cấu hình ICE từ server:', config.iceServers);
      }
    });
  }

  private debugState(message: string, data?: any): void {
    const debugEnabled = true; 
    if (debugEnabled) {
      console.log(`[WebRTC] ${message}`, data ? data : '');
    }
  }

  private async handleDatabaseIssue(error: any): Promise<boolean> {
    const sqlError = error.response?.data?.error?.sqlMessage;
    
    if (sqlError?.includes("Table 'ins.conversations' doesn't exist")) {
      this.debugState('Phát hiện lỗi database: Bảng conversations không tồn tại');
      console.error('Database chưa được khởi tạo đúng. Vui lòng kiểm tra cấu hình backend.');
      
      Alert.alert(
        "Lỗi Database",
        "Hệ thống chưa được khởi tạo đầy đủ. Vui lòng liên hệ quản trị viên.",
        [{ text: "OK" }]
      );
      
      return false;
    }
    
    return true;
  }

  public async initiateCall(targetId: number, mediaType: 'audio' | 'video' = 'audio', isConversation: boolean = false): Promise<boolean> {
    if (WebRTCService.isInitiatingCall) {
      console.log(`[WebRTC initiateCall] ĐÃ ĐANG KHỞI TẠO CUỘC GỌI, BỎ QUA YÊU CẦU MỚI`);
      return false;
    }
    
    WebRTCService.isInitiatingCall = true;
    
    try {
      console.log(`[WebRTC initiateCall] BẮT ĐẦU KHỞI TẠO CUỘC GỌI: ${new Date().toISOString()}`);
      console.log(`[WebRTC initiateCall] Tham số: targetId=${targetId}, mediaType=${mediaType}, isConversation=${isConversation}`);
      
      if (!mediaDevicesRN || !RTCPeerConnection) {
        console.error('[WebRTC initiateCall] KHÔNG THỂ KHỞI TẠO: WebRTC không được khởi tạo đúng cách');
        Alert.alert(
          "Không thể thực hiện cuộc gọi",
          "Thiết bị của bạn không hỗ trợ tính năng gọi video hoặc âm thanh.",
          [{ text: "OK" }]
        );
        return false;
      }
      
      if (this.activeCallId) {
        console.warn(`[WebRTC initiateCall] Đang có cuộc gọi hiện tại với ID: ${this.activeCallId}. Kết thúc trước khi bắt đầu cuộc gọi mới.`);
        await this.endCall();
      }
      
      console.log(`[WebRTC initiateCall] Kiểm tra quyền truy cập thiết bị...`);
      const permissions = await this.mediaStreamAdapter.checkPermissions();
      console.log(`[WebRTC initiateCall] Kết quả kiểm tra quyền: audio=${permissions.audio}, video=${permissions.video}`);
      
      if (!permissions.audio || (mediaType === 'video' && !permissions.video)) {
        console.log(`[WebRTC initiateCall] Cần xin lại quyền thiết bị...`);
        try {
          await this.mediaStreamAdapter.requestNativePermissions(mediaType);
          console.log(`[WebRTC initiateCall] Đã xin quyền thành công`);
        } catch (permError) {
          console.error(`[WebRTC initiateCall] Lỗi khi yêu cầu quyền:`, permError);
          return false;
        }
      }
      
      if (!this.iceServersInitialized) {
        console.log(`[WebRTC initiateCall] Bắt đầu khởi tạo ICE servers...`);
        await this.initializeIceServers();
      }

      console.log(`[WebRTC initiateCall] Bắt đầu tạo cuộc gọi với máy chủ...`);
      let callResponse;
      
      try {
        if (isConversation) {
          console.log(`[WebRTC initiateCall] Gọi initiateCall API cho hội thoại ${targetId}...`);
          callResponse = await messageService.initiateCall({
            conversation_id: targetId,
            call_type: mediaType
          });
        } else {
          console.log(`[WebRTC initiateCall] Gọi initiateCall API cho người dùng ${targetId}...`);
          callResponse = await messageService.initiateCall({
            recipient_id: targetId,
            call_type: mediaType
          });
        }
        
        console.log(`[WebRTC initiateCall] Phản hồi từ API:`, callResponse);
      } catch (apiError: any) {
        console.error(`[WebRTC initiateCall] LỖI API KHI TẠO CUỘC GỌI:`, apiError);
        
        let errorMessage = "Không thể bắt đầu cuộc gọi. Vui lòng thử lại sau.";
        
        if (apiError.response) {
          console.error(`[WebRTC initiateCall] Chi tiết lỗi API: ${apiError.response.status} - ${JSON.stringify(apiError.response.data)}`);
          if (apiError.response.status === 404) {
            errorMessage = "Không tìm thấy người nhận cuộc gọi.";
          } else if (apiError.response.status === 403) {
            errorMessage = "Bạn không có quyền thực hiện cuộc gọi này.";
          } else if (apiError.response.status === 400) {
            errorMessage = apiError.response.data?.message || "Thông tin cuộc gọi không hợp lệ.";
          }
        } else if (apiError.message) {
          errorMessage = `Lỗi: ${apiError.message}`;
        }
        
        Alert.alert("Lỗi cuộc gọi", errorMessage, [{ text: "OK" }]);
        WebRTCService.isInitiatingCall = false;
        return false;
      }
      
      const callId = callResponse.call_id;
      this.activeCallId = callId;
      
      console.log(`[WebRTC initiateCall] Cuộc gọi đã được tạo với ID: ${callId}`);
      
      this.updateCallStatus('connecting');
      
      console.log(`[WebRTC initiateCall] Bắt đầu lấy local media stream với loại: ${mediaType}`);
      
      try {
        const constraints: MediaStreamConstraints = {
          audio: true,
          video: mediaType === 'video'
        };
        
        console.log(`[WebRTC initiateCall] Yêu cầu getUserMedia với:`, constraints);
        this.localStream = await this.mediaStreamAdapter.getUserMedia(constraints);
        console.log(`[WebRTC initiateCall] Đã nhận được local stream thành công`);
        
        if (isConversation) {
          console.log(`[WebRTC initiateCall] Đây là cuộc gọi nhóm, cần thiết lập kết nối với nhiều người dùng`);
          if (callResponse.participants && callResponse.participants.length > 0) {
            for (const participant of callResponse.participants) {
              if (participant.user_id !== callResponse.initiator_id) {
                console.log(`[WebRTC initiateCall] Tạo peer connection với người tham gia: ${participant.user_id}`);
                await this.createPeerConnection(participant.user_id.toString());
                this.createAndSendOffer(participant.user_id.toString());
              }
            }
          } else {
            console.log(`[WebRTC initiateCall] Không có người tham gia nào trong nhóm`);
          }
        } else {
          console.log(`[WebRTC initiateCall] Đây là cuộc gọi 1-1, tạo peer connection với: ${targetId}`);
          await this.createPeerConnection(targetId.toString());
          this.createAndSendOffer(targetId.toString());
        }
        
        console.log(`[WebRTC initiateCall] KHỞI TẠO CUỘC GỌI THÀNH CÔNG: ${callId}`);
        
        if (this.callTimeoutId) {
          clearTimeout(this.callTimeoutId);
        }
        
        this.callTimeoutId = setTimeout(async () => {
          if (this.callStatus === 'connecting') {
            console.log(`[WebRTC initiateCall] CUỘC GỌI KHÔNG ĐƯỢC TRẢ LỜI SAU 30 GIÂY: ${callId}`);
            Alert.alert(
              "Cuộc gọi không được trả lời",
              "Người nhận không trả lời cuộc gọi. Họ có thể đang bận hoặc không trực tuyến.",
              [{ text: "OK" }]
            );
            await this.endCall();
          }
          this.callTimeoutId = null;
        }, 30000);
        
        socketService.onCall('recipient-offline', async (data) => {
          if (data.call_id === callId) {
            console.log(`[WebRTC] Người nhận không trực tuyến: ${data.recipient_id}`);
            Alert.alert(
              "Người nhận không trực tuyến",
              "Người nhận hiện không trực tuyến. Vui lòng thử lại sau.",
              [{ text: "OK" }]
            );
            await this.endCall();
          }
        });
        
        return true;
      } catch (mediaError: any) {
        console.error(`[WebRTC initiateCall] LỖI KHI LẤY MEDIA STREAM:`, mediaError);
        
        if (callId) {
          try {
            console.log(`[WebRTC initiateCall] Hủy cuộc gọi ${callId} do lỗi media`);
            await messageService.endCall(callId);
          } catch (endError) {
            console.error(`[WebRTC initiateCall] Không thể kết thúc cuộc gọi ${callId}:`, endError);
          }
        }
        
        this.cleanupCall();
        
        Alert.alert(
          "Không thể truy cập thiết bị",
          `Không thể bắt đầu cuộc gọi: ${mediaError.message || 'Không thể truy cập camera hoặc microphone'}`,
          [{ text: "OK" }]
        );
        
        return false;
      }
    } catch (error: any) {
      console.error(`[WebRTC initiateCall] LỖI KHÔNG XÁC ĐỊNH:`, error);
      
      this.cleanupCall();
      
      Alert.alert(
        "Lỗi cuộc gọi",
        `Đã xảy ra lỗi: ${error.message || 'Không xác định'}`,
        [{ text: "OK" }]
      );
      
      return false;
    } finally {
      WebRTCService.isInitiatingCall = false;
    }
  }

  public async acceptCall(callId: number, mediaType: 'audio' | 'video' = 'audio'): Promise<boolean> {
    try {
      if (!this.iceServersInitialized) {
        await this.initializeIceServers();
      }

      await this.mediaStreamAdapter.requestNativePermissions(mediaType);
      
      const callDetails = await messageService.getCallDetails(callId);
      
      const callConfig: CallConfig = {
        callId: callDetails.call_id,
        conversationId: callDetails.conversation_id,
        initiatorId: callDetails.initiator_id,
        participantIds: callDetails.participants.map((p: any) => p.user_id),
        callType: callDetails.call_type,
        isGroup: callDetails.participants.length > 2
      };
      
      this.callConfigs.set(callConfig.callId, callConfig);
      this.activeCallId = callConfig.callId;
      
      const constraints: MediaStreamConstraints = {
        audio: true,
        video: mediaType === 'video' || callDetails.call_type === 'video'
      };
      
      try {
        console.log('Đang yêu cầu stream với constraints:', constraints);
        this.localStream = await this.mediaStreamAdapter.getUserMedia(constraints);
        console.log('Đã nhận stream thành công từ getUserMedia');
      } catch (error) {
        console.error('Lỗi khi lấy stream từ thiết bị:', error);
        
        Alert.alert(
          "Không thể truy cập thiết bị media",
          "Không thể truy cập microphone hoặc camera. Vui lòng kiểm tra lại quyền truy cập và thiết bị của bạn.",
          [
            { text: "Hủy", style: "cancel", onPress: () => this.cleanupCall() },
            { text: "Mở Cài đặt", onPress: () => { Linking.openSettings(); this.cleanupCall(); } }
          ]
        );
        
        throw new Error('Không thể truy cập thiết bị media. Cuộc gọi bị hủy.');
      }
      
      this.videoEnabled = mediaType === 'video' || callDetails.call_type === 'video';
      this.audioEnabled = true;
      this.updateCallStatus('connecting');
      
      await messageService.answerCall(callId, 'accepted');
      
      await this.createPeerConnection(callDetails.initiator_id.toString());
      
      for (const participant of callDetails.participants) {
        if (participant.user_id !== callDetails.initiator_id) {
          await this.createPeerConnection(participant.user_id.toString());
        }
      }
      
      this.createAndSendOffer(callDetails.initiator_id);
      
      return true;
    } catch (error) {
      console.error('Lỗi khi chấp nhận cuộc gọi:', error);
      this.cleanupCall();
      return false;
    }
  }

  public async rejectCall(callId: number): Promise<void> {
    try {
      await messageService.answerCall(callId, 'rejected');
    } catch (error) {
      console.error('Lỗi khi từ chối cuộc gọi:', error);
    }
  }

  public async endCall(): Promise<void> {
    if (this.activeCallId) {
      try {
        await messageService.endCall(this.activeCallId);
      } catch (error) {
        console.error('Lỗi khi kết thúc cuộc gọi:', error);
      } finally {
        this.cleanupCall();
      }
    }
  }

  private async handleUserJoined(data: any): Promise<void> {
    if (!this.activeCallId || this.activeCallId !== data.call_id) return;
    
    const userId = data.user_id;
    
    if (!this.peerConnections.has(userId)) {
      await this.createPeerConnection(userId.toString());
      
      if (this.localStream) {
        this.createAndSendOffer(userId.toString());
      }
    }
    
    this.notifyParticipantStatus({
      userId,
      status: 'joined',
      muted: false,
      videoEnabled: this.callConfigs.get(this.activeCallId)?.callType === 'video'
    });
  }

  public async createPeerConnection(callerId: string): Promise<RTCPeerConnection> {
    console.log(`Tạo peer connection với config: ${JSON.stringify(this.iceServers)}`);
    
    try {
      if (!RTCPeerConnection) {
        throw new Error('RTCPeerConnection không khả dụng');
      }

      const peerConnection = new RTCPeerConnection({
        iceServers: this.iceServers,
        iceTransportPolicy: 'all', 
        bundlePolicy: 'max-bundle'
      });
      
      peerConnection.onicecandidate = (event: RTCPeerConnectionIceEvent) => {
        if (event.candidate) {
          console.log(`[WebRTC] ICE candidate cho peer ${callerId}:`, event.candidate.candidate.substr(0, 50) + '...');
            this.sendIceCandidate(Number(callerId), event.candidate);
        }
      };

      peerConnection.oniceconnectionstatechange = () => {
        console.log(`[WebRTC] ICE connection state change: ${peerConnection.iceConnectionState}`);
        
        switch (peerConnection.iceConnectionState) {
          case 'connected':
            this.notifyConnectionStateChange({
              peerId: callerId,
              state: 'connected'
            });
            break;
          case 'disconnected':
            this.notifyConnectionStateChange({
              peerId: callerId,
              state: 'disconnected'
            });
            this.handleConnectionFailure(callerId);
            break;
          case 'failed':
            this.notifyConnectionStateChange({
              peerId: callerId,
              state: 'failed',
              message: 'Kết nối ICE thất bại'
            });
            break;
        }
      };

      if (this.localStream) {
        console.log(`[WebRTC] Thêm local tracks vào peer connection cho ${callerId}`);
        try {
          const audioTracks = this.localStream.getAudioTracks();
          const videoTracks = this.localStream.getVideoTracks();
          
          console.log(`[WebRTC] Thêm ${audioTracks.length} audio tracks và ${videoTracks.length} video tracks`);
          
          audioTracks.forEach(track => {
            try {
              peerConnection.addTrack(track, this.localStream!);
              console.log(`[WebRTC] Đã thêm audio track: ${track.id}`);
            } catch (e) {
              console.error(`[WebRTC] Lỗi khi thêm audio track: ${e}`);
            }
          });
          
          videoTracks.forEach(track => {
            try {
              peerConnection.addTrack(track, this.localStream!);
              console.log(`[WebRTC] Đã thêm video track: ${track.id}`);
            } catch (e) {
              console.error(`[WebRTC] Lỗi khi thêm video track: ${e}`);
            }
          });
        } catch (e) {
          console.error(`[WebRTC] Lỗi khi thêm track vào peer connection: ${e}`);
        }
      } else {
        console.warn(`[WebRTC] Không có local stream khi tạo peer connection cho ${callerId}`);
      }
      
      let remoteStream;
      
      try {
        const { MediaStream } = require('react-native-webrtc');
        console.log('[WebRTC] Bắt đầu tạo MediaStream với constructor từ react-native-webrtc');
        remoteStream = new MediaStream();
        console.log(`[WebRTC] MediaStream đã được tạo thành công với ID: ${remoteStream.id}`);
      } catch (error: unknown) {
        console.error('[WebRTC] Lỗi khi tạo remote MediaStream:', error);
        console.log('[WebRTC] Sử dụng dummy-stream thay thế do tạo MediaStream thất bại');
        remoteStream = { id: 'dummy-stream', addTrack: () => {}, removeTrack: () => {} };
      }
      
      peerConnection.ontrack = (event: RTCTrackEvent) => {
        console.log(`[WebRTC] Nhận được track từ peer ${callerId}:`, event.track.kind);
        
        try {
          console.log(`[WebRTC] Thêm track ${event.track.id} (${event.track.kind}) vào remoteStream ${remoteStream.id}`);
          remoteStream.addTrack(event.track);
          console.log(`[WebRTC] Đã thêm track thành công vào remoteStream`);
          
        const peerData = this.peerConnections.get(Number(callerId));
        if (peerData) {
            peerData.remoteStream = remoteStream;
            console.log(`[WebRTC] Cập nhật remoteStream trong peerConnections cho peer ${callerId}`);
            this.peerConnections.set(Number(callerId), peerData);
          }
          
          this.notifyParticipantStatus({
            peerId: callerId,
            trackAdded: true,
            kind: event.track.kind
          });
        } catch (e) {
          console.error(`[WebRTC] Lỗi khi xử lý track nhận được: ${e}`);
        }
      };
      
      this.peerConnections.set(Number(callerId), {
        connection: peerConnection,
        mediaStream: this.localStream,
        remoteStream: remoteStream,
        mediaType: this.videoEnabled ? 'video' : 'audio'
      });
      
      console.log(`[WebRTC] Đã tạo peer connection thành công cho ${callerId}`);
      return peerConnection;
    } catch (error: unknown) {
      console.error(`[WebRTC] Lỗi khi tạo peer connection:`, error);
      
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'Lỗi không xác định';
        
      Alert.alert(
        "Lỗi kết nối",
        `Không thể thiết lập kết nối WebRTC: ${errorMessage}`,
        [{ text: "OK" }]
      );
      
      throw error;
    }
  }

  private async createAndSendOffer(callerId: string): Promise<void> {
    try {
      const peerData = this.peerConnections.get(Number(callerId));
      if (!peerData || !this.activeCallId) return;
      
      const offer = await peerData.connection.createOffer();
      await peerData.connection.setLocalDescription(offer);
      
      this.sendSignal(
        this.activeCallId,
        Number(callerId),
        offer,
        'offer'
      );
    } catch (error) {
      console.error('Lỗi khi tạo và gửi offer:', error);
    }
  }

  private async handleSignal(data: any): Promise<void> {
    try {
      const callId = data.call_id || data.roomId;
      const senderId = data.sender_id || data.userId;
      const signalData = data.signal_data || data.sdp;
      const signalType = data.signal_type || data.type;
      
      if (!this.activeCallId || this.activeCallId !== callId) {
        console.log('Bỏ qua tín hiệu không thuộc về cuộc gọi hiện tại', { callId, currentId: this.activeCallId });
        return;
      }
      
      console.log(`Đã nhận tín hiệu ${signalType} từ ${senderId}`);
      
      if (!this.peerConnections.has(senderId)) {
        await this.createPeerConnection(senderId.toString());
      }
      
      const peerData = this.peerConnections.get(senderId);
      if (!peerData) return;
      
      if (signalType === 'offer') {
        await peerData.connection.setRemoteDescription(new RTCSessionDescription(signalData));
        
        const answer = await peerData.connection.createAnswer();
        await peerData.connection.setLocalDescription(answer);
        
        this.sendSignal(this.activeCallId, senderId, answer, 'answer');
      } else if (signalType === 'answer') {
        await peerData.connection.setRemoteDescription(new RTCSessionDescription(signalData));
      } else if (signalType === 'ice-candidate' || signalType === 'candidate') {
        await peerData.connection.addIceCandidate(new RTCIceCandidate(signalData));
      }
    } catch (error) {
      console.error('Lỗi khi xử lý tín hiệu:', error);
    }
  }

  private sendSignal(callId: number, recipientId: number, signalData: any, signalType: 'offer' | 'answer' | 'ice-candidate'): void {
    console.log(`Gửi tín hiệu ${signalType} tới ${recipientId}`);
    socketService.sendCallSignal(callId, recipientId, signalData, signalType);
  }

  private sendIceCandidate(recipientId: number, candidate: RTCIceCandidate): void {
    if (!this.activeCallId) return;
    
    socketService.sendIceCandidate(
      this.activeCallId.toString(), 
      Number(recipientId),
      candidate
    );
  }

  private handleUserLeft(data: any): void {
    if (!this.activeCallId || this.activeCallId !== data.call_id) return;
    
    const userId = data.user_id;
    this.cleanupPeerConnection(userId);
    
    this.notifyParticipantStatus({
      userId,
      status: 'left'
    });
  }

  private handleCallEnded(data: any): void {
    if (!this.activeCallId || this.activeCallId !== data.call_id) return;
    
    this.updateCallStatus('ended');
    this.cleanupCall();
  }

  private cleanupPeerConnection(userId: number): void {
    try {
      const peerConnection = this.peerConnections.get(userId);
      if (peerConnection) {
        try {
          peerConnection.connection.close();
        } catch (closeError) {
          console.error(`Lỗi khi đóng kết nối peer ${userId}:`, closeError);
        }
        this.peerConnections.delete(userId);
      }
    } catch (error) {
      console.error(`Lỗi khi dọn dẹp kết nối peer ${userId}:`, error);
    }
  }

  private cleanupCall(): void {
    if (this.callTimeoutId) {
      clearTimeout(this.callTimeoutId);
      this.callTimeoutId = null;
    }
    
    this.peerConnections.forEach((peerData, userId) => {
      try {
        this.cleanupPeerConnection(userId);
      } catch (peerError) {
        console.error(`Lỗi khi dọn dẹp kết nối peer ${userId}:`, peerError);
      }
    });

    this.peerConnections.clear();
    
    if (this.localStream) {
      this.mediaStreamAdapter.releaseStream(this.localStream);
      this.localStream = null;
    }
    
    this.callConfigs.clear();
    this.activeCallId = null;
    this.updateCallStatus(null);
  }

  private handleUserMuted(data: any): void {
    if (!this.activeCallId || this.activeCallId !== data.call_id) return;
    
    this.notifyParticipantStatus({
      userId: data.user_id,
      muted: data.muted
    });
  }
  
  private handleUserCamera(data: any): void {
    if (!this.activeCallId || this.activeCallId !== data.call_id) return;
    
    this.notifyParticipantStatus({
      userId: data.user_id,
      videoEnabled: data.enabled
    });
  }
  
  private handlePeerStatus(data: any): void {
    if (!this.activeCallId || this.activeCallId !== data.call_id) return;
    
    this.notifyParticipantStatus({
      userId: data.user_id,
      connectionStatus: data.status
    });
  }

  public toggleAudio(enable: boolean): void {
    if (!this.localStream) return;
    
    this.audioEnabled = enable;
    this.localStream.getAudioTracks().forEach(track => {
      track.enabled = enable;
    });
    
    if (this.activeCallId) {
      socketService.toggleMute(this.activeCallId, !enable);
    }
  }

  public toggleVideo(enable: boolean): void {
    const activeCallConfig = this.activeCallId !== null ? this.callConfigs.get(this.activeCallId) : null;
    if (!this.localStream || activeCallConfig?.callType !== 'video') return;
    
    this.videoEnabled = enable;
    this.localStream.getVideoTracks().forEach(track => {
      track.enabled = enable;
    });
    
    if (this.activeCallId) {
      socketService.toggleCamera(this.activeCallId, enable);
    }
  }

  public getRemoteStream(userId: number): MediaStream | null {
    const stream = this.peerConnections.get(userId)?.remoteStream || null;
    console.log(`[WebRTC getRemoteStream] Lấy remoteStream cho userId=${userId}:`, 
      stream ? {
        id: stream.id,
        isMediaStream: stream instanceof MediaStream,
        isDummy: stream.id === 'dummy-stream'
      } : 'null'
    );
    return stream;
  }

  public getLocalStream(): MediaStream | null {
    console.log('[WebRTC getLocalStream] Kiểm tra localStream:', 
      this.localStream ? {
        id: this.localStream.id,
        active: this.localStream.active,
        audioTracks: this.localStream.getAudioTracks().length,
        videoTracks: this.localStream.getVideoTracks().length
      } : 'null'
    );
    
    if (this.localStream && this.localStream.active) {
      const videoTracks = this.localStream.getVideoTracks();
      if (videoTracks.length > 0) {
        console.log('[WebRTC getLocalStream] Video track:', {
          enabled: videoTracks[0].enabled,
          readyState: videoTracks[0].readyState,
          id: videoTracks[0].id
        });
      }
      return this.localStream;
    }
    
    console.log('[WebRTC getLocalStream] CẢNH BÁO: LocalStream không khả dụng hoặc không active');
    return null;
  }
  
  public isAudioEnabled(): boolean {
    return this.audioEnabled;
  }
  
  public isVideoEnabled(): boolean {
    return this.videoEnabled;
  }
  
  public getCurrentCallId(): number | null {
    return this.activeCallId;
  }
  
  public getParticipantIds(): number[] {
    const currentConfig = this.activeCallId !== null ? this.callConfigs.get(this.activeCallId) : null;
    return currentConfig?.participantIds || [];
  }
  
  public onStatusChange(callback: (status: string) => void): () => void {
    this.statusListeners.add(callback);
    return () => this.statusListeners.delete(callback);
  }
  
  public onParticipantStatusChange(callback: (data: any) => void): () => void {
    this.participantStatusListeners.add(callback);
    return () => this.participantStatusListeners.delete(callback);
  }
  
  private updateCallStatus(status: string | null): void {
    this.callStatus = status as any;
    this.statusListeners.forEach(listener => listener(status || 'unknown'));
  }
  
  private notifyParticipantStatus(data: any): void {
    this.participantStatusListeners.forEach(listener => listener(data));
  }

  public onConnectionStateChange(callback: (data: ConnectionStateChangeInfo) => void): () => void {
    this.connectionStateListeners.add(callback);
    return () => this.connectionStateListeners.delete(callback);
  }

  private notifyConnectionStateChange(data: ConnectionStateChangeInfo): void {
    this.connectionStateListeners.forEach(listener => listener(data));
  }

  public async handleConnectionFailure(peerId: string): Promise<void> {
    console.log('Kết nối với peer bị lỗi:', peerId);
    
    const attempts = this.reconnectAttempts.get(peerId) || 0;
    
    if (attempts >= this.MAX_RECONNECT_ATTEMPTS) {
      this.notifyConnectionStateChange({
        peerId,
        state: 'failed',
        message: `Không thể kết nối sau ${this.MAX_RECONNECT_ATTEMPTS} lần thử. Vui lòng kiểm tra kết nối mạng.`
      });
      return;
    }
    
    this.reconnectAttempts.set(peerId, attempts + 1);
    
    if (this.peerConnections.has(Number(peerId))) {
      console.log('Đang thử kết nối lại với:', peerId);
      
      const peerData = this.peerConnections.get(Number(peerId));
      if (peerData) {
        try {
          peerData.connection.close();
        } catch (closeError) {
          console.error(`Lỗi khi đóng kết nối peer ${peerId}:`, closeError);
        }
        this.peerConnections.delete(Number(peerId));
      }
      
      this.notifyConnectionStateChange({
        peerId,
        state: 'reconnecting',
        message: `Kết nối bị mất, đang thử kết nối lại... (lần ${attempts + 1}/${this.MAX_RECONNECT_ATTEMPTS})`
      });
      
      setTimeout(() => {
        if (!this.peerConnections.has(Number(peerId))) {
          this.createPeerConnection(peerId)
            .then(newPeerConnection => {
              console.log('Đã tạo lại kết nối với:', peerId);
              if (this.localStream) {
                this.localStream.getTracks().forEach(track => {
                  newPeerConnection.addTrack(track, this.localStream!);
                });
              }
              socketService.requestReconnection(peerId);
            })
            .catch(error => {
              console.error('Không thể tạo lại kết nối:', error);
              this.notifyConnectionStateChange({
                peerId,
                state: 'failed',
                message: 'Không thể kết nối lại với người dùng'
              });
            });
        }
      }, 2000);
    }
  }

  public switchCamera(): boolean {
    console.log('[WebRTC switchCamera] Bắt đầu chuyển đổi camera...');
    if (!this.localStream) {
      console.warn('[WebRTC switchCamera] Không thể chuyển đổi camera: localStream không tồn tại');
      return false;
    }

    const videoTracks = this.localStream.getVideoTracks();
    if (!videoTracks || videoTracks.length === 0) {
      console.warn('[WebRTC switchCamera] Không tìm thấy video track trong localStream');
      return false;
    }

    const videoTrack = videoTracks[0];
    if (!videoTrack) {
      console.warn('[WebRTC switchCamera] Video track không hợp lệ');
      return false;
    }

    try {
      const track = videoTrack as any;
      if (typeof track.switchCamera === 'function') {
        track.switchCamera();
        console.log('[WebRTC switchCamera] Đã chuyển đổi camera thành công');
        return true;
      } else {
        console.warn('[WebRTC switchCamera] Phương thức switchCamera không tồn tại trên videoTrack');
        
        if (Platform.OS === 'android' || Platform.OS === 'ios') {
          console.log('[WebRTC switchCamera] Thử sử dụng cách thay thế: tái tạo stream với facingMode ngược lại');
        }
        
        return false;
      }
    } catch (error) {
      console.error('[WebRTC switchCamera] Lỗi khi chuyển đổi camera:', error);
      return false;
    }
  }

  public getConnectionStatus(): { connected: boolean; error?: string } {
    if (!this.activeCallId) {
      return { connected: false, error: 'Không có cuộc gọi đang diễn ra' };
    }
    
    let allConnected = true;
    let error = '';
    
    for (const [peerId, peerData] of this.peerConnections.entries()) {
      const state = peerData.connection.iceConnectionState;
      if (state !== 'connected' && state !== 'completed') {
        allConnected = false;
        error = `Peer ${peerId} có trạng thái ${state}`;
        break;
      }
    }
    
    return { connected: allConnected, error };
  }

  public async troubleshootConnection(): Promise<string> {
    this.debugState('Bắt đầu khắc phục sự cố kết nối');
    
    if (!this.activeCallId) {
      return 'Không có cuộc gọi đang diễn ra';
    }
    
    try {
      const iceServers = await turnService.getIceServers();
      if (iceServers && iceServers.length > 0) {
        this.iceServers = iceServers;
        this.debugState('Đã cập nhật ICE servers', iceServers);
      }
    } catch (error) {
      console.error('Không thể lấy ICE servers mới:', error);
    }
    
    let reconnections = 0;
    
    for (const [peerId, peerData] of this.peerConnections.entries()) {
      const state = peerData.connection.iceConnectionState;
      if (state === 'failed' || state === 'disconnected') {
        this.debugState(`Tái thiết lập kết nối với peer ${peerId} (${state})`);
        await this.handleConnectionFailure(peerId.toString());
        reconnections++;
      }
    }
    
    return reconnections > 0 
      ? `Đã thử tái thiết lập ${reconnections} kết nối`
      : 'Không phát hiện kết nối bị lỗi';
  }

  public getCurrentCallConfig(): CallConfig | null {
    return this.activeCallId !== null ? this.callConfigs.get(this.activeCallId) || null : null;
  }

  public switchActiveCall(callId: number): boolean {
    if (this.callConfigs.has(callId)) {
      this.activeCallId = callId;
      return true;
    }
    return false;
  }

  public isInitialized(): boolean {
    const rtcPeerConnectionAvailable = !!RTCPeerConnection;
    const mediaDevicesAvailable = !!mediaDevicesRN;
    
    console.log(`[WebRTC] Trạng thái khởi tạo: RTCPeerConnection=${rtcPeerConnectionAvailable}, mediaDevices=${mediaDevicesAvailable}, iceServers=${this.iceServersInitialized}`);
    
    return rtcPeerConnectionAvailable && mediaDevicesAvailable;
  }

  public async ensureLocalStream(mediaType: 'audio' | 'video' = 'audio'): Promise<MediaStream | null> {
    console.log('[WebRTC ensureLocalStream] Kiểm tra localStream:', 
      this.localStream ? {
        id: this.localStream.id,
        active: this.localStream.active,
        audioTracks: this.localStream.getAudioTracks().length,
        videoTracks: this.localStream.getVideoTracks().length
      } : 'null'
    );
    
    if (!this.localStream || !this.localStream.active) {
      console.log('[WebRTC ensureLocalStream] LocalStream không khả dụng, tạo mới...');
      try {
        await this.checkPermissions();
        
        const constraints: MediaStreamConstraints = { 
          audio: true, 
          video: mediaType === 'video'
        };
        
        console.log('[WebRTC ensureLocalStream] Gọi getUserMedia với:', constraints);
        this.localStream = await this.mediaStreamAdapter.getUserMedia(constraints);
        
        console.log('[WebRTC ensureLocalStream] Đã tạo localStream mới thành công:', {
          id: this.localStream.id,
          active: this.localStream.active,
          audioTracks: this.localStream.getAudioTracks().length,
          videoTracks: this.localStream.getVideoTracks().length
        });
        return this.localStream;
      } catch (error) {
        console.error('[WebRTC ensureLocalStream] Lỗi khi tạo localStream:', error);
        return null;
      }
    }
    
    console.log('[WebRTC ensureLocalStream] LocalStream đã khả dụng');
    return this.localStream;
  }
}

export default new WebRTCService();