import { View, Text, Image, TouchableOpacity, SafeAreaView, ScrollView } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { AntDesign, Fontisto, Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { StatusBar } from "expo-status-bar";
import { useState } from 'react';

import StoryList from '~/components/StoryList';
import DiscoverPersonItem from '~/components/DiscoverPerson';
const UserProfileScreen = () => {
    const router = useRouter();


// Type for route params
type UserProfileRouteParams = {
    username: string;
  }
  
// Type data in User
interface User {
  id: string;
  username: string;
  bio: string;
  fullName: string;
  profileImage: string;
  posts: number;
  followers: number;  
  following: number;
}

const sampleUsers: User[] = [
  {
    id: "1",
    username: "thang_doan",
    fullName: "Thắng Đoàn",
    bio:"AI for life, sometimes for death",
    profileImage: "https://anhnail.vn/wp-content/uploads/2024/10/anh-meme-ech-xanh-5.webp",
    posts: 5,
    followers: 10,
    following: 8,
  },
  {
    id: "2",
    username: "lap_pham",
    fullName: "Lập Phạm",
    bio:"AI for life, sometimes for death",
    profileImage: "https://anhnail.vn/wp-content/uploads/2024/10/anh-meme-ech-xanh-5.webp",
    posts: 1,
    followers: 11,
    following: 9,
  },
  {
    id: "3",
    username: "hiep_le",
    fullName: "Hiệp Lê",
    bio:"AI for life, sometimes for death",
    profileImage: "https://anhnail.vn/wp-content/uploads/2024/10/anh-meme-ech-xanh-5.webp",
    posts: 5,
    followers: 1,
    following: 8,
  },
  {
    id: "4",
    username: "nam_pham",
    fullName: "Nam Phạm",
    bio:"AI for life, sometimes for death",
    profileImage: "https://anhnail.vn/wp-content/uploads/2024/10/anh-meme-ech-xanh-5.webp",
    posts: 5,
    followers: 28,
    following: 32,
  },
  {
    id: "5",
    username: "phuc_nguyen",
    fullName: "Phúc Nguyễn",
    bio:"AI for life, sometimes for death",
    profileImage: "https://anhnail.vn/wp-content/uploads/2024/10/anh-meme-ech-xanh-5.webp",
    posts: 5,
    followers: 55,
    following: 64,
  },
];

const stories = [
  {
    id: "1",
    image: "https://www.atakinteractive.com/hubfs/react-native%20%281%29.png",
    title: "React-Native",
    isHighlight: true,
  },
  {
    id: "2",
    image: "https://nativewind.dev/img/og-image.png",
    title: "Nativewind",
    isHighlight: true,
  },
];

//   const { username } = useLocalSearchParams();
  const { username } = useLocalSearchParams<UserProfileRouteParams>();
  
  // Trong thực tế, bạn sẽ fetch user data từ API dựa trên username
  // Ở đây tôi dùng sampleUsers từ file search của bạn
  const user = sampleUsers.find(u => u.username === username);

  if (!user) {
    return (
      <View className="flex-1 justify-center items-center">
        <Text>User not found</Text>
      </View>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className='flex-1 p-2'>
        {/* Header */}
        <View className="bg-white flex-row items-center justify-between px-4 py-2 border-b border-gray-200">
            {/* Button back */}
            <TouchableOpacity onPress={() => router.push("search/searchbarscreen")}>
                <Ionicons name="chevron-back" size={24} color="black" />
            </TouchableOpacity>

               {/* Username */}
            <TouchableOpacity onPress={() => alert("About this account")}>
                <View className="flex-row items-center">
                    <Text className="text-xl font-bold">{user.username}</Text>
                </View>
            </TouchableOpacity>
               
               {/* Buttons (right side) */}
            <View className="flex-row items-center">
                <TouchableOpacity className="mr-5">
                    <Fontisto name="bell" size={24} color="black" />
                </TouchableOpacity>

                <TouchableOpacity>
                    <MaterialCommunityIcons name="dots-horizontal" size={24} color="black" />
                </TouchableOpacity>
            </View>
        </View>
             
        <View className="bg-white p-4">
          <StatusBar style="auto" />
          {/* Avatar */}
          <View className="flex-row items-center mb-4">
            <Image
              source={{ uri: user.profileImage }}
              className="w-20 h-20 rounded-full border border-gray-300 overflow-hidden"
              style={{ aspectRatio: 1 }}
            />
            <View className="flex-1 ml-4">
            {/* Stats */}
              <View className="flex-row justify-between w-full">
                <View className="items-center flex-1">
                  <Text className="text-lg font-bold">{user.posts}</Text>
                  <Text className="text-gray-500 text-xs">Posts</Text>
                </View>
                <View className="items-center flex-1">
                  <Text className="text-lg font-bold">{user.followers}</Text>
                  <Text className="text-gray-500 text-xs">Followers</Text>
                </View>
                <View className="items-center flex-1">
                  <Text className="text-lg font-bold">{user.following}</Text>
                  <Text className="text-gray-500 text-xs">Following</Text>
                </View>
              </View>
            </View>
          </View>
        </View>
         {/* Username and Bio */}
        <View className="mb-4">
          <Text className="text-lg font-bold">{user.fullName}</Text>
          <Text className="text-gray-500">{user.bio}</Text>
        </View>
        {/* Story */}
        <StoryList stories={stories} />
        {/* Buttons */}
        
    

      </View>
    </SafeAreaView>
  );
};

export default UserProfileScreen;