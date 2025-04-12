import React from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

interface MessageListItemProps {
  conversation: {
    id: string;
    username: string;
    avatar: string;
    lastMessage: string;
    timestamp: string;
    isRead: boolean;
    isOnline: boolean;
    isSent: boolean;
    isDelivered: boolean;
    isGroup: boolean;
    hasStory: boolean;
    isTyping: boolean;
    mediaType?: 'image' | 'video' | 'audio' | 'file';
  };
  onPress: (id: string) => void;
}

const MessageListItem: React.FC<MessageListItemProps> = ({
  conversation,
  onPress,
}) => {
  const formatLastMessage = () => {
    if (conversation.isTyping) {
      return 'Đang nhập...';
    }
    
    if (conversation.mediaType === 'image') {
      return 'Đã gửi một hình ảnh';
    } else if (conversation.mediaType === 'video') {
      return conversation.lastMessage;
    } else if (conversation.mediaType === 'audio') {
      return 'Đã gửi một tin nhắn thoại';
    } else if (conversation.mediaType === 'file') {
      return 'Đã gửi một tệp đính kèm';
    }
    
    return conversation.lastMessage;
  };

  return (
    <TouchableOpacity
      onPress={() => {
        if (conversation.id) {
          onPress(conversation.id);
        }
      }}
      className="flex-row items-center px-4 py-3"
    >
      <View className="relative mr-3">
        <Image 
          source={{ uri: conversation.avatar }} 
          className={`w-14 h-14 rounded-full ${conversation.hasStory ? 'border-2 border-pink-500' : ''}`}
        />
        {conversation.isOnline && (
          <View className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-black"></View>
        )}
      </View>
      
      <View className="flex-1">
        <View className="flex-row justify-between items-center">
          <Text className="text-white font-semibold">{conversation.username}</Text>
          <Text className="text-gray-400 text-xs">{conversation.timestamp}</Text>
        </View>
        
        <View className="flex-row justify-between items-center mt-1">
          <Text 
            className={`${conversation.isRead ? 'text-gray-400' : 'text-white'} text-sm`}
            numberOfLines={1}
          >
            {formatLastMessage()}
          </Text>
          
          {!conversation.isRead && (
            <View className="w-2.5 h-2.5 rounded-full bg-blue-500"></View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
};

export default MessageListItem;
