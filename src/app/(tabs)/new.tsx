import { SafeAreaView, View } from "react-native";
import CreatePostScreen from "~/app/new/index";


export default function NewPost() {
    return (
        <SafeAreaView>
            <View>
                <CreatePostScreen/>
            </View>
        </SafeAreaView>
    );
}