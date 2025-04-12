import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TextInput, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView, Edge } from 'react-native-safe-area-context';
import apiClient from '../../services/apiClient';

interface User {
  id: string;
  username: string;
  avatar: string;
  isOnline: boolean;
  isFollowing: boolean;
  isVerified: boolean;
}

// Kiểu dữ liệu API response
interface UsersResponse {
  users: Array<{
    id?: string;
    _id?: string;
    username?: string;
    profile_picture?: string;
    is_online?: boolean;
    is_following?: boolean;
    is_verified?: boolean;
  }>;
}

interface ConversationResponse {
  conversation: {
    id: string;
  };
}

export default function NewMessageScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ userId?: string, username?: string }>();
  const [searchQuery, setSearchQuery] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchUsers = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        const response = await apiClient.get<UsersResponse>('/users/connections');
        
        if (response.data && response.data.users) {
          const apiUsers = response.data.users.map((user) => ({
            id: user.id || user._id || '',
            username: user.username || 'Người dùng',
            avatar: user.profile_picture || 'https://randomuser.me/api/portraits/lego/1.jpg',
            isOnline: user.is_online || false,
            isFollowing: user.is_following || false,
            isVerified: user.is_verified || false
          }));
          
          setUsers(apiUsers);
          setFilteredUsers(apiUsers);
          
          if (params.userId) {
            const targetUser = apiUsers.find(user => user.id === params.userId);
            if (targetUser) {
              setSelectedUsers([targetUser]);
              handleUserNavigation(targetUser);
            } else if (params.username) {
              const tempUser: User = {
                id: params.userId,
                username: params.username,
                avatar: 'https://randomuser.me/api/portraits/lego/1.jpg',
                isOnline: false,
                isFollowing: false,
                isVerified: false
              };
              setSelectedUsers([tempUser]);
              handleUserNavigation(tempUser);
            }
          }
        } else {
          setUsers([]);
          setFilteredUsers([]);
        }
      } catch (err) {
        console.error('Lỗi khi lấy danh sách người dùng:', err);
        setError('Không thể tải danh sách người dùng, vui lòng thử lại sau.');
        setUsers([]);
        setFilteredUsers([]);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchUsers();
  }, [params.userId, params.username]);

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredUsers(users);
    } else {
      const filtered = users.filter(user => 
        user.username.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredUsers(filtered);
    }
  }, [searchQuery, users]);

  const handleUserSelect = (user: User) => {
    if (selectedUsers.some(selectedUser => selectedUser.id === user.id)) {
      setSelectedUsers(prev => prev.filter(selectedUser => selectedUser.id !== user.id));
    } else {
      setSelectedUsers(prev => [...prev, user]);
    }
  };

  const handleNext = async () => {
    if (selectedUsers.length === 0) return;
    
    setIsLoading(true);
    
    try {
      if (selectedUsers.length === 1) {
        const userId = selectedUsers[0].id;
        
        const checkResponse = await apiClient.get<ConversationResponse>(`/messages/conversations/with/${userId}`);
        
        if (checkResponse.data && checkResponse.data.conversation) {
          router.push({
            pathname: "/message/[id]",
            params: { id: checkResponse.data.conversation.id }
          });
        } else {
          const createResponse = await apiClient.post<ConversationResponse>('/messages/conversations', {
            recipient_id: userId
          });
          
          if (createResponse.data && createResponse.data.conversation) {
            router.push({
              pathname: "/message/[id]",
              params: { id: createResponse.data.conversation.id }
            });
          }
        }
      } else {
        const userIds = selectedUsers.map(user => user.id);
        
        const createGroupResponse = await apiClient.post<ConversationResponse>('/messages/conversations/group', {
          name: `Nhóm (${selectedUsers.length})`,
          member_ids: userIds
        });
        
        if (createGroupResponse.data && createGroupResponse.data.conversation) {
          router.push({
            pathname: "/message/[id]",
            params: { id: createGroupResponse.data.conversation.id }
          });
        }
      }
    } catch (err) {
      console.error('Lỗi khi tạo cuộc trò chuyện:', err);
      setError('Không thể tạo cuộc trò chuyện, vui lòng thử lại sau.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUserNavigation = async (user: User) => {
    try {
      setIsLoading(true);
      const checkResponse = await apiClient.get<ConversationResponse>(`/messages/conversations/with/${user.id}`);
      
      if (checkResponse.data && checkResponse.data.conversation) {
        router.replace({
          pathname: "/message/[id]",
          params: { id: checkResponse.data.conversation.id }
        });
      } else {
        const createResponse = await apiClient.post<ConversationResponse>('/messages/conversations', {
          recipient_id: user.id
        });
        
        if (createResponse.data && createResponse.data.conversation) {
          router.replace({
            pathname: "/message/[id]",
            params: { id: createResponse.data.conversation.id }
          });
        }
      }
    } catch (err) {
      console.error('Lỗi khi tạo cuộc trò chuyện:', err);
      setError('Không thể tạo cuộc trò chuyện, vui lòng thử lại sau.');
      setIsLoading(false);
    }
  };

  const renderUserItem = ({ item }: { item: User }) => {
    const isSelected = selectedUsers.some(user => user.id === item.id);
    
    return (
      <TouchableOpacity 
        onPress={() => handleUserSelect(item)}
        className="flex-row items-center justify-between px-4 py-3 border-b border-gray-800"
      >
        <View className="flex-row items-center">
          <View className="relative">
            <Image 
              source={{ uri: item.avatar }} 
              className="w-12 h-12 rounded-full"
            />
            {item.isOnline && (
              <View className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-black"></View>
            )}
          </View>
          
          <View className="ml-3">
            <View className="flex-row items-center">
              <Text className="text-white font-semibold">{item.username}</Text>
              {item.isVerified && (
                <Ionicons name="checkmark-circle" size={16} color="#0095f6" className="ml-1" />
              )}
            </View>
            {item.isFollowing && (
              <Text className="text-gray-400 text-xs">Đang theo dõi</Text>
            )}
          </View>
        </View>
        
        <View className={`w-5 h-5 rounded-full border ${isSelected ? 'bg-blue-500 border-blue-500' : 'border-gray-400'}`}>
          {isSelected && (
            <Ionicons name="checkmark" size={16} color="white" />
          )}
        </View>
      </TouchableOpacity>
    );
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

  return (
    <SafeAreaView edges={['top' as Edge]} className="flex-1 bg-black">
      <StatusBar style="light" />
      
      <View className="flex-row items-center justify-between px-4 py-2 border-b border-gray-800">
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        
        <Text className="text-white text-lg font-semibold">Tin nhắn mới</Text>
        
        <TouchableOpacity 
          onPress={handleNext}
          disabled={selectedUsers.length === 0 || isLoading}
        >
          <Text className={`${selectedUsers.length > 0 && !isLoading ? 'text-blue-500' : 'text-blue-500/50'} font-semibold`}>
            {isLoading ? 'Đang xử lý...' : 'Tiếp'}
          </Text>
        </TouchableOpacity>
      </View>
      
      <View className="px-4 py-3 border-b border-gray-800">
        <View className="flex-row items-center">
          <Text className="text-white font-semibold mr-2">Đến:</Text>
          
          <View className="flex-row flex-wrap flex-1">
            {selectedUsers.map(user => (
              <View 
                key={user.id}
                className="flex-row items-center bg-[#303030] rounded-full px-2 py-1 mr-2 mb-2"
              >
                <Text className="text-white mr-1">{user.username}</Text>
                <TouchableOpacity onPress={() => handleUserSelect(user)}>
                  <Ionicons name="close-circle" size={18} color="#8e8e8e" />
                </TouchableOpacity>
              </View>
            ))}
            
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Tìm kiếm..."
              placeholderTextColor="#8e8e8e"
              className="flex-1 text-white min-w-[100px]"
            />
          </View>
        </View>
      </View>
      
      {isLoading ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#0095f6" />
        </View>
      ) : error ? (
        renderErrorState()
      ) : (
        <FlatList
          data={filteredUsers}
          keyExtractor={(item) => item.id}
          renderItem={renderUserItem}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={() => (
            <View className="flex-1 justify-center items-center p-5 mt-10">
              <Ionicons name="search" size={50} color="#555" />
              <Text className="text-white text-center mt-4">Không tìm thấy người dùng</Text>
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
}
