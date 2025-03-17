import React from "react";
import { View, Text, TouchableOpacity, Dimensions, Image } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Heart, MessageCircle, Share2 } from "lucide-react-native";
import SimpleLineIcons from '@expo/vector-icons/SimpleLineIcons';
import Feather from '@expo/vector-icons/Feather';
import Entypo from '@expo/vector-icons/Entypo';

const { height } = Dimensions.get("window");

const ReelsScreen: React.FC = (): JSX.Element => {
  return (
    <SafeAreaView className=" bg-gray-300">
        <View className="w-full h-full relative">
            
            {/* Phần nền Reels */}
            <View className="w-full h-full bg-gray-800 relative" />

            {/*thông tin phía dưới */}
            <View className="absolute bottom-0 left-0 right-12 p-4">
                <View className="flex-row items-center justify-between">
                    {/* Row chứa avatar và username */}
                    <View className="flex-row items-center">
                    <Image
                        source={{ uri: "https://via.placeholder.com/100" }}
                        className="w-10 h-10 rounded-full border border-white mr-2"
                    />
                    <Text className="text-white font-bold text-lg">Username</Text>
                {/* Nút theo dõi */}
                    <TouchableOpacity className="bg-white px-3 py-1 rounded-full ml-5">
                        <Text className="text-black text-sm font-semibold ml-">Follow</Text>
                    </TouchableOpacity>
                    </View>
                </View>
                <Text className="text-white mt-2">
                        Description
                </Text>
            </View>

            {/* Cột icon tương tác bên phải */}
            <View className="absolute bottom-10 right-4 gap-5 space-y-10 items-center">
                <TouchableOpacity className="items-center">
                <SimpleLineIcons name="heart" size={24} color="white" />
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
  );
};

export default ReelsScreen;
