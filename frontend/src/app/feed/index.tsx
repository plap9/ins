import { ActivityIndicator, FlatList, SafeAreaView, Alert, ScrollView, Dimensions, RefreshControl } from "react-native";
import React, { useState, useEffect, useCallback } from "react";
import { View, Text, TouchableOpacity, Modal } from "react-native";
import { Feather, AntDesign, Entypo, SimpleLineIcons, FontAwesome5, } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import apiClient from "~/services/apiClient";
import AllCaughtUpScreen from "./allCaughtUp";
import PostListItem from "../../components/PostListItem";
import StoryList from "~/components/StoryList";

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
  profile_picture: string;
  media_urls: string[];
  media_types: string[];
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
  const [loading, setLoading] = useState<boolean>(true);
  const [page, setPage] = useState<number>(1);
  const [allCaughtUp, setAllCaughtUp] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  const fetchPosts = useCallback(async (fetchPage = 1, isRefreshAction = false) => {
    if (!isRefreshAction && allCaughtUp) return;

    try {
      if (isRefreshAction) {
        setIsRefreshing(true);
        setAllCaughtUp(false); 
      } else {
        setLoading(true);
      }

      const response = await apiClient.get<{ message: string; posts: Post[] }>(
        `/posts?page=${fetchPage}&limit=10`
      );

      const fetchedPosts = response.data.posts || [];

      if (fetchedPosts.length === 0) {
        setAllCaughtUp(true);
        setPosts(prev => (fetchPage === 1 ? [] : prev));
        return;
      }

      setPosts(prev => 
        fetchPage === 1 ? fetchedPosts : [...prev, ...fetchedPosts]
      );

      setAllCaughtUp(fetchedPosts.length < 10);

    } catch (error) {
      console.error("API error:", error);
      Alert.alert("Lỗi", "Không thể tải bài viết");
      setAllCaughtUp(true);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [allCaughtUp]); 

  useEffect(() => {
    fetchPosts(1, false);
  }, []); 

  const onRefresh = useCallback(() => {
    if (!isRefreshing) {
      setPage(1);
      fetchPosts(1, true);
    }
  }, [fetchPosts, isRefreshing]);

  const loadMorePosts = useCallback(() => {
    if (!loading && !allCaughtUp && !isRefreshing) {
      setPage(prev => prev + 1);
      fetchPosts(page + 1, false);
    }
  }, [loading, allCaughtUp, isRefreshing, page]);

  const renderFooter = () => {
    if (!loading || isRefreshing) return null;
    return (
      <View style={{ paddingVertical: 20 }}>
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  };

  return (
    <View className="flex-1 bg-white">
      <View className="flex-1">
        {/* Header */}
        <View className="flex-row items-center justify-between px-4 py-2 border-b border-gray-100">
          {/* Nút bên trái: chữ Instagram */}
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

          {/* Nút bên phải: Notifications và Messages */}
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

        {/* Stories Section */}
        <View className="py-2 border-b border-gray-100">
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 8 }}
          >   
              <StoryList stories = {stories} /> 
          </ScrollView>
        </View>

        {/* Modal hiển thị khi bấm vào chữ "Instagram" */}
        <Modal
          visible={modalVisible}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setModalVisible(false)}
        >
          {/* Nút bấm ngoài modal để đóng */}
          <TouchableOpacity
            style={{ flex: 1 }}
            activeOpacity={1}
            onPress={() => setModalVisible(false)}
          >
            {/* Nội dung modal */}
            <View
              className="absolute mt-28 left-4 bg-white p-4 rounded-lg shadow-lg"
              style={{
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.25,
                shadowRadius: 3.84,
                elevation: 5,
              }}
            >
              <TouchableOpacity
                onPress={() => {
                  // Xử lý "Đang theo dõi"
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
                  // Xử lý "Yêu thích"
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

        {/* Danh sách bài post */}
          <FlatList
            data={posts}
            renderItem={({ item }) => <PostListItem posts={item} />}
            onEndReached={loadMorePosts}
            onEndReachedThreshold={0.5}
            ListFooterComponent={renderFooter}
            contentContainerStyle={{
              gap: 10,
              flexGrow: 1,
            }}
            keyExtractor={(item) => item.post_id.toString()}
            ListEmptyComponent={
              !loading && !isRefreshing && allCaughtUp ? (
                allCaughtUp ? <AllCaughtUpScreen /> : (
                  <View className="flex-1 justify-center items-center">
                    <Text className="text-gray-500">Chưa có bài viết nào để hiển thị</Text>
                  </View>
                )
              ) : null
            }
            refreshControl={
              <RefreshControl
              refreshing={isRefreshing}
              onRefresh={onRefresh}
              colors={["#007AFF", "#FF3B30"]}
              tintColor={"#007AFF"}
              />
            }
          />
      </View>
    </View>
  );
}