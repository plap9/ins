
import { View, SafeAreaView } from "react-native";
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

