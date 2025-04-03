import { SafeAreaView } from "react-native-safe-area-context";
import CreatePostScreen from "~/app/new/index";

export default function NewPost() {
    return (
        <SafeAreaView className="flex-1 bg-white">
            <CreatePostScreen/>
        </SafeAreaView>
    );
}