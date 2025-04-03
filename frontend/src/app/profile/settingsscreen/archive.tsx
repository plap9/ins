import React, { useState } from 'react';
import { View, Text, TouchableOpacity, FlatList, Image } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import Header from './components/Header';

interface ArchivedItem {
  id: string;
  image: string;
  date: string;
  type: 'post' | 'story';
}

// Sample data for archived content
const archivedItems: ArchivedItem[] = [
  // {
  //   id: '1',
  //   image: 'https://anhnail.vn/wp-content/uploads/2024/10/anh-meme-ech-xanh-5.webp',
  //   date: '2024-03-15',
  //   type: 'post'
  // },
  // {
  //   id: '2',
  //   image: 'https://anhnail.vn/wp-content/uploads/2024/10/anh-meme-ech-xanh-5.webp',
  //   date: '2024-03-10',
  //   type: 'post'
  // },
  // {
  //   id: '3',
  //   image: 'https://anhnail.vn/wp-content/uploads/2024/10/anh-meme-ech-xanh-5.webp',
  //   date: '2024-03-05',
  //   type: 'story'
  // },
  // {
  //   id: '4',
  //   image: 'https://anhnail.vn/wp-content/uploads/2024/10/anh-meme-ech-xanh-5.webp',
  //   date: '2024-02-28',
  //   type: 'post'
  // },
  // {
  //   id: '5',
  //   image: 'https://anhnail.vn/wp-content/uploads/2024/10/anh-meme-ech-xanh-5.webp',
  //   date: '2024-02-20',
  //   type: 'story'
  // },
  // {
  //   id: '6',
  //   image: 'https://anhnail.vn/wp-content/uploads/2024/10/anh-meme-ech-xanh-5.webp',
  //   date: '2024-02-15',
  //   type: 'post'
  // },
  // {
  //   id: '7',
  //   image: 'https://anhnail.vn/wp-content/uploads/2024/10/anh-meme-ech-xanh-5.webp',
  //   date: '2024-02-10',
  //   type: 'post'
  // },
  // {
  //   id: '8',
  //   image: 'https://anhnail.vn/wp-content/uploads/2024/10/anh-meme-ech-xanh-5.webp',
  //   date: '2024-02-05',
  //   type: 'post'
  // },
  // {
  //   id: '9',
  //   image: 'https://anhnail.vn/wp-content/uploads/2024/10/anh-meme-ech-xanh-5.webp',
  //   date: '2024-01-30',
  //   type: 'story'
  // },
];

export default function ArchiveScreen() {
  const [activeTab, setActiveTab] = useState<'posts' | 'stories' | 'all'>('posts');

  const filterData = (): ArchivedItem[] => {
    if (activeTab === 'all') return archivedItems;
    return archivedItems.filter(item => item.type === activeTab.slice(0, -1) as 'post' | 'story'); // remove 's' from 'posts' or 'stories'
  };

  const renderItem = ({ item }: { item: ArchivedItem }) => (
    <TouchableOpacity className="flex-1/3 aspect-square p-0.5">
      <Image 
        source={{ uri: item.image }} 
        className="w-full h-full"
      />
      {item.type === 'story' && (
        <View className="absolute top-2 right-2 bg-blue-500 rounded-full h-6 w-6 items-center justify-center">
          <Feather name="clock" size={12} color="white" />
        </View>
      )}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView className="flex-1 bg-white">
      <Header title="Archive" />
      {/* Tabs */}
      <View className="flex-row border-b border-gray-200">
        <TouchableOpacity 
          className={`flex-1 py-3 items-center ${activeTab === 'posts' ? 'border-b-2 border-black' : ''}`}
          onPress={() => setActiveTab('posts')}
        >
          <Text className={`font-semibold ${activeTab === 'posts' ? 'text-black' : 'text-gray-500'}`}>
            Posts
          </Text>
        </TouchableOpacity>
        <TouchableOpacity 
          className={`flex-1 py-3 items-center ${activeTab === 'stories' ? 'border-b-2 border-black' : ''}`}
          onPress={() => setActiveTab('stories')}
        >
          <Text className={`font-semibold ${activeTab === 'stories' ? 'text-black' : 'text-gray-500'}`}>
            Stories
          </Text>
        </TouchableOpacity>
        <TouchableOpacity 
          className={`flex-1 py-3 items-center ${activeTab === 'all' ? 'border-b-2 border-black' : ''}`}
          onPress={() => setActiveTab('all')}
        >
          <Text className={`font-semibold ${activeTab === 'all' ? 'text-black' : 'text-gray-500'}`}>
            All
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      {filterData().length > 0 ? (
        <FlatList
          data={filterData()}
          renderItem={renderItem}
          keyExtractor={item => item.id}
          numColumns={3}
        />
      ) : (
        <View className="flex-1 items-center justify-center p-6">
          <Feather name="archive" size={48} color="#ccc" />
          <Text className="text-lg font-semibold mt-4 text-center">No archived {activeTab}</Text>
          <Text className="text-gray-500 text-center mt-2">
            Items you archive will appear here. They're only visible to you.
          </Text>
        </View>
      )}
    </SafeAreaView>
  );
}
