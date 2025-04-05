import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  Image,
  StatusBar,
  Alert,
  ActivityIndicator
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialIcons, Entypo } from '@expo/vector-icons';
import StoryEditorScreen from './StoryEditorScreen';
import StoryService from '../../services/storyService';

interface StoryLibraryScreenProps {
  onClose: () => void;
  onSelectAsset?: (asset: ImagePicker.ImagePickerAsset) => void;
}

const StoryLibraryScreen = ({ onClose, onSelectAsset }: StoryLibraryScreenProps) => {
  const [galleryImages, setGalleryImages] = useState<ImagePicker.ImagePickerAsset[]>([]);
  const [selectedAsset, setSelectedAsset] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [galleryPermission, setGalleryPermission] = useState(false);
  const [showEditor, setShowEditor] = useState(false);

  useEffect(() => {
    (async () => {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      setGalleryPermission(status === 'granted');
      
      if (status === 'granted') {
        await loadGalleryImages();
      } else {
        setIsLoading(false);
        Alert.alert(
          'Quyền truy cập',
          'Cần cấp quyền truy cập thư viện ảnh để tiếp tục',
          [{ text: 'OK', onPress: onClose }]
        );
      }
    })();
  }, []);

  const loadGalleryImages = async () => {
    setIsLoading(true);
    try {
      const mediaLibrary = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.All,
        allowsMultipleSelection: true,
        orderedSelection: true,
        selectionLimit: 30,
        quality: 1,
        exif: false,
        base64: false,
        videoMaxDuration: 30,
        aspect: [9, 16],
        allowsEditing: false
      });
      
      if (!mediaLibrary.canceled && mediaLibrary.assets.length > 0) {
        setGalleryImages(mediaLibrary.assets);
        setSelectedAsset(mediaLibrary.assets[0]);
      } else {
        onClose();
      }
    } catch (error) {
      console.error('Lỗi khi tải thư viện ảnh:', error);
      Alert.alert('Lỗi', 'Không thể tải ảnh từ thư viện');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenCamera = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Quyền truy cập', 'Cần cấp quyền truy cập camera để tiếp tục');
        return;
      }
      
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.All,
        allowsEditing: true,
        quality: 0.8,
        videoMaxDuration: 30,
        aspect: [9, 16],
      });
      
      if (!result.canceled && result.assets && result.assets.length > 0) {
        setSelectedAsset(result.assets[0]);
        setShowEditor(true);
      }
    } catch (error) {
      console.error('Lỗi khi sử dụng camera:', error);
      Alert.alert('Lỗi', 'Không thể sử dụng camera. Vui lòng thử lại.');
    }
  };

  const handleCaptureImage = async () => {
    try {
      const photo = await StoryService.takePhoto();
      if (photo) {
        setSelectedAsset(photo);
        setShowEditor(true);
      }
    } catch (error) {
      console.error('Lỗi khi chụp ảnh:', error);
      Alert.alert('Lỗi', 'Không thể chụp ảnh. Vui lòng thử lại.');
    }
  };

  const renderGalleryItem = ({ item }: { item: ImagePicker.ImagePickerAsset }) => (
    <TouchableOpacity
      onPress={() => setSelectedAsset(item)}
      className={`m-1 ${selectedAsset?.uri === item.uri ? 'border-2 border-blue-500' : ''}`}
    >
      <Image
        source={{ uri: item.uri }}
        className="w-24 h-24"
        resizeMode="cover"
      />
      {item.type === 'video' && (
        <View className="absolute right-1 bottom-1 bg-black/50 rounded-full p-1">
          <MaterialIcons name="videocam" size={16} color="white" />
        </View>
      )}
    </TouchableOpacity>
  );

  const handleNext = () => {
    if (selectedAsset) {
      if (onSelectAsset) {
        onSelectAsset(selectedAsset);
      } else {
        setShowEditor(true);
      }
    } else {
      Alert.alert('Chọn media', 'Vui lòng chọn một ảnh hoặc video');
    }
  };

  if (isLoading) {
    return (
      <View className="flex-1 bg-black justify-center items-center">
        <ActivityIndicator size="large" color="white" />
      </View>
    );
  }

  if (showEditor && selectedAsset) {
    return (
      <StoryEditorScreen 
        asset={selectedAsset} 
        onClose={() => {
          setShowEditor(false);
          if (selectedAsset?.uri.startsWith('file://photo')) {
            loadGalleryImages();
          }
        }} 
      />
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-black">
      <StatusBar barStyle="light-content" />
      
      <View className="flex-row justify-between items-center p-4">
        <TouchableOpacity onPress={onClose}>
          <Ionicons name="close" size={28} color="white" />
        </TouchableOpacity>
        
        <Text className="text-white font-bold text-lg">Tạo Story</Text>
        
        <TouchableOpacity onPress={handleNext}>
          <Text className="text-blue-500 font-bold">Tiếp theo</Text>
        </TouchableOpacity>
      </View>
      
      <View className="flex-1">
        {selectedAsset ? (
          selectedAsset.type === 'video' ? (
            <View className="flex-1 justify-center items-center">
              <Image 
                source={{ uri: selectedAsset.uri }}
                className="w-full h-full"
                resizeMode="contain"
              />
              <View className="absolute bg-black/50 p-2 rounded-full">
                <MaterialIcons name="play-arrow" size={40} color="white" />
              </View>
            </View>
          ) : (
            <Image 
              source={{ uri: selectedAsset.uri }}
              className="w-full h-full"
              resizeMode="contain"
            />
          )
        ) : (
          <View className="flex-1 justify-center items-center">
            <Text className="text-white">Chưa có ảnh nào được chọn</Text>
          </View>
        )}
      </View>
      
      <View className="p-2 bg-gray-900">
        <View className="flex-row justify-around pb-2">
          <TouchableOpacity
            className="items-center"
            onPress={handleOpenCamera}
          >
            <View className="w-12 h-12 rounded-full bg-blue-500 items-center justify-center mb-1">
              <Ionicons name="camera" size={24} color="white" />
            </View>
            <Text className="text-white text-xs">Camera</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            className="items-center"
            onPress={loadGalleryImages}
          >
            <View className="w-12 h-12 rounded-full bg-purple-500 items-center justify-center mb-1">
              <MaterialIcons name="photo-library" size={24} color="white" />
            </View>
            <Text className="text-white text-xs">Thư viện</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            className="items-center"
          >
            <View className="w-12 h-12 rounded-full bg-red-500 items-center justify-center mb-1">
              <Entypo name="text" size={24} color="white" />
            </View>
            <Text className="text-white text-xs">Văn bản</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            className="items-center"
          >
            <View className="w-12 h-12 rounded-full bg-green-500 items-center justify-center mb-1">
              <MaterialIcons name="music-note" size={24} color="white" />
            </View>
            <Text className="text-white text-xs">Âm nhạc</Text>
          </TouchableOpacity>
        </View>
        
        <FlatList
          data={galleryImages}
          renderItem={renderGalleryItem}
          keyExtractor={(item) => item.assetId || item.uri}
          horizontal={false}
          numColumns={4}
          showsVerticalScrollIndicator={false}
          initialNumToRender={20}
          className="mt-2"
          contentContainerStyle={{ paddingBottom: 20 }}
        />
      </View>
    </SafeAreaView>
  );
};

export default StoryLibraryScreen;