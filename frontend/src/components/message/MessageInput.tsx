import React, { useState, useRef } from 'react';
import { View, TextInput, TouchableOpacity, Keyboard } from 'react-native';
import { Ionicons, FontAwesome, MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';

interface MessageInputProps {
  onSendMessage: (text: string) => void;
  onSendMedia: (uri: string, type: 'image' | 'video') => void;
  onTypingStatusChange?: (isTyping: boolean) => void;
  placeholder?: string;
}

const MessageInput: React.FC<MessageInputProps> = ({
  onSendMessage,
  onSendMedia,
  onTypingStatusChange,
  placeholder = 'Nhắn tin...',
}) => {
  const [message, setMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const inputRef = useRef<TextInput>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleTextChange = (text: string) => {
    setMessage(text);
    
    if (!isTyping && text.length > 0) {
      setIsTyping(true);
      onTypingStatusChange?.(true);
    } else if (isTyping && text.length === 0) {
      setIsTyping(false);
      onTypingStatusChange?.(false);
    }
    
    // Reset typing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    // Set new typing timeout
    if (text.length > 0) {
      typingTimeoutRef.current = setTimeout(() => {
        setIsTyping(false);
        onTypingStatusChange?.(false);
      }, 3000);
    }
  };

  const handleSendMessage = () => {
    if (message.trim()) {
      onSendMessage(message.trim());
      setMessage('');
      setIsTyping(false);
      onTypingStatusChange?.(false);
      
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    }
  };

  const handlePickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      allowsEditing: false,
      quality: 0.5,
      exif: false,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      const asset = result.assets[0];
      const type = asset.type === 'video' ? 'video' : 'image';
      onSendMedia(asset.uri, type);
    }
  };

  const handleOpenCamera = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    
    if (status !== 'granted') {
      alert('Cần quyền truy cập camera để chụp ảnh');
      return;
    }
    
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      allowsEditing: false,
      quality: 0.5,
      exif: false,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      const asset = result.assets[0];
      const type = asset.type === 'video' ? 'video' : 'image';
      onSendMedia(asset.uri, type);
    }
  };

  return (
    <View className="flex-row items-center px-2 py-2 bg-black">
      <TouchableOpacity 
        className="w-12 h-12 justify-center items-center"
        onPress={handleOpenCamera}
      >
        <Ionicons name="camera" size={28} color="#e44dff" />
      </TouchableOpacity>
      
      <View className="flex-1 flex-row items-center bg-[#262626] rounded-full px-3 py-1 mx-2">
        <TextInput
          ref={inputRef}
          value={message}
          onChangeText={handleTextChange}
          placeholder={placeholder}
          placeholderTextColor="#8e8e8e"
          className="flex-1 text-white py-2 px-2 text-base"
          multiline
          maxLength={1000}
        />
        
        <TouchableOpacity className="mr-2" onPress={handlePickImage}>
          <Ionicons name="image" size={24} color="#8e8e8e" />
        </TouchableOpacity>
        
        <TouchableOpacity>
          <MaterialCommunityIcons name="sticker-emoji" size={24} color="#8e8e8e" />
        </TouchableOpacity>
      </View>
      
      {message.trim() ? (
        <TouchableOpacity 
          onPress={handleSendMessage}
          className="w-12 h-12 justify-center items-center"
        >
          <Ionicons name="send" size={24} color="#e44dff" />
        </TouchableOpacity>
      ) : (
        <TouchableOpacity className="w-12 h-12 justify-center items-center">
          <Ionicons name="mic" size={24} color="#e44dff" />
        </TouchableOpacity>
      )}
    </View>
  );
};

export default MessageInput;
