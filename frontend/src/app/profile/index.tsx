import { View, Text, Image, FlatList, TouchableOpacity, } from "react-native";
import { StatusBar } from "expo-status-bar";
import { SafeAreaView } from "react-native";
import posts from "../../../assets/data/posts.json";
import PostListItem from "~/components/PostListItem";
import { useRouter } from "expo-router";
import HighlightsStory from "~/components/StoryList";
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useState } from "react";
import { ScrollView } from "react-native";
import ProfilePostList from "~/components/ProfilePostList";

// Giả lập dữ liệu cho phần stories:
const stories = [
  {
    id: "1",
    image: "https://www.atakinteractive.com/hubfs/react-native%20%281%29.png",
    title: "React-Native",
  },
  {
    id: "2",
    image: "https://nativewind.dev/img/og-image.png",
    title: "Nativewind",
  },
];

export default function ProfileScreen() {
  const [activeTab, setActiveTab] = useState<"posts" | "reels" | "tags">("posts");  

  
  
  
  const router = useRouter();
  return (
    <SafeAreaView className="bg-gray-100">
      <View className="bg-white p-4">
        <StatusBar style="auto" />
        
            {/* Avatar */}
        <View className="flex-row items-center mb-4">
          <Image
            source={{ uri: "https://cdn-useast1.kapwing.com/static/templates/spider-man-triple-meme-template-full-a9a8b78a.webp" }}
            className="w-20 h-20 rounded-full border border-gray-300"
          />
          <View className="flex-1 ml-4">
            {/* Stats */}
            <View className="flex-row justify-between w-full">
              <View className="items-center flex-1">
                <Text className="text-lg font-bold">120</Text>
                <Text className="text-gray-500 text-xs">Posts</Text>
              </View>
              <View className="items-center flex-1">
                <Text className="text-lg font-bold">5.2K</Text>
                <Text className="text-gray-500 text-xs">Followers</Text>
              </View>
              <View className="items-center flex-1">
                <Text className="text-lg font-bold">320</Text>
                <Text className="text-gray-500 text-xs">Following</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Username and Bio */}
        <View className="mb-4">
          <Text className="text-lg font-bold">Username</Text>
          <Text className="text-gray-500">Bio or short description</Text>
        </View>

        {/* Story */}
        <HighlightsStory stories={stories}/>
        
        {/* Buttons */}
        <View className="flex-row justify-between mb-4">
          <TouchableOpacity className="flex-1 bg-gray-200 p-2 rounded-lg mr-2" onPress={() => router.push("/profile/update")}>
            <Text className="text-center text-black font-semibold">Chỉnh sửa</Text>
          </TouchableOpacity>
          <TouchableOpacity className="flex-1 bg-gray-200 p-2 rounded-lg" onPress={() => router.push("/profile/update")}>
            <Text className="text-center text-black font-semibold">Chia sẻ trang cá nhân</Text>
          </TouchableOpacity>
        </View>
        
        {/* 3 button: Posts, Reels, Tags */}
        {/* 3 nút Posts, Reels, Tags */}
        <View className="flex-row border-t border-gray-300">
          <TouchableOpacity
            onPress={() => setActiveTab("posts")}
            className="flex-1 items-center py-2"
          >
            <Text
              className={`font-semibold ${
                activeTab === "posts" ? "text-black" : "text-gray-400"
              }`}
            >
              Posts
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setActiveTab("reels")}
            className="flex-1 items-center py-2"
          >
            <Text
              className={`font-semibold ${
                activeTab === "reels" ? "text-black" : "text-gray-400"
              }`}
            >
              Reels
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setActiveTab("tags")}
            className="flex-1 items-center py-2"
          >
            <Text
              className={`font-semibold ${
                activeTab === "tags" ? "text-black" : "text-gray-400"
              }`}
            >
              Tags
            </Text>
          </TouchableOpacity>
        </View>
        
        <View className="w-full bg-blue-600">  
          <ProfilePostList activeTab={activeTab}/>
        </View>   
         
      </View>
    </SafeAreaView>
  );
}