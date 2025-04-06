import React, { useState, useEffect } from "react";
import {
  View,
  Image,
  FlatList,
  Text,
  ActivityIndicator,
  TouchableOpacity,
  Dimensions,
  Modal,
  ScrollView,
} from "react-native";
import apiClient from "~/services/apiClient";
import { useRouter } from "expo-router";
import { getS3Url } from "../utils/config";
import PostListItem from "~/components/PostListItem";

interface Post {
  post_id: number;
  content: string;
  location?: string;
  post_privacy: string;
  created_at: string;
  updated_at: string;
  like_count: number;
  comment_count: number;
  user_id: number;
  username: string;
  profile_picture: string | null;
  media_urls: string[];
  media_types: string[];
  is_liked?: boolean;
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

const ProfilePostList: React.FC<ProfilePostListProps> = ({
  activeTab,
  userId,
}) => {
  const [loading, setLoading] = useState<boolean>(false);
  const [posts, setPosts] = useState<Post[]>([]);
  const [reels, setReels] = useState<Post[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [selectedPost, setSelectedPost] = useState<number | null>(null);
  const [showPostModal, setShowPostModal] = useState<boolean>(false);
  const [selectedPostsCollection, setSelectedPostsCollection] = useState<
    Post[]
  >([]);
  const router = useRouter();
  const screenWidth = Dimensions.get("window").width;
  const itemSize = screenWidth / 3;

  useEffect(() => {
    const fetchUserPosts = async () => {
      if (!userId) {
        console.error("Không có user ID");
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const response = await apiClient.get<ApiResponse>(
          `/posts?user_id=${userId}&page=1&limit=50`
        );
        if (response.data && response.data.posts) {
          const allPosts = response.data.posts;

          const safeAllPosts = allPosts.map((post) => ({
            ...post,
            media_types: post.media_types || [],
            media_urls: post.media_urls || [],
          }));

          const sortedPosts = safeAllPosts.sort(
            (a, b) =>
              new Date(b.created_at).getTime() -
              new Date(a.created_at).getTime()
          );

          const userPosts = sortedPosts.filter((post) => {
            if (!post.media_types || post.media_types.length === 0) {
              return true;
            }
            return !post.media_types.some(
              (type) => type && type.includes("video")
            );
          });

          const userReels = sortedPosts.filter((post) => {
            if (!post.media_types || post.media_types.length === 0) {
              return false;
            }
            return post.media_types.some(
              (type) => type && type.includes("video")
            );
          });
          setPosts(userPosts);
          setReels(userReels);
        } else {
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
    const post = currentData.find((p) => p.post_id === postId);
    if (!post) return;

    const sortedPosts = [...currentData].sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    setSelectedPost(postId);
    setSelectedPostsCollection(sortedPosts);
    setShowPostModal(true);
  };

  const handleCloseModal = () => {
    setShowPostModal(false);
    setSelectedPost(null);
  };

  const handleLikeCountPress = (postId: number) => {
    console.log(`Xem danh sách người thích bài viết ${postId}`);
  };

  const handleCommentPress = (postId: number) => {
    console.log(`Xem bình luận của bài viết ${postId}`);
  };

  let currentData: Post[] = [];
  if (activeTab === "posts") currentData = posts;
  if (activeTab === "reels") currentData = reels;

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center py-4">
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }

  if (error) {
    return (
      <View className="flex-1 items-center justify-center py-4">
        <Text className="text-red-500">{error}</Text>
      </View>
    );
  }

  if (currentData.length === 0) {
    return (
      <View className="flex-1 items-center justify-center py-8">
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

  const renderItem = ({ item }: { item: Post }) => {
    const mediaUrl =
      item.media_urls && item.media_urls.length > 0
        ? getS3Url(item.media_urls[0])
        : null;


    return (
      <TouchableOpacity
        onPress={() => handlePostPress(item.post_id)}
        style={{
          width: itemSize,
          height: itemSize,
          padding: 1,
        }}
      >
        {mediaUrl ? (
          <Image
            source={{ uri: mediaUrl }}
            style={{
              width: "100%",
              height: "100%",
            }}
          />
        ) : (
          <View
            style={{
              width: "100%",
              height: "100%",
              backgroundColor: "#E0E0E0",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <Text style={{ color: "#9E9E9E", fontSize: 12 }}>Không có ảnh</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={{ flex: 1, minHeight: 300 }}>
      <FlatList
        data={currentData}
        renderItem={renderItem}
        keyExtractor={(item) => item.post_id.toString()}
        numColumns={3}
        showsVerticalScrollIndicator={true}
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingBottom: 20,
        }}
        ListEmptyComponent={() => (
          <View className="flex-1 items-center justify-center py-8">
            <Text className="text-gray-500">Không có dữ liệu</Text>
          </View>
        )}
      />

      {/* Modal hiển thị chi tiết bài viết */}
      <Modal
        visible={showPostModal}
        animationType="slide"
        onRequestClose={handleCloseModal}
      >
        <View className="flex-1 bg-white">
          <View className="flex-row items-center p-2 border-b border-gray-200">
            <TouchableOpacity onPress={handleCloseModal} className="p-2">
              <Text className="text-blue-500 font-semibold">Đóng</Text>
            </TouchableOpacity>
            <Text className="text-lg font-bold flex-1 text-center">
              Bài viết
            </Text>
            <View className="w-12"></View>
          </View>

          <FlatList
            data={selectedPostsCollection}
            keyExtractor={(item) => item.post_id.toString()}
            renderItem={({ item }) => (
              <PostListItem
                posts={item}
                onLikeCountPress={handleLikeCountPress}
                onCommentPress={handleCommentPress}
              />
            )}
            initialScrollIndex={selectedPostsCollection.findIndex(
              (p) => p.post_id === selectedPost
            )}
            getItemLayout={(data, index) => ({
              length: 500, 
              offset: 500 * index,
              index,
            })}
            showsVerticalScrollIndicator={true}
          />
        </View>
      </Modal>
    </View>
  );
};

export default ProfilePostList;
