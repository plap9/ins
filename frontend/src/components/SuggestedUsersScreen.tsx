import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  Image,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { getSuggestedUsers, User } from '~/services/followService';
import { getS3Url } from '~/utils/config';
import FollowButton from './FollowButton';

interface SuggestedUsersScreenProps {
  onUserFollowed?: () => void;
  onClose?: () => void;
  showHeader?: boolean;
}

const SuggestedUsersScreen: React.FC<SuggestedUsersScreenProps> = ({
  onUserFollowed,
  onClose,
  showHeader = true
}) => {
  const [suggestedUsers, setSuggestedUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSuggestedUsers = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }
      setError(null);

      const response = await getSuggestedUsers(20);
      setSuggestedUsers(response.suggested_users);
    } catch (error: any) {
      console.error('Lỗi khi lấy suggested users:', error);
      setError('Không thể tải danh sách gợi ý. Vui lòng thử lại.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchSuggestedUsers();
  }, []);

  const handleFollowChange = (userId: number, isFollowing: boolean) => {
    // Update local state
    setSuggestedUsers(prev => 
      prev.map(user => 
        user.user_id === userId 
          ? { ...user, is_following: isFollowing }
          : user
      )
    );

    if (isFollowing && onUserFollowed) {
      onUserFollowed();
    }
  };

  const handleRefresh = () => {
    fetchSuggestedUsers(true);
  };

  const renderUserItem = ({ item }: { item: User }) => {
    const profileImageUrl = item.profile_picture ? getS3Url(item.profile_picture) : null;

    return (
      <View className="flex-row items-center p-4 bg-white">
        {profileImageUrl ? (
          <Image
            source={{ uri: profileImageUrl }}
            className="w-12 h-12 rounded-full bg-gray-200"
          />
        ) : (
          <View className="w-12 h-12 rounded-full bg-gray-300 items-center justify-center">
            <Text className="text-gray-500 font-bold text-lg">
              {item.username.charAt(0).toUpperCase()}
            </Text>
          </View>
        )}

        <View className="flex-1 ml-3">
          <Text className="font-semibold text-base" numberOfLines={1}>
            {item.username}
          </Text>
          {item.full_name && (
            <Text className="text-gray-600 text-sm" numberOfLines={1}>
              {item.full_name}
            </Text>
          )}
          {item.bio && (
            <Text className="text-gray-500 text-sm mt-1" numberOfLines={2}>
              {item.bio}
            </Text>
          )}
          <View className="flex-row items-center mt-1">
            <Text className="text-gray-500 text-xs">
              {item.followers_count || 0} người theo dõi
            </Text>
            {item.mutual_follows_count && item.mutual_follows_count > 0 && (
              <Text className="text-blue-500 text-xs ml-2">
                • {item.mutual_follows_count} bạn chung
              </Text>
            )}
          </View>
        </View>

        <FollowButton
          userId={item.user_id}
          username={item.username}
          initialFollowState={item.is_following}
          onFollowChange={(isFollowing) => handleFollowChange(item.user_id, isFollowing)}
          size="small"
        />
      </View>
    );
  };

  const renderEmptyState = () => (
    <View className="flex-1 items-center justify-center p-8">
      <Feather name="users" size={64} color="#9CA3AF" />
      <Text className="text-xl font-semibold text-gray-700 mt-4 text-center">
        Không có gợi ý nào
      </Text>
      <Text className="text-gray-500 text-center mt-2">
        Hiện tại chưa có người dùng nào để gợi ý. Hãy thử lại sau.
      </Text>
      <TouchableOpacity
        onPress={() => fetchSuggestedUsers()}
        className="bg-blue-500 px-6 py-3 rounded-lg mt-4"
      >
        <Text className="text-white font-medium">Thử lại</Text>
      </TouchableOpacity>
    </View>
  );

  const renderErrorState = () => (
    <View className="flex-1 items-center justify-center p-8">
      <Feather name="alert-circle" size={64} color="#EF4444" />
      <Text className="text-xl font-semibold text-gray-700 mt-4 text-center">
        Có lỗi xảy ra
      </Text>
      <Text className="text-gray-500 text-center mt-2">
        {error}
      </Text>
      <TouchableOpacity
        onPress={() => fetchSuggestedUsers()}
        className="bg-blue-500 px-6 py-3 rounded-lg mt-4"
      >
        <Text className="text-white font-medium">Thử lại</Text>
      </TouchableOpacity>
    </View>
  );

  const renderLoadingState = () => (
    <View className="flex-1 items-center justify-center">
      <ActivityIndicator size="large" color="#3B82F6" />
      <Text className="text-gray-500 mt-4">Đang tải gợi ý...</Text>
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      {showHeader && (
        <View className="flex-row items-center justify-between p-4 bg-white border-b border-gray-200">
          <Text className="text-xl font-bold">Gợi ý theo dõi</Text>
          {onClose && (
            <TouchableOpacity onPress={onClose} className="p-2">
              <Feather name="x" size={24} color="#374151" />
            </TouchableOpacity>
          )}
        </View>
      )}

      {isLoading ? (
        renderLoadingState()
      ) : error ? (
        renderErrorState()
      ) : suggestedUsers.length === 0 ? (
        renderEmptyState()
      ) : (
        <FlatList
          data={suggestedUsers}
          renderItem={renderUserItem}
          keyExtractor={(item) => item.user_id.toString()}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              colors={['#3B82F6']}
              tintColor="#3B82F6"
            />
          }
          ItemSeparatorComponent={() => (
            <View className="h-px bg-gray-200 ml-16" />
          )}
          contentContainerStyle={{ flexGrow: 1 }}
        />
      )}
    </SafeAreaView>
  );
};

export default SuggestedUsersScreen; 