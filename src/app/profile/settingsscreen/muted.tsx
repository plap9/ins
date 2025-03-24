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

// Muted User Item
const MutedUserItem = ({ username, fullName, imageUrl, mutedStories, mutedPosts, onToggleMuteStories, onToggleMutePosts, onUnmuteAll }:
  {username: string; fullName: string; imageUrl: string; mutedStories: boolean; mutedPosts: boolean; onToggleMuteStories: () => void; onToggleMutePosts: () => void; onUnmuteAll: () => void}
) => (
  <View className="py-4 border-b border-gray-100">
    <View className="flex-row items-center justify-between">
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
      <TouchableOpacity onPress={onUnmuteAll} className="px-2">
        <Text className="text-blue-500 font-medium">Unmute</Text>
      </TouchableOpacity>
    </View>
    
    <View className="mt-3 ml-15">
      <View className="flex-row items-center justify-between mb-2">
        <Text className="text-sm">Posts</Text>
        <Switch
          value={mutedPosts}
          onValueChange={onToggleMutePosts}
          trackColor={{ false: "#e0e0e0", true: "#3897f0" }}
          thumbColor="#fff"
          style={{ transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }] }}
        />
      </View>
      <View className="flex-row items-center justify-between">
        <Text className="text-sm">Stories</Text>
        <Switch
          value={mutedStories}
          onValueChange={onToggleMuteStories}
          trackColor={{ false: "#e0e0e0", true: "#3897f0" }}
          thumbColor="#fff"
          style={{ transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }] }}
        />
      </View>
    </View>
  </View>
);

export default function MutedAccountsScreen() {
  // States for general settings
  const [muteDuration, setMuteDuration] = useState("8 hours");
  
  // Sample muted accounts
  const [mutedUsers, setMutedUsers] = useState([
    {
      id: '1',
      username: 'lappham',
      fullName: 'Lap Pham',
      imageUrl: 'https://anhnail.vn/wp-content/uploads/2024/10/anh-meme-ech-xanh-5.webp',
      mutedStories: true,
      mutedPosts: true,
    },
    {
      id: '2',
      username: 'lappham2',
      fullName: 'Lap Pham',
      imageUrl: 'https://anhnail.vn/wp-content/uploads/2024/10/anh-meme-ech-xanh-5.webp',
      mutedStories: true,
      mutedPosts: false,
    },
    {
      id: '3',
      username: 'lappham3',
      fullName: 'Lap Pham',
      imageUrl: 'https://anhnail.vn/wp-content/uploads/2024/10/anh-meme-ech-xanh-5.webp',
      mutedStories: false,
      mutedPosts: true,
    },
  ]);

  const toggleMuteStories = (id: string): void => {
    setMutedUsers(mutedUsers.map(user => 
      user.id === id ? {...user, mutedStories: !user.mutedStories} : user
    ));
  };

  const toggleMutePosts = (id: string): void => {
    setMutedUsers(mutedUsers.map(user => 
      user.id === id ? {...user, mutedPosts: !user.mutedPosts} : user
    ));
  };

  const unmuteAll = (id: string): void => {
    setMutedUsers(mutedUsers.map(user => 
      user.id === id ? {...user, mutedStories: false, mutedPosts: false} : user
    ));
  };

  const removeMutedUser = (id: string): void => {
    setMutedUsers(mutedUsers.filter(user => user.id !== id));
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-100">
      <Header title="Muted Accounts" />
      <ScrollView className="flex-1 p-4">
        {/* Info Section */}
        <View className=" p-4 mb-6">
          <Text className="text-sm text-gray-400">
            Muted accounts won't know you've muted them. You can unmute an account at any time.
          </Text>
        </View>
        
        {/* Mute Settings */}
        <SettingsGroup title="Mute Settings">
          <SettingOption 
            title="Default Mute Duration"
            description="How long to mute new accounts for"
            onPress={() => {}}
            rightElement={
              <Text className="text-gray-500">{muteDuration}</Text>
            }
          />
        </SettingsGroup>
        
        {/* Muted Accounts */}
        <SettingsGroup title="Muted Accounts">
          {mutedUsers.length > 0 ? (
            mutedUsers.map(user => (
              <MutedUserItem
                key={user.id}
                username={user.username}
                fullName={user.fullName}
                imageUrl={user.imageUrl}
                mutedStories={user.mutedStories}
                mutedPosts={user.mutedPosts}
                onToggleMuteStories={() => toggleMuteStories(user.id)}
                onToggleMutePosts={() => toggleMutePosts(user.id)}
                onUnmuteAll={() => unmuteAll(user.id)}
              />
            ))
          ) : (
            <Text className="py-4 text-center text-gray-500">
              You haven't muted any accounts
            </Text>
          )}
        </SettingsGroup>
        
        {/* Manage Muted Keywords */}
        <SettingsGroup title="Muted Content">
          <SettingOption 
            title="Muted Words"
            description="Hide posts containing specific words or phrases"
            onPress={() => {}}
          />
          <SettingOption 
            title="Muted Hashtags"
            description="Hide posts with specific hashtags"
            onPress={() => {}}
          />
        </SettingsGroup>
      </ScrollView>
    </SafeAreaView>
  );
}
