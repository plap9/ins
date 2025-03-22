import React from 'react';
import { View, Text, SafeAreaView } from 'react-native';

export default function FeedScreen() {
  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="flex-1 items-center justify-center">
        <Text className="text-lg">Màn hình Feed</Text>
        <Text className="text-sm text-gray-500">Đăng nhập thành công!</Text>
      </View>
    </SafeAreaView>
  );
}