import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';

interface HeaderProps {
  title: string;
}

export default function Header({ title }: HeaderProps) {
  const router = useRouter();

  return (
    <View className="flex-row items-center justify-between px-4 py-3 border-b border-gray-200">
      <TouchableOpacity onPress={() => router.back()} className="w-10">
        <Feather name="arrow-left" size={24} color="black" />
      </TouchableOpacity>
      <Text className="text-xl font-bold flex-1 text-center">{title}</Text>
      <View className="w-10" /> {/* Empty view for balanced spacing */}
    </View>
  );
}
