import React, { useState } from 'react';
import { 
  View, 
  Text, 
  Image, 
  TouchableOpacity, 
  ScrollView,
  ActivityIndicator,
  Alert,
  TextInput
} from 'react-native';
import { ImagePickerAsset } from 'expo-image-picker';
import { Ionicons, MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import StoryService from '../../services/storyService';
import { SafeAreaView } from 'react-native-safe-area-context';

// Mock Video component để thay thế expo-av
const Video = (props: any) => {
  return <Image {...props} />;
};

interface RouteParams {
  asset: ImagePickerAsset;
}

interface StoryEditorScreenProps {
  route?: { params: RouteParams };
  asset?: ImagePickerAsset;
  onClose?: () => void;
}

const StoryEditorScreen = ({ route, asset: propAsset, onClose }: StoryEditorScreenProps) => {
  const navigation = useNavigation();
  // Sử dụng asset từ prop hoặc từ route
  const routeParams = route?.params;
  const asset = propAsset || routeParams?.asset;
  
  if (!asset) {
    console.error('Không có asset được cung cấp cho StoryEditorScreen');
    return null;
  }
  
  const [text, setText] = useState('');
  const [hasText, setHasText] = useState(false);
  const [stickerData, setStickerData] = useState(null);
  const [filterData, setFilterData] = useState(null);
  const [isCloseFriendsOnly, setIsCloseFriendsOnly] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [showTools, setShowTools] = useState(true);

  const handleTextToggle = () => {
    setHasText(!hasText);
    setShowTools(false);
  };

  const handleCloseFriendsToggle = () => {
    setIsCloseFriendsOnly(!isCloseFriendsOnly);
  };

  const handleCreateStory = async () => {
    try {
      setIsUploading(true);
      
      const formData = new FormData();
      
      // Xác định loại media
      let type = 'image/jpeg';
      if (asset.uri.endsWith('.mp4') || asset.uri.endsWith('.mov')) {
        type = 'video/mp4';
      } else if (asset.uri.endsWith('.png')) {
        type = 'image/png';
      }
      
      // @ts-ignore
      formData.append('file', {
        uri: asset.uri,
        name: asset.fileName || `story_${Date.now()}.jpg`,
        type,
      });
      
      if (hasText && text.trim()) {
        formData.append('caption', text.trim());
      }
      
      if (isCloseFriendsOnly) {
        formData.append('close_friends_only', 'true');
      }
      
      await StoryService.createStory(formData);
      
      Alert.alert(
        'Thành công',
        'Story đã được tạo',
        [{ 
          text: 'OK', 
          onPress: () => {
            if (onClose) {
              onClose();
            } else {
              navigation.navigate('Feed' as never);
            }
          } 
        }]
      );
    } catch (error: any) {
      Alert.alert('Lỗi', error.message || 'Không thể tạo story');
    } finally {
      setIsUploading(false);
    }
  };

  const handleBackPress = () => {
    if (onClose) {
      onClose();
    } else {
      navigation.goBack();
    }
  };

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
        {asset.type === 'video' ? (
          <Video
            source={{ uri: asset.uri }}
            className="w-full h-full"
            resizeMode="contain"
            shouldPlay
            isLooping
          />
        ) : (
          <Image source={{ uri: asset.uri }} className="w-full h-full" resizeMode="contain" />
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
            
            <TouchableOpacity className="items-center mr-5 w-15">
              <MaterialIcons name="music-note" size={24} color="white" />
              <Text className="text-white mt-1 text-xs">Nhạc</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      )}

      <View className="px-4 py-4">
        <TouchableOpacity
          className={`bg-blue-500 rounded px-4 py-3 items-center ${isUploading ? 'opacity-50' : ''}`}
          onPress={handleCreateStory}
          disabled={isUploading}
        >
          {isUploading ? (
            <ActivityIndicator color="white" size="small" />
          ) : (
            <Text className="text-white font-bold">Tạo Story</Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

export default StoryEditorScreen;