import {
  ActivityIndicator,
  FlatList,
  Alert,
  ScrollView,
  Dimensions,
  RefreshControl,
  View,
  Text,
  TouchableOpacity,
  Modal,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  Feather,
  AntDesign,
  Entypo,
  SimpleLineIcons,
  FontAwesome5,
} from "@expo/vector-icons";
import { useRouter } from "expo-router";
import apiClient from "~/services/apiClient";
import {
  BottomSheetModal,
  BottomSheetModalProvider,
} from "@gorhom/bottom-sheet";
import { setRefreshFeedCallback, refreshFeed } from "~/services/feedService";

import AllCaughtUpScreen from "./allCaughtUp";
import PostListItem from "../../components/PostListItem";
import StoryList from "~/components/StoryList";
import CommentBottomSheet from "../../components/CommentBottomSheet";
import LikeBottomSheet from "../../components/LikeBottomSheet";

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

const stories = [
  {
    id: "1",
    username: "Your Story",
    image:
      "https://anhnail.vn/wp-content/uploads/2024/10/anh-meme-ech-xanh-5.webp",
    hasStory: false,
    isYourStory: true,
    isOpened: false,
  },
  {
    id: "2",
    username: "doanthang",
    image:
      "https://anhnail.vn/wp-content/uploads/2024/10/anh-meme-ech-xanh-5.webp",
    hasStory: true,
    isOpened: true,
  },
  {
    id: "3",
    username: "lappham",
    image:
      "https://anhnail.vn/wp-content/uploads/2024/10/anh-meme-ech-xanh-5.webp",
    hasStory: true,
    isOpened: true,
  },
  {
    id: "4",
    username: "vuong.quoc_echs",
    image:
      "https://anhnail.vn/wp-content/uploads/2024/10/anh-meme-ech-xanh-5.webp",
    hasStory: true,
    isOpened: false,
  },
  {
    id: "5",
    username: "echxanh",
    image:
      "https://anhnail.vn/wp-content/uploads/2024/10/anh-meme-ech-xanh-5.webp",
    hasStory: true,
    isOpened: false,
  },
  {
    id: "6",
    username: "jes.ech",
    image:
      "https://anhnail.vn/wp-content/uploads/2024/10/anh-meme-ech-xanh-5.webp",
    hasStory: true,
    isOpened: false,
  },
  {
    id: "7",
    username: "pepefrog",
    image:
      "https://anhnail.vn/wp-content/uploads/2024/10/anh-meme-ech-xanh-5.webp",
    hasStory: true,
    isOpened: false,
  },
];

