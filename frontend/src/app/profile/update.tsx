import { View, Text, TextInput, Image, TouchableOpacity, Pressable, SafeAreaView } from "react-native";
import { useState } from "react";
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from "expo-router";
import { MaterialIcons } from '@expo/vector-icons';


export default function UpdateProfile() {
    const router = useRouter();

    const [image, setImage] = useState<string | null>(null);
    const [username, setUsername] = useState("");
    const [bio, setBio] = useState("");
    const [email, setEmail] = useState("");
    const [gender, setGender] = useState("");

    const pickImage = async () => {
    // No permissions request is necessary for launching the image library
    let result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images', 'videos'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 1,
    });
            
    if (!result.canceled) {
      setImage(result.assets[0].uri);
    }
  };

  return (
    <SafeAreaView>
      <View className="p-4 bg-white h-full">
            {/* Nút quay về Profile */}
            <Pressable
                  onPress={() => router.back()}
                  className="py-2"
              >
                  <MaterialIcons name="arrow-back-ios" size={24} color="black" />
              </Pressable>
        {/* Avatar Image Picker */}
          <View className="items-center mb-4">
          {image ? (
            <Image
              source={{ uri: image }}
              className="w-24 h-24 rounded-full bg-slate-300"
            />
          ) : (
            <View className="w-24 h-24 rounded-full bg-slate-300" />
          )}
          <Text onPress={pickImage} className="text-blue-500 font-semibold mt-2">
            Change avatar
          </Text>
        </View>

        {/* Form */}
        <View className="py-4">
          {/* Hàng Form */}
          <View className="flex-row py-2">
            <Text className="w-1/3 text-gray-600 font-medium">Username</Text>
            <TextInput
              placeholder="Enter username"
              value={username}
              onChangeText={setUsername}
              className="flex-1 p-2 border-b border-gray-200"
            />
          </View>

          <View className="flex-row py-2">
            <Text className="w-1/3 text-gray-600 font-medium">Bio</Text>
            <TextInput
              placeholder="Enter bio"
              value={bio}
              onChangeText={setBio}
              className="flex-1 p-2 border-b border-gray-200"
            />
          </View>

          <View className="flex-row py-2">
            <Text className="w-1/3 text-gray-600 font-medium">Email</Text>
            <TextInput
              placeholder="Enter email"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              className="flex-1 p-2 border-b border-gray-200"
            />
          </View>
          <View className="flex-row border-b border-gray-200 py-2 pb-6">
            <Text className="w-1/3 text-gray-600 font-medium">Gender</Text>
            <Pressable
              onPress={() => router.push("/profile/gender")}
              className="flex-1 p-2 border-b border-gray-200"
            >
            <Text className="text-gray-500">{gender|| "Select gender"}</Text>
            </Pressable>
          </View>
        </View>

        {/* Submit Button */}
        <TouchableOpacity className="bg-blue-500 mt-6 p-3 rounded-lg">
          <Text className="text-white text-center font-semibold">Update Profile</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
