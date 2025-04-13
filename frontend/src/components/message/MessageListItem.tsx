import React from 'react';
import { View, Text, TouchableOpacity, Image } from 'react-native';
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
      return 'Đã gửi một video';
    } else if (conversation.mediaType === 'audio') {
      return 'Đã gửi một tin nhắn thoại';
    } else if (conversation.mediaType === 'file') {
      return 'Đã gửi một tệp đính kèm';
    }
    
    return conversation.lastMessage || 'Chưa có tin nhắn';
  };

  return (
    <TouchableOpacity
      onPress={() => {
        if (conversation.id) {
          onPress(conversation.id);
        } else {
          console.log("Không thể ấn vào cuộc trò chuyện vì ID không tồn tại hoặc rỗng");
        }
      }}
      className="flex-row items-center justify-between px-5 py-3"
    >
      <View className="flex-row items-center flex-1">
        <View className="relative mr-4">
          <Image 
            source={{ uri: conversation.avatar }} 
            className="w-14 h-14 rounded-full"
          />
          {conversation.isOnline && (
            <View className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border border-black"></View>
          )}
        </View>
        
        <View className="flex-1">
          <Text className="text-white font-medium text-base">{conversation.username}</Text>
          <View className="flex-row items-center">
            <Text 
              className={`${conversation.isRead ? 'text-gray-500' : 'text-gray-400'} text-sm`}
              numberOfLines={1}
            >
              {formatLastMessage()}
              {!conversation.isRead ? null : <Text className="text-gray-500"> · {conversation.timestamp}</Text>}
            </Text>
          </View>
        </View>
      </View>
      
      <TouchableOpacity className="ml-3">
        <Ionicons name="camera-outline" size={24} color="#8e8e8e" />
      </TouchableOpacity>
    </TouchableOpacity>
  );
};

export default MessageListItem;
