import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface MessageOptionsProps {
  onReply?: () => void;
  onForward?: () => void;
  onCopy?: () => void;
  onDelete?: () => void;
  onReact?: () => void;
  onClose?: () => void;
  isOwnMessage?: boolean;
}

const MessageOptions: React.FC<MessageOptionsProps> = ({
  onReply,
  onForward,
  onCopy,
  onDelete,
  onReact,
  onClose,
  isOwnMessage = false,
}) => {
  return (
    <View className="bg-[#262626] rounded-2xl p-4">
      <View className="flex-row justify-between mb-4">
        <Text className="text-white font-semibold text-base">Tùy chọn tin nhắn</Text>
        <TouchableOpacity onPress={onClose}>
          <Ionicons name="close" size={24} color="white" />
        </TouchableOpacity>
      </View>
      
      <View className="space-y-4">
        {onReply && (
          <TouchableOpacity 
            onPress={onReply}
            className="flex-row items-center"
          >
            <Ionicons name="arrow-undo-outline" size={24} color="white" className="mr-3" />
            <Text className="text-white">Trả lời</Text>
          </TouchableOpacity>
        )}
        
        {onForward && (
          <TouchableOpacity 
            onPress={onForward}
            className="flex-row items-center"
          >
            <Ionicons name="arrow-redo-outline" size={24} color="white" className="mr-3" />
            <Text className="text-white">Chuyển tiếp</Text>
          </TouchableOpacity>
        )}
        
        {onCopy && (
          <TouchableOpacity 
            onPress={onCopy}
            className="flex-row items-center"
          >
            <Ionicons name="copy-outline" size={24} color="white" className="mr-3" />
            <Text className="text-white">Sao chép</Text>
          </TouchableOpacity>
        )}
        
        {onReact && (
          <TouchableOpacity 
            onPress={onReact}
            className="flex-row items-center"
          >
            <Ionicons name="happy-outline" size={24} color="white" className="mr-3" />
            <Text className="text-white">Bày tỏ cảm xúc</Text>
          </TouchableOpacity>
        )}
        
        {isOwnMessage && onDelete && (
          <TouchableOpacity 
            onPress={onDelete}
            className="flex-row items-center"
          >
            <Ionicons name="trash-outline" size={24} color="red" className="mr-3" />
            <Text className="text-red-500">Xóa</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

export default MessageOptions;
