import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, SafeAreaView } from 'react-native';
import { useRouter } from 'expo-router';
import { Feather, Ionicons, MaterialIcons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';

interface SettingItemProps {
  icon: string;
  iconPack?: string;
  label: string;
  route: string;
  isLast?: boolean;
  color?: string;
}

const SettingItem: React.FC<SettingItemProps> = ({ 
  icon, 
  iconPack = "Feather", 
  label, 
  route, 
  isLast = false,
  color = "#333"
}) => {
  const router = useRouter();
  
  const renderIcon = () => {
    switch(iconPack) {
      case "Ionicons":
        return <Ionicons name={icon as any} size={22} color={color} />;
      case "MaterialIcons":
        return <MaterialIcons name={icon as any} size={22} color={color} />;
      case "MaterialCommunityIcons":
        return <MaterialCommunityIcons name={icon as any} size={22} color={color} />;
      case "FontAwesome5":
        return <FontAwesome5 name={icon as any} size={20} color={color} />;
      default:
        return <Feather name={icon as any} size={22} color={color} />;
    }
  };
  
  return (
    <TouchableOpacity 
      className={`flex-row items-center justify-between p-4 ${!isLast ? 'border-b border-gray-200' : ''}`}
      onPress={() => router.push(route)}
    >
      <View className="flex-row items-center">
        {renderIcon()}
        <Text className="ml-3 text-base">{label}</Text>
      </View>
      <Feather name="chevron-right" size={20} color="#999" />
    </TouchableOpacity>
  );
};

interface SettingsGroupProps {
  title: string;
  children: React.ReactNode;
}

const SettingsGroup: React.FC<SettingsGroupProps> = ({ title, children }) => (
  <View className="mb-6">
    <Text className="text-lg font-semibold mb-2 px-4">{title}</Text>
    <View className="bg-gray-100 rounded-lg">
      {children}
    </View>
  </View>
);

export default function SettingsScreen() {
  const router = useRouter();

  return (
    <SafeAreaView className="flex-1 bg-white">
      <StatusBar style="dark" />
      
      {/* Header */}
      <View className="flex-row items-center px-4 py-3 border-b border-gray-200">
        <TouchableOpacity onPress={() => router.back()} className="mr-4">
          <Feather name="arrow-left" size={24} color="black" />
        </TouchableOpacity>
        <Text className="text-xl font-bold">Settings</Text>
      </View>
      
      <ScrollView className="flex-1">
        <View className="p-4">
          {/* Account Settings */}
          <SettingsGroup title="Account Settings">
            <SettingItem 
              icon="bookmark" 
              label="Saved" 
              route="/profile/settingsscreen/saved" 
            />
            <SettingItem 
              icon="archive" 
              label="Archive" 
              route="/profile/settingsscreen/archive" 
            />
            <SettingItem 
              icon="activity" 
              label="Your Activity" 
              route="/profile/settingsscreen/activity" 
            />
            <SettingItem 
              icon="bell" 
              label="Notifications" 
              route="/profile/settingsscreen/notifications" 
            />
            <SettingItem 
              icon="clock" 
              label="Time Management" 
              route="/profile/settingsscreen/time-management" 
              isLast={true}
            />
          </SettingsGroup>
          
          {/* Privacy */}
          <SettingsGroup title="Privacy">
            <SettingItem 
              icon="lock" 
              label="Account Privacy" 
              route="/profile/settingsscreen/privacy" 
            />
            <SettingItem 
              icon="users" 
              label="Close Friends" 
              route="/profile/settingsscreen/close-friends" 
            />
            <SettingItem 
              icon="slash" 
              label="Blocked Accounts" 
              route="/profile/settingsscreen/blocked" 
            />
            <SettingItem 
              icon="eye-off" 
              label="Hide Story and Live" 
              route="/profile/settingsscreen/hide-story" 
            />
            <SettingItem 
              icon="message-square" 
              label="Message and Story Replies" 
              route="/profile/settingsscreen/message-replies" 
            />
            <SettingItem 
              icon="hash" 
              label="Tags and Mentions" 
              route="/profile/settingsscreen/tags-mentions" 
            />
            <SettingItem 
              icon="message-circle" 
              label="Comments" 
              route="/profile/settingsscreen/comments" 
            />
            <SettingItem 
              icon="share-2" 
              label="Sharing" 
              route="/profile/settingsscreen/sharing" 
              isLast={true}
            />
          </SettingsGroup>
          
          {/* Interactions */}
          <SettingsGroup title="Interactions">
            <SettingItem 
              icon="user-minus" 
              label="Restricted Accounts" 
              route="/profile/settingsscreen/restricted" 
            />
            <SettingItem 
              icon="star" 
              label="Favorites" 
              route="/profile/settingsscreen/favorites" 
            />
            <SettingItem 
              icon="volume-x" 
              label="Muted Accounts" 
              route="/profile/settingsscreen/muted" 
            />
            <SettingItem 
              icon="heart" 
              label="Like and Share Counts" 
              route="/profile/settingsscreen/like-share-counts" 
            />
            <SettingItem 
              icon="shield" 
              label="Account Status" 
              route="/profile/settingsscreen/account-status" 
              isLast={true}
            />
          </SettingsGroup>
          
          {/* Logout Button */}
          <TouchableOpacity 
            className="bg-red-500 rounded-lg p-4 items-center mt-4"
            onPress={() => router.replace("/")}
          >
            <Text className="text-white font-semibold text-base">Log Out</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
