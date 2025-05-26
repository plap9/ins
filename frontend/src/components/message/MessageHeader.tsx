import React from 'react';
import { View, Text, Image, TouchableOpacity, Platform, Alert } from 'react-native';
import { useNavigation, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import 'react-native-webrtc';

const supportsVideoCall = true;

interface MessageHeaderProps {
  user: {
    id: string;
    username: string;
    avatar: string;
    isOnline?: boolean;
    lastSeen?: string;
    isGroup?: boolean;
  };
  isOnline?: boolean;
}

const MessageHeader: React.FC<MessageHeaderProps> = ({ user, isOnline: isNetworkOnline = true }) => {
  const router = useRouter();
  const navigation = useNavigation();
  
  const defaultAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(user.username)}&background=random`;
  
  const avatarSource = user.isGroup 
    ? { uri: 'https://ui-avatars.com/api/?name=Group&size=128&background=7558ff&color=fff' }
    : { uri: user.avatar || defaultAvatar };
  
  const statusText = user.isGroup 
    ? user.lastSeen 
    : user.isOnline 
      ? 'Đang hoạt động' 
      : user.lastSeen || 'Hoạt động gần đây';
  
  const handleAudioCall = () => {
    const params = {
      id: user.id,
      callType: 'audio',
      isIncoming: 'false'
    };
    router.push({
      pathname: '/message/calls/audio',
      params
    });
  };

  const handleVideoCall = () => {
    if (!supportsVideoCall) {
      Alert.alert('Thông báo', 'Tính năng gọi video chưa được hỗ trợ');
      return;
    }
    
    const params = {
      id: user.id,
      callType: 'video',
      isIncoming: 'false'
    };
    router.push({
      pathname: '/message/calls/video',
      params
    });
  };

  const handleGroupInfo = () => {
    router.push({
      pathname: '/message/group-info',
      params: { id: user.id }
    });
  };
  
  return (
    <View className="flex-row items-center justify-between px-4 h-16 bg-black">
      <View className="flex-row items-center">
        <TouchableOpacity onPress={() => router.back()} className="mr-3">
          <Ionicons name="chevron-back" size={28} color="#FFFFFF" />
        </TouchableOpacity>
        
        <TouchableOpacity 
          className="flex-row items-center" 
          onPress={() => user.isGroup ? handleGroupInfo() : router.push(`/profile/${user.id}`)}
        >
          <Image 
            source={avatarSource} 
            className="w-10 h-10 rounded-full mr-3" 
          />
          
          <View>
            <Text className="text-white font-medium text-base">{user.username || 'Người dùng'}</Text>
            <View className="flex-row items-center">
              <Text className="text-gray-400 text-xs">
                {statusText}
              </Text>
              {!isNetworkOnline && (
                <View className="flex-row items-center ml-2">
                  <View className="w-1.5 h-1.5 bg-red-500 rounded-full mr-1" />
                  <Text className="text-red-400 text-xs">Không có mạng</Text>
                </View>
              )}
            </View>
          </View>
        </TouchableOpacity>
      </View>
      
      <View className="flex-row items-center space-x-4">
        {!user.isGroup && (
          <TouchableOpacity onPress={handleAudioCall}>
            <Ionicons name="call" size={22} color="#FFFFFF" />
          </TouchableOpacity>
        )}
        
        <TouchableOpacity onPress={user.isGroup ? handleGroupInfo : handleVideoCall}>
          <Ionicons name={user.isGroup ? "people" : "videocam"} size={22} color="#FFFFFF" />
        </TouchableOpacity>
        
        <TouchableOpacity>
          <Ionicons name="ellipsis-vertical" size={22} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default MessageHeader;
