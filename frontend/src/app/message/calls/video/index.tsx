import React, { useState, useEffect, useRef } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, SafeAreaView, Dimensions, Alert, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { RTCView } from 'react-native-webrtc';
import { useWebRTC } from '../../../context/WebRTCContext';
import { useAuth } from '../../../context/AuthContext';
import messageService from '../../../../services/messageService';
import webRTCService from '../../../../services/webRTCService';

import CallControls from '../../../../components/message/CallControls';
import CallTimer from '../../../../components/message/CallTimer';
import CallStatus from '../../../../components/message/CallStatus';

const { width, height } = Dimensions.get('window');

interface User {
  id: number;
  username: string;
  avatar: string;
  isOnline: boolean;
}

export default function VideoCallScreen() {
  const router = useRouter();
  const { id, callId } = useLocalSearchParams<{ id: string, callId: string }>();
  const { currentCall, localStream, toggleAudio, toggleVideo, endCall } = useWebRTC();
  const { authData } = useAuth();
  
  const [callState, setCallState] = useState<'connecting' | 'ringing' | 'connected' | 'ended'>('connecting');
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const [isFrontCamera, setIsFrontCamera] = useState(true);
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [localStreamUrl, setLocalStreamUrl] = useState<string | null>(null);
  const [remoteStreamUrl, setRemoteStreamUrl] = useState<string | null>(null);

  useEffect(() => {
    const setupLocalStream = async () => {
      try {
        console.log('[Video Call] Bắt đầu khởi tạo localStream...');
        const stream = await webRTCService.ensureLocalStream('video');
        if (stream) {
          console.log('[Video Call] Đã khởi tạo localStream thành công:', {
            id: stream.id,
            active: stream.active,
            tracks: stream.getTracks().map(t => ({
              kind: t.kind,
              enabled: t.enabled,
              id: t.id
            }))
          });
          
          const streamUrl = (stream as any).toURL();
          console.log('[Video Call] Stream URL đầy đủ:', streamUrl, 'Kiểu dữ liệu:', typeof streamUrl);
          setLocalStreamUrl(streamUrl);
          console.log('[Video Call] Đã set localStreamUrl:', streamUrl);
        } else {
          console.error('[Video Call] Không thể khởi tạo localStream');
        }
      } catch (error) {
        console.error('[Video Call] Lỗi khi khởi tạo localStream:', error);
      }
    };
    
    setupLocalStream();
    
    const fetchCallDetails = async () => {
      try {
        setIsLoading(true);
        console.log('Tham số nhận được: id=', id, 'callId=', callId);
        
        if (currentCall) {
          const otherParticipantEntry = Array.from(currentCall.participants.entries())
            .find(([userId]) => userId !== authData?.user?.user_id);
          
          if (otherParticipantEntry) {
            const [userId, participant] = otherParticipantEntry;
            setUser({
              id: userId,
              username: participant.username || 'Người dùng',
              avatar: participant.profilePicture || 'https://ui-avatars.com/api/?name=User&background=random',
              isOnline: true
            });
            
            setCallState('connected');
            setStartTime(currentCall.startTime || new Date());
          }
        }
        else if (callId) {
          const callDetails = await messageService.getCallDetails(parseInt(callId));
          
          const otherParticipant = callDetails.participants.find(
            (p: { user_id: number }) => p.user_id !== authData?.user?.user_id
          );
          
          if (otherParticipant) {
            setUser({
              id: otherParticipant.user_id,
              username: otherParticipant.username || 'Người dùng',
              avatar: otherParticipant.profile_picture || 'https://ui-avatars.com/api/?name=User&background=random',
              isOnline: true
            });
          } else {
            setUser({
              id: callDetails.initiator_id,
              username: callDetails.initiator_name || 'Người dùng',
              avatar: callDetails.initiator_avatar || 'https://ui-avatars.com/api/?name=User&background=random',
              isOnline: true
            });
          }
          
          if (callDetails.status === 'ongoing') {
            setCallState('connected');
            setStartTime(new Date(callDetails.started_at || callDetails.created_at));
          } else if (callDetails.status === 'ended') {
            setCallState('ended');
            Alert.alert("Thông báo", "Cuộc gọi đã kết thúc");
            router.back();
          } else {
            setCallState('ringing');
            
            setTimeout(() => {
              setCallState('connected');
              setStartTime(new Date());
            }, 3000);
          }
        }
        else if (id) {
          console.log('Đang lấy thông tin người dùng với ID:', id);
          try {
            const userDetails = await messageService.getUserDetails(parseInt(id));
            console.log('Thông tin người dùng nhận được:', userDetails);
            
            if (userDetails && userDetails.user_id) {
              setUser({
                id: userDetails.user_id,
                username: userDetails.username || 'Người dùng',
                avatar: userDetails.profile_picture || 'https://ui-avatars.com/api/?name=User&background=random',
                isOnline: userDetails.is_online || false
              });
              
              if (!userDetails.is_online) {
                Alert.alert(
                  "Thông báo",
                  "Người dùng hiện không trực tuyến. Cuộc gọi sẽ tự động kết thúc sau 30 giây nếu không có phản hồi."
                );
                
                setTimeout(() => {
                  if (callState !== 'connected' && callState !== 'ended') {
                    setCallState('ended');
                    Alert.alert("Thông báo", "Người dùng không phản hồi cuộc gọi.");
                    router.back();
                  }
                }, 30000);
              }
              
              setCallState('ringing');
            } else {
              setError("Dữ liệu người dùng không hợp lệ");
              console.error('Dữ liệu người dùng không hợp lệ:', userDetails);
            }
          } catch (userError) {
            console.error('Lỗi khi lấy thông tin người dùng:', userError);
            setError('Không thể tải thông tin người dùng');
          }
        } else {
          setError("Không có thông tin cuộc gọi");
        }
      } catch (error) {
        console.error('Lỗi khi lấy thông tin cuộc gọi:', error);
        setError('Không thể tải thông tin cuộc gọi');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchCallDetails();
    
    return () => {
      console.log('[Video Call] Cleanup effect, giải phóng tài nguyên');
      if (currentCall) {
        console.log('[Video Call] Kết thúc cuộc gọi và giải phóng tài nguyên');
        endCall();
      } else {
        const stream = webRTCService.getLocalStream();
        if (stream) {
          console.log('[Video Call] Không có cuộc gọi nhưng có localStream, dọn dẹp kết nối');
          
          console.log('[Video Call] Dừng tất cả các track media');
          stream.getTracks().forEach(track => {
            console.log(`[Video Call] Dừng track ${track.kind} (${track.id})`);
            track.stop();
          });
          
          console.log('[Video Call] Gọi webRTCService.endCall() để dọn dẹp tài nguyên');
          webRTCService.endCall()
            .catch(err => console.error('[Video Call] Lỗi khi dọn dẹp:', err))
            .finally(() => {
              console.log('[Video Call] Hoàn tất dọn dẹp tài nguyên, quay lại');
              setLocalStreamUrl(null);
              router.back();
            });
        } else {
          console.log('[Video Call] Không tìm thấy localStream, quay lại');
          router.back();
        }
      }
    };
  }, [id, callId, currentCall, authData]);

  useEffect(() => {
    if (!currentCall) return;
    
    const checkStreams = () => {
      if (localStream) {
        console.log('[Video Call] Local stream đã tồn tại:', { 
          id: localStream.id, 
          active: localStream.active,
          tracks: localStream.getTracks().map(t => ({
            kind: t.kind,
            enabled: t.enabled,
            id: t.id
          }))
        });
        setLocalStreamUrl((localStream as any).toURL());
        console.log('[Video Call] Đã set localStreamUrl:', (localStream as any).toURL());
      } else {
        console.log('[Video Call] localStream chưa tồn tại');
      }
      
      const otherParticipantEntry = Array.from(currentCall.participants.entries())
        .find(([userId]) => userId !== authData?.user?.user_id);
      
      if (otherParticipantEntry) {
        const [userId, participant] = otherParticipantEntry;
        if (participant.remoteStream) {
          console.log('[Video Call] Remote stream đã tồn tại cho user:', userId);
          setRemoteStreamUrl((participant.remoteStream as any).toURL());
          console.log('[Video Call] Đã set remoteStreamUrl:', (participant.remoteStream as any).toURL());
        } else {
          console.log('[Video Call] Chưa có remote stream cho user:', userId);
        }
      } else {
        console.log('[Video Call] Không tìm thấy người tham gia khác trong cuộc gọi');
      }
    };
    
    console.log('[Video Call] Khởi tạo kiểm tra streams');
    checkStreams();
    const interval = setInterval(checkStreams, 2000);
    
    return () => clearInterval(interval);
  }, [currentCall, authData, localStream]);

  useEffect(() => {
    console.log('[Video Call] Kiểm tra RTCView có tồn tại:', !!RTCView);
  }, []);

  useEffect(() => {
    if (currentCall) {
      const currentUser = currentCall.participants.get(authData?.user?.user_id || 0);
      if (currentUser) {
        setIsAudioEnabled(currentUser.audioEnabled);
        setIsVideoEnabled(currentUser.videoEnabled);
      }
    }
  }, [currentCall]);

  useEffect(() => {
    console.log('[Video Call] Component mounted, isFrontCamera:', isFrontCamera);
  }, []);

  useEffect(() => {
    console.log('[Video Call] Camera state changed to:', isFrontCamera ? 'Trước' : 'Sau');
  }, [isFrontCamera]);

  const handleToggleAudio = () => {
    console.log('[Video Call] Bắt đầu toggle audio, trạng thái hiện tại:', isAudioEnabled);
    toggleAudio();
    setIsAudioEnabled(prev => !prev);
    console.log('[Video Call] Sau khi toggle audio, trạng thái mới:', !isAudioEnabled);
  };

  const handleToggleVideo = () => {
    console.log('[Video Call] Bắt đầu toggle video, trạng thái hiện tại:', isVideoEnabled);
    toggleVideo();
    setIsVideoEnabled(prev => !prev);
    console.log('[Video Call] Sau khi toggle video, trạng thái mới:', !isVideoEnabled);
  };

  const handleToggleSpeaker = () => {
    console.log('[Video Call] Bắt đầu toggle speaker, trạng thái hiện tại:', isSpeakerOn);
    setIsSpeakerOn(prev => !prev);
    console.log('[Video Call] Sau khi toggle speaker, trạng thái mới:', !isSpeakerOn);
  };

  const handleFlipCamera = () => {
    console.log('[Video Call] Bắt đầu đổi camera từ:', isFrontCamera ? 'Trước' : 'Sau', 'sang:', !isFrontCamera ? 'Trước' : 'Sau');
    
    try {
      const result = webRTCService.switchCamera();
      if (result) {
        console.log('[Video Call] Đã chuyển đổi camera thành công qua webRTCService');
        setIsFrontCamera(prev => !prev);
      } else {
        console.warn('[Video Call] Không thể chuyển đổi camera qua webRTCService, thử phương pháp thay thế');
        
        const currentStream = webRTCService.getLocalStream();
        if (currentStream) {
          const videoTracks = currentStream.getVideoTracks();
          if (videoTracks && videoTracks.length > 0) {
            try {
              const track = videoTracks[0] as any;
              if (track && typeof track._switchCamera === 'function') {
                track._switchCamera();
                console.log('[Video Call] Đã chuyển đổi camera thành công qua _switchCamera');
                setIsFrontCamera(prev => !prev);
              } else {
                console.error('[Video Call] Không tìm thấy phương thức _switchCamera trên track');
                Alert.alert("Thông báo", "Không thể chuyển đổi camera, vui lòng thử lại sau.");
              }
            } catch (trackError) {
              console.error('[Video Call] Lỗi khi truy cập video track:', trackError);
              Alert.alert("Thông báo", "Không thể chuyển đổi camera, vui lòng thử lại sau.");
            }
          } else {
            console.error('[Video Call] Không tìm thấy video track trong stream');
            Alert.alert("Thông báo", "Không tìm thấy camera, vui lòng kiểm tra quyền truy cập và thử lại.");
          }
        } else {
          console.error('[Video Call] Không tìm thấy localStream');
          Alert.alert("Thông báo", "Không thể truy cập camera, vui lòng thử lại sau.");
        }
      }
    } catch (error) {
      console.error('[Video Call] Lỗi khi chuyển đổi camera:', error);
      Alert.alert("Thông báo", "Đã xảy ra lỗi khi chuyển đổi camera, vui lòng thử lại sau.");
    }
  };

  const handleEndCall = () => {
    console.log('[Video Call] Người dùng kết thúc cuộc gọi');
    
    if (currentCall) {
      console.log('[Video Call] Có currentCall, gọi endCall()');
      endCall();
    } else if (callId) {
      console.log('[Video Call] Có callId, gọi messageService.endCall()');
      messageService.endCall(parseInt(callId))
        .catch(error => console.error('Lỗi khi kết thúc cuộc gọi:', error));
    } else {
      console.log('[Video Call] Không có currentCall/callId, dừng localStream');
      const stream = webRTCService.getLocalStream();
      if (stream) {
        console.log('[Video Call] Dừng tất cả các track media');
        stream.getTracks().forEach(track => {
          console.log(`[Video Call] Dừng track ${track.kind} (${track.id})`);
          track.stop();
        });
      }
    }
    
    setCallState('ended');
    setTimeout(() => {
      console.log('[Video Call] Quay lại sau khi kết thúc cuộc gọi');
      router.back();
    }, 1000);
  };

  const handleToggleFullscreen = () => {
    setIsFullscreen(prev => !prev);
  };

  const logRenderState = () => {
    console.log('[Video Call] RENDER - Trạng thái:', {
      RTCView: !!RTCView,
      localStreamUrl: !!localStreamUrl,
      remoteStreamUrl: !!remoteStreamUrl,
      isVideoEnabled,
      isAudioEnabled,
      callState,
      isFrontCamera
    });
  };

  const logRemoteVideo = () => {
    console.log('[Video Call] Hiển thị remote video:', {
      hasRTCView: !!RTCView,
      hasRemoteStreamUrl: !!remoteStreamUrl,
      remoteStreamUrl: remoteStreamUrl || 'N/A'
    });
  };

  const logCallStatus = () => {
    console.log('[Video Call] Hiển thị trạng thái cuộc gọi:', callState);
  };

  const logLocalVideo = () => {
    console.log('[Video Call] Thông tin localStreamUrl:', {
      hasRTCView: !!RTCView,
      hasLocalStreamUrl: !!localStreamUrl,
      videoEnabled: isVideoEnabled,
      url: localStreamUrl || 'N/A',
      urlType: typeof localStreamUrl,
      RTCViewType: typeof RTCView
    });
  };

  useEffect(() => {
    logRenderState();
  });

  useEffect(() => {
    if (callState === 'connected' && isVideoEnabled && RTCView && remoteStreamUrl) {
      logRemoteVideo();
    }
  }, [callState, isVideoEnabled, RTCView, remoteStreamUrl]);

  useEffect(() => {
    logCallStatus();
  }, [callState]);

  useEffect(() => {
    if (callState === 'connected' && RTCView && localStreamUrl) {
      logLocalVideo();
    }
  }, [callState, RTCView, localStreamUrl, isVideoEnabled]);

  useEffect(() => {
    if (localStreamUrl) {
      console.log('[Video Call] localStreamUrl đã cập nhật:', {
        value: localStreamUrl,
        type: typeof localStreamUrl,
        length: localStreamUrl.length
      });
    }
  }, [localStreamUrl]);

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-black">
        <StatusBar style="light" />
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#0095f6" />
        </View>
      </SafeAreaView>
    );
  }

  if (error || !user) {
    return (
      <SafeAreaView className="flex-1 bg-black">
        <StatusBar style="light" />
        <View className="flex-1 justify-center items-center p-4">
          <Ionicons name="alert-circle-outline" size={60} color="#ff3b30" />
          <Text className="text-white text-lg mt-4 text-center">{error || "Không có thông tin người dùng"}</Text>
          <TouchableOpacity 
            className="mt-6 bg-red-500 px-6 py-3 rounded-full"
            onPress={() => router.back()}
          >
            <Text className="text-white font-medium">Quay lại</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-black">
      <StatusBar style="light" />
      
      <View className="flex-1">
        {/* Màn hình chính - Hiển thị video của người được gọi khi đã connected, hoặc camera của người gọi khi chưa connected */}
        <View className="flex-1 justify-center items-center">
          {callState === 'connected' && isVideoEnabled ? (
            <>
              {RTCView && remoteStreamUrl ? (
                <RTCView
                  streamURL={remoteStreamUrl}
                  style={{ width: '100%', height: '100%' }}
                  objectFit="cover"
                  zOrder={1}
                />
              ) : (
                <Image 
                  source={{ uri: user.avatar }} 
                  className="absolute inset-0 w-full h-full"
                  resizeMode="cover"
                />
              )}
            </>
          ) : (
            <>
              {RTCView && localStreamUrl && isVideoEnabled ? (
                <RTCView
                  streamURL={localStreamUrl}
                  style={{ width: '100%', height: '100%', backgroundColor: 'black' }}
                  objectFit="cover"
                  mirror={isFrontCamera}
                  zOrder={1}
                />
              ) : (
                <View className="flex-1 justify-center items-center w-full">
                  <Image 
                    source={{ uri: user.avatar }} 
                    className="w-32 h-32 rounded-full mb-6"
                  />
                  
                  <Text className="text-white text-2xl font-semibold mb-2">{user.username}</Text>
                  
                  <CallStatus 
                    status={callState}
                    callType="video"
                    isIncoming={false}
                  />
                </View>
              )}
            </>
          )}
          
          {/* Overlay cho các điều khiển */}
          <LinearGradient
            colors={['rgba(0,0,0,0.7)', 'transparent', 'transparent', 'rgba(0,0,0,0.7)']}
            className="absolute inset-0"
            locations={[0, 0.2, 0.8, 1]}
          />
          
          {/* Phần trên - Thông tin cuộc gọi */}
          <View className="absolute top-4 left-0 right-0 items-center">
            <CallTimer 
              startTime={startTime}
              isConnected={callState === 'connected'}
              status={callState}
            />
          </View>
          
          {/* Video góc nhỏ - Hiển thị avatar của người được gọi khi chưa kết nối, hoặc video của người gọi khi đã kết nối */}
          {(callState === 'connected' || callState === 'ringing') && (
            <TouchableOpacity 
              onPress={handleToggleFullscreen}
              className="absolute top-16 right-4 rounded-lg overflow-hidden border-2 border-white"
              style={{ width: width / 4, height: height / 6, backgroundColor: 'black' }}
            >
              {callState === 'connected' && RTCView && localStreamUrl && isVideoEnabled ? (
                <View style={{ width: '100%', height: '100%', backgroundColor: 'black' }}>
                  <RTCView
                    streamURL={localStreamUrl}
                    style={{ 
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: '100%',
                      backgroundColor: 'black'
                    }}
                    objectFit="cover"
                    mirror={isFrontCamera}
                    zOrder={2}
                  />
                  
                  {/* View debug để xem localStreamUrl có hoạt động không */}
                  <View style={{ position: 'absolute', top: 2, left: 2, backgroundColor: 'rgba(0,0,0,0.5)', padding: 2, borderRadius: 4 }}>
                    <Text style={{ color: 'lime', fontSize: 7 }}>
                      URL: {localStreamUrl ? localStreamUrl.substring(0, 8) + '...' : 'N/A'}
                    </Text>
                  </View>
                </View>
              ) : (
                // Khi chưa kết nối, hiển thị avatar của người được gọi ở góc nhỏ
                <Image 
                  source={{ uri: user.avatar }}
                  className="w-full h-full"
                  resizeMode="cover"
                />
              )}
              
              {callState === 'connected' && !isVideoEnabled && (
                <View className="absolute inset-0 bg-black/70 justify-center items-center">
                  <Ionicons name="videocam-off" size={24} color="white" />
                </View>
              )}
              
              {callState === 'connected' && !isAudioEnabled && (
                <View className="absolute bottom-2 right-2 bg-red-500 rounded-full p-1">
                  <Ionicons name="mic-off" size={12} color="white" />
                </View>
              )}
            </TouchableOpacity>
          )}
          
          
          {/* Phần dưới - Điều khiển cuộc gọi */}
          <View className="absolute bottom-8 left-0 right-0 items-center">
            <CallControls 
              isAudioCall={false}
              isAudioEnabled={isAudioEnabled}
              isVideoEnabled={isVideoEnabled}
              isSpeakerOn={isSpeakerOn}
              onToggleAudio={handleToggleAudio}
              onToggleVideo={handleToggleVideo}
              onToggleSpeaker={handleToggleSpeaker}
              onFlipCamera={handleFlipCamera}
              onEndCall={handleEndCall}
            />
          </View>
          
          {/* Nút hiệu ứng */}
          <TouchableOpacity 
            className="absolute bottom-32 right-4 w-10 h-10 rounded-full bg-[#303030] justify-center items-center"
          >
            <Ionicons name="sparkles" size={24} color="white" />
          </TouchableOpacity>
        </View>
      </View>
      
      {/* Thông báo trạng thái */}
      {callState === 'ringing' && (
        <View className="absolute bottom-32 left-0 right-0 items-center">
          <Text className="text-gray-500 text-xs">Đang đổ chuông...</Text>
        </View>
      )}
      
      {callState === 'connecting' && (
        <View className="absolute bottom-32 left-0 right-0 items-center">
          <Text className="text-gray-500 text-xs">Đang kết nối...</Text>
        </View>
      )}
    </SafeAreaView>
  );
}
