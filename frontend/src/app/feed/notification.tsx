import React from "react";
import { FlatList, Image, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

const notifications = [
  {
    id: "1",
    type: "like",
    username: "alice",
    text: "liked your photo.",
    time: "2h",
    avatar: "https://th.bing.com/th/id/R.8bd21b04b431cc630dabb66ba7c8f192?rik=eDuQUVD29w3bRQ&riu=http%3a%2f%2fimages.wikia.com%2fmarvelmovies%2fimages%2f1%2f19%2fTheAvengers_IronMan.jpg&ehk=V7n049kbKXjaqFDhpyoVDOmDJBiYFwcUQtiiwTZNTNs%3d&risl=1&pid=ImgRaw&r=0",
    image: "https://th.bing.com/th/id/OIP.EYedyI-yftSoIz_xoNy-MAHaEK?rs=1&pid=ImgDetMain", // ảnh được thích
  },
  {
    id: "2",
    type: "comment",
    username: "bob",
    text: "commented: Nice shot!",
    time: "3h",
    avatar: "https://media3.coolmate.me/cdn-cgi/image/quality=80,format=auto/uploads/April2023/meme-ech-xanh-10_38.jpg",
    image: "https://th.bing.com/th/id/OIP.DbXwTw597FBCOmedtFRHdQHaEc?rs=1&pid=ImgDetMain", // ảnh trong bình luận
  },
  {
    id: "3",
    type: "follow",
    username: "charlie",
    text: "started following you.",
    time: "4h",
    avatar: "https://thuvienmeme.com/wp-content/uploads/2024/03/meme-dam-ech-xanh-khong-truot-phat-nao.jpg",
  },
];

export default function NotificationScreen() {
  const router = useRouter();

  const renderItem = ({ item }: { item: typeof notifications[0] }) => (
    <TouchableOpacity className="flex-row items-center px-4 py-3 border-b border-gray-200">
      {/* Ảnh đại diện */}
      <Image source={{ uri: item.avatar }} className="w-12 h-12 rounded-full" />
      <View className="flex-1 ml-4">
        <Text className="text-base">
          <Text className="font-bold">{item.username} </Text>
          {item.text}
        </Text>
        <Text className="text-xs text-gray-500 mt-1">{item.time}</Text>
      </View>
      {/* Nếu có ảnh đi kèm thông báo */}
      {item.image && (
        <Image source={{ uri: item.image }} className="w-12 h-12" />
      )}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView className="flex-1 bg-white">
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 py-3 border-b border-gray-200">
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="black" />
        </TouchableOpacity>
        <Text className="text-lg font-bold">Thông báo</Text>
        <View className="w-6" />
      </View>

      {/* Danh sách thông báo */}
      <FlatList
        data={notifications}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
      />
    </SafeAreaView>
  );
}
