import React from 'react';
import { View, Image, TouchableOpacity, Text, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface MessageAttachmentProps {
  type: 'image' | 'video' | 'file';
  uri: string;
  filename?: string;
  fileSize?: string;
  duration?: string;
  onPress: () => void;
  onClose?: () => void;
  preview?: boolean;
}

const { width } = Dimensions.get('window');

const MessageAttachment: React.FC<MessageAttachmentProps> = ({
  type,
  uri,
  filename,
  fileSize,
  duration,
  onPress,
  onClose,
  preview = false,
}) => {
  if (type === 'image') {
    return (
      <View className={`relative ${preview ? 'mb-2' : ''}`}>
        <TouchableOpacity onPress={onPress}>
          <Image 
            source={{ uri }} 
            className={`rounded-xl ${preview ? 'w-32 h-32' : 'w-60 h-60'}`}
            resizeMode="cover"
          />
        </TouchableOpacity>
        
        {preview && onClose && (
          <TouchableOpacity 
            onPress={onClose}
            className="absolute top-1 right-1 bg-black/50 rounded-full p-1"
          >
            <Ionicons name="close" size={16} color="white" />
          </TouchableOpacity>
        )}
      </View>
    );
  }
  
  if (type === 'video') {
    return (
      <View className={`relative ${preview ? 'mb-2' : ''}`}>
        <TouchableOpacity onPress={onPress}>
          <Image 
            source={{ uri }} 
            className={`rounded-xl ${preview ? 'w-32 h-32' : 'w-60 h-60'}`}
            resizeMode="cover"
          />
          
          <View className="absolute inset-0 flex items-center justify-center">
            <View className="bg-black/50 rounded-full p-2">
              <Ionicons name="play" size={24} color="white" />
            </View>
          </View>
          
          {duration && (
            <View className="absolute bottom-2 right-2 bg-black/70 px-1 rounded">
              <Text className="text-white text-xs">{duration}</Text>
            </View>
          )}
        </TouchableOpacity>
        
        {preview && onClose && (
          <TouchableOpacity 
            onPress={onClose}
            className="absolute top-1 right-1 bg-black/50 rounded-full p-1"
          >
            <Ionicons name="close" size={16} color="white" />
          </TouchableOpacity>
        )}
      </View>
    );
  }
  
  // File attachment
  return (
    <View className={`${preview ? 'mb-2' : ''}`}>
      <TouchableOpacity 
        onPress={onPress}
        className="flex-row items-center bg-[#303030] p-3 rounded-xl"
      >
        <View className="bg-[#0095f6] p-2 rounded-lg mr-3">
          <Ionicons name="document-outline" size={24} color="white" />
        </View>
        
        <View className="flex-1">
          <Text className="text-white font-medium" numberOfLines={1}>
            {filename || 'File đính kèm'}
          </Text>
          {fileSize && (
            <Text className="text-gray-400 text-xs">{fileSize}</Text>
          )}
        </View>
        
        <Ionicons name="download-outline" size={24} color="#0095f6" />
      </TouchableOpacity>
      
      {preview && onClose && (
        <TouchableOpacity 
          onPress={onClose}
          className="absolute top-1 right-1 bg-black/50 rounded-full p-1"
        >
          <Ionicons name="close" size={16} color="white" />
        </TouchableOpacity>
      )}
    </View>
  );
};

export default MessageAttachment;
