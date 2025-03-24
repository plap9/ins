import { useState } from "react";
import { View, Text, TouchableOpacity, SafeAreaView } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import { FontAwesome } from "@expo/vector-icons";

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
    <SafeAreaView style={{ flex: 1, backgroundColor: "white" }}>
      {/* Header */}
      <View style={{ 
        flexDirection: "row", 
        alignItems: "center", 
        justifyContent: "space-between", 
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: "#e5e5e5"
      }}>
        <TouchableOpacity onPress={() => router.back()} style={{ padding: 4 }}>
          <MaterialIcons name="arrow-back-ios" size={24} color="black" />
        </TouchableOpacity>
        <Text style={{ fontSize: 18, fontWeight: "600" }}>Gender</Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={{ color: "#3897f0", fontWeight: "500" }}>Done</Text>
        </TouchableOpacity>
      </View>

      {/* Main content */}
      <View style={{ padding: 16 }}>
        <Text style={{ color: "#666", marginBottom: 24 }}>
          This information is not public in your profile.
        </Text>
        
        {/* Gender options as list */}
        <View>
          {genderOptions.map((option) => (
            <TouchableOpacity 
              key={option.id}
              onPress={() => setSelected(option.id)}
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                paddingVertical: 16,
                borderBottomWidth: 1,
                borderBottomColor: "#e5e5e5"
              }}
            >
              <Text style={{ fontSize: 16 }}>{option.label}</Text>
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
