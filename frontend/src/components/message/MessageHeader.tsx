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
    console.log(`[VIDEO CALL] BẮT ĐẦU THỬ GỌI VIDEO TỪ HEADER - ${new Date().toISOString()}`);
    console.log(`[VIDEO CALL] Thông tin người dùng:`, JSON.stringify(user));
    console.log(`[VIDEO CALL] Hỗ trợ WebRTC: ${supportsVideoCall}`);
    
    if (!supportsVideoCall) {
      console.error('[VIDEO CALL] THIẾT BỊ KHÔNG HỖ TRỢ GỌI VIDEO!');
      Alert.alert(
        "Không hỗ trợ gọi video",
        "Thiết bị của bạn không hỗ trợ gọi video. Bạn có muốn thực hiện cuộc gọi thoại thay thế không?",
        [
          { text: "Không", style: "cancel" },
          { text: "Gọi thoại", onPress: handleAudioCall }
        ]
      );
      return;
    }
    
    console.log(`[VIDEO CALL] Chuẩn bị chuyển đến trang gọi video với ID người dùng: ${user.id}`);
    
    try {
      const params = {
        id: user.id,
        callType: 'video',
        isIncoming: 'false'
      };
      
      console.log(`[VIDEO CALL] Tham số truyền vào:`, JSON.stringify(params));
      console.log(`[VIDEO CALL] Gọi router.push với pathname: /message/calls/video`);
      
      router.push({
        pathname: '/message/calls/video',
        params
      });
      
      console.log('[VIDEO CALL] Đã gọi router.push thành công, đang điều hướng...');
    } catch (error) {
      console.error('[VIDEO CALL] *** LỖI KHI ĐIỀU HƯỚNG ĐẾN TRANG GỌI ***', error);
      
      if (error instanceof Error) {
        console.error('[VIDEO CALL] Chi tiết lỗi:', {
          name: error.name,
          message: error.message,
          stack: error.stack
        });
      }
      
      Alert.alert(
        "Lỗi Chuyển Hướng",
        "Không thể bắt đầu cuộc gọi video. Vui lòng thử lại sau.",
        [{ text: "OK" }]
      );
    }
    
    console.log(`[VIDEO CALL] Kết thúc xử lý nút gọi video`);
  };
  
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
          <TouchableOpacity onPress={handleAudioCall}>
            <Ionicons name="call" size={22} color="#FFFFFF" />
          </TouchableOpacity>
        )}
        
        <TouchableOpacity onPress={user.isGroup ? undefined : handleVideoCall}>
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
