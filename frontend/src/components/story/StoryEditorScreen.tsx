import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, 
  Text, 
  Image, 
  TouchableOpacity, 
  ScrollView,
  ActivityIndicator,
  Alert,
  TextInput,
  Modal,
  FlatList,
  Platform
} from 'react-native';
import { Ionicons, MaterialIcons, MaterialCommunityIcons, FontAwesome5, Entypo } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import StoryService, { refreshStories } from '../../services/storyService';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { ImagePickerAsset } from 'expo-image-picker';
import { Video, ResizeMode } from 'expo-av';

interface RouteParams {
  asset: ImagePickerAsset;
}

const musicSamples = [
  { id: '1', title: 'Nhạc Trending #1', artist: 'Artist 1', duration: '30s' },
  { id: '2', title: 'Pop Hits', artist: 'Artist 2', duration: '15s' },
  { id: '3', title: 'Dance Mix', artist: 'Artist 3', duration: '20s' },
  { id: '4', title: 'Acoustic Vibes', artist: 'Artist 4', duration: '30s' },
  { id: '5', title: 'EDM Party', artist: 'Artist 5', duration: '25s' },
];

const cameraTemplates = [
  { id: 'temp1', name: 'Bokeh', icon: 'camera' },
  { id: 'temp2', name: 'Portrait', icon: 'camera-portrait' },
  { id: 'temp3', name: 'Selfie', icon: 'camera-retro' },
  { id: 'temp4', name: 'Night', icon: 'moon' },
  { id: 'temp5', name: 'HDR', icon: 'adjust' },
];

interface StoryEditorScreenProps {
  route?: { params: RouteParams };
  asset?: ImagePickerAsset;
  onClose?: (storyData: any) => void;
  onStoryCreated?: (story: any) => void;
}

