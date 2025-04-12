import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface MessageReactionProps {
  reactions?: {
    emoji: string;
    count: number;
    userReacted: boolean;
  }[];
  onReactionPress?: (emoji: string) => void;
  onShowAllReactions?: () => void;
  compact?: boolean;
}

const EMOJI_LIST = ['❤️', '😂', '😮', '😢', '😡', '👍'];

const MessageReaction: React.FC<MessageReactionProps> = ({
  reactions = [],
  onReactionPress,
  onShowAllReactions,
  compact = false,
}) => {
  if (reactions.length === 0 && compact) {
    return null;
  }

  if (compact && reactions.length > 0) {
    // Hiển thị dạng nhỏ gọn cho tin nhắn
    return (
      <View className="flex-row items-center bg-[#303030] rounded-full px-2 py-1 self-start mt-1">
        {reactions.slice(0, 2).map((reaction, index) => (
          <Text key={index} className="mr-1">{reaction.emoji}</Text>
        ))}
        
        {reactions.length > 2 && (
          <TouchableOpacity onPress={onShowAllReactions}>
            <Text className="text-gray-400 text-xs">+{reactions.length - 2}</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  // Hiển thị đầy đủ cho bottom sheet
  return (
    <View className="bg-[#262626] rounded-2xl p-4">
      <View className="flex-row justify-between mb-4">
        <Text className="text-white font-semibold text-base">Nhấn để bày tỏ cảm xúc</Text>
        <TouchableOpacity>
          <Ionicons name="close" size={24} color="white" />
        </TouchableOpacity>
      </View>
      
      <View className="flex-row justify-between mb-4">
        {EMOJI_LIST.map((emoji, index) => {
          const reactionData = reactions.find(r => r.emoji === emoji);
          const isSelected = reactionData?.userReacted;
          
          return (
            <TouchableOpacity 
              key={index}
              onPress={() => onReactionPress?.(emoji)}
              className={`p-2 ${isSelected ? 'bg-[#0084ff33] rounded-full' : ''}`}
            >
              <Text className="text-2xl">{emoji}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
      
      {reactions.length > 0 && (
        <View className="border-t border-gray-700 pt-3">
          <Text className="text-white font-medium mb-2">Tất cả cảm xúc</Text>
          
          {reactions.map((reaction, index) => (
            <View key={index} className="flex-row justify-between items-center mb-2">
              <View className="flex-row items-center">
                <Text className="text-xl mr-2">{reaction.emoji}</Text>
                <Text className="text-white">{reaction.count}</Text>
              </View>
              
              {reaction.userReacted && (
                <Text className="text-blue-500 text-xs">Bạn</Text>
              )}
            </View>
          ))}
        </View>
      )}
    </View>
  );
};

export default MessageReaction;
