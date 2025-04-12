import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, Image, SafeAreaView } from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';

// Import các components cuộc gọi
import CallControls from '../../../components/message/CallControls';
import CallStatus from '../../../components/message/CallStatus';
import IncomingCall from '../../../components/message/IncomingCall';

interface CallHistory {
  id: string;
  username: string;
  avatar: string;
  timestamp: string;
  callType: 'audio' | 'video';
  callStatus: 'missed' | 'incoming' | 'outgoing';
  duration?: string;
}

export default function CallsScreen() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [callHistory, setCallHistory] = useState<CallHistory[]>([]);
  const [activeCall, setActiveCall] = useState<CallHistory | null>(null);
  const [isIncomingCall, setIsIncomingCall] = useState(false);

  // Giả lập dữ liệu lịch sử cuộc gọi
  useEffect(() => {
    const mockCalls: CallHistory[] = [
      {
        id: '1',
        username: 'Timmy Doan',
        avatar: 'https://randomuser.me/api/portraits/men/32.jpg',
        timestamp: '22:53, Hôm nay',
        callType: 'video',
        callStatus: 'missed',
      },
      {
        id: '2',
        username: 'Hoang M Anh',
        avatar: 'https://randomuser.me/api/portraits/men/33.jpg',
        timestamp: 'Hôm qua',
        callType: 'audio',
        callStatus: 'incoming',
        duration: '9:32',
      },
      {
        id: '3',
        username: 'timmy.304_',
        avatar: 'https://randomuser.me/api/portraits/men/34.jpg',
        timestamp: 'Tháng trước',
        callType: 'video',
        callStatus: 'outgoing',
        duration: '15:08',
      },
      {
        id: '4',
        username: 'Vuong D Quang',
        avatar: 'https://randomuser.me/api/portraits/men/35.jpg',
        timestamp: '20/06/2024',
        callType: 'audio',
        callStatus: 'outgoing',
        duration: '5:45',
      },
    ];

    // Giả lập cuộc gọi đến sau 3 giây
    const timer = setTimeout(() => {
      setIsIncomingCall(true);
    }, 3000);

    setTimeout(() => {
      setCallHistory(mockCalls);
      setIsLoading(false);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  const handleAcceptCall = () => {
    if (isIncomingCall) {
      setActiveCall({
        id: '5',
        username: 'Meta AI',
        avatar: 'https://randomuser.me/api/portraits/lego/1.jpg',
        timestamp: 'Bây giờ',
        callType: 'video',
        callStatus: 'incoming',
      });
      setIsIncomingCall(false);
    }
  };

  const handleRejectCall = () => {
    setIsIncomingCall(false);
  };

  const handleEndCall = () => {
    setActiveCall(null);
  };

  const handleCallUser = (call: CallHistory) => {
    setActiveCall(call);
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

  // Hiển thị cuộc gọi đang diễn ra
  if (activeCall) {
    return (
      <View className="flex-1 bg-black">
        <StatusBar style="light" />
        
        <View className="flex-1 justify-center items-center p-4">
          <Image 
            source={{ uri: activeCall.avatar }} 
            className="w-32 h-32 rounded-full mb-4"
          />
          
          <Text className="text-white text-2xl font-bold mb-2">{activeCall.username}</Text>
          
          <View className="mb-4">
            <Text className="text-white text-lg text-center">Đang kết nối...</Text>
          </View>
          
          <View className="mt-auto w-full">
            <View className="flex-row justify-around mb-8">
              <TouchableOpacity 
                onPress={() => {}}
                className="items-center"
              >
                <View className="w-12 h-12 bg-[#333333] rounded-full items-center justify-center mb-2">
                  <Ionicons name="mic-off" size={24} color="white" />
                </View>
                <Text className="text-white text-xs">Tắt tiếng</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                onPress={() => {}}
                className="items-center"
              >
                <View className="w-12 h-12 bg-[#333333] rounded-full items-center justify-center mb-2">
                  <Ionicons name="volume-high" size={24} color="white" />
                </View>
                <Text className="text-white text-xs">Loa ngoài</Text>
              </TouchableOpacity>

              {activeCall.callType === 'video' && (
                <TouchableOpacity 
                  onPress={() => {}}
                  className="items-center"
                >
                  <View className="w-12 h-12 bg-[#333333] rounded-full items-center justify-center mb-2">
                    <Ionicons name="videocam" size={24} color="white" />
                  </View>
                  <Text className="text-white text-xs">Video</Text>
                </TouchableOpacity>
              )}
            </View>

            <TouchableOpacity 
              onPress={handleEndCall}
              className="w-16 h-16 bg-red-500 rounded-full items-center justify-center self-center"
            >
              <Ionicons name="call" size={32} color="white" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  // Hiển thị cuộc gọi đến
  if (isIncomingCall) {
    return (
      <View className="flex-1 bg-black">
        <StatusBar style="light" />
        
        <View className="flex-1 justify-center items-center p-4">
          <Image 
            source={{ uri: "https://randomuser.me/api/portraits/lego/1.jpg" }}
            className="w-32 h-32 rounded-full mb-4"
          />
          
          <Text className="text-white text-2xl font-bold mb-2">Meta AI</Text>
          <Text className="text-gray-400 mb-8">Cuộc gọi video đến...</Text>
          
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
                <Ionicons name="videocam" size={32} color="white" />
              </View>
              <Text className="text-white">Trả lời</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-black">
      <StatusBar style="light" />
      
      <View className="flex-row items-center justify-between px-4 py-2 border-b border-gray-800">
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        
        <Text className="text-white text-xl font-semibold">Cuộc gọi</Text>
        
        <TouchableOpacity>
          <Ionicons name="add" size={24} color="white" />
        </TouchableOpacity>
      </View>
      
      <FlatList
        data={callHistory}
        keyExtractor={(item) => item.id}
        renderItem={renderCallItem}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={() => (
          <View className="px-4 py-3">
            <Text className="text-white font-bold text-lg">Lịch sử cuộc gọi</Text>
          </View>
        )}
      />
    </SafeAreaView>
  );
} 