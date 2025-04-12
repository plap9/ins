import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface IncomingCallProps {
  caller: {
    id: string;
    username: string;
    avatar: string;
  };
  callType: 'audio' | 'video';
  onAccept: () => void;
  onReject: () => void;
}

const IncomingCall: React.FC<IncomingCallProps> = ({
  caller,
  callType,
  onAccept,
  onReject,
}) => {
  const [ringingTime, setRingingTime] = useState(0);
  
  // Đếm thời gian đổ chuông
  useEffect(() => {
    const interval = setInterval(() => {
      setRingingTime(prev => prev + 1);
    }, 1000);
    
    return () => clearInterval(interval);
  }, []);
  
  // Tự động từ chối sau 30 giây
  useEffect(() => {
    if (ringingTime >= 30) {
      onReject();
    }
  }, [ringingTime, onReject]);

  return (
    <View className="flex-1 bg-black justify-between items-center p-6">
      <View className="flex-1 justify-center items-center">
        <Image 
          source={{ uri: caller.avatar }} 
          className="w-24 h-24 rounded-full mb-6"
        />
        
        <Text className="text-white text-2xl font-semibold mb-2">{caller.username}</Text>
        
        <Text className="text-gray-400 text-base mb-4">
          {callType === 'audio' ? 'Cuộc gọi thoại đến' : 'Cuộc gọi video đến'}
        </Text>
      </View>
      
      <View className="w-full flex-row justify-around mb-10">
        <TouchableOpacity 
          onPress={onReject}
          className="items-center"
        >
          <View className="w-16 h-16 rounded-full bg-red-600 justify-center items-center mb-2">
            <Ionicons name="close" size={32} color="white" />
          </View>
          <Text className="text-white">Từ chối</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          onPress={onAccept}
          className="items-center"
        >
          <View className="w-16 h-16 rounded-full bg-green-600 justify-center items-center mb-2">
            {callType === 'audio' ? (
              <Ionicons name="call" size={32} color="white" />
            ) : (
              <Ionicons name="videocam" size={32} color="white" />
            )}
          </View>
          <Text className="text-white">Chấp nhận</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default IncomingCall;
