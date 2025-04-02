// ~/components/ProfilePostList.tsx
import React, { useEffect, useState } from 'react';
import { View, FlatList, Image, TouchableOpacity, Text } from 'react-native';
import { Link } from 'expo-router';

// Dữ liệu mẫu cho grid posts
const samplePosts = [
  {
    id: 1,
    image: "https://images.unsplash.com/photo-1597589827317-4c6d6e0a90bd"
  },
  {
    id: 2,
    image: "https://images.unsplash.com/photo-1598128558393-70ff21433be0"
  },
  {
    id: 3,
    image: "https://images.unsplash.com/photo-1609692814859-8cb88b73827c"
  },
  {
    id: 4,
    image: "https://images.unsplash.com/photo-1558227576-efbf15cf1864"
  },
  {
    id: 5,
    image: "https://images.unsplash.com/photo-1558054455-d6b4d21e39c0"
  },
  {
    id: 6,
    image: "https://images.unsplash.com/photo-1583221700633-f13c7e442f26"
  },
];

interface Props {
  activeTab: string;
  userId?: number;
}

export default function ProfilePostList({ activeTab, userId }: Props) {
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Giả lập việc tải dữ liệu
    const timer = setTimeout(() => {
      console.log("[ProfilePostList] Đang sử dụng dữ liệu mẫu cho posts");
      setPosts(samplePosts);
      setLoading(false);
    }, 300);
    
    return () => clearTimeout(timer);
  }, [userId]);

  const renderItem = ({ item }: { item: any }) => (
    <Link href={`/post/${item.id}`} asChild>
      <TouchableOpacity className="w-1/3 p-0.5">
        <Image
          source={{ uri: item.image }}
          className="aspect-square w-full h-full"
        />
      </TouchableOpacity>
    </Link>
  );

  if (loading) {
    return (
      <View className="h-40 justify-center items-center bg-white">
        <Text className="text-gray-500">Đang tải bài viết...</Text>
      </View>
    );
  }

  if (posts.length === 0 || activeTab !== "posts") {
    return (
      <View className="h-40 justify-center items-center p-5 bg-white">
        <Text className="text-gray-500 text-center">
          {activeTab === "posts" ? "Chưa có bài viết nào." : 
           activeTab === "reels" ? "Chưa có reels nào." :
           "Chưa có ảnh được gắn thẻ."}
        </Text>
      </View>
    );
  }

  return (
    <FlatList
      data={posts}
      renderItem={renderItem}
      keyExtractor={(item) => item.id.toString()}
      numColumns={3}
      className="bg-white"
      scrollEnabled={false}
    />
  );
}
