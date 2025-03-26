import React, { useState } from "react";
import { View, Text, TouchableOpacity, Dimensions, Image, StatusBar } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Heart } from "lucide-react-native";
import SimpleLineIcons from '@expo/vector-icons/SimpleLineIcons';
import Feather from '@expo/vector-icons/Feather';
import Entypo from '@expo/vector-icons/Entypo';

const { height, width } = Dimensions.get("window");

const ReelsScreen: React.FC = (): JSX.Element => {
  // State for follow and like functionality
  const [isFollowing, setIsFollowing] = useState(false);
  const [isLiked, setIsLiked] = useState(false);

  // Toggle follow state
  const toggleFollow = () => {
    setIsFollowing(prev => !prev);
  };

  // Toggle like state
  const toggleLike = () => {
    setIsLiked(prev => !prev);
  };

  return (
    <View className="flex-1 bg-black w-full h-full">
      <StatusBar barStyle="light-content" backgroundColor="#000000" />
      <SafeAreaView className="flex-1 w-full h-full" edges={['right', 'left', 'bottom']}>
        <View className="flex-1 w-full h-full relative bg-black">
            
            {/* Phần nền Reels */}
            <View className="flex-1 w-full h-full absolute inset-0 bg-gray-800" />

            {/*thông tin phía dưới */}
            <View className="absolute bottom-0 left-0 w-full p-4 pr-16">
                <View className="flex-row items-center justify-between">
                    {/* Row chứa avatar và username */}
                    <View className="flex-row items-center">
                    <Image
                        source={{ uri: "https://via.placeholder.com/100" }}
                        className="w-10 h-10 rounded-full border border-white mr-2"
                    />
                    <Text className="text-white font-bold text-lg">Username</Text>
                    {/* Nút theo dõi */}
                    <TouchableOpacity 
                      className={`${isFollowing ? 'border border-white' : 'bg-white'} px-3 py-1 rounded-full ml-5`}
                      onPress={toggleFollow}
                    >
                        <Text className={`${isFollowing ? 'text-white' : 'text-black'} text-sm font-semibold`}>
                          {isFollowing ? 'Following' : 'Follow'}
                        </Text>
                    </TouchableOpacity>
                    </View>
                </View>
                <Text className="text-white mt-2">
                        Description
                </Text>
            </View>

            {/* Cột icon tương tác bên phải */}
            <View className="absolute bottom-10 right-1 gap-5 items-center">
                <TouchableOpacity className="items-center" onPress={toggleLike}>
                  {isLiked ? (
                    <Heart size={24} color="#FF2D55" fill="#FF2D55" />
                  ) : (
                    <SimpleLineIcons name="heart" size={24} color="white" />
                  )}
                  <Text className="text-white text-xs mt-1">1.2K</Text>
                </TouchableOpacity>
                <TouchableOpacity className="items-center">
                    <Feather name="message-circle" size={26} color="white" />
                  <Text className="text-white text-xs mt-1">45</Text>
                </TouchableOpacity>
                <TouchableOpacity className="items-center">
                    <Feather name="send" size={24} color="white" />
                </TouchableOpacity>
                <TouchableOpacity className="items-center">
                    <Entypo name="dots-three-horizontal" size={24} color="white" />
                </TouchableOpacity>
            </View>

        </View>
      </SafeAreaView>
    </View>
  );
};

export default ReelsScreen;
