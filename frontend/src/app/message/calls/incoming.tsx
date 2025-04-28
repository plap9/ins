import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Image, SafeAreaView, ActivityIndicator, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useWebRTC } from '../../context/WebRTCContext';
import messageService from '../../../services/messageService';

import IncomingCall from '../../../components/message/IncomingCall';

interface Caller {
  id: number;
  username: string;
  avatar: string;
}

export default function IncomingCallScreen() {
  const router = useRouter();
  const { id, type, callId } = useLocalSearchParams<{ id: string; type: 'audio' | 'video', callId: string }>();
  const callType = type || 'audio';
  const { incomingCall, acceptCall, rejectCall } = useWebRTC();
  
  const [isLoading, setIsLoading] = useState(true);
  const [caller, setCaller] = useState<Caller | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCallDetails = async () => {
      try {
        setIsLoading(true);
        
        if (callId) {
          const callDetails = await messageService.getCallDetails(parseInt(callId));
          
          if (callDetails) {
            const callerInfo = {
              id: callDetails.initiator_id,
              username: callDetails.initiator_name || 'Người dùng',
              avatar: callDetails.initiator_avatar || 'https://ui-avatars.com/api/?name=User&background=random'
            };
            
            setCaller(callerInfo);
          }
        } 
        else if (id) {
          const userDetails = await messageService.getUserDetails(parseInt(id));
          
          if (userDetails) {
            const callerInfo = {
              id: userDetails.user_id,
              username: userDetails.username || 'Người dùng',
              avatar: userDetails.profile_picture || 'https://ui-avatars.com/api/?name=User&background=random'
            };
            
            setCaller(callerInfo);
          }
        } else {
          Alert.alert("Lỗi", "Không có thông tin cuộc gọi đến");
          router.back();
        }
      } catch (error) {
        console.error('Lỗi khi lấy thông tin cuộc gọi:', error);
        setError('Không thể tải thông tin cuộc gọi');
      } finally {
        setIsLoading(false);
      }
    };
    
    if (incomingCall) {
      const initiator = incomingCall.participants.get(incomingCall.initiatorId);
      if (initiator) {
        setCaller({
          id: incomingCall.initiatorId,
          username: initiator.username || incomingCall.initiatorName || 'Người dùng',
          avatar: initiator.profilePicture || 'https://ui-avatars.com/api/?name=User&background=random'
        });
        setIsLoading(false);
      } else {
        fetchCallDetails();
      }
    } else {
      fetchCallDetails();
    }
  }, [id, callId, incomingCall]);

  const handleAccept = async () => {
    try {
      if (incomingCall) {
        const success = await acceptCall();
        if (!success) {
          Alert.alert(
            "Lỗi cuộc gọi",
            "Không thể kết nối cuộc gọi. Vui lòng kiểm tra quyền truy cập mic/camera và thử lại."
          );
          router.back();
        }
      } else if (callId) {
        await messageService.answerCall(parseInt(callId), 'accepted');
        
        if (callType === 'audio') {
          router.push(`/message/calls/audio?id=${callId}`);
        } else {
          router.push(`/message/calls/video?id=${callId}`);
        }
      } else {
        Alert.alert("Lỗi", "Không thể chấp nhận cuộc gọi");
        router.back();
      }
    } catch (error) {
      console.error('Lỗi khi chấp nhận cuộc gọi:', error);
      Alert.alert("Lỗi", "Không thể chấp nhận cuộc gọi");
      router.back();
    }
  };

  const handleReject = async () => {
    try {
      if (incomingCall) {
        rejectCall();
      } else if (callId) {
        await messageService.answerCall(parseInt(callId), 'rejected');
      }
      router.back();
    } catch (error) {
      console.error('Lỗi khi từ chối cuộc gọi:', error);
      router.back();
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-black">
        <StatusBar style="light" />
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#0095f6" />
        </View>
      </SafeAreaView>
    );
  }

  if (error || !caller) {
    return (
      <SafeAreaView className="flex-1 bg-black">
        <StatusBar style="light" />
        <View className="flex-1 justify-center items-center p-4">
          <Ionicons name="alert-circle-outline" size={60} color="#ff3b30" />
          <Text className="text-white text-lg mt-4 text-center">{error || "Không có thông tin người gọi"}</Text>
          <TouchableOpacity 
            className="mt-6 bg-red-500 px-6 py-3 rounded-full"
            onPress={() => router.back()}
          >
            <Text className="text-white font-medium">Quay lại</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-black">
      <StatusBar style="light" />
      
      <View className="flex-1 justify-center items-center p-4">
        <Image 
          source={{ uri: caller.avatar }}
          className="w-32 h-32 rounded-full mb-4"
        />
        
        <Text className="text-white text-2xl font-bold mb-2">{caller.username}</Text>
        <Text className="text-gray-400 mb-8">
          Cuộc gọi {callType === 'video' ? 'video' : 'thoại'} đến...
        </Text>
        
        <View className="flex-row justify-around w-full mt-8">
          <TouchableOpacity 
            onPress={handleReject}
            className="items-center"
          >
            <View className="w-16 h-16 bg-red-500 rounded-full items-center justify-center mb-2">
              <Ionicons name="call" size={32} color="white" />
            </View>
            <Text className="text-white">Từ chối</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            onPress={handleAccept}
            className="items-center"
          >
            <View className="w-16 h-16 bg-green-500 rounded-full items-center justify-center mb-2">
              <Ionicons name={callType === 'video' ? "videocam" : "call"} size={32} color="white" />
            </View>
            <Text className="text-white">Trả lời</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}
