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
import StoryService, { StoryGroup, Story, setRefreshStoriesCallback } from '../../services/storyService';
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

  const fetchStories = useCallback(async (showFullLoading = true) => {
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
  }, []);

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
  }, [authData]);

  const handleStoryCreated = useCallback(async (newStory?: any) => {
    
    if (newStory && newStory.success && newStory.story_id && newStory.media) {
      try {
        const currentUser = authData?.user;
        if (!currentUser || !currentUser.user_id) {
          await fetchStories(false);
          return;
        }
        
        let userStoryGroupIndex = storyGroups.findIndex(group => 
          group.user.user_id === currentUser.user_id
        );
        
        const newStoryObj: Story = {
          story_id: newStory.story_id,
          created_at: new Date().toISOString(),
          expires_at: newStory.expires_at,
          has_text: newStory.has_text || false, 
          sticker_data: newStory.sticker_data || null,
          filter_data: newStory.filter_data || null,
          view_count: 0,
          close_friends_only: newStory.close_friends_only || false,
          is_viewed: false,
          media: newStory.media,
          media_url: newStory.media[0]?.media_url,
          user_id: currentUser.user_id,
          username: currentUser.username || "",
          profile_picture: currentUser.profile_picture || ""
        };
        
        const updatedStoryGroups = [...storyGroups];
        
        if (userStoryGroupIndex >= 0) {
          const updatedStories = [...updatedStoryGroups[userStoryGroupIndex].stories];
          updatedStories.unshift(newStoryObj);
          
          updatedStoryGroups[userStoryGroupIndex] = {
            ...updatedStoryGroups[userStoryGroupIndex],
            stories: updatedStories,
            has_unviewed: true
          };
          
          if (userStoryGroupIndex > 0) {
            const userGroup = updatedStoryGroups.splice(userStoryGroupIndex, 1)[0];
            updatedStoryGroups.unshift(userGroup);
          }
        } else {
          const newStoryGroup: StoryGroup = {
            user: {
              user_id: currentUser.user_id,
              username: currentUser.username || "",
              profile_picture: currentUser.profile_picture || 'https://via.placeholder.com/150'
            },
            stories: [newStoryObj],
            has_unviewed: true
          };
          updatedStoryGroups.unshift(newStoryGroup);
        }
        
        console.log("Cập nhật state với story mới:", updatedStoryGroups.length, "story groups");
        setStoryGroups(updatedStoryGroups);
        setIsLoading(false);
        setIsRefreshing(false);
        setError(null);
        
      } catch (error) {
        console.error("Lỗi khi cập nhật story mới:", error);
        await fetchStories(false);
      }
    } else {
      console.log("Không có dữ liệu story hợp lệ, tải lại từ server");
      await fetchStories(false);
    }
  }, [storyGroups, authData, fetchStories]);

  const currentProfilePicture = useMemo(() => {
    return authData?.user?.profile_picture || 'https://via.placeholder.com/150';
  }, [authData?.user?.profile_picture]);

  const handleCreateStory = () => {
    if (openStoryLibrary) {
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

  const handleCloseEditor = (newStoryData?: any) => {
    if (newStoryData) {
      handleStoryCreated(newStoryData);
    }
    setSelectedAsset(null);
  };

  useEffect(() => {
    if (selectedAsset) {
      console.log("selectedAsset đã thay đổi, mở StoryEditorScreen:", selectedAsset);
    }
  }, [selectedAsset]);

  const handleOpenCamera = async () => {
    try {
      const photo = await StoryService.takePhoto();
      if (photo) {
        setShowLibrary(false);
        
        setTimeout(() => {
          setSelectedAsset(photo);
        }, 300);
      }
    } catch (error) {
      console.error("Lỗi khi chụp ảnh:", error);
      Alert.alert("Lỗi", "Không thể mở camera");
    }
  };

  const handleChooseFromLibrary = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.All,
        allowsEditing: true,
        quality: 1,
      });

      if (!result.canceled) {
        setShowLibrary(false);
        
        setTimeout(() => {
          setSelectedAsset(result.assets[0]);
        }, 300);
      }
    } catch (error) {
      console.error("Lỗi khi chọn ảnh từ thư viện:", error);
      Alert.alert("Lỗi", "Không thể mở thư viện ảnh");
    }
  };
  
  const handleOpenLibrary = () => {
    setShowLibrary(false);
    setIsLibraryOpen(true);
  };

  const handleCloseLibrary2 = () => {
    setIsLibraryOpen(false);
  };

  const handleSelectAssetFromLibrary = (asset: ImagePickerAsset) => {
    setSelectedAsset(asset);
    setIsLibraryOpen(false);
  };

  useEffect(() => {
    setRefreshStoriesCallback(fetchStories);
    
    return () => {
      setRefreshStoriesCallback(() => {});
    };
  }, [fetchStories]);

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
            onClose={handleCloseEditor}
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