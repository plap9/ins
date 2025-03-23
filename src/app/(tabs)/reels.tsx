
import { View, SafeAreaView } from "react-native";
import ReelsScreen from "../reels";

export default function Reels() {
    return (
    <SafeAreaView className="flex-1 bg-white">
        <View>
            <ReelsScreen/>
        </View>
    </SafeAreaView>
    );
}

