import { FlatList, SafeAreaView, Alert, Image, ScrollView, Dimensions } from "react-native";
import PostListItem from "../../components/PostListItem";
import posts from "../../../assets/data/posts.json";
import React, { useState } from "react";
import { View, Text, TouchableOpacity, Modal } from "react-native";
import { Feather, AntDesign, Entypo, SimpleLineIcons, FontAwesome5 } from '@expo/vector-icons';

import { useRouter } from "expo-router";

// Define interface for story items
interface StoryItemType {
  id: string;
  username: string;
  image: string;
  hasStory: boolean;
  isYourStory?: boolean;
  isOpened?: boolean;
}

// Sample story data
const storyData: StoryItemType[] = [
  { id: '1', username: 'Your Story', image: 'https://randomuser.me/api/portraits/men/32.jpg', hasStory: false, isYourStory: true, isOpened: false },
  { id: '2', username: 'john_doe', image: 'https://randomuser.me/api/portraits/men/43.jpg', hasStory: true, isOpened: true },
  { id: '3', username: 'jane_smith', image: 'https://randomuser.me/api/portraits/women/45.jpg', hasStory: true, isOpened: true },
  { id: '4', username: 'mike_jones', image: 'https://randomuser.me/api/portraits/men/29.jpg', hasStory: true, isOpened: false },
  { id: '5', username: 'sara_lee', image: 'https://randomuser.me/api/portraits/women/30.jpg', hasStory: true, isOpened: false },
  { id: '6', username: 'alex_wong', image: 'https://randomuser.me/api/portraits/men/36.jpg', hasStory: true, isOpened: false },
  { id: '7', username: 'emma_clark', image: 'https://randomuser.me/api/portraits/women/33.jpg', hasStory: true, isOpened: false },
];

// Story Item Component
const StoryItem = ({ item }: { item: StoryItemType }) => {
  const handleStoryPress = () => {
    Alert.alert('Story Opened', `Opening ${item.username}'s story`);
  };

  return (
    <TouchableOpacity 
      className="items-center mx-2" 
      onPress={handleStoryPress}
    >
      <View className={`w-24 aspect-square rounded-full  ${item.hasStory ? (item.isOpened ? 'border-pink-500 border-2' : 'border-gray-300 border-2') : ''} p-[2px]`}>
        <Image 
          source={{ uri: item.image }} 
          className="h-full w-full rounded-full" 
        />
        {item.isYourStory && (
          <View className="absolute bottom-0 right-0 bg-blue-500 rounded-full h-5 w-5 items-center justify-center border-2 border-white">
            <AntDesign name="plus" size={12} color="white" />
          </View>
        )}
      </View>
      <Text className="text-xs mt-1 max-w-16 text-center" numberOfLines={1}>
        {item.username}
      </Text>
    </TouchableOpacity>
  );
};

export default function FeedScreen() {
    const router = useRouter();
    const [modalVisible, setModalVisible] = useState<boolean>(false);
    const screenWidth = Dimensions.get('window').width;
    
    return (
    <View className="flex-1 bg-white">
        <View className="flex-1">
            {/* Header */}
            <View className="flex-row items-center justify-between px-4 py-2 border-b border-gray-100">
                {/* Nút bên trái: chữ Instagram */}
                <TouchableOpacity onPress={() => setModalVisible(true)}>
                    <View className="flex-row items-center">
                        <Text className="text-2xl font-bold">Instagram</Text>
                        <Entypo name="chevron-small-down" size={20} color="black" style={{ marginTop: 2 }} />
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
                    <TouchableOpacity 
                        onPress={() => router.push("/feed/listmessage")}
                    >
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
                    {storyData.map(item => (
                        <StoryItem key={item.id} item={item} />
                    ))}
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
                    <View className="absolute mt-28 left-4 bg-white p-4 rounded-lg shadow-lg" style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 3.84, elevation: 5 }}>
                        <TouchableOpacity
                            onPress={() => {
                                // Xử lý "Đang theo dõi"
                                setModalVisible(false);
                            }}
                        >
                            <View className="flex-row items-center gap-3">
                                <SimpleLineIcons name="user-following" size={20} color="black" />
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
                renderItem={({item}) => <PostListItem posts={item} />}
                contentContainerStyle={{
                    gap: 10,
                }}
                showsVerticalScrollIndicator={false}
            />
        </View>
    </View>
    );
}
