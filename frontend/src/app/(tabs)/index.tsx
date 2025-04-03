import FeedScreen from "../feed/index";
import { View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function Feed() {
    return (
        <SafeAreaView className="flex-1 ">
            <FeedScreen/>
        </SafeAreaView>
    );
}
