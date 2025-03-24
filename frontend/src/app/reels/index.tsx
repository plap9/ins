import React from "react";
import { View, Text, TouchableOpacity, Dimensions, Image, StyleSheet, StatusBar } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Heart, MessageCircle, Share2 } from "lucide-react-native";
import SimpleLineIcons from '@expo/vector-icons/SimpleLineIcons';
import Feather from '@expo/vector-icons/Feather';
import Entypo from '@expo/vector-icons/Entypo';

const { height, width } = Dimensions.get("window");

const ReelsScreen: React.FC = (): JSX.Element => {
  return (
    <View style={styles.outerContainer}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />
      <SafeAreaView style={styles.container} edges={['right', 'left', 'bottom']}>
        <View style={styles.fullWidthContainer}>
            
            {/* Phần nền Reels */}
            <View style={styles.backgroundContainer} className="bg-gray-800" />

            {/*thông tin phía dưới */}
            <View style={styles.bottomInfoContainer} className="p-4">
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
                        <Text className="text-black text-sm font-semibold">Follow</Text>
                    </TouchableOpacity>
                    </View>
                </View>
                <Text className="text-white mt-2">
                        Description
                </Text>
            </View>

            {/* Cột icon tương tác bên phải */}
            <View style={styles.interactionContainer} className="gap-5 items-center">
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
    </View>
  );
};

const styles = StyleSheet.create({
  outerContainer: {
    flex: 1,
    width: width,
    height: height,
    backgroundColor: '#000000',
  },
  container: {
    flex: 1,
    width: width,
    height: height,
  },
  fullWidthContainer: {
    flex: 1,
    width: width,
    height: height,
    position: 'relative',
    backgroundColor: '#000000',
  },
  backgroundContainer: {
    flex: 1,
    width: width,
    height: height,
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#000000',
  },
  bottomInfoContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    width: width,
    padding: 16,
    paddingRight: 60,
  },
  interactionContainer: {
    position: 'absolute',
    bottom: 40,
    right: 4,
    alignItems: 'center',
    gap: 20,
  }
});

export default ReelsScreen;
