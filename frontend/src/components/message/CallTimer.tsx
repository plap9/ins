import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface CallTimerProps {
  startTime: Date | null;
  isConnected: boolean;
  status?: 'connecting' | 'ringing' | 'connected' | 'ended';
}

const CallTimer: React.FC<CallTimerProps> = ({
  startTime,
  isConnected,
  status = 'connected',
}) => {
  const [duration, setDuration] = useState('00:00');
  
  useEffect(() => {
    if (!startTime || !isConnected) {
      setDuration('00:00');
      return;
    }
    
    const intervalId = setInterval(() => {
      const now = new Date();
      const diffInSeconds = Math.floor((now.getTime() - startTime.getTime()) / 1000);
      
      const minutes = Math.floor(diffInSeconds / 60);
      const seconds = diffInSeconds % 60;
      
      const formattedMinutes = minutes < 10 ? `0${minutes}` : `${minutes}`;
      const formattedSeconds = seconds < 10 ? `0${seconds}` : `${seconds}`;
      
      setDuration(`${formattedMinutes}:${formattedSeconds}`);
    }, 1000);
    
    return () => clearInterval(intervalId);
  }, [startTime, isConnected]);
  
  const renderStatus = () => {
    switch (status) {
      case 'connecting':
        return <Text className="text-gray-400 text-base">Đang kết nối...</Text>;
      case 'ringing':
        return <Text className="text-gray-400 text-base">Đang đổ chuông...</Text>;
      case 'connected':
        return <Text className="text-white text-base">{duration}</Text>;
      case 'ended':
        return <Text className="text-gray-400 text-base">Cuộc gọi đã kết thúc</Text>;
      default:
        return null;
    }
  };
  
  return (
    <View className="items-center">
      {renderStatus()}
    </View>
  );
};

export default CallTimer;
