import React, { useState, useEffect } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, SafeAreaView, Dimensions } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import CallControls from '../../../../components/message/CallControls';
import CallTimer from '../../../../components/message/CallTimer';
import CallStatus from '../../../../components/message/CallStatus';

const { width, height } = Dimensions.get('window');

export default function AudioCallScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  
  const [callState, setCallState] = useState<'connecting' | 'ringing' | 'connected' | 'ended'>('ringing');
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isSpeakerOn, setIsSpeakerOn] = useState(false);
  const [startTime, setStartTime] = useState<Date | null>(null);
  
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

  const handleToggleSpeaker = () => {
    setIsSpeakerOn(prev => !prev);
  };

  const handleEndCall = () => {
    setCallState('ended');
    
    // Giả lập kết thúc cuộc gọi
    setTimeout(() => {
      router.back();
    }, 1000);
  };

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
      {callState === 'connected' && (
        <View className="absolute bottom-32 left-0 right-0 items-center">
          <Text className="text-gray-500 text-xs">Đang liên hệ...</Text>
        </View>
      )}
    </SafeAreaView>
  );
}
