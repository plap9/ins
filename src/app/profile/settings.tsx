import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, Switch } from 'react-native';
import { useRouter } from 'expo-router';
import { Feather, Ionicons, MaterialIcons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';

export default function SettingsScreen() {
  const router = useRouter();
  const [notifications, setNotifications] = React.useState(true);
  const [darkMode, setDarkMode] = React.useState(false);
  const [privateAccount, setPrivateAccount] = React.useState(false);

  return (
    <View className="flex-1 bg-white">
      <StatusBar style="dark" />
      
      <ScrollView className="flex-1">
        <View className="p-4">
          <Text className="text-2xl font-bold mb-6">Settings</Text>
          
          {/* Account Settings */}
          <View className="mb-6">
            <Text className="text-lg font-semibold mb-2">Account</Text>
            <View className="bg-gray-100 rounded-lg">
              <TouchableOpacity 
                className="flex-row items-center justify-between p-4 border-b border-gray-200"
                onPress={() => router.push("/profile/update")}
              >
                <View className="flex-row items-center">
                  <Feather name="user" size={20} color="#333" />
                  <Text className="ml-3 text-base">Edit Profile</Text>
                </View>
                <Feather name="chevron-right" size={20} color="#999" />
              </TouchableOpacity>
              
              <TouchableOpacity 
                className="flex-row items-center justify-between p-4 border-b border-gray-200"
              >
                <View className="flex-row items-center">
                  <Feather name="lock" size={20} color="#333" />
                  <Text className="ml-3 text-base">Privacy</Text>
                </View>
                <Feather name="chevron-right" size={20} color="#999" />
              </TouchableOpacity>
              
              <TouchableOpacity 
                className="flex-row items-center justify-between p-4"
              >
                <View className="flex-row items-center">
                  <Feather name="shield" size={20} color="#333" />
                  <Text className="ml-3 text-base">Security</Text>
                </View>
                <Feather name="chevron-right" size={20} color="#999" />
              </TouchableOpacity>
            </View>
          </View>
          
          {/* Preferences */}
          <View className="mb-6">
            <Text className="text-lg font-semibold mb-2">Preferences</Text>
            <View className="bg-gray-100 rounded-lg">
              <View 
                className="flex-row items-center justify-between p-4 border-b border-gray-200"
              >
                <View className="flex-row items-center">
                  <Feather name="bell" size={20} color="#333" />
                  <Text className="ml-3 text-base">Notifications</Text>
                </View>
                <Switch
                  value={notifications}
                  onValueChange={setNotifications}
                  trackColor={{ false: "#767577", true: "#3B82F6" }}
                />
              </View>
              
              <View 
                className="flex-row items-center justify-between p-4 border-b border-gray-200"
              >
                <View className="flex-row items-center">
                  <Feather name="moon" size={20} color="#333" />
                  <Text className="ml-3 text-base">Dark Mode</Text>
                </View>
                <Switch
                  value={darkMode}
                  onValueChange={setDarkMode}
                  trackColor={{ false: "#767577", true: "#3B82F6" }}
                />
              </View>
              
              <View 
                className="flex-row items-center justify-between p-4"
              >
                <View className="flex-row items-center">
                  <Feather name="eye-off" size={20} color="#333" />
                  <Text className="ml-3 text-base">Private Account</Text>
                </View>
                <Switch
                  value={privateAccount}
                  onValueChange={setPrivateAccount}
                  trackColor={{ false: "#767577", true: "#3B82F6" }}
                />
              </View>
            </View>
          </View>
          
          {/* Support */}
          <View className="mb-6">
            <Text className="text-lg font-semibold mb-2">Support</Text>
            <View className="bg-gray-100 rounded-lg">
              <TouchableOpacity 
                className="flex-row items-center justify-between p-4 border-b border-gray-200"
              >
                <View className="flex-row items-center">
                  <Feather name="help-circle" size={20} color="#333" />
                  <Text className="ml-3 text-base">Help Center</Text>
                </View>
                <Feather name="chevron-right" size={20} color="#999" />
              </TouchableOpacity>
              
              <TouchableOpacity 
                className="flex-row items-center justify-between p-4 border-b border-gray-200"
              >
                <View className="flex-row items-center">
                  <Feather name="info" size={20} color="#333" />
                  <Text className="ml-3 text-base">About</Text>
                </View>
                <Feather name="chevron-right" size={20} color="#999" />
              </TouchableOpacity>
              
              <TouchableOpacity 
                className="flex-row items-center justify-between p-4"
              >
                <View className="flex-row items-center">
                  <MaterialIcons name="privacy-tip" size={20} color="#333" />
                  <Text className="ml-3 text-base">Privacy Policy</Text>
                </View>
                <Feather name="chevron-right" size={20} color="#999" />
              </TouchableOpacity>
            </View>
          </View>
          
          {/* Logout Button */}
          <TouchableOpacity 
            className="bg-red-500 rounded-lg p-4 items-center mt-4"
            onPress={() => router.replace("/")}
          >
            <Text className="text-white font-semibold text-base">Log Out</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}
