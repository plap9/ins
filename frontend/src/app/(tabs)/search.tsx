
import { View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import SearchSreen from "../search";

export default function Search() {
    return (
        <SafeAreaView className="flex-1 bg-white">
        <View>
            <SearchSreen/>
        </View>
        </SafeAreaView>
    
    );
}

