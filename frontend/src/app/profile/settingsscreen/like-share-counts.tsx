import React, { useState } from 'react';
import { View, Text, Switch, TouchableOpacity, ScrollView, Image } from 'react-native';
import { Feather } from '@expo/vector-icons';
import Header from './components/Header';
import { SafeAreaView } from 'react-native-safe-area-context';

// Setting item with switch
const SettingSwitch = ({ title, description, value, onValueChange }: 
  { title: string; description?: string; value: boolean; onValueChange: (value: boolean) => void }) => (
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

// Settings group
const SettingsGroup = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <View className="mb-6">
    <Text className="text-lg font-semibold mb-2">{title}</Text>
    <View className="bg-white rounded-lg p-3 shadow-sm">
      {children}
    </View>
  </View>
);

export default function LikeShareCountsScreen() {
  // States
  const [hidePostLikes, setHidePostLikes] = useState(false);
  const [hideViewCounts, setHideViewCounts] = useState(false);
  const [hideReelLikes, setHideReelLikes] = useState(false);
  const [hideShareCounts, setHideShareCounts] = useState(false);

  return (
    <SafeAreaView className="flex-1 bg-gray-100">
      <Header title="Like and Share Counts" />
      <ScrollView className="flex-1 p-4">
        {/* Info Section */}
        <View className="p-4 mb-6">
          <Text className="text-sm text-gray-400">
            You can hide the total number of likes and views on posts from other accounts. Your likes will still be visible to you.
          </Text>
        </View>
        
        {/* Like Count Settings */}
        <SettingsGroup title="Like Count Settings">
          <SettingSwitch
            title="Hide Like Counts"
            description="Hide the number of likes on posts from other accounts"
            value={hidePostLikes}
            onValueChange={setHidePostLikes}
          />
          <SettingSwitch
            title="Hide View Counts"
            description="Hide the number of views on videos from other accounts"
            value={hideViewCounts}
            onValueChange={setHideViewCounts}
          />
          <SettingSwitch
            title="Hide Reel Likes"
            description="Hide like counts on reels from other accounts"
            value={hideReelLikes}
            onValueChange={setHideReelLikes}
          />
        </SettingsGroup>
        
        {/* Share Count Settings */}
        <SettingsGroup title="Share Count Settings">
          <SettingSwitch
            title="Hide Share Counts"
            description="Hide the number of times posts have been shared"
            value={hideShareCounts}
            onValueChange={setHideShareCounts}
          />
        </SettingsGroup>
      </ScrollView>
    </SafeAreaView>
  );
}
