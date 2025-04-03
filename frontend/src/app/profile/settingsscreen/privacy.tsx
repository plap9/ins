import React, { useState } from 'react';
import { View, Text, ScrollView, Switch } from 'react-native';
import { Feather, MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import Header from './components/Header';
import { SafeAreaView } from 'react-native-safe-area-context';

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

export default function PrivacyScreen() {
  const router = useRouter();
  // States
  const [privateAccount, setPrivateAccount] = useState(true);
  const [activityStatus, setActivityStatus] = useState(true);
  const [readReceipts, setReadReceipts] = useState(true);
  const [tagApproval, setTagApproval] = useState(false);
  const [mentionControl, setMentionControl] = useState(false);
  const [dataSharing, setDataSharing] = useState(false);

  return (
    <SafeAreaView className="flex-1 bg-gray-100">
      <Header title="Privacy" />
      <ScrollView className="flex-1 p-4">
        {/* Account Privacy */}
        <SettingsGroup title="Account Privacy">
          <SettingSwitch
            title="Private Account"
            description="Only people you approve can follow you and see your content"
            value={privateAccount}
            onValueChange={setPrivateAccount}
          />
        </SettingsGroup>
        
        {/* Interactions */}
        <SettingsGroup title="Interactions">
          <SettingSwitch
            title="Tags and Mentions Approval"
            description="Manually approve tags and mentions before they appear on your profile"
            value={tagApproval}
            onValueChange={setTagApproval}
          />
          <SettingSwitch
            title="Mention Controls"
            description="Limit who can @mention you in comments, captions and stories"
            value={mentionControl}
            onValueChange={setMentionControl}
          />
        </SettingsGroup>
        
        {/* Messaging */}
        <SettingsGroup title="Messaging">
          <SettingSwitch
            title="Activity Status"
            description="Let others see when you were last active"
            value={activityStatus}
            onValueChange={setActivityStatus}
          />
          <SettingSwitch
            title="Read Receipts"
            description="Show when you've seen messages"
            value={readReceipts}
            onValueChange={setReadReceipts}
          />
        </SettingsGroup>
        
        {/* Visibility */}
        <SettingsGroup title="Visibility">
          <SettingSwitch
            title="Data Sharing with Partners"
            description="Allow sharing your activity data with partner websites"
            value={dataSharing}
            onValueChange={setDataSharing}
          />
        </SettingsGroup>
      </ScrollView>
    </SafeAreaView>
  );
}
