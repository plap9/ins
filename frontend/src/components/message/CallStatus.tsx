import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface CallStatusProps {
  status: 'connecting' | 'ringing' | 'connected' | 'ended' | 'missed' | 'rejected';
  isIncoming?: boolean;
  callType: 'audio' | 'video';
}

const CallStatus: React.FC<CallStatusProps> = ({
  status,
  isIncoming = false,
  callType,
}) => {
  const getStatusText = () => {
    switch (status) {
      case 'connecting':
        return 'Đang kết nối...';
      case 'ringing':
        return isIncoming ? 'Đang gọi đến...' : 'Đang đổ chuông...';
      case 'connected':
        return callType === 'audio' ? 'Cuộc gọi thoại đã bắt đầu' : 'Cuộc gọi video đã bắt đầu';
      case 'ended':
        return 'Cuộc gọi đã kết thúc';
      case 'missed':
        return isIncoming ? 'Cuộc gọi nhỡ' : 'Không trả lời';
      case 'rejected':
        return isIncoming ? 'Cuộc gọi bị từ chối' : 'Đã từ chối cuộc gọi';
      default:
        return '';
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'connecting':
        return <Ionicons name="sync" size={24} color="#8e8e8e" />;
      case 'ringing':
        return callType === 'audio' 
          ? <Ionicons name="call" size={24} color="#8e8e8e" />
          : <Ionicons name="videocam" size={24} color="#8e8e8e" />;
      case 'connected':
        return callType === 'audio' 
          ? <Ionicons name="call" size={24} color="#0095f6" />
          : <Ionicons name="videocam" size={24} color="#0095f6" />;
      case 'ended':
        return <Ionicons name="call" size={24} color="#8e8e8e" />;
      case 'missed':
        return <Ionicons name="call" size={24} color="red" />;
      case 'rejected':
        return <Ionicons name="call-outline" size={24} color="red" />;
      default:
        return null;
    }
  };

  return (
    <View className="flex-row items-center justify-center">
      <View className="mr-2">
        {getStatusIcon()}
      </View>
      <Text className={`text-base ${status === 'connected' ? 'text-white' : 'text-gray-400'}`}>
        {getStatusText()}
      </Text>
    </View>
  );
};

export default CallStatus;
