import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, TextInput, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView, Edge } from 'react-native-safe-area-context';
import apiClient from '../../services/apiClient';

import MessageListItem from '../../components/message/MessageListItem';

interface Conversation {
  id: string;
  username: string;
  avatar: string;
  lastMessage: string;
  timestamp: string;
  isRead: boolean;
  isOnline: boolean;
  isSent: boolean;
  isDelivered: boolean;
  isGroup: boolean;
  hasStory: boolean;
  isTyping: boolean;
  mediaType?: 'image' | 'video' | 'audio' | 'file';
}

interface ConversationsResponse {
  conversations: Array<{
    id?: string;
    _id?: string;
    recipient?: {
      username?: string;
      profile_picture?: string;
      is_online?: boolean;
    };
    last_message?: {
      content?: string;
      created_at?: string;
      is_read?: boolean;
      media_type?: string;
    };
    is_group?: boolean;
  }>;
}

export default function MessageListScreen() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [filteredConversations, setFilteredConversations] = useState<Conversation[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchConversations = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        const response = await apiClient.get<ConversationsResponse>('/messages/conversations');
        
        if (response.data && response.data.conversations) {
          const apiConversations = response.data.conversations.map((conv) => ({
            id: conv.id || conv._id || '',
            username: conv.recipient?.username || 'Người dùng',
            avatar: conv.recipient?.profile_picture || 'https://randomuser.me/api/portraits/lego/1.jpg',
            lastMessage: conv.last_message?.content || '',
            timestamp: formatTimestamp(conv.last_message?.created_at || new Date()),
            isRead: conv.last_message?.is_read || false,
            isOnline: conv.recipient?.is_online || false,
            isSent: true,
            isDelivered: true,
            isGroup: conv.is_group || false,
            hasStory: false,
            isTyping: false,
            mediaType: conv.last_message?.media_type as 'image' | 'video' | 'audio' | 'file' | undefined,
          }));
          
          setConversations(apiConversations);
          setFilteredConversations(apiConversations);
        } else {
          setConversations([]);
          setFilteredConversations([]);
        }
      } catch (err) {
        console.error('Lỗi khi lấy danh sách tin nhắn:', err);
        setError('Không thể tải danh sách tin nhắn, vui lòng thử lại sau.');
        setConversations([]);
        setFilteredConversations([]);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchConversations();
  }, []);

  const formatTimestamp = (timestamp: string | Date) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diffInSeconds < 60) {
      return 'Vừa xong';
    } else if (diffInSeconds < 3600) {
      return `${Math.floor(diffInSeconds / 60)} phút trước`;
    } else if (diffInSeconds < 86400) {
      return `${Math.floor(diffInSeconds / 3600)} giờ trước`;
    } else if (diffInSeconds < 604800) {
      return `${Math.floor(diffInSeconds / 86400)} ngày trước`;
    } else if (diffInSeconds < 2592000) {
      return `${Math.floor(diffInSeconds / 604800)} tuần trước`;
    } else {
      return date.toLocaleDateString('vi-VN');
    }
  };

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredConversations(conversations);
    } else {
      const filtered = conversations.filter(conv => 
        conv.username.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredConversations(filtered);
    }
  }, [searchQuery, conversations]);

  const handleConversationPress = (id: string) => {
    router.push({
      pathname: "/message/[id]",
      params: { id }
    });
  };

  const handleNewMessage = () => {
    router.push('/message/new');
  };

  const renderErrorState = () => (
    <View className="flex-1 justify-center items-center p-5">
      <Ionicons name="alert-circle-outline" size={60} color="#ff3b30" />
      <Text className="text-white text-lg mt-4 text-center">{error}</Text>
      <TouchableOpacity 
        className="mt-6 bg-blue-500 px-6 py-3 rounded-full"
        onPress={() => setIsLoading(true)}
      >
        <Text className="text-white font-medium">Thử lại</Text>
      </TouchableOpacity>
    </View>
  );

  const renderEmptyState = () => (
    <View className="flex-1 justify-center items-center p-5">
      <Ionicons name="chatbubble-outline" size={60} color="#777" />
      <Text className="text-white text-lg mt-4 text-center">Chưa có tin nhắn nào</Text>
      <TouchableOpacity 
        className="mt-6 bg-blue-500 px-6 py-3 rounded-full"
        onPress={handleNewMessage}
      >
        <Text className="text-white font-medium">Tạo tin nhắn mới</Text>
      </TouchableOpacity>
    </View>
  );

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-black">
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#0095f6" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['top' as Edge]} className="flex-1 bg-black">
      {/* Header */}
      <View className="px-4 py-2">
        <View className="flex-row items-center justify-between mb-4">
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          
          <Text className="text-white text-xl font-semibold">Tin nhắn</Text>
          
          <TouchableOpacity onPress={handleNewMessage}>
            <Ionicons name="create-outline" size={24} color="white" />
          </TouchableOpacity>
        </View>
        
        {/* Thanh tìm kiếm */}
        <View className="bg-[#262626] rounded-lg flex-row items-center px-3 py-2 mb-4">
          <Ionicons name="search" size={20} color="#8e8e8e" className="mr-2" />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Tìm kiếm"
            placeholderTextColor="#8e8e8e"
            className="flex-1 text-white"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color="#8e8e8e" />
            </TouchableOpacity>
          )}
        </View>
      </View>
      
      {/* Danh sách cuộc trò chuyện */}
      {error ? (
        renderErrorState()
      ) : filteredConversations.length === 0 ? (
        renderEmptyState()
      ) : (
        <FlatList
          data={filteredConversations}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <MessageListItem
              conversation={item}
              onPress={handleConversationPress}
            />
          )}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}
