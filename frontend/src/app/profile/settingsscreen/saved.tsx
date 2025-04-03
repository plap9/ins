import React, { useState } from 'react';
import { View, Text, TouchableOpacity, FlatList, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import Header from './components/Header';
import { SafeAreaView } from 'react-native-safe-area-context';

// Sample data for saved posts
const savedItems = [
  {
    id: '1',
    image: 'https://anhnail.vn/wp-content/uploads/2024/10/anh-meme-ech-xanh-5.webp',
    collection: 'Fashion',
    count: 12,
  },
  {
    id: '2',
    image: 'https://anhnail.vn/wp-content/uploads/2024/10/anh-meme-ech-xanh-5.webp',
    collection: 'Food',
    count: 8,
  },
  {
    id: '3',
    image: 'https://anhnail.vn/wp-content/uploads/2024/10/anh-meme-ech-xanh-5.webp',
    collection: 'Travel',
    count: 24,
  },
  {
    id: '4',
    image: 'https://anhnail.vn/wp-content/uploads/2024/10/anh-meme-ech-xanh-5.webp',
    collection: 'Fitness',
    count: 5,
  },
  {
    id: '5',
    image: 'https://anhnail.vn/wp-content/uploads/2024/10/anh-meme-ech-xanh-5.webp',
    collection: 'Inspiration',
    count: 19,
  },
];

export default function SavedScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('collections');

  const renderItem = ({ item }: { item: typeof savedItems[0] }) => (
    <TouchableOpacity className="flex-1 mr-1 mb-1">
      <View className="relative h-40">
        <Image 
          source={{ uri: item.image }} 
          className="w-full h-full rounded-md"
          resizeMode="cover"
        />
        <View className="absolute inset-0 bg-black/30 flex items-center justify-center rounded-md">
          <Text className="text-white font-bold text-lg">{item.collection}</Text>
          <Text className="text-white">{item.count} items</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderItemGrid = ({ item }: { item: typeof savedItems[number] }) => (
    <TouchableOpacity className="flex-1/3 aspect-square p-0.5">
      <Image 
        source={{ uri: item.image }} 
        className="w-full h-full"
      />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView className="flex-1 bg-white">
      <Header title="Saved Posts" />
      {/* Tabs */}
      <View className="flex-row border-b border-gray-200">
        <TouchableOpacity 
          className={`flex-1 py-3 items-center ${activeTab === 'collections' ? 'border-b-2 border-black' : ''}`}
          onPress={() => setActiveTab('collections')}
        >
          <Text className={`font-semibold ${activeTab === 'collections' ? 'text-black' : 'text-gray-500'}`}>
            Collections
          </Text>
        </TouchableOpacity>
        <TouchableOpacity 
          className={`flex-1 py-3 items-center ${activeTab === 'all' ? 'border-b-2 border-black' : ''}`}
          onPress={() => setActiveTab('all')}
        >
          <Text className={`font-semibold ${activeTab === 'all' ? 'text-black' : 'text-gray-500'}`}>
            All Posts
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      {activeTab === 'collections' ? (
        <FlatList
          data={savedItems}
          renderItem={renderItem}
          keyExtractor={item => item.id}
          numColumns={2}
          contentContainerStyle={{ padding: 4 }}
        />
      ) : (
        <FlatList
          data={[...savedItems, ...savedItems, ...savedItems]}
          renderItem={renderItemGrid}
          keyExtractor={(item, index) => `${item.id}-${index}`}
          numColumns={3}
        />
      )}

      {/* Floating Action Button */}
      <TouchableOpacity 
        className="absolute bottom-6 right-6 bg-blue-500 w-14 h-14 rounded-full items-center justify-center shadow-lg"
      >
        <Feather name="plus" size={24} color="white" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}
