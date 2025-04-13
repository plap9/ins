import React from 'react';
import { View, Text, Image, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface MessageBubbleProps {
  message: {
    id: string;
    content: string;
    timestamp: string;
    isRead: boolean;
    isSent: boolean;
    isDelivered: boolean;
    type: 'text' | 'image' | 'video';
    mediaUrl?: string;
    senderId?: string;
    senderName?: string;
  };
  isOwn: boolean;
  showAvatar?: boolean;
  avatar?: string;
  isGroup?: boolean;
  onLongPress?: () => void;
  onMediaPress?: () => void;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  isOwn,
  showAvatar = false,
  avatar,
  isGroup = false,
  onLongPress,
  onMediaPress,
}) => {
  const defaultAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(message.senderName || 'User')}&background=random`;
  
  const avatarSource = { uri: avatar || defaultAvatar };

  const renderMedia = () => {
    if (message.type === 'image' && message.mediaUrl) {
      return (
        <TouchableOpacity onPress={onMediaPress} className="rounded-2xl overflow-hidden mb-1">
          <Image 
            source={{ uri: message.mediaUrl }} 
            className="w-60 h-60 rounded-2xl"
            resizeMode="cover"
          />
        </TouchableOpacity>
      );
    } else if (message.type === 'video' && message.mediaUrl) {
      return (
        <TouchableOpacity onPress={onMediaPress} className="rounded-2xl overflow-hidden mb-1 relative">
          <Image 
            source={{ uri: message.mediaUrl }} 
            className="w-60 h-60 rounded-2xl"
            resizeMode="cover"
          />
          <View className="absolute inset-0 flex items-center justify-center">
            <View className="bg-black/50 rounded-full p-2">
              <Ionicons name="play" size={24} color="white" />
            </View>
          </View>
        </TouchableOpacity>
      );
    }
    return null;
  };

  return (
    <View className={`flex-row mb-3 max-w-[80%] ${isOwn ? 'self-end ml-auto' : 'self-start'}`}>
      {!isOwn && showAvatar && (
        <View className="mr-2 mt-auto">
          <Image 
            source={avatarSource} 
            className="w-9 h-9 rounded-full" 
          />
        </View>
      )}
      
      <View>
        {isGroup && !isOwn && message.senderName && (
          <Text className="text-gray-400 text-xs mb-1 ml-2">{message.senderName}</Text>
        )}
        
        <TouchableOpacity 
          onLongPress={onLongPress}
          className={`rounded-3xl px-4 py-2.5 ${
            isOwn 
              ? 'bg-[#ba00ff]' 
              : 'bg-[#303030]'
          }`}
        >
          {renderMedia()}
          
          {message.content && (
            <Text className="text-white text-base">{message.content}</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default MessageBubble;
