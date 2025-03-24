import React, { useState } from 'react';
import { View, Text, SafeAreaView, TextInput, FlatList, Image, TouchableOpacity } from 'react-native';
import { Feather, AntDesign } from '@expo/vector-icons';
import Header from './components/Header';

interface User {
  id: string;
  name: string;
  username: string;
  image: string;
  isCloseFriend: boolean;
}

// Sample data for suggested and close friends
const sampleUsers: User[] = [
  {
    id: '1',
    name: 'Doan Thang',
    username: 'dttt',
    image: 'https://anhnail.vn/wp-content/uploads/2024/10/anh-meme-ech-xanh-5.webp',
    isCloseFriend: true,
  },
  {
    id: '2',
    name: 'Lap Pham',
    username: 'lap.pham',
    image: 'https://anhnail.vn/wp-content/uploads/2024/10/anh-meme-ech-xanh-5.webp',
    isCloseFriend: true,
  },
  {
    id: '3',
    name: 'Luis Pham',
    username: 'lapluis',
    image: 'https://anhnail.vn/wp-content/uploads/2024/10/anh-meme-ech-xanh-5.webp',
    isCloseFriend: true,
  },
  {
    id: '4',
    name: 'hiepdavid',
    username: 'duchiep',
    image: 'https://anhnail.vn/wp-content/uploads/2024/10/anh-meme-ech-xanh-5.webp',
    isCloseFriend: false,
  },
  {
    id: '5',
    name: 'David Hiep',
    username: 'hiep.d',
    image: 'https://anhnail.vn/wp-content/uploads/2024/10/anh-meme-ech-xanh-5.webp',
    isCloseFriend: false,
  },
  {
    id: '6',
    name: 'davzz',
    username: 'zzdavid',
    image: 'https://anhnail.vn/wp-content/uploads/2024/10/anh-meme-ech-xanh-5.webp',
    isCloseFriend: false,
  },
  {
    id: '7',
    name: 'Lap Tien Pham',
    username: 'lap1',
    image: 'https://anhnail.vn/wp-content/uploads/2024/10/anh-meme-ech-xanh-5.webp',
    isCloseFriend: false,
  },
  {
    id: '8',
    name: 'Pham Tien Lap',
    username: 'lap67cs1',
    image: 'https://anhnail.vn/wp-content/uploads/2024/10/anh-meme-ech-xanh-5.webp',
    isCloseFriend: false,
  },
  {
    id: '9',
    name: 'TimTImy',
    username: 'dthang',
    image: 'https://anhnail.vn/wp-content/uploads/2024/10/anh-meme-ech-xanh-5.webp',
    isCloseFriend: false,
  },
];

export default function CloseFriendsScreen() {
  const [search, setSearch] = useState('');
  const [users, setUsers] = useState<User[]>(sampleUsers);
  const [activeTab, setActiveTab] = useState<'close-friends' | 'suggestions'>('close-friends');

  // Filter users based on search and active tab
  const filteredUsers = users.filter(user => {
    const matchesSearch = 
      search === '' || 
      user.name.toLowerCase().includes(search.toLowerCase()) || 
      user.username.toLowerCase().includes(search.toLowerCase());
    
    if (activeTab === 'close-friends') {
      return matchesSearch && user.isCloseFriend;
    } else {
      return matchesSearch;
    }
  });

  // Toggle close friend status
  const toggleCloseFriend = (id: string) => {
    setUsers(users.map(user => 
      user.id === id 
        ? { ...user, isCloseFriend: !user.isCloseFriend } 
        : user
    ));
  };

  // Render each user item
  const renderUserItem = ({ item }: { item: User }) => (
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
        onPress={() => toggleCloseFriend(item.id)}
        className={`px-3 py-1.5 rounded-full ${
          item.isCloseFriend 
            ? 'bg-green-500' 
            : 'bg-gray-200'
        }`}
      >
        <Text className={item.isCloseFriend ? 'text-white' : 'text-gray-800'}>
          {item.isCloseFriend ? 'Added' : 'Add'}
        </Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-white">
      <Header title="Close Friends" />
      {/* Header Info */}
      <View className="p-4 bg-gray-50">
        <Text className="text-base">
          People you add to your close friends list will be able to see your stories and reels marked for close friends. People won't be notified when you add them to or remove them from your list.
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
          className={`flex-1 py-3 items-center ${activeTab === 'close-friends' ? 'border-b-2 border-black' : ''}`}
          onPress={() => setActiveTab('close-friends')}
        >
          <Text className={`font-semibold ${activeTab === 'close-friends' ? 'text-black' : 'text-gray-500'}`}>
            Close Friends ({users.filter(u => u.isCloseFriend).length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity 
          className={`flex-1 py-3 items-center ${activeTab === 'suggestions' ? 'border-b-2 border-black' : ''}`}
          onPress={() => setActiveTab('suggestions')}
        >
          <Text className={`font-semibold ${activeTab === 'suggestions' ? 'text-black' : 'text-gray-500'}`}>
            Suggestions
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
            <AntDesign name="addusergroup" size={48} color="#ccc" />
            <Text className="text-lg text-center mt-4">
              {activeTab === 'close-friends' 
                ? "You haven't added any close friends yet" 
                : "No suggestions found"}
            </Text>
            <Text className="text-gray-500 text-center mt-2">
              {activeTab === 'close-friends'
                ? "Add people to your close friends list to share private content with them"
                : "Try searching for people to add to your close friends list"}
            </Text>
          </View>
        }
      />
      
      {/* Create List Button */}
      {activeTab === 'close-friends' && users.some(u => u.isCloseFriend) && (
        <View className="p-4 border-t border-gray-200">
          <TouchableOpacity className="bg-green-500 p-3 items-center rounded-md">
            <Text className="text-white font-semibold">Create Close Friends Story</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}
