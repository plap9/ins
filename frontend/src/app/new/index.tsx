import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Image, TextInput, ScrollView, Alert, KeyboardAvoidingView, Platform, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { Feather, MaterialIcons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import * as ImagePicker from 'expo-image-picker';
import apiClient from '~/services/apiClient';

const filters = [
  { id: 1, name: 'Fade', color: '#E8DCD8' },
  { id: 2, name: 'Fade Warm', color: '#E8D8C8' },
  { id: 3, name: 'Fade Cool', color: '#D8E8E8' },
  { id: 4, name: 'Simple', color: '#F5F5F5' },
  { id: 5, name: 'Simple Warm', color: '#F5F0E8' },
  { id: 6, name: 'Simple Cool', color: '#E8F0F5' },
  { id: 7, name: 'Boost', color: '#E0F0FF' },
  { id: 8, name: 'Boost Warm', color: '#FFE0C0' },
  { id: 9, name: 'Boost Cool', color: '#C0E0FF' },
  { id: 10, name: 'Graphite', color: '#D0D0D0' },
  { id: 11, name: 'Hyper', color: '#FFD0E0' },
  { id: 12, name: 'Rosy', color: '#FFD0D0' },
  { id: 13, name: 'Midnight', color: '#404060' },
  { id: 14, name: 'Grainy', color: '#E0E0E0' },
  { id: 15, name: 'Soft Light', color: '#FFF8E0' },
  { id: 16, name: 'Zoom Blur', color: '#E0E0FF' },
];

export default function CreatePostScreen() {
  const router = useRouter();
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [caption, setCaption] = useState('');
  const [location, setLocation] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<number | null>(null);
  const screenWidth = Dimensions.get('window').width;

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

  const handlePost = async () => {
    if (!selectedImage) {
      Alert.alert('Lỗi', 'Vui lòng chọn ảnh');
      return;
    }

    setIsUploading(true);

    try {
      const formData = new FormData();
      
      if (caption.trim()) {
        formData.append('content', caption);
      }

      if (location.trim()) {
        formData.append('location', location);
      }

      const fileExtension = selectedImage.split('.').pop();
      const fileName = `image_${Date.now()}.${fileExtension}`;

      formData.append('files', {
        uri: selectedImage,
        type: `image/${fileExtension}`,
        name: fileName
      } as any);

      const response = await apiClient.post('/posts', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      Alert.alert(
        'Thành công', 
        'Bài post của bạn đã được đăng!',
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } catch (error) {
      console.error('Lỗi khi đăng bài:', error);
      Alert.alert(
        'Lỗi', 
        'Không thể đăng bài. Vui lòng thử lại.'
      );
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <View className="flex-1 bg-white">
      <StatusBar style="dark" />
      
      <KeyboardAvoidingView 
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        <ScrollView 
          className="flex-1"
          contentContainerStyle={{ paddingBottom: 20 }}
          showsVerticalScrollIndicator={false}
        >
          <View className="p-4">
            <View className="flex-row items-center mb-4">
              <TouchableOpacity onPress={() => router.back()} className="mr-4">
                <Feather name="arrow-left" size={24} color="black" />
              </TouchableOpacity>
              <Text className="text-xl font-bold">Create New Post</Text>
            </View>
            
            {/* Image Selection */}
            <View className="mb-6 items-center">
              {selectedImage ? (
                <View style={{ width: screenWidth - 32 }}>
                  <Image 
                    source={{ uri: selectedImage }} 
                    className='w-full h-80 rounded-lg'
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
                  className="border-2 border-dashed border-gray-300 items-center justify-center w-full h-80 rounded-lg"
                  onPress={pickImage}
                >
                  <Feather name="image" size={48} color="#999" />
                  <Text className="mt-2 text-gray-500">Tap to select an image</Text>
                </TouchableOpacity>
              )}
            </View>
            
            {/* Filters Section */}
            {selectedImage && (
              <View className="mb-6">
                <Text className="text-base font-semibold mb-2">Filters</Text>
                <ScrollView 
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ paddingVertical: 8 }}
                >
                  {filters.map((filter) => (
                    <TouchableOpacity 
                      key={filter.id}
                      className={`mr-4 items-center`}
                      style={{ width: 80 }}
                      onPress={() => setSelectedFilter(filter.id)}
                    >
                      <View 
                        className={`w-20 h-20 rounded-lg overflow-hidden mb-1 ${selectedFilter === filter.id ? 'border-2 border-blue-500' : ''}`}
                      >
                        {selectedImage && (
                          <View style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            backgroundColor: filter.color,
                            opacity: 0.5,
                            zIndex: 1
                          }} />
                        )}
                        <Image 
                          source={{ uri: selectedImage }} 
                          style={{ width: '100%', height: '100%' }}
                          resizeMode="cover"
                        />
                      </View>
                      <Text className="text-xs text-center" numberOfLines={1}>
                        {filter.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}
            
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
                style={{ textAlignVertical: 'top', minHeight: 100 }}
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
              className="flex-row items-center justify-between p-4 bg-gray-100 rounded-lg mb-6"
            >
              <View className="flex-row items-center">
                <Feather name="users" size={20} color="#333" />
                <Text className="ml-3 text-base">Tag People</Text>
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
                {isUploading ? 'Đang đăng...' : 'Chia sẻ bài viết'}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}