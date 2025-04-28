import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, Image, SafeAreaView, ActivityIndicator, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import messageService from '../../../services/messageService';
import { useWebRTC } from '../../context/WebRTCContext';

import CallControls from '../../../components/message/CallControls';
import CallStatus from '../../../components/message/CallStatus';
import IncomingCall from '../../../components/message/IncomingCall';

interface CallHistory {
  id: string;
  callId: number;
  username: string;
  avatar: string;
  timestamp: string;
  callType: 'audio' | 'video';
  callStatus: 'missed' | 'incoming' | 'outgoing';
  duration?: string;
  userId?: number;
  conversationId?: number;
}

export default function CallsScreen() {
  const router = useRouter();
  const { authData } = useAuth();
  const { incomingCall, acceptCall, rejectCall, currentCall } = useWebRTC();
  const [isLoading, setIsLoading] = useState(true);
  const [callHistory, setCallHistory] = useState<CallHistory[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchCallHistory();
  }, []);

  const fetchCallHistory = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await messageService.getCallHistory();
      
      if (response && response.calls) {
        const formattedCalls: CallHistory[] = response.calls.map(call => {
          const otherParticipant = call.participants?.find(
            (p: { user_id: number }) => p.user_id !== authData?.user?.user_id
          );
          
          const callStatus = 
            call.initiator_id === authData?.user?.user_id
              ? 'outgoing'
              : call.status === 'missed' || call.status === 'rejected'
                ? 'missed'
                : 'incoming';
          
          return {
            id: call.call_id.toString(),
            callId: call.call_id,
            username: otherParticipant?.username || 'Người dùng',
            avatar: otherParticipant?.profile_picture || 'https://ui-avatars.com/api/?name=User&background=random',
            timestamp: formatTimestamp(call.created_at),
            callType: call.call_type,
            callStatus: callStatus,
            duration: call.duration ? formatDuration(call.duration) : undefined,
            userId: otherParticipant?.user_id,
            conversationId: call.conversation_id
          };
        });
        
        setCallHistory(formattedCalls);
      } else {
        setCallHistory([]);
      }
    } catch (error) {
      console.error('Lỗi khi lấy lịch sử cuộc gọi:', error);
      setError('Không thể tải lịch sử cuộc gọi. Vui lòng thử lại sau.');
    } finally {
      setIsLoading(false);
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffInDays === 0) {
      return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}, Hôm nay`;
    } else if (diffInDays === 1) {
      return 'Hôm qua';
    } else if (diffInDays < 7) {
      return `${diffInDays} ngày trước`;
    } else if (diffInDays < 30) {
      return 'Tháng này';
    } else {
      return date.toLocaleDateString('vi-VN');
    }
  };

  const formatDuration = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const handleAcceptCall = async () => {
    if (incomingCall) {
      try {
        const success = await acceptCall();
        if (!success) {
          Alert.alert(
            "Lỗi cuộc gọi",
            "Không thể kết nối cuộc gọi. Vui lòng kiểm tra quyền truy cập mic/camera và thử lại."
          );
        }
      } catch (error) {
        console.error('Lỗi khi chấp nhận cuộc gọi:', error);
        Alert.alert("Lỗi", "Không thể kết nối đến cuộc gọi");
      }
    }
  };

  const handleRejectCall = () => {
    if (incomingCall) {
      rejectCall();
    }
  };

  const handleCallUser = (call: CallHistory) => {
    if (currentCall) {
      Alert.alert(
        "Cuộc gọi đang diễn ra",
        "Bạn đang trong một cuộc gọi khác. Vui lòng kết thúc cuộc gọi hiện tại trước khi bắt đầu cuộc gọi mới."
      );
      return;
    }

    if (call.userId) {
      router.push({
        pathname: "/message/call",
        params: {
          recipientId: call.userId.toString(),
          callType: call.callType
        }
      });
    } else if (call.conversationId) {
      router.push({
        pathname: "/message/call",
        params: {
          conversationId: call.conversationId.toString(),
          callType: call.callType
        }
      });
    }
  };

  const renderCallItem = ({ item }: { item: CallHistory }) => {
    const getCallIcon = () => {
      if (item.callStatus === 'missed') {
        return <Ionicons name="call-sharp" size={18} color="red" />;
      } else if (item.callStatus === 'incoming') {
        return <Ionicons name="call-sharp" size={18} color="green" />;
      } else {
        return <Ionicons name="call-sharp" size={18} color="gray" />;
      }
    };

    return (
      <TouchableOpacity 
        onPress={() => handleCallUser(item)}
        className="flex-row items-center px-4 py-3 border-b border-gray-800"
      >
        <Image 
          source={{ uri: item.avatar }} 
          className="w-12 h-12 rounded-full mr-3"
        />
        
        <View className="flex-1">
          <Text className="text-white font-semibold">{item.username}</Text>
          <View className="flex-row items-center">
            {getCallIcon()}
            <Text className="text-gray-400 text-sm ml-1">
              {item.callStatus === 'missed' ? 'Cuộc gọi nhỡ' : 
               item.callStatus === 'incoming' ? 'Cuộc gọi đến' : 'Cuộc gọi đi'}
            </Text>
            {item.duration && (
              <Text className="text-gray-400 text-sm ml-1"> • {item.duration}</Text>
            )}
          </View>
        </View>
        
        <Text className="text-gray-400 text-xs">{item.timestamp}</Text>
        
        <TouchableOpacity 
          onPress={() => handleCallUser(item)}
          className="ml-3"
        >
          {item.callType === 'video' ? (
            <Ionicons name="videocam" size={24} color="#0095f6" />
          ) : (
            <Ionicons name="call" size={24} color="#0095f6" />
          )}
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  if (incomingCall) {
    return (
      <View className="flex-1 bg-black">
        <StatusBar style="light" />
        
        <View className="flex-1 justify-center items-center p-4">
          <Image 
            source={{ uri: incomingCall.participants.get(incomingCall.initiatorId)?.profilePicture || "https://ui-avatars.com/api/?name=User&background=random" }}
            className="w-32 h-32 rounded-full mb-4"
          />
          
          <Text className="text-white text-2xl font-bold mb-2">
            {incomingCall.participants.get(incomingCall.initiatorId)?.username || incomingCall.initiatorName || "Người dùng"}
          </Text>
          <Text className="text-gray-400 mb-8">
            Cuộc gọi {incomingCall.callType === 'video' ? 'video' : 'thoại'} đến...
          </Text>
          
          <View className="flex-row justify-around w-full mt-8">
            <TouchableOpacity 
              onPress={handleRejectCall}
              className="items-center"
            >
              <View className="w-16 h-16 bg-red-500 rounded-full items-center justify-center mb-2">
                <Ionicons name="call" size={32} color="white" />
              </View>
              <Text className="text-white">Từ chối</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              onPress={handleAcceptCall}
              className="items-center"
            >
              <View className="w-16 h-16 bg-green-500 rounded-full items-center justify-center mb-2">
                <Ionicons name={incomingCall.callType === 'video' ? "videocam" : "call"} size={32} color="white" />
              </View>
              <Text className="text-white">Trả lời</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-black">
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#0095f6" />
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView className="flex-1 bg-black">
        <View className="flex-1 justify-center items-center p-4">
          <Ionicons name="alert-circle-outline" size={60} color="#ff3b30" />
          <Text className="text-white text-lg mt-4 text-center">{error}</Text>
          <TouchableOpacity 
            className="mt-6 bg-blue-500 px-6 py-3 rounded-full"
            onPress={fetchCallHistory}
          >
            <Text className="text-white font-medium">Thử lại</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-black">
      <StatusBar style="light" />
      
      <View className="flex-row items-center justify-between px-4 py-3">
        <Text className="text-white text-xl font-semibold">Lịch sử cuộc gọi</Text>
        <TouchableOpacity onPress={fetchCallHistory}>
          <Ionicons name="refresh" size={24} color="white" />
        </TouchableOpacity>
      </View>
      
      {callHistory.length === 0 ? (
        <View className="flex-1 justify-center items-center p-4">
          <Ionicons name="call-outline" size={60} color="#777" />
          <Text className="text-white text-lg mt-4 text-center">Chưa có cuộc gọi nào</Text>
        </View>
      ) : (
        <FlatList
          data={callHistory}
          keyExtractor={(item) => item.id}
          renderItem={renderCallItem}
          className="flex-1"
        />
      )}
    </SafeAreaView>
  );
} 