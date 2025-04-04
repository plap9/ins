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
import StoriesList from "../../components/story/StoriesList";
import CommentBottomSheet from "../../components/CommentBottomSheet";
import LikeBottomSheet from "../../components/LikeBottomSheet";
import StoryLibraryScreen from "../../components/story/StoryLibraryScreen";
import StoryService from "../../services/storyService";

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

export default function FeedScreen() {
  const router = useRouter();
  const [modalVisible, setModalVisible] = useState<boolean>(false);
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [page, setPage] = useState<number>(1);
  const [allCaughtUp, setAllCaughtUp] = useState(false);
  const [showStoryButton, setShowStoryButton] = useState(true);
  const [showStoryLibrary, setShowStoryLibrary] = useState(false);

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
    
    setIsRefreshing(true);
    
    setPosts([]);
    setPage(1);
    setAllCaughtUp(false);
    
    apiClient.get('/cache/clear/posts')
      .then(() => {
        console.log('Đã xóa cache posts trước khi refresh');
        const timestamp = Date.now();
        
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

  const handleCreateStory = () => {
    console.log("Opening story library from feed");
    setShowStoryLibrary(true);
  };

  const handleCloseStoryLibrary = () => {
    console.log("Closing story library");
    setShowStoryLibrary(false);
  };

  const handleOpenCamera = async () => {
    try {
      console.log("Mở camera từ feed...");
      const photo = await StoryService.takePhoto();
      if (photo) {
        console.log("Chụp ảnh thành công:", photo);
        Alert.alert("Thành công", "Đã chụp ảnh thành công");
      }
    } catch (error) {
      console.error("Lỗi khi chụp ảnh:", error);
      Alert.alert("Lỗi", "Không thể mở camera");
    }
  };

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
          ListHeaderComponent={
            <View className="border-b border-gray-100">
              <StoriesList />
            </View>
          }
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

        <CommentBottomSheet
          ref={commentSheetRef}
          postId={selectedPostIdForComments}
          onCommentAdded={handleCommentPosted}
        />
        <LikeBottomSheet ref={likeSheetRef} postId={selectedPostIdForLikes} />

        {showStoryButton && (
          <TouchableOpacity
            style={{
              position: 'absolute',
              bottom: 30,
              right: 30,
              backgroundColor: '#0095f6',
              padding: 15,
              borderRadius: 30,
              elevation: 5,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.25,
              shadowRadius: 3.84,
            }}
            onPress={() => {
              Alert.alert(
                "Tạo story",
                "Chọn cách tạo story",
                [
                  { text: "Hủy", style: "cancel" },
                  { 
                    text: "Mở camera", 
                    onPress: handleOpenCamera
                  },
                  { 
                    text: "Chọn từ thư viện", 
                    onPress: handleCreateStory
                  }
                ]
              );
            }}
          >
            <AntDesign name="plus" size={24} color="white" />
          </TouchableOpacity>
        )}

        <Modal
          visible={showStoryLibrary}
          animationType="slide"
          onRequestClose={handleCloseStoryLibrary}
          presentationStyle="fullScreen"
          statusBarTranslucent={true}
        >
          <StoryLibraryScreen onClose={handleCloseStoryLibrary} />
        </Modal>
      </SafeAreaView>
    </BottomSheetModalProvider>
  );
}
