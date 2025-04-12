import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

interface MessageHeaderProps {
  username: string;
  avatar: string;
  userId: string;
  isOnline?: boolean;
  lastSeen?: string;
  showCallButtons?: boolean;
}

const MessageHeader: React.FC<MessageHeaderProps> = ({
  username,
  avatar,
  userId,
  isOnline = false,
  lastSeen,
  showCallButtons = true,
}) => {
  const router = useRouter();

  const handleGoBack = () => {
    router.back();
  };

  const handleUserProfile = () => {
    router.push(`/profile/${userId}`);
  };

  const handleAudioCall = () => {
    // Xử lý cuộc gọi âm thanh
  };

  const handleVideoCall = () => {
    // Xử lý cuộc gọi video
  };

  return (
    <View className="flex-row items-center justify-between px-4 py-2 bg-black border-b border-gray-800">
      <View className="flex-row items-center">
        <TouchableOpacity onPress={handleGoBack} className="mr-3">
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        
        <TouchableOpacity 
          onPress={handleUserProfile}
          className="flex-row items-center"
        >
          <Image 
            source={{ uri: avatar }} 
            className="w-9 h-9 rounded-full mr-3"
          />
          
          <View>
            <View className="flex-row items-center">
              <Text className="text-white font-semibold text-base">{username}</Text>
              {userId.includes('_') && (
                <Text className="text-gray-400 text-xs ml-2">_{userId.split('_')[1]}</Text>
              )}
            </View>
            
            {isOnline ? (
              <Text className="text-gray-400 text-xs">Đang hoạt động</Text>
            ) : lastSeen ? (
              <Text className="text-gray-400 text-xs">{lastSeen}</Text>
            ) : null}
          </View>
        </TouchableOpacity>
      </View>
      
      {showCallButtons && (
        <View className="flex-row">
          <TouchableOpacity 
            onPress={handleAudioCall}
            className="mr-5"
          >
            <Ionicons name="call-outline" size={24} color="white" />
          </TouchableOpacity>
          
          <TouchableOpacity onPress={handleVideoCall}>
            <Ionicons name="videocam-outline" size={24} color="white" />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

export default MessageHeader;
