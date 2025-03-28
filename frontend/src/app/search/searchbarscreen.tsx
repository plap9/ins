import React, { useState } from "react";
import { View, Text, TextInput, FlatList, TouchableOpacity, Image } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

// Sample data for search results
interface User {
  id: string;
  username: string;
  fullName: string;
  profileImage: string;
}

const sampleUsers: User[] = [
  {
    id: "1",
    username: "lap_pham",
    fullName: "Lập Phạm",
    profileImage: "https://anhnail.vn/wp-content/uploads/2024/10/anh-meme-ech-xanh-5.webp",
  },
  {
    id: "2",
    username: "thang_doan",
    fullName: "Thắng Đoàn",
    profileImage: "https://anhnail.vn/wp-content/uploads/2024/10/anh-meme-ech-xanh-5.webp",
  },
  {
    id: "3",
    username: "hiep_le",
    fullName: "Hiệp Lê",
    profileImage: "https://anhnail.vn/wp-content/uploads/2024/10/anh-meme-ech-xanh-5.webp",
  },
  {
    id: "4",
    username: "nam_pham",
    fullName: "Nam Phạm",
    profileImage: "https://anhnail.vn/wp-content/uploads/2024/10/anh-meme-ech-xanh-5.webp",
  },
  {
    id: "5",
    username: "phuc_nguyen",
    fullName: "Phúc Nguyễn",
    profileImage: "https://anhnail.vn/wp-content/uploads/2024/10/anh-meme-ech-xanh-5.webp",
  },
];

const SearchScreen = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const router = useRouter();

  // Filter users based on search query
  const filteredUsers = sampleUsers.filter(
    (user) =>
      user.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.fullName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <SafeAreaView className="flex-1 bg-white">
      {/* Header with Search Bar */}
      <View className="p-4 border-b border-gray-200 flex-row items-center">
        <TouchableOpacity onPress={() => router.back()} className="mr-3">
          <Ionicons name="arrow-back" size={24} color="black" />
        </TouchableOpacity>
        <TextInput
          className="flex-1 bg-gray-100 rounded-md p-2 pl-3"
          placeholder="Search"
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoFocus={true}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity 
            className="ml-2" 
            onPress={() => setSearchQuery("")}
          >
            <Ionicons name="close-circle" size={20} color="gray" />
          </TouchableOpacity>
        )}
      </View>

      {/* Search Results */}
      <FlatList
        data={filteredUsers}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity 
            className="flex-row items-center p-4 border-b border-gray-200"
            onPress={() => router.push(`/profile/${item.username}`)}
          >
            <Image
              source={{ uri: item.profileImage }}
              className="w-12 h-12 rounded-full"
            />
            <View className="ml-3">
              <Text className="font-bold">{item.username}</Text>
              <Text className="text-gray-500">{item.fullName}</Text>
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          searchQuery.length > 0 ? (
            <View className="p-4 items-center justify-center">
              <Text className="text-gray-500">No users found</Text>
            </View>
          ) : null
        }
      />
    </SafeAreaView>
  );
};

export default SearchScreen;