import React from 'react';
import { View, Text, Dimensions, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle, Path } from 'react-native-svg';
import { Feather } from '@expo/vector-icons';

export default function AllCaughtUpScreen() {
  const screenWidth = Dimensions.get('window').width;

  return (
    <View className="items-center justify-center py-16 px-6 bg-white">

      <View className="w-24 h-24 rounded-full border-2 border-black items-center justify-center mb-8">
        <Feather name="check" size={60} color="black" />
      </View>

      <Text className="text-black text-xl font-bold mb-2">
        Bạn đã xem tất cả bài viết mới
      </Text>

      <Text className="text-gray-500 text-sm text-center">
        Bạn đã xem tất cả bài viết mới từ 3 ngày trước.
      </Text>
      <TouchableOpacity className="mt-4">
        <Text className="text-blue-500 font-semibold text-sm">
          Xem bài viết cũ hơn
        </Text>
      </TouchableOpacity>
    </View>
  );
};