export default function FeedScreen() {
  const router = useRouter();
  const [modalVisible, setModalVisible] = useState<boolean>(false);
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [page, setPage] = useState<number>(1);
  const [allCaughtUp, setAllCaughtUp] = useState(false);

  const commentSheetRef = useRef<BottomSheetModal>(null);
  const [selectedPostIdForComments, setSelectedPostIdForComments] = useState<
    number | null
  >(null);
  const likeSheetRef = useRef<BottomSheetModal>(null);
  const [selectedPostIdForLikes, setSelectedPostIdForLikes] = useState<
    number | null
  >(null);

  const handleCommentPosted = useCallback((updatedPostId: number) => {
    setPosts((currentPosts) =>
      currentPosts.map((post) => {
        if (post.post_id === updatedPostId) {
          return { ...post, comment_count: (post.comment_count || 0) + 1 };
        }
        return post;
      })
    );
  }, []);

  const fetchPosts = useCallback(
    async (fetchPage = 1, isRefreshAction = false) => {
      if (allCaughtUp && !isRefreshAction) return;
      if (isLoading && !isRefreshAction) return;
      if (isRefreshing && isRefreshAction) return;

      setIsLoading(true);
      if (isRefreshAction) setIsRefreshing(true);

      try {
        const response = await apiClient.get<{
          message: string;
          posts: Post[];
        }>(`/posts?page=${fetchPage}&limit=10`);
        const fetchedPosts = (response.data.posts || []).map((p) => ({
          ...p,
          is_liked: p.is_liked ?? Math.random() < 0.3,
          profile_picture: p.profile_picture || null,
        }));

        if (fetchedPosts.length === 0) {
          setAllCaughtUp(true);
          if (fetchPage === 1) setPosts([]);
        } else {
          if (fetchPage === 1) setAllCaughtUp(false);
          setPosts((prev) =>
            fetchPage === 1 ? fetchedPosts : [...prev, ...fetchedPosts]
          );
          if (fetchedPosts.length < 10) setAllCaughtUp(true);
        }
      } catch (error: any) {
        console.error(
          "API error fetching posts:",
          error.response?.data || error
        );
        Alert.alert("Lỗi", "Không thể tải bài viết");
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [allCaughtUp, isLoading, isRefreshing]
  );

  useEffect(() => {
    setRefreshFeedCallback(() => {
      console.log("Feed Screen: Đang refresh từ callback");
      onRefresh();
    });

    setPosts([]);
    setPage(1);
    setAllCaughtUp(false);
    fetchPosts(1, true);

    return () => {
      setRefreshFeedCallback(() => {});
    };
  }, []);

  const onRefresh = useCallback(() => {
    console.log("Feed Screen: Đang thực hiện refresh");
    
    // Tăng cường refresh bằng cách force reload dữ liệu
    setIsRefreshing(true);
    
    // Xóa trạng thái cũ
    setPosts([]);
    setPage(1);
    setAllCaughtUp(false);
    
    // Xóa cache posts trước
    apiClient.get('/cache/clear/posts')
      .then(() => {
        console.log('Đã xóa cache posts trước khi refresh');
        // Tạo timestamp để tránh cache
        const timestamp = Date.now();
        
        // Fetch lại dữ liệu với force = true để không dùng cache
        return apiClient.get<{ message: string; posts: Post[] }>(`/posts?page=1&limit=20&_=${timestamp}`);
      })
      .then(response => {
        const fetchedPosts = (response.data.posts || []).map((p) => ({
          ...p,
          is_liked: p.is_liked ?? Math.random() < 0.3,
          profile_picture: p.profile_picture || null,
        }));
        
        console.log(`Feed Screen: Đã nhận ${fetchedPosts.length} bài viết`);
        setPosts(fetchedPosts);
        
        if (fetchedPosts.length < 20) {
          setAllCaughtUp(true);
        }
        
        setIsRefreshing(false);
      })
      .catch(error => {
        console.error("API error refreshing posts:", error);
        Alert.alert("Lỗi", "Không thể tải bài viết");
        setIsRefreshing(false);
      });
  }, []);

  const loadMorePosts = () => {
    if (!isLoading && !isRefreshing && !allCaughtUp) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchPosts(nextPage, false);
    }
  };

  const renderFooter = () => {
    if (isLoading && !isRefreshing) {
      return (
        <View className="py-5">
          <ActivityIndicator size="large" color="#0000ff" />
        </View>
      );
    }
    if (allCaughtUp && posts.length > 0 && !isLoading && !isRefreshing) {
      return <AllCaughtUpScreen />;
    }
    return null;
  };

  const openCommentSheet = useCallback((postId: number) => {
    setSelectedPostIdForComments(postId);
    commentSheetRef.current?.present();
  }, []);

  const openLikeSheet = useCallback((postId: number) => {
    setSelectedPostIdForLikes(postId);
    likeSheetRef.current?.present();
  }, []);

  return (
    <BottomSheetModalProvider>
      <SafeAreaView className="flex-1 bg-white">
        <View className="flex-row items-center justify-between px-4 py-2 border-b border-gray-100">
          <TouchableOpacity onPress={() => setModalVisible(true)}>
            <View className="flex-row items-center">
              <Text className="text-2xl font-bold">Instagram</Text>
              <Entypo
                name="chevron-small-down"
                size={20}
                color="black"
                style={{ marginTop: 2 }}
              />
            </View>
          </TouchableOpacity>
          <View className="flex-row">
            <TouchableOpacity
              className="px-3"
              onPress={() => router.push("/feed/notification")}
            >
              <Feather name="heart" size={24} color="black" />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => router.push("/feed/listmessage")}>
              <AntDesign name="message1" size={24} color="black" />
            </TouchableOpacity>
          </View>
        </View>

        <View className="py-2 border-b border-gray-100">
          <StoryList stories={stories} />
        </View>

        <Modal
          visible={modalVisible}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setModalVisible(false)}
        >
          <TouchableOpacity
            style={{ flex: 1 }}
            activeOpacity={1}
            onPress={() => setModalVisible(false)}
          >
            <View
              className="absolute mt-28 left-4 bg-white p-4 rounded-lg shadow-lg"
              style={{ elevation: 5 }}
            >
              <TouchableOpacity
                onPress={() => {
                  setModalVisible(false);
                }}
              >
                <View className="flex-row items-center gap-3">
                  <SimpleLineIcons
                    name="user-following"
                    size={20}
                    color="black"
                  />
                  <Text className="text-lg">Đang theo dõi</Text>
                </View>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  setModalVisible(false);
                }}
                className="mt-2"
              >
                <View className="flex-row items-center gap-3">
                  <FontAwesome5 name="star" size={22} color="black" />
                  <Text className="text-lg">Yêu thích</Text>
                </View>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>

        <FlatList
          className="flex-1"
          data={posts}
          renderItem={({ item }) => (
            <PostListItem
              posts={item}
              onCommentPress={openCommentSheet}
              onLikeCountPress={openLikeSheet}
            />
          )}
          keyExtractor={(item) => item.post_id.toString()}
          onEndReached={loadMorePosts}
          onEndReachedThreshold={0.5}
          ListFooterComponent={renderFooter}
          contentContainerStyle={{ flexGrow: 1, paddingBottom: 10, gap: 10 }}
          ListEmptyComponent={
            isLoading && posts.length === 0 ? (
              <View className="flex-1 justify-center items-center">
                <ActivityIndicator size="large" color="#0000ff" />
              </View>
            ) : !isLoading && !isRefreshing && posts.length === 0 ? (
              allCaughtUp ? (
                <AllCaughtUpScreen />
              ) : (
                <View className="flex-1 justify-center items-center p-5">
                  <Text className="text-gray-500 text-center">
                    Chưa có bài viết nào.
                  </Text>
                </View>
              )
            ) : null
          }
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={onRefresh}
              colors={["#007AFF"]}
              tintColor={"#007AFF"}
            />
          }
        />
        <CommentBottomSheet
          ref={commentSheetRef}
          postId={selectedPostIdForComments}
          onCommentAdded={handleCommentPosted}
        />
        <LikeBottomSheet ref={likeSheetRef} postId={selectedPostIdForLikes} />
      </SafeAreaView>
    </BottomSheetModalProvider>
  );
}
