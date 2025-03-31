import React, { useState } from 'react';
import { View, Text, SafeAreaView, Switch, TouchableOpacity, ScrollView, Image } from 'react-native';
import { Feather, MaterialIcons } from '@expo/vector-icons';
import Header from './components/Header';

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

// Status Indicator
const StatusIndicator = ({ status, label, description }: { status: string; label: string; description: string }) => {
  const getStatusColor = () => {
    switch(status) {
      case 'good': return 'bg-green-500';
      case 'warning': return 'bg-yellow-500';
      case 'issue': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };
  
  const getStatusIcon = () => {
    switch(status) {
      case 'good': 
        return <MaterialIcons name="check-circle" size={24} color="#10b981" />;
      case 'warning': 
        return <MaterialIcons name="warning" size={24} color="#f59e0b" />;
      case 'issue': 
        return <MaterialIcons name="error" size={24} color="#ef4444" />;
      default: 
        return <MaterialIcons name="help" size={24} color="#6b7280" />;
    }
  };
  
  return (
    <View className="flex-row items-center justify-between py-4 border-b border-gray-100">
      <View className="flex-row items-center flex-1">
        {getStatusIcon()}
        <View className="ml-3 flex-1">
          <Text className="text-base font-medium">{label}</Text>
          <Text className="text-sm text-gray-500 mt-1">{description}</Text>
        </View>
      </View>
      <Feather name="chevron-right" size={20} color="#999" />
    </View>
  );
};

export default function AccountStatusScreen() {
  return (
    <SafeAreaView className="flex-1 bg-gray-100">
      <Header title="Account Status" />
      <ScrollView className="flex-1 p-4">
        {/* Status Summary */}
        <View className="bg-white rounded-lg p-4 shadow-sm mb-6">
          <View className="items-center mb-4">
            <View className="w-20 h-20 rounded-full bg-gray-200 items-center justify-center mb-2">
              <MaterialIcons name="account-circle" size={60} color="#3897f0" />
            </View>
            <Text className="text-xl font-bold">@username</Text>
            <View className="flex-row items-center mt-1">
              <View className="w-3 h-3 rounded-full bg-green-500 mr-2" />
              <Text className="text-green-700 font-medium">Active</Text>
            </View>
          </View>
          
          <View className="flex-row justify-between mb-4">
            <View className="items-center">
              <Text className="text-2xl font-bold">45</Text>
              <Text className="text-xs text-gray-500">Days Active</Text>
            </View>
            <View className="h-full w-px bg-gray-200" />
            <View className="items-center">
              <Text className="text-2xl font-bold">98%</Text>
              <Text className="text-xs text-gray-500">Health Score</Text>
            </View>
            <View className="h-full w-px bg-gray-200" />
            <View className="items-center">
              <Text className="text-2xl font-bold">0</Text>
              <Text className="text-xs text-gray-500">Violations</Text>
            </View>
          </View>
          
          <TouchableOpacity 
            className="mt-2 p-3 bg-blue-500 rounded-md items-center"
            onPress={() => {}}
          >
            <Text className="text-white font-medium">Download Account Data</Text>
          </TouchableOpacity>
        </View>
        
        {/* Account Health */}
        <SettingsGroup title="Account Health">
          <StatusIndicator 
            status="good" 
            label="Content Guidelines" 
            description="Your content follows our community guidelines"
          />
          <StatusIndicator 
            status="good" 
            label="Account Security" 
            description="Two-factor authentication is enabled"
          />
          <StatusIndicator 
            status="warning" 
            label="Profile Completion" 
            description="Add a bio to complete your profile"
          />
        </SettingsGroup>
        
        {/* Account Restrictions */}
        <SettingsGroup title="Account Restrictions">
          <StatusIndicator 
            status="good" 
            label="Posting Status" 
            description="You can share posts without restrictions"
          />
          <StatusIndicator 
            status="good" 
            label="Comment Status" 
            description="You can comment on all posts without restrictions"
          />
          <StatusIndicator 
            status="good" 
            label="Messaging Status" 
            description="You can send messages without restrictions"
          />
        </SettingsGroup>
        
        {/* Verification */}
        <SettingsGroup title="Verification">
          <SettingOption 
            title="Account Verification"
            description="Request a verified badge for your account"
            onPress={() => {}}
            rightElement={
              <View className="bg-blue-100 px-2 py-1 rounded">
                <Text className="text-sm text-blue-600">Eligible</Text>
              </View>
            }
          />
        </SettingsGroup>
        
        {/* Additional Options */}
        <SettingsGroup title="Additional Options">
          <SettingOption 
            title="Support Requests"
            description="View your active support tickets"
            onPress={() => {}}
          />
          <SettingOption 
            title="Content Appeals"
            description="Appeal decisions about your content"
            onPress={() => {}}
          />
          <SettingOption 
            title="Account Recovery"
            description="Options to recover your account if needed"
            onPress={() => {}}
          />
        </SettingsGroup>
      </ScrollView>
    </SafeAreaView>
  );
}
