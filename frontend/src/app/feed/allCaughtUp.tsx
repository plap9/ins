import React from 'react';
import { View, Text, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle, Path } from 'react-native-svg';

export default function AllCaughtUpScreen() {
  const screenWidth = Dimensions.get('window').width;

  return (
    <View 
      className="flex-1 items-center justify-center bg-black"
      style={{ backgroundColor: 'black' }}
    >
      <LinearGradient
        colors={['#FF5757', '#FF9F5F', '#9C27B0']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        className="w-32 h-32 rounded-full items-center justify-center mb-6"
      >
        <View className="bg-black w-[118px] h-[118px] rounded-full items-center justify-center">
          <Svg width="80" height="80" viewBox="0 0 24 24">
            <Path 
              d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" 
              fill="white" 
            />
          </Svg>
        </View>
      </LinearGradient>
      
      <Text className="text-white text-2xl font-bold mb-2">
        You're all caught up
      </Text>
      
      <Text className="text-gray-400 text-base text-center px-6">
        You've seen all new posts from the past 3 days.
      </Text>
    </View>
  );
};
