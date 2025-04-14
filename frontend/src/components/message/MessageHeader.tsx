import React from 'react';
import { View, Text, Image, TouchableOpacity, Platform } from 'react-native';
import { useNavigation, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

interface MessageHeaderProps {
  user: {
    id: string;
    username: string;
    avatar: string;
    isOnline?: boolean;
    lastSeen?: string;
    isGroup?: boolean;
  };
}

const MessageHeader: React.FC<MessageHeaderProps> = ({ user }) => {
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
  
  return (
    <View className="flex-row items-center justify-between px-4 h-16 bg-black">
      <View className="flex-row items-center">
        <TouchableOpacity onPress={() => router.back()} className="mr-3">
          <Ionicons name="chevron-back" size={28} color="#FFFFFF" />
        </TouchableOpacity>
        
        <TouchableOpacity 
          className="flex-row items-center" 
          onPress={() => user.isGroup ? router.push('/group-info') : router.push(`/profile/${user.id}`)}
        >
          <Image 
            source={avatarSource} 
            className="w-10 h-10 rounded-full mr-3" 
          />
          
          <View>
            <Text className="text-white font-medium text-base">{user.username || 'Người dùng'}</Text>
            <Text className="text-gray-400 text-xs">
              {statusText}
            </Text>
          </View>
        </TouchableOpacity>
      </View>
      
      <View className="flex-row items-center space-x-4">
        {!user.isGroup && (
          <TouchableOpacity>
            <Ionicons name="call" size={22} color="#FFFFFF" />
          </TouchableOpacity>
        )}
        
        <TouchableOpacity>
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
