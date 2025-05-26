import React, { useState, useEffect } from "react";
import { View, Text, FlatList, Image, TouchableOpacity, ActivityIndicator, Platform, StatusBar } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Dimensions } from "react-native";

const WINDOW_WIDTH = Dimensions.get('window').width;

interface ExploreItem {
  id: string;
  mediaUrl: string;
  likes: number;
  comments: number;
  hasMultipleMedia: boolean;
}

const SearchScreen = () => {
  const router = useRouter();
  const [exploreData, setExploreData] = useState<ExploreItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchExploreContent();
  }, []);

  const fetchExploreContent = async () => {
    try {
      setIsLoading(true);
      const fakeData = Array(20).fill(null).map((_, index) => ({
        id: index.toString(),
        mediaUrl: "https://cdn-useast1.kapwing.com/static/templates/spider-man-triple-meme-template-full-a9a8b78a.webp",
        likes: Math.floor(Math.random() * 1000),
        comments: Math.floor(Math.random() * 100),
        hasMultipleMedia: Math.random() > 0.7
      }));

      setExploreData(fakeData);
    } catch (error) {
      console.error("Lỗi khi lấy dữ liệu khám phá:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const calculateImageSize = () => {
    const spacing = 2;
    const numColumns = 3;
    return (WINDOW_WIDTH - (spacing * (numColumns + 1))) / numColumns;
  };

  const imageSize = calculateImageSize();

  if (isLoading) {
    return (
      <View className="flex-1 justify-center items-center bg-white">
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-white" style={{ paddingTop: Platform.OS === 'ios' ? 44 : StatusBar.currentHeight || 0 }}>
      {/* Header với thanh tìm kiếm */}
      <View className="px-4 py-3 border-b border-gray-200 flex-row items-center">
        <TouchableOpacity
          className="flex-1 flex-row items-center bg-gray-100 rounded-full px-4 py-3"
          style={{ height: 50 }}
          onPress={() => router.push("/search/searchbarscreen")}
        >
          <Ionicons name="search" size={20} color="gray" />
          <Text className="flex-1 ml-2 text-base text-gray-500">Tìm kiếm</Text>
        </TouchableOpacity>
      </View>

      {/* Lưới khám phá */}
      <FlatList
        data={exploreData}
        numColumns={3}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={{
              width: imageSize,
              height: imageSize,
              margin: 1
            }}
            onPress={() => router.push(`/feed/post/${item.id}`)}
          >
            <Image
              source={{ uri: item.mediaUrl }}
              style={{ width: '100%', height: '100%' }}
              className="bg-gray-200"
            />

            {/* Biểu tượng cho nhiều ảnh */}
            {item.hasMultipleMedia && (
              <View className="absolute top-2 right-2">
                <Ionicons name="grid-outline" size={16} color="white" />
              </View>
            )}

            {/* Biểu tượng xem chi tiết */}
            <View className="absolute bottom-0 left-0 right-0 flex-row justify-between p-2 bg-black/30">
              <View className="flex-row items-center">
                <Ionicons name="heart" size={14} color="white" />
                <Text className="text-white text-xs ml-1">{item.likes}</Text>
              </View>
              <View className="flex-row items-center">
                <Ionicons name="chatbubble-outline" size={14} color="white" />
                <Text className="text-white text-xs ml-1">{item.comments}</Text>
              </View>
            </View>
          </TouchableOpacity>
        )}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 20 }}
      />
    </View>
  );
};

export default SearchScreen;
