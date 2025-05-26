import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, Image, ActivityIndicator, Alert, ScrollView } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView, Edge } from 'react-native-safe-area-context';
import apiClient from '../../services/apiClient';
import messageService from '../../services/messageService';
import { useAuth } from '../context/AuthContext';

interface GroupMember {
  user_id: number;
  username: string;
  profile_picture?: string;
  role: 'admin' | 'member';
  joined_at: string;
}

interface GroupInfo {
  group_id: number;
  group_name: string;
  group_avatar?: string;
  creator_id: number;
  type: string;
  members: GroupMember[];
}

interface GroupInfoResponse {
  status: string;
  data: GroupInfo;
}

export default function GroupInfoScreen() {
  const router = useRouter();
  const { authData } = useAuth();
  const { id: groupId } = useLocalSearchParams<{ id: string }>();
  const [groupInfo, setGroupInfo] = useState<GroupInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddingMembers, setIsAddingMembers] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const currentUserId = authData?.user?.user_id || 0;

  useEffect(() => {
    const fetchGroupInfo = async () => {
      if (!groupId) return;
      
      setIsLoading(true);
      setError(null);
      
      try {
        const response = await apiClient.get<GroupInfoResponse>(`/api/messages/groups/${groupId}`);
        
        if (response.data && response.data.data) {
          setGroupInfo(response.data.data);
        }
      } catch (err) {
        console.error('Lỗi khi tải thông tin nhóm:', err);
        setError('Không thể tải thông tin nhóm, vui lòng thử lại sau.');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchGroupInfo();
  }, [groupId]);

  const isAdmin = groupInfo?.members.find(m => m.user_id === currentUserId)?.role === 'admin';

  const handleAddMembers = () => {
    router.push({
      pathname: '/message/add-members',
      params: { groupId: groupId }
    });
  };

  const handleRemoveMember = (member: GroupMember) => {
    if (!isAdmin) {
      Alert.alert('Thông báo', 'Bạn không có quyền xóa thành viên');
      return;
    }

    if (member.role === 'admin' && member.user_id !== currentUserId) {
      Alert.alert('Thông báo', 'Không thể xóa admin khác');
      return;
    }

    Alert.alert(
      'Xác nhận',
      `Bạn có chắc muốn xóa ${member.username} khỏi nhóm?`,
      [
        { text: 'Hủy', style: 'cancel' },
        { text: 'Xóa', style: 'destructive', onPress: () => removeMember(member.user_id) }
      ]
    );
  };

  const removeMember = async (userId: number) => {
    try {
      await apiClient.delete(`/api/messages/groups/${groupId}/members/${userId}`);
      
      setGroupInfo(prev => prev ? {
        ...prev,
        members: prev.members.filter(m => m.user_id !== userId)
      } : null);
      
      Alert.alert('Thành công', 'Đã xóa thành viên khỏi nhóm');
    } catch (err) {
      console.error('Lỗi khi xóa thành viên:', err);
      Alert.alert('Lỗi', 'Không thể xóa thành viên, vui lòng thử lại');
    }
  };

  const handleLeaveGroup = () => {
    Alert.alert(
      'Xác nhận',
      'Bạn có chắc muốn rời khỏi nhóm?',
      [
        { text: 'Hủy', style: 'cancel' },
        { text: 'Rời nhóm', style: 'destructive', onPress: leaveGroup }
      ]
    );
  };

  const leaveGroup = async () => {
    try {
      await apiClient.delete(`/api/messages/groups/${groupId}/leave`);
      
      Alert.alert('Thành công', 'Đã rời khỏi nhóm', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } catch (err) {
      console.error('Lỗi khi rời nhóm:', err);
      Alert.alert('Lỗi', 'Không thể rời nhóm, vui lòng thử lại');
    }
  };

  const renderMember = ({ item }: { item: GroupMember }) => (
    <View className="flex-row items-center justify-between px-4 py-3 border-b border-gray-800">
      <View className="flex-row items-center flex-1">
        <Image 
          source={{ 
            uri: item.profile_picture || `https://ui-avatars.com/api/?name=${encodeURIComponent(item.username)}&background=random` 
          }} 
          className="w-12 h-12 rounded-full"
        />
        
        <View className="ml-3 flex-1">
          <View className="flex-row items-center">
            <Text className="text-white font-semibold">{item.username}</Text>
            {item.role === 'admin' && (
              <View className="ml-2 bg-blue-500 px-2 py-1 rounded-full">
                <Text className="text-white text-xs">Admin</Text>
              </View>
            )}
            {item.user_id === currentUserId && (
              <Text className="text-gray-400 text-sm ml-2">Bạn</Text>
            )}
          </View>
          <Text className="text-gray-400 text-sm">
            Tham gia {new Date(item.joined_at).toLocaleDateString('vi-VN')}
          </Text>
        </View>
      </View>
      
      {isAdmin && item.user_id !== currentUserId && (
        <TouchableOpacity 
          onPress={() => handleRemoveMember(item)}
          className="p-2"
        >
          <Ionicons name="remove-circle-outline" size={24} color="#ff3b30" />
        </TouchableOpacity>
      )}
    </View>
  );

  if (isLoading) {
    return (
      <SafeAreaView edges={['top' as Edge]} className="flex-1 bg-black">
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#0095f6" />
        </View>
      </SafeAreaView>
    );
  }

  if (error || !groupInfo) {
    return (
      <SafeAreaView edges={['top' as Edge]} className="flex-1 bg-black">
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
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['top' as Edge]} className="flex-1 bg-black">
      <StatusBar style="light" />
      
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 py-2 border-b border-gray-800">
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        
        <Text className="text-white text-lg font-semibold">Thông tin nhóm</Text>
        
        <View className="w-6" />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Group Avatar & Name */}
        <View className="items-center py-6 border-b border-gray-800">
          <Image 
            source={{ 
              uri: groupInfo.group_avatar || `https://ui-avatars.com/api/?name=Group&size=128&background=7558ff&color=fff` 
            }} 
            className="w-24 h-24 rounded-full mb-4"
          />
          <Text className="text-white text-xl font-bold">{groupInfo.group_name}</Text>
          <Text className="text-gray-400 text-sm mt-1">
            {groupInfo.members.length} thành viên
          </Text>
        </View>

        {/* Members Section */}
        <View className="py-4">
          <View className="flex-row items-center justify-between px-4 py-3">
            <Text className="text-white text-lg font-semibold">
              Thành viên ({groupInfo.members.length})
            </Text>
            
            {isAdmin && (
              <TouchableOpacity 
                onPress={handleAddMembers}
                className="flex-row items-center bg-blue-500 px-3 py-2 rounded-full"
                disabled={isAddingMembers}
              >
                {isAddingMembers ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <>
                    <Ionicons name="person-add" size={16} color="white" />
                    <Text className="text-white font-medium ml-1">Thêm</Text>
                  </>
                )}
              </TouchableOpacity>
            )}
          </View>
          
          <FlatList
            data={groupInfo.members}
            keyExtractor={(item) => item.user_id.toString()}
            renderItem={renderMember}
            scrollEnabled={false}
          />
        </View>

        {/* Action Buttons */}
        <View className="px-4 py-6 space-y-4">
          <TouchableOpacity className="bg-gray-800 p-4 rounded-lg">
            <View className="flex-row items-center">
              <Ionicons name="notifications-outline" size={24} color="white" />
              <Text className="text-white ml-3 flex-1">Thông báo</Text>
              <Ionicons name="chevron-forward" size={20} color="#8e8e8e" />
            </View>
          </TouchableOpacity>

          <TouchableOpacity className="bg-gray-800 p-4 rounded-lg">
            <View className="flex-row items-center">
              <Ionicons name="color-palette-outline" size={24} color="white" />
              <Text className="text-white ml-3 flex-1">Chủ đề</Text>
              <Ionicons name="chevron-forward" size={20} color="#8e8e8e" />
            </View>
          </TouchableOpacity>

          <TouchableOpacity 
            onPress={handleLeaveGroup}
            className="bg-red-500 p-4 rounded-lg"
          >
            <View className="flex-row items-center justify-center">
              <Ionicons name="exit-outline" size={24} color="white" />
              <Text className="text-white font-medium ml-2">Rời nhóm</Text>
            </View>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
} 