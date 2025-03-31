import React, { useState } from 'react';
import { View, Text, SafeAreaView, Switch, TouchableOpacity, ScrollView, Image } from 'react-native';
import { Feather } from '@expo/vector-icons';
import Header from './components/Header';

// Setting item with switch
const SettingSwitch = ({ title, description, value, onValueChange }:
  { title: string; description?: string; value: boolean; onValueChange: (value: boolean) => void }
) => (
  <View className="flex-row items-center justify-between py-4 border-b border-gray-100">
    <View className="flex-1 pr-4">
      <Text className="text-base font-medium">{title}</Text>
      {description && <Text className="text-sm text-gray-500 mt-1">{description}</Text>}
    </View>
    <Switch
      value={value}
      onValueChange={onValueChange}
      trackColor={{ false: "#e0e0e0", true: "#3897f0" }}
      thumbColor="#fff"
    />
  </View>
);

// Setting item with right arrow
const SettingOption = ({ title, description, onPress, rightElement = null }:
  { title: string; description?: string; onPress: () => void; rightElement?: React.ReactNode }
) => (
  <TouchableOpacity 
    className="flex-row items-center justify-between py-4 border-b border-gray-100"
    onPress={onPress}
  >
    <View className="flex-1 pr-4">
      <Text className="text-base font-medium">{title}</Text>
      {description && <Text className="text-sm text-gray-500 mt-1">{description}</Text>}
    </View>
    {rightElement || <Feather name="chevron-right" size={20} color="#999" />}
  </TouchableOpacity>
);

// Settings group
const SettingsGroup = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <View className="mb-6">
    <Text className="text-lg font-semibold mb-2">{title}</Text>
    <View className="bg-white rounded-lg p-3 shadow-sm">
      {children}
    </View>
  </View>
);

// Favorite User item
const FavoriteUserItem = ({ username, fullName, imageUrl, onRemove }: 
  { username: string; fullName: string; imageUrl: string; onRemove: () => void }
) => (
  <View className="flex-row items-center justify-between py-3 border-b border-gray-100">
    <View className="flex-row items-center flex-1">
      <Image
        source={{ uri: imageUrl }}
        className="w-12 h-12 rounded-full"
      />
      <View className="ml-3">
        <Text className="font-medium">{username}</Text>
        <Text className="text-gray-500 text-sm">{fullName}</Text>
      </View>
    </View>
    <TouchableOpacity onPress={onRemove} className="p-2">
      <Feather name="x" size={20} color="#999" />
    </TouchableOpacity>
  </View>
);

export default function FavoritesScreen() {
  // States
  const [prioritizeContent, setPrioritizeContent] = useState(true);
  const [notifyNewPosts, setNotifyNewPosts] = useState(true);
  const [autoAddToClose, setAutoAddToClose] = useState(false);
  
  // Sample favorite accounts
  const [favoriteUsers, setFavoriteUsers] = useState([
    {
      id: '1',
      username: 'frontend guy',
      fullName: 'Dthang',
      imageUrl: 'https://anhnail.vn/wp-content/uploads/2024/10/anh-meme-ech-xanh-5.webp',
    },
    {
      id: '2',
      username: 'backend guy',
      fullName: 'Lap Pham',
      imageUrl: 'https://anhnail.vn/wp-content/uploads/2024/10/anh-meme-ech-xanh-5.webp',
    },
    {
      id: '3',
      username: 'duchiep',
      fullName: 'dev',
      imageUrl: 'https://anhnail.vn/wp-content/uploads/2024/10/anh-meme-ech-xanh-5.webp',
    },
    {
      id: '4',
      username: 'dev',
      fullName: 'AI',
      imageUrl: 'https://anhnail.vn/wp-content/uploads/2024/10/anh-meme-ech-xanh-5.webp',
    },
  ]);

  const removeFavorite = (id: string): void => {
    setFavoriteUsers(favoriteUsers.filter(user => user.id !== id));
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-100">
      <Header title="Favorites" />
      <ScrollView className="flex-1 p-4">
        {/* Info Section */}
        <View className="p-4 mb-6">
          <Text className="text-sm text-gray-400">
            Your favorite accounts will appear first in feed and stories. Only you can see who you've added.
          </Text>
        </View>
        
        {/* Preferences */}
        <SettingsGroup title="Favorites Preferences">
          <SettingSwitch
            title="Prioritize Content"
            description="Show favorite accounts' posts higher in your feed"
            value={prioritizeContent}
            onValueChange={setPrioritizeContent}
          />
          <SettingSwitch
            title="Post Notifications"
            description="Get notified when favorites post new content"
            value={notifyNewPosts}
            onValueChange={setNotifyNewPosts}
          />
          <SettingSwitch
            title="Add to Close Friends"
            description="Automatically add favorites to your close friends list"
            value={autoAddToClose}
            onValueChange={setAutoAddToClose}
          />
        </SettingsGroup>
        
        {/* Favorite Accounts */}
        <SettingsGroup title="Favorite Accounts">
          {favoriteUsers.length > 0 ? (
            favoriteUsers.map(user => (
              <FavoriteUserItem
                key={user.id}
                username={user.username}
                fullName={user.fullName}
                imageUrl={user.imageUrl}
                onRemove={() => removeFavorite(user.id)}
              />
            ))
          ) : (
            <Text className="py-4 text-center text-gray-500">
              You haven't added any favorites yet
            </Text>
          )}
          
          <TouchableOpacity 
            className="mt-4 p-3 bg-blue-500 rounded-md items-center"
            onPress={() => {}}
          >
            <Text className="text-white font-medium">Add New Favorites</Text>
          </TouchableOpacity>
        </SettingsGroup>
      </ScrollView>
    </SafeAreaView>
  );
}
