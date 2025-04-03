import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity,  Switch } from 'react-native';
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

export default function CommentsScreen() {
  // States for different settings
  const [commentPermission, setCommentPermission] = useState('everyone');
  const [filterOffensiveComments, setFilterOffensiveComments] = useState(true);
  const [hideOffensiveComments, setHideOffensiveComments] = useState(true);
  const [manualFilterKeywords, setManualFilterKeywords] = useState(true);
  const [approveTaggedComments, setApproveTaggedComments] = useState(false);
  const [pinComments, setPinComments] = useState(true);

  // Options for comment permissions
  const commentOptions = [
    { 
      value: 'everyone', 
      label: 'Everyone', 
      description: 'Anyone can comment on your posts' 
    },
    { 
      value: 'followers', 
      label: 'People You Follow and Your Followers', 
      description: 'Only people you follow and your followers can comment on your posts' 
    },
    { 
      value: 'following', 
      label: 'People You Follow', 
      description: 'Only people you follow can comment on your posts' 
    },
    { 
      value: 'none', 
      label: 'Turn Off', 
      description: 'No one can comment on your posts' 
    }
  ];

  // Options for comment filtering
  const filterOptions = [
    { 
      value: 'offensive', 
      label: 'Hide Offensive Comments', 
      description: 'Automatically hide comments that may be offensive' 
    },
    { 
      value: 'specific', 
      label: 'Manual Filter', 
      description: 'Hide comments that contain specific words or phrases' 
    },
    { 
      value: 'none', 
      label: 'No Filter', 
      description: 'Show all comments' 
    }
  ];

  return (
    <SafeAreaView className="flex-1 bg-gray-100">
      <Header title="Comments" />
      <ScrollView className="flex-1 p-4">
        <Text className="text-base mb-6">
          Control who can comment on your posts and manage comment filters to improve your experience.
        </Text>
        
        {/* Allow comments from */}
        <OptionSelector
          title="Allow Comments From"
          options={commentOptions}
          selectedOption={commentPermission}
          onSelect={setCommentPermission}
        />
        
        {/* Comment moderation settings */}
        <SettingsGroup title="Comment Moderation">
          <SettingSwitch
            title="Hide Offensive Comments"
            description="Automatically hide comments that may be offensive"
            value={hideOffensiveComments}
            onValueChange={setHideOffensiveComments}
          />
          <SettingSwitch
            title="Filter Most Reported Words"
            description="Hide comments that contain commonly reported words"
            value={filterOffensiveComments}
            onValueChange={setFilterOffensiveComments}
          />
          <SettingSwitch
            title="Manual Filter"
            description="Hide comments that contain specific words or phrases you choose"
            value={manualFilterKeywords}
            onValueChange={setManualFilterKeywords}
          />
          
          {manualFilterKeywords && (
            <TouchableOpacity className="mt-2 py-2">
              <Text className="text-blue-500">Manage Manual Filter List</Text>
            </TouchableOpacity>
          )}
        </SettingsGroup>
        
        {/* Advanced comment controls */}
        <SettingsGroup title="Advanced Controls">
          <SettingSwitch
            title="Approve Tagged Comments"
            description="Manually approve comments where you're mentioned before they're visible"
            value={approveTaggedComments}
            onValueChange={setApproveTaggedComments}
          />
          <SettingSwitch
            title="Allow Comment Pinning"
            description="Allow pinning up to three comments on your posts"
            value={pinComments}
            onValueChange={setPinComments}
          />
        </SettingsGroup>
        
        {/* Manage blocked commenters */}
        <TouchableOpacity className="bg-white p-4 rounded-lg shadow-sm items-center justify-center mb-6">
          <Text className="text-blue-500 font-medium">Manage Blocked Commenters</Text>
        </TouchableOpacity>
        
        {/* View hidden comments */}
        <TouchableOpacity className="bg-white p-4 rounded-lg shadow-sm items-center justify-center mb-6">
          <Text className="text-blue-500 font-medium">View Hidden Comments</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}
