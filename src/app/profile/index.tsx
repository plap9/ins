import { View, Text, Pressable } from "react-native";
import { useRouter } from "expo-router";

export default function ProfileScreen() {
    const router = useRouter();

    return (
        <View className=" items-center justify-center bg-white">
            <Text className="text-xl font-semibold">Profile Screen</Text>

            {/* Nút chuyển sang UpdateProfile */}
            <Pressable
                onPress={() => router.push("/profile/update")}
                className="mt-4 bg-blue-500 p-3 rounded-lg"
            >
                <Text className="text-white font-semibold">Update Profile</Text>
            </Pressable>
        </View>
    );
}
