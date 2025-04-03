import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Switch } from 'react-native';
import { Feather } from '@expo/vector-icons';
import Header from './components/Header';
import { SafeAreaView } from 'react-native-safe-area-context';

// Option selector component with radio buttons
const OptionSelector = ({ title, options, selectedOption, onSelect }:
  { title: string, options: { value: string, label: string, description?: string }[], selectedOption: string, onSelect: (value: string) => void }
) => {
  return (
    <View className="mb-6">
      <Text className="text-lg font-semibold mb-3">{title}</Text>
      <View className="bg-white rounded-lg overflow-hidden shadow-sm">
        {options.map((option, index) => (
          <TouchableOpacity 
            key={option.value}
            className={`flex-row items-center justify-between p-4 ${
              index < options.length - 1 ? 'border-b border-gray-100' : ''
            }`}
            onPress={() => onSelect(option.value)}
          >
            <View className="flex-1">
              <Text className="text-base font-medium">{option.label}</Text>
              {option.description && (
                <Text className="text-sm text-gray-500 mt-1">{option.description}</Text>
              )}
            </View>
            {selectedOption === option.value && (
              <Feather name="check" size={20} color="#3897f0" />
            )}
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

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

// Settings group
const SettingsGroup = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <View className="mb-6">
    <Text className="text-lg font-semibold mb-2">{title}</Text>
    <View className="bg-white rounded-lg p-3 shadow-sm">
      {children}
    </View>
  </View>
);

export default function TagsMentionsScreen() {
  // States for different settings
  const [taggingPermission, setTaggingPermission] = useState('everyone');
  const [mentionPermission, setMentionPermission] = useState('everyone');
  const [tagReviewEnabled, setTagReviewEnabled] = useState(true);
  const [mentionReviewEnabled, setMentionReviewEnabled] = useState(true);
  const [hideTagsFromProfile, setHideTagsFromProfile] = useState(false);

  // Options for tagging
  const taggingOptions = [
    { 
      value: 'everyone', 
      label: 'Everyone', 
      description: 'Anyone can tag you in their photos and videos' 
    },
    { 
      value: 'followers', 
      label: 'People You Follow', 
      description: 'Only people you follow can tag you in their photos and videos' 
    },
    { 
      value: 'none', 
      label: 'No One', 
      description: 'No one can tag you in their photos and videos' 
    }
  ];

  // Options for mentions
  const mentionOptions = [
    { 
      value: 'everyone', 
      label: 'Everyone', 
      description: 'Anyone can @mention you in their posts, comments, and stories' 
    },
    { 
      value: 'followers', 
      label: 'People You Follow', 
      description: 'Only people you follow can @mention you' 
    },
    { 
      value: 'none', 
      label: 'No One', 
      description: 'No one can @mention you' 
    }
  ];

  // Recently tagged items list
  const RecentlyTaggedSection = () => (
    <View className="mb-6">
      <View className="flex-row justify-between items-center mb-3">
        <Text className="text-lg font-semibold">Recently Tagged</Text>
        <TouchableOpacity>
          <Text className="text-blue-500">See All</Text>
        </TouchableOpacity>
      </View>
      <View className="bg-white p-4 rounded-lg shadow-sm items-center justify-center">
        <Feather name="tag" size={40} color="#ccc" />
        <Text className="text-base text-center mt-3">No new tags to review</Text>
        <Text className="text-sm text-gray-500 text-center mt-1">
          When people tag you in photos, they'll appear here for review.
        </Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-gray-100">
      <Header title="Tags and Mentions" />
      <ScrollView className="flex-1 p-4">
        <Text className="text-base mb-6">
          Control who can tag and mention you in their content and manage how tags appear on your profile.
        </Text>
        
        {/* Tags section */}
        <OptionSelector
          title="Allow Tags From"
          options={taggingOptions}
          selectedOption={taggingPermission}
          onSelect={setTaggingPermission}
        />
        
        {/* Mentions section */}
        <OptionSelector
          title="Allow @mentions From"
          options={mentionOptions}
          selectedOption={mentionPermission}
          onSelect={setMentionPermission}
        />
        
        {/* Manual approval settings */}
        <SettingsGroup title="Approval Settings">
          <SettingSwitch
            title="Manually Approve Tags"
            description="Review tags before they appear on your profile"
            value={tagReviewEnabled}
            onValueChange={setTagReviewEnabled}
          />
          <SettingSwitch
            title="Manually Approve @mentions"
            description="Review @mentions before they appear on your profile"
            value={mentionReviewEnabled}
            onValueChange={setMentionReviewEnabled}
          />
        </SettingsGroup>
        
        {/* Profile display settings */}
        <SettingsGroup title="Profile Display">
          <SettingSwitch
            title="Hide Tags From Profile"
            description="Tags won't appear on your profile, but people can still tag you"
            value={hideTagsFromProfile}
            onValueChange={setHideTagsFromProfile}
          />
        </SettingsGroup>
        
        {/* Recently tagged items */}
        <RecentlyTaggedSection />
        
        {/* Pending review button */}
        <TouchableOpacity className="bg-white p-4 rounded-lg shadow-sm items-center justify-center mb-6">
          <Text className="text-blue-500 font-medium">Review Tags and Mentions Pending Approval</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}
