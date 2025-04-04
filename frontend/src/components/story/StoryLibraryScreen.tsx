import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  FlatList, 
  Image, 
  Dimensions,
  ActivityIndicator,
  Alert,
  ScrollView,
  Modal,
  StatusBar,
  Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import StoryService from '../../services/storyService';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ImagePickerAsset } from 'expo-image-picker';
import * as MediaLibrary from 'expo-media-library';
import StoryEditorScreen from './StoryEditorScreen';

// Custom error type
interface HandledError {
  message: string;
}

interface StoryLibraryScreenProps {
  onClose?: () => void;
}

const { width } = Dimensions.get('window');
const ITEM_WIDTH = width / 3;

interface MediaItem {
  id: string;
  uri: string;
  type: 'image' | 'video';
  width: number;
  height: number;
  filename?: string;
  duration?: number;
  creationTime?: number;
}

const StoryLibraryScreen = ({ onClose }: StoryLibraryScreenProps) => {
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [endCursor, setEndCursor] = useState<string | undefined>(undefined);
  const navigation = useNavigation();
  const [selectedAsset, setSelectedAsset] = useState<ImagePickerAsset | null>(null);
  const [showEditor, setShowEditor] = useState(false);

  useEffect(() => {
    console.log("StoryLibraryScreen mounted");
    requestPermissionsAndLoadMedia();
    
    return () => {
      console.log("StoryLibraryScreen unmounted");
    };
  }, []);

  const requestPermissionsAndLoadMedia = async () => {
    try {
      console.log("Requesting media library permissions...");
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        console.log("Permission denied");
        Alert.alert(
          'Cần quyền truy cập',
          'Ứng dụng cần quyền truy cập thư viện ảnh để hiển thị hình ảnh và video của bạn',
          [{ text: 'OK', onPress: () => onClose ? onClose() : navigation.goBack() }]
        );
        return;
      }
      
      console.log("Permission granted, loading media...");
      loadMediaItems(true);
    } catch (error) {
      console.error('Lỗi khi yêu cầu quyền truy cập:', error);
      Alert.alert('Lỗi', 'Không thể truy cập thư viện ảnh');
    }
  };

  const loadMediaItems = async (refresh = false) => {
    try {
      if (refresh) {
        setHasMore(true);
        setMediaItems([]);
        setEndCursor(undefined);
      }

      setLoading(true);
      
      // Lấy hình ảnh và video từ thư viện ảnh
      const result = await MediaLibrary.getAssetsAsync({
        first: 20,
        mediaType: [MediaLibrary.MediaType.photo, MediaLibrary.MediaType.video],
        sortBy: [MediaLibrary.SortBy.creationTime],
        after: refresh ? undefined : endCursor,
      });
      
      // Chuyển đổi sang định dạng MediaItem
      const items: MediaItem[] = result.assets.map(asset => ({
        id: asset.id,
        uri: asset.uri,
        type: asset.mediaType === 'video' ? 'video' : 'image',
        width: asset.width,
        height: asset.height,
        filename: asset.filename,
        duration: asset.duration,
        creationTime: asset.creationTime,
      }));
      
      setMediaItems(prev => refresh ? items : [...prev, ...items]);
      setHasMore(result.hasNextPage || false);
      setEndCursor(result.endCursor);
    } catch (error) {
      console.error('Lỗi khi tải thư viện ảnh:', error);
      Alert.alert('Lỗi', 'Không thể tải thư viện ảnh');
    } finally {
      setLoading(false);
    }
  };

  const loadMoreItems = () => {
    if (!loading && hasMore) {
      loadMediaItems(false);
    }
  };

  const handleRefresh = () => {
    loadMediaItems(true);
  };

  const handleCameraPress = async () => {
    try {
      const photo = await StoryService.takePhoto();
      if (photo) {
        setSelectedAsset(photo);
        setShowEditor(true);
      }
    } catch (error) {
      const handledError = error as HandledError;
      Alert.alert('Lỗi', handledError?.message || 'Không thể mở camera');
    }
  };

  const handleMediaSelect = async (item: MediaItem) => {
    try {
      setUploading(true);
      
      // Thực hiện truy vấn để lấy thông tin chi tiết về asset
      const asset = await MediaLibrary.getAssetInfoAsync(item.id);
      
      // Chuyển đổi MediaItem thành ImagePickerAsset
      const pickerAsset: ImagePickerAsset = {
        uri: asset.uri,
        width: asset.width,
        height: asset.height,
        assetId: asset.id,
        type: asset.mediaType === 'video' ? 'video' : 'image',
        fileName: asset.filename || `file-${asset.id}.${asset.mediaType === 'video' ? 'mp4' : 'jpg'}`,
        duration: asset.duration,
      };
      
      setSelectedAsset(pickerAsset);
      setShowEditor(true);
    } catch (error) {
      Alert.alert('Lỗi', 'Không thể chọn media');
      console.error('Lỗi khi chọn media:', error);
    } finally {
      setUploading(false);
    }
  };

  const handleCloseEditor = () => {
    console.log("Closing editor");
    setShowEditor(false);
    setSelectedAsset(null);
  };

  const renderItem = ({ item }: { item: MediaItem }) => (
    <TouchableOpacity 
      className="relative"
      style={{ width: ITEM_WIDTH, height: ITEM_WIDTH }}
      onPress={() => handleMediaSelect(item)}
    >
      <Image source={{ uri: item.uri }} className="w-full h-full border-0.5 border-white" />
      {item.type === 'video' && (
        <View className="absolute right-1.5 top-1.5 bg-black/50 w-6 h-6 rounded-full justify-center items-center">
          <Ionicons name="play" size={16} color="white" />
        </View>
      )}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView className="flex-1 bg-white">
      <StatusBar backgroundColor="#ffffff" barStyle="dark-content" />
      <View className="flex-row justify-center items-center p-4 border-b border-gray-200">
        <Text className="text-lg font-bold">Tạo story mới</Text>
        <TouchableOpacity 
          onPress={() => {
            console.log("Close button pressed");
            onClose ? onClose() : navigation.goBack();
          }}
          className="absolute right-4 top-4"
        >
          <Ionicons name="close" size={24} color="black" />
        </TouchableOpacity>
      </View>

      {loading && mediaItems.length === 0 ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#0095f6" />
        </View>
      ) : (
        <FlatList
          data={mediaItems}
          renderItem={renderItem}
          keyExtractor={item => item.id}
          numColumns={3}
          onRefresh={handleRefresh}
          refreshing={loading && mediaItems.length > 0}
          onEndReached={loadMoreItems}
          onEndReachedThreshold={0.5}
          ListEmptyComponent={
            <View className="flex-1 items-center justify-center p-8">
              <Text className="text-gray-500 text-center">
                Không tìm thấy hình ảnh hoặc video nào trong thư viện của bạn
              </Text>
            </View>
          }
          ListFooterComponent={
            hasMore && loading && mediaItems.length > 0 ? (
              <View className="py-4 items-center">
                <ActivityIndicator size="small" color="#0095f6" />
              </View>
            ) : null
          }
          ListHeaderComponent={
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="py-4 border-b border-gray-200">
              <View className="items-center mx-3 w-24">
                <TouchableOpacity 
                  className="relative"
                  onPress={handleCameraPress}
                >
                  <View className="relative">
                    <Image 
                      source={{ uri: 'https://via.placeholder.com/150' }} 
                      className="w-20 h-20 rounded-full" 
                    />
                    <View 
                      className="absolute bottom-0 right-0 bg-blue-500 w-7 h-7 rounded-full justify-center items-center border-2 border-white z-10"
                    >
                      <Ionicons name="add" size={18} color="white" />
                    </View>
                  </View>
                  <Text className="text-sm mt-1.5 font-medium text-center">Your Story</Text>
                </TouchableOpacity>
              </View>
              <View className="items-center mx-3 w-24">
                <TouchableOpacity 
                  className="w-20 h-20 rounded-full bg-gray-100 justify-center items-center"
                  onPress={handleCameraPress}
                >
                  <Ionicons name="camera" size={28} color="#0095f6" />
                </TouchableOpacity>
                <Text className="text-sm mt-1.5 font-medium text-blue-500">Camera</Text>
              </View>
            </ScrollView>
          }
        />
      )}

      {uploading && (
        <View className="absolute inset-0 bg-black/70 justify-center items-center">
          <ActivityIndicator size="large" color="white" />
          <Text className="text-white mt-2.5 text-base">Đang xử lý media...</Text>
        </View>
      )}

      <Modal
        visible={showEditor}
        animationType="slide"
        onRequestClose={handleCloseEditor}
        presentationStyle="fullScreen"
        statusBarTranslucent={true}
      >
        {selectedAsset && (
          <StoryEditorScreen 
            asset={selectedAsset} 
            onClose={handleCloseEditor} 
          />
        )}
      </Modal>
    </SafeAreaView>
  );
};

export default StoryLibraryScreen;