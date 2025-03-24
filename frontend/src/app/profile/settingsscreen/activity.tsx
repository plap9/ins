import React, { useState } from 'react';
import { View, Text, TouchableOpacity, FlatList, SafeAreaView, Image } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import Header from './components/Header';

// Define activity data type
interface ActivityItem {
  id: string;
  type: 'like' | 'comment' | 'follow' | 'save';
  content: string;
  time: string;
  userImage?: string;
  contentImage?: string;
}

// Sample data for activity
const activityData: ActivityItem[] = [
  {
    id: '1',
    type: 'like',
    content: 'You liked a post by @lappham',
    time: '2h ago',
    userImage: 'https://anhnail.vn/wp-content/uploads/2024/10/anh-meme-ech-xanh-5.webp',
    contentImage: 'https://anhnail.vn/wp-content/uploads/2024/10/anh-meme-ech-xanh-5.webp',
  },
  {
    id: '2',
    type: 'comment',
    content: 'You commented on @duchiep\'s post: "This looks amazing!"',
    time: '4h ago',
    userImage: 'https://anhnail.vn/wp-content/uploads/2024/10/anh-meme-ech-xanh-5.webp',
    contentImage: 'https://anhnail.vn/wp-content/uploads/2024/10/anh-meme-ech-xanh-5.webp',
  },
  {
    id: '3',
    type: 'follow',
    content: 'You started following @duchiep',
    time: '1d ago',
    userImage: 'https://anhnail.vn/wp-content/uploads/2024/10/anh-meme-ech-xanh-5.webp',
  },
  {
    id: '4',
    type: 'save',
    content: 'You saved a post by @lappham',
    time: '2d ago',
    userImage: 'https://anhnail.vn/wp-content/uploads/2024/10/anh-meme-ech-xanh-5.webp',
    contentImage: 'https://anhnail.vn/wp-content/uploads/2024/10/anh-meme-ech-xanh-5.webp',
  },
  {
    id: '5',
    type: 'like',
    content: 'You liked a post by @photo67cs1',
    time: '3d ago',
    userImage: 'https://anhnail.vn/wp-content/uploads/2024/10/anh-meme-ech-xanh-5.webp',
    contentImage: 'https://anhnail.vn/wp-content/uploads/2024/10/anh-meme-ech-xanh-5.webp',
  },
  {
    id: '6',
    type: 'comment',
    content: 'You replied to @tech67cs1: "Thanks for sharing!"',
    time: '4d ago',
    userImage: 'https://anhnail.vn/wp-content/uploads/2024/10/anh-meme-ech-xanh-5.webp',
    contentImage: 'https://anhnail.vn/wp-content/uploads/2024/10/anh-meme-ech-xanh-5.webp',
  },
  {
    id: '7',
    type: 'follow',
    content: 'You started following @food_huce',
    time: '1w ago',
    userImage: 'https://anhnail.vn/wp-content/uploads/2024/10/anh-meme-ech-xanh-5.webp',
  },
];

export default function ActivityScreen() {
  const [activeTab, setActiveTab] = useState('all');

  const filterData = () => {
    if (activeTab === 'all') return activityData;
    return activityData.filter(item => item.type === activeTab);
  };

  const renderIcon = (type: ActivityItem['type']) => {
    switch(type) {
      case 'like':
        return <Feather name="heart" size={16} color="#E53E3E" />;
      case 'comment':
        return <Feather name="message-circle" size={16} color="#3182CE" />;
      case 'follow':
        return <Feather name="user-plus" size={16} color="#38A169" />;
      case 'save':
        return <Feather name="bookmark" size={16} color="#6B46C1" />;
      default:
        return <Feather name="activity" size={16} color="#718096" />;
    }
  };

  const renderItem = ({ item }: { item: ActivityItem }) => (
    <View className="flex-row p-4 border-b border-gray-100">
      <View className="h-10 w-10 rounded-full bg-gray-200 items-center justify-center mr-3">
        {item.userImage ? (
          <Image source={{ uri: item.userImage }} className="h-10 w-10 rounded-full" />
        ) : (
          <Feather name="user" size={20} color="#718096" />
        )}
      </View>
      <View className="flex-1">
        <View className="flex-row items-center mb-1">
          {renderIcon(item.type)}
          <Text className="text-gray-500 ml-2 text-xs">{item.time}</Text>
        </View>
        <Text className="text-base">{item.content}</Text>
      </View>
      {item.contentImage && (
        <Image 
          source={{ uri: item.contentImage }} 
          className="h-14 w-14 rounded-md"
        />
      )}
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-white">
      <Header title="Activity" />
      {/* Tabs */}
      <View className="flex-row border-b border-gray-200">
        <TouchableOpacity 
          className={`flex-1 py-3 items-center ${activeTab === 'all' ? 'border-b-2 border-black' : ''}`}
          onPress={() => setActiveTab('all')}
        >
          <Text className={`font-semibold ${activeTab === 'all' ? 'text-black' : 'text-gray-500'}`}>
            All
          </Text>
        </TouchableOpacity>
        <TouchableOpacity 
          className={`flex-1 py-3 items-center ${activeTab === 'like' ? 'border-b-2 border-black' : ''}`}
          onPress={() => setActiveTab('like')}
        >
          <Text className={`font-semibold ${activeTab === 'like' ? 'text-black' : 'text-gray-500'}`}>
            Likes
          </Text>
        </TouchableOpacity>
        <TouchableOpacity 
          className={`flex-1 py-3 items-center ${activeTab === 'comment' ? 'border-b-2 border-black' : ''}`}
          onPress={() => setActiveTab('comment')}
        >
          <Text className={`font-semibold ${activeTab === 'comment' ? 'text-black' : 'text-gray-500'}`}>
            Comments
          </Text>
        </TouchableOpacity>
        <TouchableOpacity 
          className={`flex-1 py-3 items-center ${activeTab === 'follow' ? 'border-b-2 border-black' : ''}`}
          onPress={() => setActiveTab('follow')}
        >
          <Text className={`font-semibold ${activeTab === 'follow' ? 'text-black' : 'text-gray-500'}`}>
            Follows
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      <FlatList
        data={filterData()}
        renderItem={renderItem}
        keyExtractor={item => item.id}
        ListEmptyComponent={
          <View className="flex-1 items-center justify-center p-6 mt-10">
            <Feather name="activity" size={48} color="#ccc" />
            <Text className="text-lg font-semibold mt-4 text-center">No activity yet</Text>
            <Text className="text-gray-500 text-center mt-2">
              Your recent interactions will appear here
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}
