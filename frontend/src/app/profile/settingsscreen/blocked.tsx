import React, { useState } from 'react';
import { View, Text, TextInput, FlatList, Image, TouchableOpacity, Alert } from 'react-native';
import { Feather } from '@expo/vector-icons';
import Header from './components/Header';
import { SafeAreaView } from 'react-native-safe-area-context';
interface BlockedUser {
  id: string;
  name: string;
  username: string;
  image: string;
}

// Sample data for blocked users
const blockedUsers: BlockedUser[] = [
  {
    id: '1',
    name: 'Doan Thang',
    username: 'dtttt',
    image: 'https://anhnail.vn/wp-content/uploads/2024/10/anh-meme-ech-xanh-5.webp',
  },
  {
    id: '2',
    name: 'Lap Tien Pham',
    username: 'lappham',
    image: 'https://anhnail.vn/wp-content/uploads/2024/10/anh-meme-ech-xanh-5.webp',
  },
  {
    id: '3',
    name: 'Duc Hiep',
    username: 'duchiep',
    image: 'https://anhnail.vn/wp-content/uploads/2024/10/anh-meme-ech-xanh-5.webp',
  }
];

export default function BlockedAccountsScreen() {
  const [search, setSearch] = useState('');
  const [users, setUsers] = useState<BlockedUser[]>(blockedUsers);

  // Filter users based on search
  const filteredUsers = users.filter(user => 
    search === '' || 
    user.name.toLowerCase().includes(search.toLowerCase()) || 
    user.username.toLowerCase().includes(search.toLowerCase())
  );

  // Unblock a user
  const unblockUser = (id: string) => {
    Alert.alert(
      "Unblock Account",
      "Are you sure you want to unblock this account? They will be able to see your posts and interact with you again.",
      [
        {
          text: "Cancel",
          style: "cancel"
        },
        { 
          text: "Unblock", 
          onPress: () => {
            setUsers(users.filter(user => user.id !== id));
          },
          style: "destructive"
        }
      ]
    );
  };

  // Render each blocked user item
  const renderUserItem = ({ item }: { item: BlockedUser }) => (
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
        onPress={() => unblockUser(item.id)}
        className="px-3 py-1.5 rounded-md border border-gray-300"
      >
        <Text className="text-black">Unblock</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-white">
      <Header title="Blocked Accounts" />
      {/* Header Info */}
      <View className="p-4 bg-gray-50">
        <Text className="text-base">
          People you've blocked can't see your posts or find you in search. They won't know you've blocked them.
        </Text>
      </View>
      
      {/* Search Bar */}
      <View className="p-4 border-b border-gray-200">
        <View className="flex-row items-center bg-gray-100 rounded-md px-3 py-2">
          <Feather name="search" size={20} color="#666" />
          <TextInput
            className="flex-1 ml-2 text-base"
            placeholder="Search blocked accounts..."
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
            <Feather name="slash" size={48} color="#ccc" />
            <Text className="text-lg text-center mt-4">
              No blocked accounts
            </Text>
            <Text className="text-gray-500 text-center mt-2">
              When you block someone, they can't see your posts or find you in search
            </Text>
          </View>
        }
      />
      
      {/* Block New Account Button */}
      <View className="p-4 border-t border-gray-200">
        <TouchableOpacity className="flex-row items-center justify-center p-3">
          <Feather name="user-x" size={20} color="#3897f0" className="mr-2" />
          <Text className="text-blue-500 font-semibold ml-2">Block Another Account</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
