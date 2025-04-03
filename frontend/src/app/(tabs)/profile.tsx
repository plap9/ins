import { View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import ProfileScreen from "~/app/profile/index";


export default function Profile() {
    return(
        <SafeAreaView className="flex-1 bg-white">
            <View>
                <ProfileScreen/>
            </View>
        </SafeAreaView>
    );
}


