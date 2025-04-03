import React, { useState, useEffect } from "react";
import { View, Image, FlatList, Text, ActivityIndicator, TouchableOpacity, Dimensions } from "react-native";
import apiClient from "~/services/apiClient";
import { useRouter } from "expo-router";

interface Post {
  post_id: number;
  content: string;
  created_at: string;
  media_urls: string[];
  media_types: string[];
}

interface ApiResponse {
  success: boolean;
  posts: Post[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPage: number;
  };
}

interface ProfilePostListProps {
  activeTab: "posts" | "reels" | "tags";
  userId?: number;
}

const ProfilePostList: React.FC<ProfilePostListProps> = ({ activeTab, userId }) => {
  const [loading, setLoading] = useState<boolean>(false);
  const [posts, setPosts] = useState<Post[]>([]);
  const [reels, setReels] = useState<Post[]>([]);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const screenWidth = Dimensions.get('window').width;
  const itemSize = screenWidth / 3;

  useEffect(() => {
    const fetchUserPosts = async () => {
      if (!userId) return;

      setLoading(true);
      setError(null);

      try {
        console.log(`Đang lấy bài đăng của người dùng: ${userId}`);
        const response = await apiClient.get<ApiResponse>(`/posts?user_id=${userId}&page=1&limit=50`);
        console.log("API response:", response.data);
        
        if (response.data && response.data.posts) {
          const allPosts = response.data.posts;
          
          const safeAllPosts = allPosts.map(post => ({
            ...post,
            media_types: post.media_types || [],
            media_urls: post.media_urls || []
          }));
          
          const userPosts = safeAllPosts.filter((post) => 
            !post.media_types.includes('video')
          );
          
          const userReels = safeAllPosts.filter((post) => 
            post.media_types.includes('video')
          );
          
          console.log(`Số lượng posts: ${userPosts.length}, reels: ${userReels.length}`);
          
          setPosts(userPosts);
          setReels(userReels);
        } else {
          console.log("Không có dữ liệu bài đăng");
          setPosts([]);
          setReels([]);
        }
      } catch (err) {
        console.error("Lỗi khi lấy bài đăng của người dùng:", err);
        setError("Không thể tải bài đăng. Vui lòng thử lại sau.");
        setPosts([]);
        setReels([]);
      } finally {
        setLoading(false);
      }
    };

    fetchUserPosts();
  }, [userId]);

  const handlePostPress = (postId: number) => {
    router.push(`/post/${postId}`);
  };

  let currentData: Post[] = [];
  if (activeTab === "posts") currentData = posts;
  if (activeTab === "reels") currentData = reels;

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }

  if (error) {
    return (
      <View className="flex-1 items-center justify-center">
        <Text className="text-red-500">{error}</Text>
      </View>
    );
  }

  if (currentData.length === 0) {
    return (
      <View className="flex-1 items-center justify-center">
        <Text className="text-gray-500">
          {activeTab === "posts" 
            ? "Chưa có bài viết nào" 
            : activeTab === "reels" 
              ? "Chưa có reels nào"
              : "Chưa có ảnh được gắn thẻ"}
        </Text>
      </View>
    );
  }

  const renderItem = ({ item }: { item: Post }) => (
    <TouchableOpacity 
      onPress={() => handlePostPress(item.post_id)}
      style={{
        width: itemSize,
        height: itemSize,
        padding: 1
      }}
    >
      {item.media_urls && item.media_urls.length > 0 ? (
        <Image 
          source={{ uri: item.media_urls[0] }} 
          style={{
            width: '100%',
            height: '100%'
          }}
        />
      ) : (
        <View 
          style={{
            width: '100%',
            height: '100%',
            backgroundColor: '#E0E0E0',
            justifyContent: 'center',
            alignItems: 'center'
          }}
        >
          <Text style={{ color: '#9E9E9E', fontSize: 12 }}>Không có ảnh</Text>
        </View>
      )}
    </TouchableOpacity>
  );

  return (
    <View className="flex-1">
      <FlatList
        data={currentData}
        renderItem={renderItem}
        keyExtractor={(item) => item.post_id.toString()}
        numColumns={3}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          flexGrow: 1,
          paddingBottom: 20
        }}
      />
    </View>
  );
};

export default ProfilePostList;
