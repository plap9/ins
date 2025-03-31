import { useState } from "react";
import { View, Text, Image, TouchableOpacity } from "react-native";
import { Feather, Ionicons, MaterialIcons, Fontisto, AntDesign } from '@expo/vector-icons';

export interface Person {
  id: string;
  name: string;
  image: string;
  mutualFriends: number;
}

export interface DiscoverPersonItemProps {
  suggested: Person;
  removePerson?: (id: string) => void;
}


const DiscoverPersonItem = ({ suggested, removePerson }: DiscoverPersonItemProps) : JSX.Element => {
    return (
      <View className="w-40 h-60 mr-3 bg-white rounded-lg border border-gray-200 relative">
        <TouchableOpacity 
          className="absolute right-0 top-1 z-10 w-6 h-6 items-center justify-center"
          onPress={() => removePerson && removePerson(suggested.id)} //Logic sẽ được truyền từ parent
        >
          <Feather name="x" size={14} color="grey" />
        </TouchableOpacity>
        <View className="items-center justify-center mt-4">
          <Image
            source={{ uri: suggested.image }}
            style={{
              width: 80,
              height: 80,
              borderRadius: 40,
              overflow: 'hidden'
            }}
            resizeMode="cover"
          />
        </View>
        <View className="p-2 items-center">
          <Text className="font-bold" numberOfLines={1}>{suggested.name}</Text>
          <Text className="text-xs text-gray-500">{suggested.mutualFriends} mutual friends</Text>
          <TouchableOpacity className="bg-blue-500 rounded-lg py-2 mt-4 absolute top-16 left-2 right-2">
            <Text className="text-white text-sm text-center font-semibold">Follow</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  export default DiscoverPersonItem;