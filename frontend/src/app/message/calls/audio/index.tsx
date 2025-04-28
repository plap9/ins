import React, { useState, useEffect } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, SafeAreaView, Dimensions, Alert, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useWebRTC } from '../../../context/WebRTCContext';
import { useAuth } from '../../../context/AuthContext';
import messageService from '../../../../services/messageService';

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

export default function AudioCallScreen() {
  const router = useRouter();
  const { id, callId } = useLocalSearchParams<{ id: string, callId: string }>();
  const { currentCall, toggleAudio, toggleVideo, endCall } = useWebRTC();
  const { authData } = useAuth();
  
  const [callState, setCallState] = useState<'connecting' | 'ringing' | 'connected' | 'ended'>('connecting');
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isSpeakerOn, setIsSpeakerOn] = useState(false);
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const fetchCallDetails = async () => {
      try {
        setIsLoading(true);
        
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
          const userDetails = await messageService.getUserDetails(parseInt(id));
          
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
      if (callState !== 'ended' && currentCall) {
        endCall();
      }
    };
  }, [id, callId, currentCall, authData]);

  useEffect(() => {
    if (currentCall) {
      const audioState = currentCall.participants.get(authData?.user?.user_id || 0)?.audioEnabled;
      if (audioState !== undefined) {
        setIsAudioEnabled(audioState);
      }
    }
  }, [currentCall]);

  const handleToggleAudio = () => {
    toggleAudio();
    setIsAudioEnabled(prev => !prev);
  };

  const handleToggleSpeaker = () => {
    setIsSpeakerOn(prev => !prev);
  };

  const handleEndCall = () => {
    if (currentCall) {
      endCall();
    } else if (callId) {
      messageService.endCall(parseInt(callId))
        .catch(error => console.error('Lỗi khi kết thúc cuộc gọi:', error));
    }
    
    setCallState('ended');
    setTimeout(() => {
      router.back();
    }, 1000);
  };

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
      
      <LinearGradient
        colors={['#121212', '#000000']}
        className="flex-1 justify-between items-center px-4 py-10"
      >
        {/* Phần trên - Thông tin người dùng */}
        <View className="items-center mt-10">
          <Image 
            source={{ uri: user.avatar }} 
            className="w-32 h-32 rounded-full mb-6"
          />
          
          <Text className="text-white text-2xl font-semibold mb-2">{user.username}</Text>
          
          <CallStatus 
            status={callState}
            callType="audio"
            isIncoming={false}
          />
          
          <View className="mt-4">
            <CallTimer 
              startTime={startTime}
              isConnected={callState === 'connected'}
              status={callState}
            />
          </View>
        </View>
        
        {/* Phần dưới - Điều khiển cuộc gọi */}
        <View className="w-full items-center">
          <CallControls 
            isAudioCall={true}
            isAudioEnabled={isAudioEnabled}
            isVideoEnabled={false}
            isSpeakerOn={isSpeakerOn}
            onToggleAudio={handleToggleAudio}
            onToggleVideo={() => {}}
            onToggleSpeaker={handleToggleSpeaker}
            onFlipCamera={() => {}}
            onEndCall={handleEndCall}
          />
        </View>
      </LinearGradient>
      
      {/* Thông báo cuộc gọi */}
      {callState === 'connecting' && (
        <View className="absolute bottom-32 left-0 right-0 items-center">
          <Text className="text-gray-500 text-xs">Đang kết nối...</Text>
        </View>
      )}
    </SafeAreaView>
  );
}
