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
  StatusBar,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  Feather,
  AntDesign,
  Entypo,
  SimpleLineIcons,
  FontAwesome5,
  MaterialIcons,
} from "@expo/vector-icons";
import { useRouter } from "expo-router";
import apiClient from "~/services/apiClient";
import {
  BottomSheetModal,
  BottomSheetModalProvider,
} from "@gorhom/bottom-sheet";
import { setRefreshFeedCallback, refreshFeed, getFeed, clearFeedCache, FeedType } from "~/services/feedService";
import AuthContext from "~/app/context/AuthContext";

import AllCaughtUpScreen from "./allCaughtUp";
import PostListItem from "../../components/PostListItem";
import StoriesList from "../../components/story/StoriesList";
import CommentBottomSheet from "../../components/CommentBottomSheet";
import LikeBottomSheet from "../../components/LikeBottomSheet";
import StoryLibraryScreen from "../../components/story/StoryLibraryScreen";
import StoryService from "../../services/storyService";

interface Post {
  post_id: number;
  content?: string;
  location?: string;
  post_privacy: string;
  created_at: string;
  updated_at: string;
  like_count: number;
  comment_count: number;
  user_id: number;
  username: string;
  profile_picture?: string;
  media_urls: string[];
  media_types: string[];
  is_liked?: boolean;
  feed_type?: 'following' | 'discover';
  engagement_score?: number;
}

export default function FeedScreen() {
  const router = useRouter();
  const { authData } = React.useContext(AuthContext);
  const [modalVisible, setModalVisible] = useState<boolean>(false);
  const [storyModalVisible, setStoryModalVisible] = useState<boolean>(false);
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [page, setPage] = useState<number>(1);
  const [allCaughtUp, setAllCaughtUp] = useState(false);
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
        const response = await getFeed(fetchPage, 10, 'following', isRefreshAction);
        const fetchedPosts = (response.posts || []).map((p) => ({
          ...p,
          is_liked: p.is_liked ?? false,
          profile_picture: p.profile_picture || undefined,
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

    const onRefresh = useCallback(async () => {
    setIsRefreshing(true);
    
    setPosts([]);
    setPage(1);
    setAllCaughtUp(false);
    
    try {
      await clearFeedCache();
      const response = await getFeed(1, 20, 'following', true);
      const fetchedPosts = (response.posts || []).map((p) => ({
        ...p,
        is_liked: p.is_liked ?? false,
        profile_picture: p.profile_picture || undefined,
      }));
      
      setPosts(fetchedPosts);
      
      if (fetchedPosts.length < 20) {
        setAllCaughtUp(true);
      }
    } catch (error) {
      console.error("API error refreshing posts:", error);
      Alert.alert("Lỗi", "Không thể tải bài viết");
    } finally {
      setIsRefreshing(false);
    }
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

  const openStoryLibrary = useCallback(() => {
    setShowStoryLibrary(true);
  }, []);

  const closeStoryLibrary = useCallback(() => {
    setShowStoryLibrary(false);
  }, []);

  const handleCreateStory = () => {
    setShowStoryLibrary(true);
    setStoryModalVisible(false);
  };

  const handleOpenCamera = async () => {
    try {
      const photo = await StoryService.takePhoto();
      if (photo) {
        Alert.alert("Thành công", "Đã chụp ảnh thành công");
      }
      setStoryModalVisible(false);
    } catch (error) {
      console.error("Lỗi khi chụp ảnh:", error);
      Alert.alert("Lỗi", "Không thể mở camera");
    }
  };

  const handleOpenMusicSelector = () => {
    Alert.alert("Thông báo", "Chức năng nhạc đang được phát triển");
    setStoryModalVisible(false);
  };

  const handleOpenTemplates = () => {
    Alert.alert("Thông báo", "Chức năng mẫu đang được phát triển");
    setStoryModalVisible(false);
  };

  return (
    <BottomSheetModalProvider>
      <View className="flex-1 bg-white" style={{ paddingTop: Platform.OS === 'ios' ? 44 : StatusBar.currentHeight || 0 }}>
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
            <TouchableOpacity onPress={() => router.push("/message")}>
              <Feather name="send" size={24} color="black" />
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
            <View>
              <StoriesList 
                navigation={router}
                userId={String(authData?.user?.user_id || 0)}
                openStoryLibrary={() => setShowStoryLibrary(true)} 
              />
            </View>
          }
          ListFooterComponent={renderFooter}
          contentContainerStyle={{ flexGrow: 1 }}
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

        {/* Modal cho menu chính */}
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

        <Modal
          visible={showStoryLibrary}
          animationType="slide"
          onRequestClose={closeStoryLibrary}
          presentationStyle="fullScreen"
          statusBarTranslucent={true}
        >
          <StoryLibraryScreen onClose={closeStoryLibrary} />
        </Modal>
      </View>
    </BottomSheetModalProvider>
  );
}