import React, { useState } from 'react';
import { View, Text, SafeAreaView, TextInput, FlatList, Image, TouchableOpacity } from 'react-native';
import { Feather, AntDesign } from '@expo/vector-icons';
import Header from './components/Header';

// Sample data for followed users
const sampleUsers = [
  {
    id: '1',
    name: 'Doan Thang',
    username: 'dt34',
    image: 'https://anhnail.vn/wp-content/uploads/2024/10/anh-meme-ech-xanh-5.webp',
    isHidden: true,
  },
  {
    id: '2',
    name: 'Lap Pham',
    username: 'lpham',
    image: 'https://anhnail.vn/wp-content/uploads/2024/10/anh-meme-ech-xanh-5.webp',
    isHidden: false,
  },
  {
    id: '3',
    name: 'Doan Manh Thang',
    username: 'dthang',
    image: 'https://anhnail.vn/wp-content/uploads/2024/10/anh-meme-ech-xanh-5.webp',
    isHidden: true,
  },
  {
    id: '4',
    name: 'dev guy',
    username: 'coder123',
    image: 'https://anhnail.vn/wp-content/uploads/2024/10/anh-meme-ech-xanh-5.webp',
    isHidden: false,
  },
  {
    id: '5',
    name: 'David Hiep',
    username: 'duc hiep',
    image: 'https://anhnail.vn/wp-content/uploads/2024/10/anh-meme-ech-xanh-5.webp',
    isHidden: false,
  },
  {
    id: '6',
    name: 'Pham tien lap',
    username: 'ptl44',
    image: 'https://anhnail.vn/wp-content/uploads/2024/10/anh-meme-ech-xanh-5.webp',
    isHidden: false,
  },
  {
    id: '7',
    name: 'Tien Lap Pham',
    username: 'plap44',
    image: 'https://anhnail.vn/wp-content/uploads/2024/10/anh-meme-ech-xanh-5.webp',
    isHidden: true,
  },
];

export default function HideStoryScreen() {
  const [search, setSearch] = useState('');
  const [users, setUsers] = useState(sampleUsers);
  const [activeTab, setActiveTab] = useState('hidden');

  // Filter users based on search and active tab
  const filteredUsers = users.filter(user => {
    const matchesSearch = 
      search === '' || 
      user.name.toLowerCase().includes(search.toLowerCase()) || 
      user.username.toLowerCase().includes(search.toLowerCase());
    
    if (activeTab === 'hidden') {
      return matchesSearch && user.isHidden;
    } else {
      return matchesSearch;
    }
  });

  // Toggle hidden status
  const toggleHidden = (id: string): void => {
    setUsers(users.map(user => 
      user.id === id 
        ? { ...user, isHidden: !user.isHidden } 
        : user
    ));
  };

  // Render each user item
  const renderUserItem = ({ item }: { item: typeof sampleUsers[number] }) => (
    <View className="flex-row items-center justify-between py-3 px-4 border-b border-gray-100">
      <View className="flex-row items-center flex-1">
        <Image 
          source={{ uri: item.image }} 
          className="w-12 h-12 rounded-full mr-3"
        />
        <View className="flex-1">
          <Text className="font-semibold">{item.name}</Text>
          <Text className="text-gray-500">@{item.username}</Text>
        </View>
      </View>
      <TouchableOpacity 
        onPress={() => toggleHidden(item.id)}
        className={`px-3 py-1.5 rounded-full ${
          item.isHidden 
            ? 'bg-red-500' 
            : 'bg-gray-200'
        }`}
      >
        <Text className={item.isHidden ? 'text-white' : 'text-gray-800'}>
          {item.isHidden ? 'Hidden' : 'Hide'}
        </Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-white">
      <Header title="Hide Story" />
      {/* Header Info */}
      <View className="p-4">
        <Text className="text-gray-400">
          People you add to your hide list won't be able to see your stories. They won't know you've hidden your content from them.
        </Text>
      </View>
      
      {/* Search Bar */}
      <View className="p-4 border-b border-gray-200">
        <View className="flex-row items-center bg-gray-100 rounded-md px-3 py-2">
          <Feather name="search" size={20} color="#666" />
          <TextInput
            className="flex-1 ml-2 text-base"
            placeholder="Search..."
            value={search}
            onChangeText={setSearch}
          />
          {search !== '' && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Feather name="x" size={20} color="#666" />
            </TouchableOpacity>
          )}
        </View>
      </View>
      
      {/* Tabs */}
      <View className="flex-row border-b border-gray-200">
        <TouchableOpacity 
          className={`flex-1 py-3 items-center ${activeTab === 'hidden' ? 'border-b-2 border-black' : ''}`}
          onPress={() => setActiveTab('hidden')}
        >
          <Text className={`font-semibold ${activeTab === 'hidden' ? 'text-black' : 'text-gray-500'}`}>
            Hidden ({users.filter(u => u.isHidden).length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity 
          className={`flex-1 py-3 items-center ${activeTab === 'all' ? 'border-b-2 border-black' : ''}`}
          onPress={() => setActiveTab('all')}
        >
          <Text className={`font-semibold ${activeTab === 'all' ? 'text-black' : 'text-gray-500'}`}>
            All Followers
          </Text>
        </TouchableOpacity>
      </View>
      
      {/* User List */}
      <FlatList
        data={filteredUsers}
        renderItem={renderUserItem}
        keyExtractor={item => item.id}
        ListEmptyComponent={
          <View className="flex-1 items-center justify-center p-10">
            <Feather name="eye-off" size={48} color="#ccc" />
            <Text className="text-lg text-center mt-4">
              {activeTab === 'hidden' 
                ? "You haven't hidden your story from anyone" 
                : "No followers found"}
            </Text>
            <Text className="text-gray-500 text-center mt-2">
              {activeTab === 'hidden'
                ? "People you hide your stories from won't know you've hidden them"
                : "Try searching for people to hide your stories from"}
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}
