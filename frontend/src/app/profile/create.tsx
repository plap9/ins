import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Image, TextInput, ScrollView, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Feather, MaterialIcons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import * as ImagePicker from 'expo-image-picker';

export default function CreatePostScreen() {
  const router = useRouter();
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [caption, setCaption] = useState('');
  const [location, setLocation] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
    });

    if (!result.canceled) {
      setSelectedImage(result.assets[0].uri);
    }
  };

  const handlePost = () => {
    if (!selectedImage) {
      Alert.alert('Error', 'Please select an image first');
      return;
    }

    setIsUploading(true);
    
    setTimeout(() => {
      setIsUploading(false);
      Alert.alert(
        'Success', 
        'Your post has been uploaded successfully!',
        [{ text: 'OK', onPress: () => router.back() }]
      );
    }, 2000);
  };

  return (
    <View className="flex-1 bg-white">
      <StatusBar style="dark" />
      
      <ScrollView className="flex-1">
        <View className="p-4">
          <Text className="text-2xl font-bold mb-6">Create New Post</Text>
          
          {/* Image Selection */}
          <View className="mb-6 items-center">
            {selectedImage ? (
              <View className="relative">
                <Image 
                  source={{ uri: selectedImage }} 
                  className="w-full h-80 rounded-lg"
                  resizeMode="cover"
                />
                <TouchableOpacity 
                  className="absolute top-2 right-2 bg-black bg-opacity-50 rounded-full p-2"
                  onPress={() => setSelectedImage(null)}
                >
                  <Feather name="x" size={20} color="white" />
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity 
                className="w-full h-60 border-2 border-dashed border-gray-300 rounded-lg items-center justify-center"
                onPress={pickImage}
              >
                <Feather name="image" size={48} color="#999" />
                <Text className="mt-2 text-gray-500">Tap to select an image</Text>
              </TouchableOpacity>
            )}
          </View>
          
          {/* Caption */}
          <View className="mb-4">
            <Text className="text-base font-semibold mb-2">Caption</Text>
            <TextInput
              className="bg-gray-100 p-3 rounded-lg text-base"
              placeholder="Write a caption..."
              multiline
              numberOfLines={4}
              value={caption}
              onChangeText={setCaption}
              style={{ textAlignVertical: 'top' }}
            />
          </View>
          
          {/* Location */}
          <View className="mb-6">
            <Text className="text-base font-semibold mb-2">Location</Text>
            <View className="flex-row items-center bg-gray-100 p-3 rounded-lg">
              <Feather name="map-pin" size={20} color="#999" />
              <TextInput
                className="flex-1 ml-2 text-base"
                placeholder="Add location"
                value={location}
                onChangeText={setLocation}
              />
            </View>
          </View>
          
          {/* Tag People */}
          <TouchableOpacity 
            className="flex-row items-center justify-between p-4 bg-gray-100 rounded-lg mb-4"
          >
            <View className="flex-row items-center">
              <Feather name="users" size={20} color="#333" />
              <Text className="ml-3 text-base">Tag People</Text>
            </View>
            <Feather name="chevron-right" size={20} color="#999" />
          </TouchableOpacity>
          
          {/* Advanced Settings */}
          <TouchableOpacity 
            className="flex-row items-center justify-between p-4 bg-gray-100 rounded-lg mb-6"
          >
            <View className="flex-row items-center">
              <Feather name="settings" size={20} color="#333" />
              <Text className="ml-3 text-base">Advanced Settings</Text>
            </View>
            <Feather name="chevron-right" size={20} color="#999" />
          </TouchableOpacity>
          
          {/* Post Button */}
          <TouchableOpacity 
            className={`rounded-lg p-4 items-center ${isUploading || !selectedImage ? 'bg-blue-300' : 'bg-blue-500'}`}
            onPress={handlePost}
            disabled={isUploading || !selectedImage}
          >
            <Text className="text-white font-semibold text-base">
              {isUploading ? 'Posting...' : 'Share Post'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}
