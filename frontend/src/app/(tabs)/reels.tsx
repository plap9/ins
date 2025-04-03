import { View } from "react-native";
import ReelsScreen from "../reels";
import { SafeAreaView } from "react-native-safe-area-context";
export default function Reels() {
    return (
        <SafeAreaView className="flex-1 bg-white">
        <View className="flex-1">
            <ReelsScreen/>
        </View>
        </SafeAreaView>
    );
}
