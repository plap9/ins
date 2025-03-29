import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, Image, ActivityIndicator, Alert, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';
import apiClient from '~/services/apiClient';

interface Liker {
  user_id: number;
  username: string;
  profile_picture: string | null;
  is_following?: boolean;
}

const DEFAULT_AVATAR = 'https://via.placeholder.com/100';

export default function LikersScreen() {
  const { postId } = useLocalSearchParams<{ postId: string }>();
  const [likers, setLikers] = useState<Liker[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLikers = useCallback(async () => {
    if (!postId) return;
    console.log(`Workspaceing likers for post ${postId}`);
    setLoading(true);
    setError(null);
    try {
      const response = await apiClient.get<{ users: Liker[] }>(`/posts/${postId}/likes`);
      setLikers(response.data.users || []);
      console.log(`Workspaceed ${response.data.users?.length || 0} likers.`);
    } catch (err) {
      console.error("Failed to fetch likers:", err);
      setError('Không thể tải danh sách người thích. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  }, [postId]);

  useEffect(() => {
    fetchLikers();
  }, [fetchLikers]);

  const handleFollowToggle = async (userId: number, currentlyFollowing?: boolean) => {
    console.log(`Toggle follow for user ${userId}, currently following: ${currentlyFollowing}`);
     const originalLikers = [...likers]; 
     setLikers(prevLikers =>
         prevLikers.map(liker =>
             liker.user_id === userId
                 ? { ...liker, is_following: !currentlyFollowing }
                 : liker
         )
     );

     try {
         console.log("API call for follow/unfollow simulated successfully");

     } catch (apiError) {
         console.error("Failed to toggle follow:", apiError);
         setLikers(originalLikers);
         Alert.alert('Lỗi', 'Không thể thay đổi trạng thái theo dõi. Vui lòng thử lại.');
     }
  };

  const renderLikerItem = ({ item }: { item: Liker }) => (
    <View className="flex-row items-center px-4 py-2.5 border-b border-gray-200">
      <Image
        source={{ uri: item.profile_picture || DEFAULT_AVATAR }}
        className="w-11 h-11 rounded-full mr-3 bg-gray-200" 
      />
      <View className="flex-1 justify-center">
        <Text className="font-bold text-sm">{item.username}</Text>
      </View>
      <TouchableOpacity
         className={`py-1.5 px-4 rounded-lg border ${
            item.is_following
            ? 'bg-white border-gray-300' 
            : 'bg-blue-500 border-blue-500' 
         }`}
         onPress={() => handleFollowToggle(item.user_id, item.is_following)}
       >
         <Text className={`font-semibold text-xs ${
            item.is_following ? 'text-black' : 'text-white' 
         }`}>
           {item.is_following ? 'Đang theo dõi' : 'Theo dõi'}
         </Text>
       </TouchableOpacity>
    </View>
  );

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-white p-5">
        <ActivityIndicator size="large" color="#007AFF"/>
      </View>
    );
  }

  if (error) {
    return (
      <View className="flex-1 justify-center items-center bg-white p-5">
        <Text className="text-red-600 text-center mb-4">{error}</Text>
        <TouchableOpacity onPress={fetchLikers} className="bg-blue-500 py-2 px-5 rounded-md">
            <Text className="text-white font-bold">Thử lại</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-white">
      <Stack.Screen options={{ title: 'Lượt thích' }} />

      {likers.length === 0 && !loading ? ( 
           <View className="flex-1 justify-center items-center p-5">
               <Text className="text-gray-500 text-base">Chưa có ai thích bài viết này.</Text>
           </View>
      ) : (
          <FlatList
            data={likers}
            renderItem={renderLikerItem}
            keyExtractor={(item) => item.user_id.toString()}
            contentContainerStyle={{ paddingBottom: 20 }} 
          />
      )}
    </View>
  );
}