const StoryEditorScreen = ({ route, asset: propAsset, onClose, onStoryCreated }: StoryEditorScreenProps) => {
  const navigation = useNavigation();
  const routeParams = route?.params;
  const asset = propAsset || routeParams?.asset;
  
  const [text, setText] = useState('');
  const [hasText, setHasText] = useState(false);
  const [stickerData, setStickerData] = useState(null);
  const [filterData, setFilterData] = useState(null);
  const [isCloseFriendsOnly, setIsCloseFriendsOnly] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [showTools, setShowTools] = useState(true);
  const [showMusicModal, setShowMusicModal] = useState(false);
  const [selectedMusic, setSelectedMusic] = useState<string | null>(null);
  const [showCameraModal, setShowCameraModal] = useState(false);
  const [mediaUri, setMediaUri] = useState<string | null>(asset ? asset.uri : null);

  useEffect(() => {
    if (!asset && !mediaUri) {
      openMediaPicker();
    }
  }, []);

  const handleTextToggle = () => {
    setHasText(!hasText);
    setShowTools(false);
  };

  const handleCloseFriendsToggle = () => {
    setIsCloseFriendsOnly(!isCloseFriendsOnly);
  };

  const openMediaPicker = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.All,
        allowsEditing: true,
        quality: 0.8,
        videoMaxDuration: 30,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setMediaUri(result.assets[0].uri);
      } else if (!mediaUri && !asset) {
        if (onClose) {
          onClose(null);
        } else {
          navigation.goBack();
        }
      }
    } catch (error) {
      console.error('Lỗi khi chọn media:', error);
      Alert.alert('Lỗi', 'Không thể chọn media. Vui lòng thử lại.');
    }
  };

  const handleOpenCamera = async () => {
    try {
      setShowCameraModal(false);
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
    }
  };

  const handleCreateStory = async () => {
    try {
      setIsUploading(true);
      
      if (!mediaUri) {
        Alert.alert('Lỗi', 'Vui lòng chọn ảnh hoặc video cho story');
        setIsUploading(false);
        return;
      }
      
      const formData = new FormData();
      
      let type = 'image/jpeg';
      if (mediaUri.endsWith('.mp4') || mediaUri.endsWith('.mov')) {
        type = 'video/mp4';
      } else if (mediaUri.endsWith('.png')) {
        type = 'image/png';
      }
      
      const fileName = mediaUri.split('/').pop() || `story_${Date.now()}.jpg`;
      console.log("File name:", fileName, "type:", type);
      
      // @ts-ignore
      formData.append('media', {
        uri: mediaUri,
        name: fileName,
        type,
      });
      
      if (hasText && text.trim()) {
        formData.append('caption', text.trim());
        formData.append('has_text', 'true');
        formData.append('sticker_data', text.trim());
      }
      
      if (isCloseFriendsOnly) {
        formData.append('close_friends_only', 'true');
      }
      
      if (selectedMusic) {
        formData.append('music_id', selectedMusic);
      }
      
      const response = await StoryService.createStory(formData);
      
      const storyData = {
        success: true,
        story_id: response.story_id,
        media: response.media || [],
        expires_at: response.expires_at,
        has_text: hasText,
        sticker_data: hasText ? text : null,
        filter_data: filterData,
        close_friends_only: isCloseFriendsOnly
      };
      
      if (onStoryCreated) {
        onStoryCreated(storyData);
      }
      
      refreshStories();
      
      Alert.alert(
        'Thành công',
        'Story đã được tạo',
        [{ 
          text: 'OK', 
          onPress: () => {
            if (onClose) {
              onClose(storyData);
            } else {
              navigation.navigate('Feed' as never);
            }
          } 
        }]
      );
    } catch (error: any) {
      console.error("Lỗi khi tạo story:", error);
      Alert.alert('Lỗi', error.message || 'Không thể tạo story');
    } finally {
      setIsUploading(false);
    }
  };

  const handleBackPress = () => {
    if (onClose) {
      onClose(null);
    } else {
      navigation.goBack();
    }
  };

  const renderMusicItem = ({ item }: { item: typeof musicSamples[0] }) => (
    <TouchableOpacity 
      className="flex-row items-center p-4 border-b border-gray-700"
      onPress={() => {
        setSelectedMusic(item.id);
        setShowMusicModal(false);
      }}
    >
      <MaterialIcons name="music-note" size={24} color="white" />
      <View className="ml-3 flex-1">
        <Text className="text-white font-medium">{item.title}</Text>
        <Text className="text-gray-400 text-sm">{item.artist} • {item.duration}</Text>
      </View>
      {selectedMusic === item.id && (
        <Ionicons name="checkmark-circle" size={24} color="#0095f6" />
      )}
    </TouchableOpacity>
  );

  const renderCameraTemplate = ({ item }: { item: typeof cameraTemplates[0] }) => (
    <TouchableOpacity 
      className="items-center mx-3"
      onPress={handleOpenCamera}
    >
      <View className="w-16 h-16 rounded-full bg-gray-800 items-center justify-center">
        <FontAwesome5 name={item.icon} size={24} color="white" />
      </View>
      <Text className="text-white mt-2 text-xs">{item.name}</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView className="flex-1 bg-black">
      <View className="flex-row justify-between items-center px-4 py-4">
        <TouchableOpacity onPress={handleBackPress}>
          <Ionicons name="chevron-back" size={28} color="white" />
        </TouchableOpacity>
        
        <View className="flex-row">
          <TouchableOpacity 
            className="w-10 h-10 rounded-full bg-white/20 items-center justify-center mr-4"
            onPress={handleTextToggle}
          >
            <MaterialIcons name="text-fields" size={24} color="white" />
          </TouchableOpacity>
          
          <TouchableOpacity 
            className={`w-10 h-10 rounded-full items-center justify-center ${isCloseFriendsOnly ? 'bg-green-500/30' : 'bg-white/20'}`}
            onPress={handleCloseFriendsToggle}
          >
            <MaterialCommunityIcons
              name={isCloseFriendsOnly ? "account-group" : "account-group-outline"}
              size={24}
              color="white"
            />
          </TouchableOpacity>
        </View>
      </View>

      <View className="flex-1 justify-center items-center">
        {mediaUri ? (
          mediaUri.endsWith('.mp4') || mediaUri.endsWith('.mov') ? (
            <Video
              source={{ uri: mediaUri }}
              className="w-full h-full"
              resizeMode={ResizeMode.CONTAIN}
              shouldPlay
              isLooping
            />
          ) : (
            <Image source={{ uri: mediaUri }} className="w-full h-full" resizeMode="contain" />
          )
        ) : (
          <View className="w-full h-full bg-gray-900 items-center justify-center">
            <TouchableOpacity onPress={openMediaPicker}>
              <Text className="text-white">Chọn ảnh hoặc video</Text>
            </TouchableOpacity>
          </View>
        )}
        
        {hasText && (
          <TextInput
            className="absolute w-4/5 p-3 rounded-lg text-white text-lg text-center bg-black/50"
            placeholder="Viết gì đó..."
            placeholderTextColor="rgba(255,255,255,0.7)"
            multiline
            value={text}
            onChangeText={setText}
            autoFocus
          />
        )}
        
        {selectedMusic && (
          <View className="absolute bottom-5 left-0 right-0 flex-row items-center justify-center bg-black/50 p-3">
            <MaterialIcons name="music-note" size={18} color="white" />
            <Text className="text-white ml-2">{musicSamples.find(m => m.id === selectedMusic)?.title}</Text>
            <TouchableOpacity onPress={() => setSelectedMusic(null)} className="ml-3">
              <Ionicons name="close-circle" size={18} color="white" />
            </TouchableOpacity>
          </View>
        )}
      </View>

      {showTools && (
        <View className="px-4 py-4 border-t border-white/10">
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <TouchableOpacity className="items-center mr-5 w-15">
              <MaterialIcons name="filter" size={24} color="white" />
              <Text className="text-white mt-1 text-xs">Bộ lọc</Text>
            </TouchableOpacity>
            
            <TouchableOpacity className="items-center mr-5 w-15">
              <MaterialCommunityIcons name="sticker-emoji" size={24} color="white" />
              <Text className="text-white mt-1 text-xs">Sticker</Text>
            </TouchableOpacity>
            
            <TouchableOpacity className="items-center mr-5 w-15">
              <MaterialIcons name="brush" size={24} color="white" />
              <Text className="text-white mt-1 text-xs">Vẽ</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              className="items-center mr-5 w-15"
              onPress={() => setShowMusicModal(true)}
            >
              <MaterialIcons name="music-note" size={24} color="white" />
              <Text className="text-white mt-1 text-xs">Nhạc</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              className="items-center mr-5 w-15"
              onPress={() => setShowCameraModal(true)}
            >
              <Ionicons name="camera" size={24} color="white" />
              <Text className="text-white mt-1 text-xs">Camera</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              className="items-center mr-5 w-15"
              onPress={openMediaPicker}
            >
              <MaterialIcons name="photo-library" size={24} color="white" />
              <Text className="text-white mt-1 text-xs">Thư viện</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      )}

      <View className="px-4 py-4">
        <TouchableOpacity
          className={`bg-blue-500 rounded px-4 py-3 items-center ${isUploading ? 'opacity-50' : ''}`}
          onPress={handleCreateStory}
          disabled={isUploading || !mediaUri}
        >
          {isUploading ? (
            <ActivityIndicator color="white" size="small" />
          ) : (
            <Text className="text-white font-bold">Tạo Story</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Modal chọn nhạc */}
      <Modal
        visible={showMusicModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowMusicModal(false)}
      >
        <View className="flex-1 bg-black/90">
          <SafeAreaView className="flex-1">
            <View className="flex-row justify-between items-center p-4 border-b border-gray-800">
              <TouchableOpacity onPress={() => setShowMusicModal(false)}>
                <Ionicons name="close" size={28} color="white" />
              </TouchableOpacity>
              <Text className="text-white text-lg font-bold">Chọn nhạc</Text>
              <View style={{ width: 28 }} />
            </View>
            
            <View className="px-4 py-2">
              <TextInput
                className="bg-gray-800 text-white px-4 py-2 rounded-full"
                placeholder="Tìm kiếm bài hát..."
                placeholderTextColor="gray"
              />
            </View>
            
            <FlatList
              data={musicSamples}
              renderItem={renderMusicItem}
              keyExtractor={item => item.id}
              contentContainerStyle={{ paddingBottom: 20 }}
            />
          </SafeAreaView>
        </View>
      </Modal>

      {/* Modal mẫu camera */}
      <Modal
        visible={showCameraModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowCameraModal(false)}
      >
        <View className="flex-1 bg-black/90 justify-end">
          <SafeAreaView>
            <View className="p-4 border-b border-gray-800">
              <Text className="text-white text-lg font-bold text-center">Chọn hiệu ứng camera</Text>
            </View>
            
            <FlatList
              data={cameraTemplates}
              renderItem={renderCameraTemplate}
              keyExtractor={item => item.id}
              horizontal
              contentContainerStyle={{ paddingVertical: 20, paddingHorizontal: 10 }}
              showsHorizontalScrollIndicator={false}
            />
            
            <TouchableOpacity 
              className="mx-4 my-6 p-4 bg-white/20 rounded-full items-center"
              onPress={() => setShowCameraModal(false)}
            >
              <Text className="text-white font-bold">Đóng</Text>
            </TouchableOpacity>
          </SafeAreaView>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

export default StoryEditorScreen;