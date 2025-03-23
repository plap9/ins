import React, { useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

const GenderScreen = () => {
  const [selectedGender, setSelectedGender] = useState<string | null>(null);
  const navigation = useNavigation();

  const genderOptions = [
    'Male',
    'Female',
    'Non-binary',
    'Transgender',
    'Prefer not to say'
  ];

  const handleGenderSelect = (gender: string) => {
    setSelectedGender(gender);
  };

  const handleDone = () => {
    // Save the selected gender and navigate back or to next screen
    navigation.goBack(); // or navigate to next screen
  };

  return (
    <View className="flex-1 bg-white">
      {/* Header with centered title and Done button */}
      <View className="flex-row items-center justify-between px-4 pt-12 pb-4 border-b border-gray-200">
        <View className="w-16">
          {/* You can add a back button here if needed */}
        </View>
        <Text className="text-lg font-bold">Gendasdasder</Text>
        <TouchableOpacity className="w-16 items-end" onPress={handleDone}>
          <Text className="text-blue-500 font-semibold text-base">Done</Text>
        </TouchableOpacity>
      </View>

      {/* Gender options */}
      <View className="px-4 pt-5">
        {genderOptions.map((gender) => (
          <TouchableOpacity
            key={gender}
            className="flex-row justify-between items-center py-4 border-b border-gray-200"
            onPress={() => handleGenderSelect(gender)}
          >
            <Text className="text-base">{gender}</Text>
            <FontAwesome
              name={selectedGender === gender ? "circle" : "circle-o"}
              size={24}
              color="black"
            />
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

export default GenderScreen;