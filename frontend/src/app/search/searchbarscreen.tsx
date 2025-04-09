import React, { useState, useEffect } from "react";
import { View, Text, TextInput, FlatList, TouchableOpacity, Image, ActivityIndicator, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import {
  searchUsers,
  getSearchHistory,
  deleteSearchHistoryItem,
  clearSearchHistory
} from "../../services/searchService";

interface User {
  id: string;
  username: string;
  fullName: string;
  avatar: string;
  isVerified?: boolean;
  bio?: string;
}

interface SearchHistoryItem {
  id: string;
  query: string;
  createdAt: string;
}

const SearchScreen = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [searchHistory, setSearchHistory] = useState<SearchHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showHistory, setShowHistory] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetchSearchHistory();
  }, []);

  const fetchSearchHistory = async () => {
    try {
      const historyData = await getSearchHistory();
      setSearchHistory(historyData);
    } catch (error) {
      console.error("Lỗi khi lấy lịch sử tìm kiếm:", error);
    }
  };

  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (searchQuery.trim().length > 0) {
        setIsLoading(true);
        setShowHistory(false);
        try {
          const results = await searchUsers(searchQuery);
          setSearchResults(results);
        } catch (error) {
          console.error("Lỗi khi tìm kiếm:", error);
        } finally {
          setIsLoading(false);
        }
      } else {
        setSearchResults([]);
        setShowHistory(true);
      }
    }, 200);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  const handleDeleteHistoryItem = async (id: string) => {
    try {
      const success = await deleteSearchHistoryItem(id);
      if (success) {
        setSearchHistory(prevHistory => 
          prevHistory.filter(item => item.id !== id)
        );
      }
    } catch (error) {
      console.error("Lỗi khi xóa mục lịch sử:", error);
    }
  };

  const handleClearAllHistory = () => {
    Alert.alert(
      "Xóa lịch sử tìm kiếm",
      "Bạn có chắc chắn muốn xóa tất cả lịch sử tìm kiếm?",
      [
        {
          text: "Hủy",
          style: "cancel"
        },
        {
          text: "Xóa",
          style: "destructive",
          onPress: async () => {
            try {
              const success = await clearSearchHistory();
              if (success) {
                setSearchHistory([]);
              }
            } catch (error) {
              console.error("Lỗi khi xóa lịch sử:", error);
            }
          }
        }
      ]
    );
  };

  const handleHistoryItemPress = (query: string) => {
    setSearchQuery(query);
    setShowHistory(false);
  };

  const handleUserPress = (username: string) => {
    router.push(`/profile/${username}`);
  };

  // Lấy 5 mục lịch sử gần nhất
  const recentHistory = searchHistory.slice(0, 5);

  return (
    <SafeAreaView className="flex-1 bg-white">
      {/* Header với thanh tìm kiếm */}
      <View className="p-4 border-b border-gray-200 flex-row items-center">
        <TouchableOpacity onPress={() => router.back()} className="mr-2">
          <Ionicons name="arrow-back" size={24} color="black" />
        </TouchableOpacity>
        <View className="flex-1 flex-row items-center bg-gray-100 rounded-full px-4 py-1">
          <Ionicons name="search" size={20} color="gray" />
          <TextInput
            className="flex-1 ml-2 text-base"
            placeholder="Tìm kiếm"
            placeholderTextColor="gray"
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoFocus={true}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity 
              onPress={() => {
                setSearchQuery("");
                setShowHistory(true);
              }}
            >
              <Ionicons name="close-circle" size={20} color="gray" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Hiển thị lịch sử tìm kiếm */}
      {showHistory && (
        <View className="flex-1">
          <View className="flex-row justify-between items-center p-4">
            <Text className="font-semibold text-base">Gần đây</Text>
            <TouchableOpacity onPress={handleClearAllHistory}>
              <Text className="text-blue-500 font-medium">Xóa tất cả</Text>
            </TouchableOpacity>
          </View>
          <FlatList
            data={recentHistory}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity 
                className="flex-row items-center justify-between p-4 border-b border-gray-200"
                onPress={() => handleHistoryItemPress(item.query)}
              >
                <View className="flex-row items-center">
                  <View className="bg-gray-200 rounded-full w-10 h-10 items-center justify-center mr-3">
                    <Ionicons name="search-outline" size={18} color="gray" />
                  </View>
                  <Text>{item.query}</Text>
                </View>
                <TouchableOpacity 
                  className="p-2"
                  onPress={() => handleDeleteHistoryItem(item.id)}
                >
                  <Ionicons name="close" size={18} color="gray" />
                </TouchableOpacity>
              </TouchableOpacity>
            )}
          />
        </View>
      )}

      {/* Hiển thị kết quả tìm kiếm */}
      {!showHistory && (
        <View className="flex-1">
          {isLoading ? (
            <View className="flex-1 justify-center items-center">
              <ActivityIndicator size="large" color="#0000ff" />
            </View>
          ) : (
            <FlatList
              data={searchResults}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity 
                  className="flex-row items-start p-4 border-b border-gray-200"
                  onPress={() => handleUserPress(item.username)}
                >
                  <Image
                    source={{ uri: item.avatar || "https://www.gravatar.com/avatar/00000000000000000000000000000000?d=mp&f=y" }}
                    className="w-12 h-12 rounded-full"
                  />
                  <View className="ml-3 flex-1">
                    <View className="flex-row items-center">
                      <Text className="font-bold">{item.username}</Text>
                      {item.isVerified && (
                        <Ionicons name="checkmark-circle" size={14} color="blue" className="ml-1" />
                      )}
                    </View>
                    <Text className="text-gray-500">{item.fullName}</Text>
                    {item.bio && (
                      <Text className="text-gray-600 text-sm mt-1" numberOfLines={2}>
                        {item.bio}
                      </Text>
                    )}
                  </View>
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                searchQuery.length > 0 ? (
                  <View className="p-4 items-center justify-center">
                    <Text className="text-gray-500">Không tìm thấy người dùng</Text>
                  </View>
                ) : null
              }
            />
          )}
        </View>
      )}
      
      {showHistory && searchHistory.length === 0 && (
        <View className="flex-1 justify-center items-center">
          <Ionicons name="search" size={40} color="gray" />
          <Text className="text-gray-500 mt-3">Chưa có lịch sử tìm kiếm</Text>
        </View>
      )}
    </SafeAreaView>
  );
};

export default SearchScreen;