import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, SafeAreaView } from 'react-native';
import { Feather } from '@expo/vector-icons';
import Header from './components/Header';

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

export default function MessageRepliesScreen() {
  // States for different settings
  const [directMessages, setDirectMessages] = useState('followers');
  const [groupRequests, setGroupRequests] = useState('everyone');
  const [storyReplies, setStoryReplies] = useState('followers');
  const [messageNotifications, setMessageNotifications] = useState('everyone');

  // Options for direct messages
  const directMessageOptions = [
    { 
      value: 'everyone', 
      label: 'Everyone', 
      description: 'Anyone can send you a message request' 
    },
    { 
      value: 'followers', 
      label: 'Followers', 
      description: 'Only people who follow you can send you message requests' 
    },
    { 
      value: 'followingAndFollowers', 
      label: 'People You Follow and Your Followers', 
      description: 'Only people you follow and your followers can send you message requests'
    },
    { 
      value: 'none', 
      label: 'No One', 
      description: 'No one can send you message requests' 
    }
  ];

  // Options for group requests
  const groupRequestOptions = [
    { 
      value: 'everyone', 
      label: 'Everyone', 
      description: 'Anyone can add you to group conversations' 
    },
    { 
      value: 'followers', 
      label: 'Followers', 
      description: 'Only people who follow you can add you to group conversations' 
    },
    { 
      value: 'followingAndFollowers', 
      label: 'People You Follow and Your Followers', 
      description: 'Only people you follow and your followers can add you to group conversations'
    },
    { 
      value: 'none', 
      label: 'No One', 
      description: 'No one can add you to group conversations' 
    }
  ];

  // Options for story replies
  const storyReplyOptions = [
    { 
      value: 'everyone', 
      label: 'Everyone', 
      description: 'Anyone who can see your stories can reply to them' 
    },
    { 
      value: 'followers', 
      label: 'Followers', 
      description: 'Only people who follow you can reply to your stories' 
    },
    { 
      value: 'following', 
      label: 'People You Follow', 
      description: 'Only people you follow can reply to your stories'
    },
    { 
      value: 'followingAndFollowers', 
      label: 'People You Follow and Your Followers', 
      description: 'Only people you follow and your followers can reply to your stories'
    },
    { 
      value: 'none', 
      label: 'Off', 
      description: 'No one can reply to your stories' 
    }
  ];

  // Options for message notifications
  const messageNotificationOptions = [
    { 
      value: 'everyone', 
      label: 'Everyone', 
      description: 'Get notifications for messages from everyone' 
    },
    { 
      value: 'followers', 
      label: 'Followers', 
      description: 'Only get notifications for messages from people who follow you' 
    },
    { 
      value: 'following', 
      label: 'People You Follow', 
      description: 'Only get notifications for messages from people you follow'
    },
    { 
      value: 'none', 
      label: 'No One', 
      description: 'Don\'t get notifications for messages' 
    }
  ];

  return (
    <SafeAreaView className="flex-1 bg-gray-100">
      <Header title="Message Replies" />
      <ScrollView className="flex-1 p-4">
        <Text className="text-base mb-6">
          Control who can send you messages and reply to your stories. These settings affect your DMs and story replies.
        </Text>
        
        <OptionSelector
          title="Message Requests"
          options={directMessageOptions}
          selectedOption={directMessages}
          onSelect={setDirectMessages}
        />
        
        <OptionSelector
          title="Group Requests"
          options={groupRequestOptions}
          selectedOption={groupRequests}
          onSelect={setGroupRequests}
        />
        
        <OptionSelector
          title="Story Replies"
          options={storyReplyOptions}
          selectedOption={storyReplies}
          onSelect={setStoryReplies}
        />
        
        <OptionSelector
          title="Message Notifications"
          options={messageNotificationOptions}
          selectedOption={messageNotifications}
          onSelect={setMessageNotifications}
        />
      </ScrollView>
    </SafeAreaView>
  );
}
