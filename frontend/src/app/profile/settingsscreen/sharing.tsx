import React, { useState } from 'react';
import { View, Text, ScrollView, SafeAreaView, Switch, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import Header from './components/Header';

// Setting item with switch
const SettingSwitch = ({ title, description, value, onValueChange }
  : { title: string; description?: string; value: boolean; onValueChange: (value: boolean) => void }
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

// Setting option with chevron
const SettingOption = ({ title, description, onPress, rightText = null }:
  { title: string; description?: string; onPress: () => void; rightText?: null | string }
) => (
  <TouchableOpacity 
    className="flex-row items-center justify-between py-4 border-b border-gray-100"
    onPress={onPress}
  >
    <View className="flex-1 pr-4">
      <Text className="text-base font-medium">{title}</Text>
      {description && <Text className="text-sm text-gray-500 mt-1">{description}</Text>}
    </View>
    <View className="flex-row items-center">
      {rightText && <Text className="text-gray-500 mr-2">{rightText}</Text>}
      <Feather name="chevron-right" size={20} color="#999" />
    </View>
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

export default function SharingScreen() {
  // States for different settings
  const [allowResharing, setAllowResharing] = useState(true);
  const [allowEmbedding, setAllowEmbedding] = useState(true);
  const [originalPhotos, setOriginalPhotos] = useState(false);
  const [shareToFacebook, setShareToFacebook] = useState(false);
  const [shareToPosts, setShareToPosts] = useState(true);
  const [autoArchiveStories, setAutoArchiveStories] = useState(true);

  // Handle connected account press
  const handleConnectedAccount = (platform: string) => {
    // Implementation would involve authentication with the respective platforms
    console.log(`Connect to ${platform}`);
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-100">
      <Header title="Sharing" />
      <ScrollView className="flex-1 p-4">
        <Text className="text-base mb-6">
          Control how your content is shared and where it appears.
        </Text>
        
        {/* Content Sharing */}
        <SettingsGroup title="Content Sharing">
          <SettingSwitch
            title="Allow Resharing to Stories"
            description="Let others share your posts to their stories"
            value={allowResharing}
            onValueChange={setAllowResharing}
          />
          <SettingSwitch
            title="Allow Sharing"
            description="Let people share your posts in messages"
            value={shareToPosts}
            onValueChange={setShareToPosts}
          />
          <SettingSwitch
            title="Allow Embedding"
            description="Let others embed your posts on their websites"
            value={allowEmbedding}
            onValueChange={setAllowEmbedding}
          />
          <SettingSwitch
            title="Share Original Photos"
            description="Share original photos when you share posts to other apps"
            value={originalPhotos}
            onValueChange={setOriginalPhotos}
          />
        </SettingsGroup>
        
        {/* Stories Sharing */}
        <SettingsGroup title="Stories">
          <SettingSwitch
            title="Save to Archive"
            description="Automatically save your stories to your archive"
            value={autoArchiveStories}
            onValueChange={setAutoArchiveStories}
          />
          <SettingOption
            title="Sharing to Story"
            description="Control who can share posts to your story"
            onPress={() => {}}
            rightText="Everyone"
          />
          <SettingOption
            title="Sharing from Story"
            description="Control who can share your story"
            onPress={() => {}}
            rightText="Everyone"
          />
        </SettingsGroup>
        
        {/* Connected Accounts */}
        <SettingsGroup title="Connected Accounts">
          <TouchableOpacity 
            className="flex-row items-center justify-between py-4 border-b border-gray-100"
            onPress={() => handleConnectedAccount('Facebook')}
          >
            <View className="flex-row items-center">
              <View className="w-8 h-8 rounded-full bg-blue-600 items-center justify-center mr-3">
                <Feather name="facebook" size={18} color="white" />
              </View>
              <Text className="text-base font-medium">Facebook</Text>
            </View>
            <Text className="text-blue-500">Connect</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            className="flex-row items-center justify-between py-4 border-b border-gray-100"
            onPress={() => handleConnectedAccount('Twitter')}
          >
            <View className="flex-row items-center">
              <View className="w-8 h-8 rounded-full bg-blue-400 items-center justify-center mr-3">
                <Feather name="twitter" size={18} color="white" />
              </View>
              <Text className="text-base font-medium">Twitter</Text>
            </View>
            <Text className="text-blue-500">Connect</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            className="flex-row items-center justify-between py-4"
            onPress={() => handleConnectedAccount('Tumblr')}
          >
            <View className="flex-row items-center">
              <View className="w-8 h-8 rounded-full bg-blue-800 items-center justify-center mr-3">
                <Text className="text-white font-bold">T</Text>
              </View>
              <Text className="text-base font-medium">Tumblr</Text>
            </View>
            <Text className="text-blue-500">Connect</Text>
          </TouchableOpacity>
        </SettingsGroup>
        
        {/* Cross-App Sharing */}
        <SettingsGroup title="Cross-App Sharing">
          <SettingSwitch
            title="Share Across Apps"
            description="Share your post to Facebook when you share on Instagram"
            value={shareToFacebook}
            onValueChange={setShareToFacebook}
          />
          <SettingOption
            title="Choose Accounts"
            description="Select which Facebook accounts to share to"
            onPress={() => {}}
          />
        </SettingsGroup>
        
        {/* Download Your Information */}
        <TouchableOpacity className="bg-white p-4 rounded-lg shadow-sm items-center justify-center mb-6">
          <Text className="text-blue-500 font-medium">Download Your Information</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}
