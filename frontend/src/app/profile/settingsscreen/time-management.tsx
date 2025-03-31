import React, { useState } from 'react';
import { View, Text, SafeAreaView, Switch, TouchableOpacity, ScrollView } from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
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

// Usage stats component
const UsageStats = () => (
  <View className="mb-6 bg-white rounded-lg p-4 shadow-sm">
    <Text className="text-lg font-semibold mb-3">Daily Average</Text>
    
    <View className="flex-row justify-between items-center mb-4">
      <View className="items-center">
        <Text className="text-3xl font-bold text-blue-500">52m</Text>
        <Text className="text-sm text-gray-500">Today</Text>
      </View>
      <View className="items-center">
        <Text className="text-3xl font-bold">1h 15m</Text>
        <Text className="text-sm text-gray-500">This Week</Text>
      </View>
      <View className="items-center">
        <Text className="text-3xl font-bold">1h 22m</Text>
        <Text className="text-sm text-gray-500">This Month</Text>
      </View>
    </View>
    
    <View className="h-4 bg-gray-200 rounded-full overflow-hidden mb-2">
      <View className="h-full bg-blue-500 w-1/3" />
    </View>
    <Text className="text-xs text-gray-500 text-center">
      33% less than your daily average
    </Text>
  </View>
);

export default function TimeManagementScreen() {
  // States
  const [dailyReminder, setDailyReminder] = useState(false);
  const [notificationsLimit, setNotificationsLimit] = useState(true);
  const [appTimeLimit, setAppTimeLimit] = useState(false);
  const [nightMode, setNightMode] = useState(false);

  return (
    <SafeAreaView className="flex-1 bg-gray-100">
      <Header title="Time Management" />
      <ScrollView className="flex-1 p-4">
        <UsageStats />
        
        {/* Time Limits */}
        <SettingsGroup title="Time Limits">
          <SettingOption 
            title="Set Daily Time Limit"
            description="Get a notification when you've reached your daily limit"
            onPress={() => {}}
            rightElement={
              <Text className="text-blue-500">2 hours</Text>
            }
          />
          <SettingSwitch
            title="Daily Reminder"
            description="Get a notification with your daily activity"
            value={dailyReminder}
            onValueChange={setDailyReminder}
          />
        </SettingsGroup>
        
        {/* Notification Management */}
        <SettingsGroup title="Notification Management">
          <SettingSwitch
            title="Notification Limit"
            description="Limit push notifications to reduce distractions"
            value={notificationsLimit}
            onValueChange={setNotificationsLimit}
          />
          <SettingOption 
            title="Mute Push Notifications"
            description="Set times when push notifications are muted"
            onPress={() => {}}
          />
        </SettingsGroup>
        
        {/* Focus Mode */}
        <SettingsGroup title="Focus Mode">
          <SettingSwitch
            title="App Time Limit"
            description="Set a time limit for using the app before taking a break"
            value={appTimeLimit}
            onValueChange={setAppTimeLimit}
          />
          <SettingSwitch
            title="Night Mode"
            description="Automatically enable dark mode at night to reduce eye strain"
            value={nightMode}
            onValueChange={setNightMode}
          />
        </SettingsGroup>
        
        {/* Activity Dashboard */}
        <SettingsGroup title="Activity Dashboard">
          <SettingOption 
            title="View Detailed Stats"
            description="See a complete breakdown of your app usage"
            onPress={() => {}}
          />
          <SettingOption 
            title="Download Activity Data"
            description="Get a copy of your usage data"
            onPress={() => {}}
          />
        </SettingsGroup>
      </ScrollView>
    </SafeAreaView>
  );
}
