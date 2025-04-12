import React, { useState, useEffect, useRef } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, SafeAreaView, Dimensions } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import CallControls from '../../../../components/message/CallControls';
import CallTimer from '../../../../components/message/CallTimer';
import CallStatus from '../../../../components/message/CallStatus';

const { width, height } = Dimensions.get('window');

export default function VideoCallScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  
  const [callState, setCallState] = useState<'connecting' | 'ringing' | 'connected' | 'ended'>('ringing');
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const [isFrontCamera, setIsFrontCamera] = useState(true);
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  // Giả lập dữ liệu người dùng
  const [user, setUser] = useState({
    id: '1',
    username: 'Timmy Doan',
    avatar: 'https://randomuser.me/api/portraits/men/32.jpg',
    isOnline: true,
  });

  // Giả lập kết nối cuộc gọi
  useEffect(() => {
    const timer = setTimeout(() => {
      setCallState('connected');
      setStartTime(new Date());
    }, 3000);
    
    return () => clearTimeout(timer);
  }, []);

  const handleToggleAudio = () => {
    setIsAudioEnabled(prev => !prev);
  };

  const handleToggleVideo = () => {
    setIsVideoEnabled(prev => !prev);
  };

  const handleToggleSpeaker = () => {
    setIsSpeakerOn(prev => !prev);
  };

  const handleFlipCamera = () => {
    setIsFrontCamera(prev => !prev);
  };

  const handleEndCall = () => {
    setCallState('ended');
    
    // Giả lập kết thúc cuộc gọi
    setTimeout(() => {
      router.back();
    }, 1000);
  };

  const handleToggleFullscreen = () => {
    setIsFullscreen(prev => !prev);
  };

  return (
    <SafeAreaView className="flex-1 bg-black">
      <StatusBar style="light" />
      
      <View className="flex-1">
        {/* Màn hình chính - Video của người khác */}
        <View className="flex-1 justify-center items-center">
          {callState === 'connected' && isVideoEnabled ? (
            <Image 
              source={{ uri: 'https://randomuser.me/api/portraits/men/32.jpg' }} 
              className="absolute inset-0 w-full h-full"
              resizeMode="cover"
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
          
          {/* Video của mình (nhỏ) */}
          {callState === 'connected' && (
            <TouchableOpacity 
              onPress={handleToggleFullscreen}
              className="absolute top-16 right-4 rounded-lg overflow-hidden border-2 border-white"
              style={{ width: width / 4, height: height / 6 }}
            >
              <Image 
                source={{ uri: 'https://randomuser.me/api/portraits/men/33.jpg' }} 
                className="w-full h-full"
                resizeMode="cover"
              />
              
              {!isVideoEnabled && (
                <View className="absolute inset-0 bg-black/70 justify-center items-center">
                  <Ionicons name="videocam-off" size={24} color="white" />
                </View>
              )}
              
              {!isAudioEnabled && (
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
      
      {/* Thông báo "Đang đổ chuông..." */}
      {callState === 'ringing' && (
        <View className="absolute bottom-32 left-0 right-0 items-center">
          <Text className="text-gray-500 text-xs">Đang đổ chuông...</Text>
        </View>
      )}
    </SafeAreaView>
  );
}
