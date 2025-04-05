import React, { useEffect, useState, useCallback, useContext, useMemo } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Modal,
  StyleSheet,
  Platform
} from 'react-native';
import { Ionicons, AntDesign } from '@expo/vector-icons';
import { useNavigation, useFocusEffect, useIsFocused } from '@react-navigation/native';
import StoryService, { StoryGroup, Story } from '../../services/storyService';
import AuthContext, { useAuth } from '../../app/context/AuthContext';
import StoryLibraryScreen from './StoryLibraryScreen';
import StoryEditorScreen from './StoryEditorScreen';
import StoryViewerScreen from './StoryViewerScreen';
import * as ImagePicker from 'expo-image-picker';
import { ImagePickerAsset } from 'expo-image-picker';
import { registerAuthUpdateFunction } from '../../services/userService';

interface StoriesListProps {
  openStoryLibrary?: () => void;
  userId: string;
  navigation: any;
}

const StoriesList = ({ openStoryLibrary, userId, navigation }: StoriesListProps) => {
  const { authData, updateUserData } = useAuth();
  const [storyGroups, setStoryGroups] = useState<StoryGroup[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showLibrary, setShowLibrary] = useState(false);
  const [isLibraryOpen, setIsLibraryOpen] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<ImagePickerAsset | null>(null);
  const [selectedStory, setSelectedStory] = useState<{
    story: Story,
    allStories: Story[],
    initialIndex: number
  } | null>(null);
  const [showStoryViewer, setShowStoryViewer] = useState(false);
  const isFocused = useIsFocused();

  useEffect(() => {
    if (updateUserData) {
      registerAuthUpdateFunction(updateUserData);
    }
  }, [updateUserData]);

  const fetchStories = async (showFullLoading = true) => {
    try {
      if (showFullLoading) {
        setIsLoading(true);
      }
      setError(null);
      const data = await StoryService.getStories();
      setStoryGroups(data);
    } catch (error: any) {
      console.error('Lỗi khi lấy danh sách stories:', error);
      setError(error?.message || 'Không thể tải danh sách stories');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchStories();
  }, [isFocused]);

  useFocusEffect(
    useCallback(() => {
      fetchStories(false);
    }, [])
  );

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchStories(false);
  };

  useEffect(() => {
    console.log("AuthData đã thay đổi, avatar mới:", authData?.user?.profile_picture);
  }, [authData]);

  const handleStoryCreated = useCallback(() => {
    console.log("Story mới đã được tạo, cập nhật danh sách");
    fetchStories(false);
  }, []);

  const currentProfilePicture = useMemo(() => {
    return authData?.user?.profile_picture || 'https://via.placeholder.com/150';
  }, [authData?.user?.profile_picture]);

  const handleCreateStory = () => {
    console.log("Đang mở thư viện ảnh để tạo story...");
    
    if (openStoryLibrary) {
      console.log("Gọi hàm openStoryLibrary từ prop");
      openStoryLibrary();
      return;
    }
    
    try {
      ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.All,
        allowsMultipleSelection: true,
        quality: 1,
        aspect: [9, 16],
        allowsEditing: false
      }).then((result) => {
        console.log("Kết quả chọn ảnh trực tiếp:", result);
        if (!result.canceled && result.assets.length > 0) {
          console.log("Chọn ảnh thành công:", result.assets[0]);
          setSelectedAsset(result.assets[0]);
        }
      }).catch((error) => {
        console.error("Lỗi khi chọn ảnh trực tiếp:", error);
        Alert.alert("Lỗi", "Không thể mở thư viện ảnh");
      });
    } catch (error) {
      console.error("Lỗi khi mở thư viện ảnh trực tiếp:", error);
      Alert.alert("Lỗi", "Không thể mở thư viện ảnh");
    }
  };

  const handleCloseLibrary = () => {
    console.log("Đóng màn hình tạo story");
    setShowLibrary(false);
  };

  const handleViewStory = (storyGroup: StoryGroup) => {
    const enrichedStories = storyGroup.stories.map(story => ({
      ...story,
      username: storyGroup.user.username || "",
      profile_picture: storyGroup.user.profile_picture || ""
    }));
    
    const firstUnviewedIndex = enrichedStories.findIndex(story => !story.is_viewed);
    const initialIndex = firstUnviewedIndex > -1 ? firstUnviewedIndex : 0;
    
    setSelectedStory({
      story: enrichedStories[initialIndex],
      allStories: enrichedStories,
      initialIndex: initialIndex
    });
    setShowStoryViewer(true);
  };

  const handleCloseEditor = () => {
    console.log("Đóng StoryEditor");
    setSelectedAsset(null);
  };

  useEffect(() => {
    if (selectedAsset) {
      console.log("selectedAsset đã thay đổi, mở StoryEditorScreen:", selectedAsset);
    }
  }, [selectedAsset]);

  const handleOpenCamera = async () => {
    try {
      console.log("Mở camera từ modal");
      const photo = await StoryService.takePhoto();
      if (photo) {
        console.log("Chụp ảnh thành công:", photo);
        
        setShowLibrary(false);
        
        setTimeout(() => {
          setSelectedAsset(photo);
          console.log("Đã set selectedAsset:", photo);
        }, 300);
      }
    } catch (error) {
      console.error("Lỗi khi chụp ảnh:", error);
      Alert.alert("Lỗi", "Không thể mở camera");
    }
  };

  const handleChooseFromLibrary = async () => {
    try {
      console.log("Mở thư viện ảnh trực tiếp");
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.All,
        allowsEditing: true,
        quality: 1,
      });

      if (!result.canceled) {
        console.log("Đã chọn media:", result.assets[0]);
        
        setShowLibrary(false);
        
        setTimeout(() => {
          setSelectedAsset(result.assets[0]);
          console.log("Đã set selectedAsset:", result.assets[0]);
        }, 300);
      }
    } catch (error) {
      console.error("Lỗi khi chọn ảnh từ thư viện:", error);
      Alert.alert("Lỗi", "Không thể mở thư viện ảnh");
    }
  };
  
  const handleOpenLibrary = () => {
    console.log("Mở thư viện ảnh");
    setShowLibrary(false);
    setIsLibraryOpen(true);
  };

  const handleCloseLibrary2 = () => {
    console.log("Đóng thư viện ảnh");
    setIsLibraryOpen(false);
  };

  const handleSelectAssetFromLibrary = (asset: ImagePickerAsset) => {
    console.log("Đã nhận asset từ thư viện:", asset);
    setSelectedAsset(asset);
    setIsLibraryOpen(false);
  };

  if (isLoading && !isRefreshing) {
    return (
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        className="pt-2 pb-4"
      >
        {/* Nút tạo Story */}
        <TouchableOpacity 
          className="items-center justify-center mr-4 ml-3"
          onPress={handleCreateStory}
        >
          <View className="w-20 h-20 rounded-full border border-gray-200 items-center justify-center relative">
            <View className="w-full h-full rounded-full overflow-hidden">
              <Image 
                source={{ uri: currentProfilePicture }}
                className="w-full h-full"
              />
            </View>
            <View className="absolute bottom-0 right-0 bg-blue-500 rounded-full w-7 h-7 items-center justify-center border-2 border-white z-10">
              <AntDesign name="plus" size={18} color="white" />
            </View>
          </View>
          <Text className="text-sm mt-1.5 font-medium text-center">Your Story</Text>
        </TouchableOpacity>
        
        {/* Loading indicator */}
        <View className="h-16 justify-center items-center px-4">
          <ActivityIndicator size="small" color="#0096F6" />
        </View>
      </ScrollView>
    );
  }

  if (storyGroups.length === 0 && !isLoading && !error) {
    return (
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        className="pt-2 pb-4"
      >
        {/* Nút tạo Story */}
        <TouchableOpacity 
          className="items-center justify-center mr-4 ml-3"
          onPress={handleCreateStory}
        >
          <View className="w-20 h-20 rounded-full border border-gray-200 items-center justify-center relative">
            <View className="w-full h-full rounded-full overflow-hidden">
              <Image 
                source={{ uri: currentProfilePicture }}
                className="w-full h-full"
              />
            </View>
            <View className="absolute bottom-0 right-0 bg-blue-500 rounded-full w-7 h-7 items-center justify-center border-2 border-white z-10">
              <AntDesign name="plus" size={18} color="white" />
            </View>
          </View>
          <Text className="text-sm mt-1.5 font-medium text-center">Your Story</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  if (error && !isRefreshing) {
    return (
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        className="pt-2 pb-4"
      >
        {/* Nút tạo Story */}
        <TouchableOpacity 
          className="items-center justify-center mr-4 ml-3"
          onPress={handleCreateStory}
        >
          <View className="w-20 h-20 rounded-full border border-gray-200 items-center justify-center relative">
            <View className="w-full h-full rounded-full overflow-hidden">
              <Image 
                source={{ uri: currentProfilePicture }}
                className="w-full h-full"
              />
            </View>
            <View className="absolute bottom-0 right-0 bg-blue-500 rounded-full w-7 h-7 items-center justify-center border-2 border-white z-10">
              <AntDesign name="plus" size={18} color="white" />
            </View>
          </View>
          <Text className="text-sm mt-1.5 font-medium text-center">Your Story</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  return (
    <>
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        className="pt-2 pb-4"
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor="#0096F6"
          />
        }
      >
        {/* Nút tạo Story */}
        <TouchableOpacity 
          className="items-center justify-center mr-4 ml-3"
          onPress={handleCreateStory}
        >
          <View className="w-20 h-20 rounded-full border border-gray-200 items-center justify-center relative">
            <View className="w-full h-full rounded-full overflow-hidden">
              <Image 
                source={{ uri: currentProfilePicture }}
                className="w-full h-full"
              />
            </View>
            <View className="absolute bottom-0 right-0 bg-blue-500 rounded-full w-7 h-7 items-center justify-center border-2 border-white z-10">
              <AntDesign name="plus" size={18} color="white" />
            </View>
          </View>
          <Text className="text-sm mt-1.5 font-medium text-center">Your Story</Text>
        </TouchableOpacity>

        {/* Danh sách Stories của người khác */}
        {storyGroups.map((storyGroup) => (
          <TouchableOpacity 
            key={`story-${storyGroup.user.user_id}`}
            className="items-center mr-4"
            onPress={() => handleViewStory(storyGroup)}
          >
            <View className={`w-20 h-20 rounded-full p-0.5 ${storyGroup.has_unviewed ? 'bg-gradient-to-tr from-yellow-500 to-pink-500' : 'border border-gray-300'}`}>
              <Image 
                source={{ uri: storyGroup.user.profile_picture }}
                className="w-full h-full rounded-full"
              />
            </View>
            <Text className="text-sm mt-1.5 font-normal" numberOfLines={1}>
              {storyGroup.user.username}
            </Text>
          </TouchableOpacity>
        ))}

        {isRefreshing && (
          <View className="h-16 justify-center items-center px-4">
            <ActivityIndicator size="small" color="#0096F6" />
          </View>
        )}
      </ScrollView>

      {/* Modal tạo story */}
      {showLibrary && (
        <Modal
          visible={true}
          transparent={true}
          animationType="slide"
          onRequestClose={handleCloseLibrary}
        >
          <View className="flex-1 bg-black/70 justify-end">
            <View className="bg-white rounded-t-xl pt-4 pb-6">
              <Text className="text-center text-lg font-bold mb-5">Tạo Story</Text>
              
              <TouchableOpacity 
                className="flex-row items-center px-5 py-3"
                onPress={handleOpenCamera}
              >
                <Ionicons name="camera" size={24} color="#0096F6" />
                <Text className="text-base ml-3">Chụp ảnh</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                className="flex-row items-center px-5 py-3"
                onPress={handleChooseFromLibrary}
              >
                <Ionicons name="image" size={24} color="#0096F6" />
                <Text className="text-base ml-3">Chọn từ thư viện</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                className="flex-row items-center px-5 py-3"
                onPress={handleOpenLibrary}
              >
                <Ionicons name="folder" size={24} color="#0096F6" />
                <Text className="text-base ml-3">Thư viện story</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                className="flex-row items-center px-5 py-3 mt-2"
                onPress={handleCloseLibrary}
              >
                <Text className="text-base text-red-500 mx-auto">Hủy</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}
      
      {/* Modal StoryEditorScreen */}
      {selectedAsset && (
        <Modal
          visible={true}
          animationType="slide"
          onRequestClose={handleCloseEditor}
          presentationStyle="fullScreen"
          transparent={false}
        >
          <StoryEditorScreen 
            asset={selectedAsset} 
            onClose={() => {
              setSelectedAsset(null);
              handleStoryCreated();
            }}
          />
        </Modal>
      )}
      
      {/* Modal StoryLibraryScreen */}
      {isLibraryOpen && (
        <Modal
          visible={true}
          animationType="slide"
          onRequestClose={handleCloseLibrary2}
          presentationStyle="fullScreen"
          transparent={false}
        >
          <StoryLibraryScreen 
            onClose={handleCloseLibrary2}
            onSelectAsset={handleSelectAssetFromLibrary}
          />
        </Modal>
      )}

      {/* Modal mới cho StoryViewerScreen */}
      {selectedStory && showStoryViewer && (
        <Modal
          visible={true}
          animationType="fade"
          onRequestClose={() => setShowStoryViewer(false)}
          presentationStyle="fullScreen"
          transparent={false}
        >
          <StoryViewerScreen
            storyId={selectedStory.story.story_id}
            stories={selectedStory.allStories}
            initialIndex={selectedStory.initialIndex}
            onClose={() => setShowStoryViewer(false)}
          />
        </Modal>
      )}
    </>
  );
};

export default StoriesList; 