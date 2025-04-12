import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
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
  };
  isOwn: boolean;
  showAvatar?: boolean;
  avatar?: string;
  onLongPress?: () => void;
  onReactionPress?: () => void;
  onMediaPress?: () => void;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  isOwn,
  showAvatar = false,
  avatar,
  onLongPress,
  onReactionPress,
  onMediaPress,
}) => {
  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

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

  const renderStatus = () => {
    if (!isOwn) return null;
    
    if (message.isRead) {
      return <Text className="text-blue-500 text-xs ml-1">Đã xem</Text>;
    } else if (message.isDelivered) {
      return <Text className="text-gray-400 text-xs ml-1">Đã gửi</Text>;
    } else if (message.isSent) {
      return <Text className="text-gray-400 text-xs ml-1">Đã gửi</Text>;
    }
    
    return <Text className="text-gray-400 text-xs ml-1">Đang gửi...</Text>;
  };

  return (
    <View className={`flex-row mb-3 max-w-[80%] ${isOwn ? 'self-end' : 'self-start'}`}>
      {!isOwn && showAvatar && (
        <View className="mr-2 mt-auto">
          <Image source={{ uri: avatar }} className="w-8 h-8 rounded-full" />
        </View>
      )}
      
      <View>
        <TouchableOpacity 
          onLongPress={onLongPress}
          className={`rounded-2xl p-3 ${
            isOwn 
              ? 'bg-[#0084ff]' 
              : 'bg-[#303030]'
          }`}
        >
          {renderMedia()}
          
          {message.content && (
            <Text className="text-white">{message.content}</Text>
          )}
        </TouchableOpacity>
        
        <View className={`flex-row items-center mt-1 ${isOwn ? 'justify-end' : 'justify-start'}`}>
          <Text className="text-gray-400 text-xs">{formatTime(message.timestamp)}</Text>
          {renderStatus()}
        </View>
      </View>
      
      <TouchableOpacity 
        onPress={onReactionPress}
        className="ml-2 self-end mb-6"
      >
        <Ionicons name="arrow-redo-outline" size={18} color="#8e8e8e" />
      </TouchableOpacity>
    </View>
  );
};

export default MessageBubble;
