import FeedScreen from "../feed/index";
import { SafeAreaView, View } from "react-native";

export default function Feed() {
    return (
        <SafeAreaView className="flex-1 ">
            <FeedScreen/>
        </SafeAreaView>
    );
}
