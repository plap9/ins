import { useState } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import { FontAwesome } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";

const genderOptions = [
  { id: "male", label: "Male" },
  { id: "female", label: "Female" },
  { id: "custom", label: "Custom" },
  { id: "not_reveal", label: "Don't want to reveal" },
];

const GenderScreen = () => {
  const router = useRouter();
  const { selectedGender } = useLocalSearchParams();
  const [selected, setSelected] = useState(selectedGender || "");

  return (
    <SafeAreaView className="flex-1 bg-white">
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 py-4 border-b border-gray-200">
        <TouchableOpacity onPress={() => router.back()} className="p-1">
          <MaterialIcons name="arrow-back-ios" size={24} color="black" />
        </TouchableOpacity>
        <Text className="text-lg font-semibold">Gender</Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text className="text-blue-500 font-medium">Done</Text>
        </TouchableOpacity>
      </View>

      {/* Main content */}
      <View className="p-4">
        <Text className="text-gray-500 mb-6">
          This information is not public in your profile.
        </Text>
        
        <View>
          {genderOptions.map((option) => (
            <TouchableOpacity 
              key={option.id}
              onPress={() => setSelected(option.id)}
              className="flex-row items-center justify-between py-4 border-b border-gray-200"
            >
              <Text className="text-base">{option.label}</Text>
              <FontAwesome 
                name={selected === option.id ? "circle" : "circle-o"} 
                size={24} 
                color={selected === option.id ? "#3897f0" : "black"} 
              />
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </SafeAreaView>
  );
};

export default GenderScreen;
