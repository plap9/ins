import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  Image,
  Platform,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  ScrollView
} from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useNavigation } from '@react-navigation/native';
import StoryService from '../../services/storyService';
import { StatusBar } from 'expo-status-bar';

const StoryCreationScreen = () => {
  const navigation = useNavigation();
  const [caption, setCaption] = useState('');
  const [mediaUri, setMediaUri] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    requestMediaPermissions();
  }, []);

  const requestMediaPermissions = async () => {
    if (Platform.OS !== 'web') {
      const { status: cameraStatus } = await ImagePicker.requestCameraPermissionsAsync();
      const { status: libraryStatus } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (cameraStatus !== 'granted' || libraryStatus !== 'granted') {
        Alert.alert('Cần quyền truy cập', 'Ứng dụng cần quyền truy cập vào máy ảnh và thư viện ảnh để tạo story.');
        navigation.goBack();
      } else {
        openMediaPicker();
      }
    }
  };

  const openMediaPicker = async () => {
    try {
      setIsLoading(true);
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.All,
        allowsEditing: true,
        quality: 0.8,
        videoMaxDuration: 30,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setMediaUri(result.assets[0].uri);
      } else {
        navigation.goBack();
      }
    } catch (error) {
      console.error('Lỗi khi chọn media:', error);
      Alert.alert('Lỗi', 'Không thể chọn media. Vui lòng thử lại.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenCamera = async () => {
    try {
      setIsLoading(true);
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.All,
        allowsEditing: true,
        quality: 0.8,
        videoMaxDuration: 30,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setMediaUri(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Lỗi khi sử dụng camera:', error);
      Alert.alert('Lỗi', 'Không thể sử dụng camera. Vui lòng thử lại.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!mediaUri) {
      Alert.alert('Lỗi', 'Vui lòng chọn ảnh hoặc video cho story');
      return;
    }

    try {
      setIsSubmitting(true);

      const formData = new FormData();
      
      let type = 'image/jpeg';
      if (mediaUri.endsWith('.mp4') || mediaUri.endsWith('.mov')) {
        type = 'video/mp4';
      } else if (mediaUri.endsWith('.png')) {
        type = 'image/png';
      }
      
      const fileName = mediaUri.split('/').pop() || `story_${Date.now()}.jpg`;
      
      // @ts-ignore
      formData.append('file', {
        uri: Platform.OS === 'ios' ? mediaUri.replace('file://', '') : mediaUri,
        name: fileName,
        type,
      });
      
      if (caption.trim()) {
        formData.append('caption', caption.trim());
      }
      
      await StoryService.createStory(formData);
      
      Alert.alert('Thành công', 'Story đã được đăng tải');
      navigation.goBack();
      
    } catch (error: any) {
      console.error('Lỗi khi đăng story:', error);
      Alert.alert('Lỗi', error.message || 'Không thể đăng story. Vui lòng thử lại.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    navigation.goBack();
  };

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-black">
        <ActivityIndicator size="large" color="#fff" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1 bg-black"
    >
      <StatusBar style="light" />
      
      <View className="flex-row items-center justify-between px-4 py-3">
        <TouchableOpacity onPress={handleCancel}>
          <Ionicons name="close" size={28} color="white" />
        </TouchableOpacity>
        
        <Text className="text-white font-bold text-lg">Tạo Story</Text>
        
        <TouchableOpacity 
          onPress={handleSubmit}
          disabled={isSubmitting || !mediaUri}
          className={isSubmitting || !mediaUri ? "opacity-50" : ""}
        >
          <Text className="text-blue-500 font-bold text-base">Đăng</Text>
        </TouchableOpacity>
      </View>
      
      <ScrollView className="flex-1">
        {mediaUri ? (
          <View className="flex-1 aspect-[9/16] mx-auto w-full">
            <Image
              source={{ uri: mediaUri }}
              className="w-full h-full"
              resizeMode="cover"
            />
            
            <View className="absolute bottom-4 left-0 right-0 px-4 py-2">
              <View className="bg-black/30 rounded-xl p-4">
                <TextInput
                  className="text-white text-base"
                  placeholder="Thêm chú thích..."
                  placeholderTextColor="rgba(255, 255, 255, 0.7)"
                  value={caption}
                  onChangeText={setCaption}
                  multiline
                  maxLength={200}
                />
              </View>
            </View>
          </View>
        ) : null}
      </ScrollView>
      
      <View className="flex-row justify-around pb-4 pt-2 bg-gray-900">
        <TouchableOpacity 
          className="items-center"
          onPress={openMediaPicker}
        >
          <MaterialIcons name="photo-library" size={24} color="white" />
          <Text className="text-white text-xs mt-1">Thư viện</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          className="items-center"
          onPress={handleOpenCamera}
        >
          <Ionicons name="camera" size={24} color="white" />
          <Text className="text-white text-xs mt-1">Camera</Text>
        </TouchableOpacity>
      </View>
      
      {isSubmitting && (
        <View className="absolute top-0 left-0 right-0 bottom-0 bg-black/50 items-center justify-center">
          <ActivityIndicator size="large" color="#fff" />
          <Text className="text-white mt-2">Đang đăng story...</Text>
        </View>
      )}
    </KeyboardAvoidingView>
  );
};

export default StoryCreationScreen; 