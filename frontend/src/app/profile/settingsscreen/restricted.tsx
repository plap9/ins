import React, { useState } from 'react';
import { View, Text, SafeAreaView, TextInput, FlatList, Image, TouchableOpacity, Alert } from 'react-native';
import { Feather } from '@expo/vector-icons';
import Header from './components/Header';

// Sample data for restricted users
const restrictedUsers = [
  {
    id: '1',
    name: 'Doan Thang',
    username: 'dttttt',
    image: 'https://anhnail.vn/wp-content/uploads/2024/10/anh-meme-ech-xanh-5.webp',
  },
  {
    id: '2',
    name: 'Pham Lap',
    username: 'plap',
    image: 'https://anhnail.vn/wp-content/uploads/2024/10/anh-meme-ech-xanh-5.webp',
  },
];

export default function RestrictedAccountsScreen() {
  const [search, setSearch] = useState('');
  const [users, setUsers] = useState(restrictedUsers);

  // Filter users based on search
  const filteredUsers = users.filter(user => 
    search === '' || 
    user.name.toLowerCase().includes(search.toLowerCase()) || 
    user.username.toLowerCase().includes(search.toLowerCase())
  );

  // Unrestrict a user
  const unrestrictUser = (id: string) => {
    Alert.alert(
      "Unrestrict Account",
      "Are you sure you want to unrestrict this account? They will be able to see when you're active, see when you've read their messages, and their comments will no longer be filtered.",
      [
        {
          text: "Cancel",
          style: "cancel"
        },
        { 
          text: "Unrestrict", 
          onPress: () => {
            setUsers(users.filter(user => user.id !== id));
          }
        }
      ]
    );
  };

  // Render each restricted user item
  const renderUserItem = ({ item }: { item: typeof restrictedUsers[number] }) => (
    <View className="flex-row items-center justify-between py-4 px-4 border-b border-gray-100">
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
        onPress={() => unrestrictUser(item.id)}
        className="px-3 py-1.5 rounded-md border border-gray-300"
      >
        <Text className="text-black">Unrestrict</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-white">
      <Header title="Restricted Accounts" />
      {/* Header Info */}
      <View className="p-4 bg-gray-50">
        <Text className="text-base">
          When you restrict someone:
        </Text>
        <View className="mt-2">
          <Text className="text-sm text-gray-600 mb-1">• Their comments on your posts will only be visible to them</Text>
          <Text className="text-sm text-gray-600 mb-1">• They won't be able to see when you're online or when you've read their messages</Text>
          <Text className="text-sm text-gray-600">• You won't receive notifications from them</Text>
        </View>
      </View>
      
      {/* Search Bar */}
      <View className="p-4 border-b border-gray-200">
        <View className="flex-row items-center bg-gray-100 rounded-md px-3 py-2">
          <Feather name="search" size={20} color="#666" />
          <TextInput
            className="flex-1 ml-2 text-base"
            placeholder="Search restricted accounts..."
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
      
      {/* User List */}
      <FlatList
        data={filteredUsers}
        renderItem={renderUserItem}
        keyExtractor={item => item.id}
        ListEmptyComponent={
          <View className="flex-1 items-center justify-center p-10">
            <Feather name="shield" size={48} color="#ccc" />
            <Text className="text-lg text-center mt-4">
              No restricted accounts
            </Text>
            <Text className="text-gray-500 text-center mt-2">
              When you restrict someone, their interactions with you will be limited, but they won't know they've been restricted.
            </Text>
          </View>
        }
      />
      
      {/* Restrict Another Account Button */}
      <View className="p-4 border-t border-gray-200">
        <TouchableOpacity className="flex-row items-center justify-center p-3">
          <Feather name="shield" size={20} color="#3897f0" className="mr-2" />
          <Text className="text-blue-500 font-semibold ml-2">Restrict Another Account</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
