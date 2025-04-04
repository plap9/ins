import React, { useEffect, useState, useCallback, useContext } from 'react';
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
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import StoryService, { StoryGroup } from '../../services/storyService';
import AuthContext from '../../app/context/AuthContext';
import StoryLibraryScreen from './StoryLibraryScreen';
import StoryEditorScreen from './StoryEditorScreen';
import * as ImagePicker from 'expo-image-picker';
import { ImagePickerAsset } from 'expo-image-picker';

const StoriesList = () => {
  const navigation = useNavigation();
  const { authData } = useContext(AuthContext);
  const [storyGroups, setStoryGroups] = useState<StoryGroup[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showLibrary, setShowLibrary] = useState(false);
  const [isLibraryOpen, setIsLibraryOpen] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<ImagePickerAsset | null>(null);

  // Hàm lấy dữ liệu stories từ API
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

  // Gọi API khi component mount và khi user quay lại tab này
  useEffect(() => {
    fetchStories();
  }, []);

  // Gọi lại API khi focus vào màn hình chứa component này
  useFocusEffect(
    useCallback(() => {
      fetchStories(false);
    }, [])
  );

  // Xử lý khi user kéo để refresh
  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchStories(false);
  };

  // Xử lý khi user muốn tạo story mới
  const handleCreateStory = () => {
    console.log("Đang mở màn hình tạo story...");
    console.log("Current showLibrary state:", showLibrary);
    
    // Thử sử dụng setTimeout để đảm bảo state được cập nhật
    setTimeout(() => {
      setShowLibrary(true);
      console.log("Đã set showLibrary thành true:", true);
    }, 100);
  };

  // Xử lý khi đóng màn hình thư viện story
  const handleCloseLibrary = () => {
    console.log("Đóng màn hình tạo story");
    setShowLibrary(false);
  };

  // Xử lý khi user muốn xem story
  const handleViewStory = (storyGroup: StoryGroup) => {
    // @ts-ignore
    navigation.navigate('StoryViewer', {
      storyId: storyGroup.stories[0].story_id,
      stories: storyGroup.stories,
      initialIndex: 0
    });
  };

  // Xử lý khi đóng màn hình chỉnh sửa
  const handleCloseEditor = () => {
    console.log("Đóng StoryEditor");
    setSelectedAsset(null);
  };

  // Xử lý khi chọn mở camera
  const handleOpenCamera = async () => {
    try {
      console.log("Mở camera từ modal");
      const photo = await StoryService.takePhoto();
      if (photo) {
        console.log("Chụp ảnh thành công:", photo);
        
        // Đóng modal story creation trước
        setShowLibrary(false);
        
        // Đợi một chút rồi mới hiển thị màn hình editor
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

  // Xử lý khi chọn ảnh từ thư viện
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
        
        // Đóng modal story creation trước
        setShowLibrary(false);
        
        // Đợi một chút rồi mới hiển thị màn hình editor
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
  
  // Xử lý khi nhấn vào thư viện ảnh
  const handleOpenLibrary = () => {
    console.log("Mở thư viện ảnh");
    setShowLibrary(false); // Đóng modal hiện tại
    setIsLibraryOpen(true); // Mở modal thư viện ảnh
  };

  // Đóng màn hình thư viện ảnh
  const handleCloseLibrary2 = () => {
    console.log("Đóng thư viện ảnh");
    setIsLibraryOpen(false);
  };

  // Hiển thị loading indicator khi đang tải dữ liệu lần đầu
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
                source={{ 
                  uri: authData?.user?.profile_picture || 'https://via.placeholder.com/150' 
                }}
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

  // Nếu không có stories, không hiển thị gì cả
  if (storyGroups.length === 0 && !isLoading && !error) {
    // Ngay cả khi không có stories từ API, vẫn hiển thị "Your Story"
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
                source={{ 
                  uri: authData?.user?.profile_picture || 'https://via.placeholder.com/150' 
                }}
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

  // Thay đổi xử lý hiển thị khi có lỗi - vẫn hiển thị Your Story
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
                source={{ 
                  uri: authData?.user?.profile_picture || 'https://via.placeholder.com/150' 
                }}
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
                source={{ 
                  uri: authData?.user?.profile_picture || 'https://via.placeholder.com/150' 
                }}
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
            key={`story-${storyGroup.user_id}`}
            className="items-center mr-4"
            onPress={() => handleViewStory(storyGroup)}
          >
            <View className={`w-20 h-20 rounded-full p-0.5 ${storyGroup.has_unviewed ? 'bg-gradient-to-tr from-yellow-500 to-pink-500' : 'border border-gray-300'}`}>
              <Image 
                source={{ uri: storyGroup.profile_picture }}
                className="w-full h-full rounded-full"
              />
            </View>
            <Text className="text-sm mt-1.5 font-normal" numberOfLines={1}>
              {storyGroup.username}
            </Text>
          </TouchableOpacity>
        ))}

        {isRefreshing && (
          <View className="h-16 justify-center items-center px-4">
            <ActivityIndicator size="small" color="#0096F6" />
          </View>
        )}
        
        {/* Button test để debug modal */}
        <TouchableOpacity
          style={{
            position: 'absolute',
            top: 0,
            right: 10,
            backgroundColor: 'red',
            padding: 5,
            borderRadius: 5,
            zIndex: 1000,
          }}
          onPress={handleCreateStory}
        >
          <Text style={{ color: 'white', fontSize: 10 }}>Test Modal</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Modal hiển thị giao diện tạo story */}
      {showLibrary && (
        <Modal
          visible={true}
          animationType="slide"
          onRequestClose={handleCloseLibrary}
          presentationStyle="fullScreen"
          statusBarTranslucent={true}
        >
          <View style={{ flex: 1, backgroundColor: 'black' }}>
            {/* Header */}
            <View style={{ 
              flexDirection: 'row', 
              justifyContent: 'space-between', 
              alignItems: 'center', 
              padding: 16,
              paddingTop: Platform.OS === 'ios' ? 50 : 30
            }}>
              <TouchableOpacity 
                onPress={handleCloseLibrary}
                style={{ padding: 4 }}
              >
                <Ionicons name="close-outline" size={30} color="white" />
              </TouchableOpacity>
              <Text style={{ color: 'white', fontSize: 18, fontWeight: '500' }}>Thêm vào tin</Text>
              <TouchableOpacity style={{ padding: 4 }}>
                <Ionicons name="settings-outline" size={26} color="white" />
              </TouchableOpacity>
            </View>

            {/* Option boxes */}
            <View style={{ 
              flexDirection: 'row',
              justifyContent: 'space-between',
              paddingHorizontal: 16,
              marginTop: 20
            }}>
              {/* Nhạc option */}
              <TouchableOpacity 
                style={{ 
                  flex: 1, 
                  marginRight: 8,
                  backgroundColor: '#1C1C1C', 
                  borderRadius: 12,
                  height: 140,
                  justifyContent: 'center',
                  alignItems: 'center'
                }}
                onPress={() => {
                  console.log("Nhấn vào tùy chọn Nhạc");
                  Alert.alert("Thông báo", "Tính năng Nhạc sẽ được phát triển trong bản cập nhật tiếp theo");
                }}
              >
                <Ionicons name="musical-notes" size={36} color="white" />
                <Text style={{ color: 'white', marginTop: 10 }}>Nhạc</Text>
              </TouchableOpacity>

              {/* Mẫu option */}
              <TouchableOpacity 
                style={{ 
                  flex: 1, 
                  marginLeft: 8,
                  backgroundColor: '#1C1C1C', 
                  borderRadius: 12,
                  height: 140,
                  justifyContent: 'center',
                  alignItems: 'center',
                  position: 'relative'
                }}
                onPress={() => {
                  console.log("Nhấn vào tùy chọn Mẫu");
                  Alert.alert("Thông báo", "Tính năng Mẫu sẽ được phát triển trong bản cập nhật tiếp theo");
                }}
              >
                <View style={{
                  position: 'absolute',
                  top: 16,
                  right: 16,
                  flexDirection: 'row'
                }}>
                  <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#FF5757', marginRight: 4 }} />
                  <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#5271FF', marginRight: 4 }} />
                  <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#FF57B9' }} />
                </View>
                
                <View style={{
                  backgroundColor: 'white',
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderRadius: 20,
                  flexDirection: 'row',
                  alignItems: 'center'
                }}>
                  <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: '#FF5757', marginRight: 6 }} />
                  <Text style={{ color: 'black', fontWeight: '500' }}>Còn bạn?</Text>
                </View>
                <Text style={{ color: 'white', marginTop: 10 }}>Mẫu</Text>
              </TouchableOpacity>
            </View>

            {/* Gần đây section */}
            <View style={{ 
              marginTop: 30,
              paddingHorizontal: 16 
            }}>
              <TouchableOpacity 
                style={{ 
                  flexDirection: 'row',
                  alignItems: 'center',
                  marginBottom: 16
                }}
              >
                <Text style={{ color: 'white', fontSize: 20, fontWeight: 'bold' }}>Mới đây</Text>
                <Ionicons name="chevron-down" size={24} color="white" style={{ marginLeft: 6 }} />
              </TouchableOpacity>
              
              {/* Camera box */}
              <View style={{
                flexDirection: 'row',
                justifyContent: 'center',
                alignItems: 'center',
                height: 300,
                backgroundColor: '#1C1C1C',
                borderRadius: 12,
                marginBottom: 10
              }}>
                <TouchableOpacity 
                  onPress={() => {
                    console.log("Nhấn nút camera trong modal");
                    handleOpenCamera();
                  }}
                  style={{
                    width: 100,
                    height: 100,
                    borderRadius: 50,
                    backgroundColor: '#333',
                    justifyContent: 'center',
                    alignItems: 'center'
                  }}
                >
                  <Ionicons name="camera" size={60} color="white" />
                </TouchableOpacity>
              </View>
            </View>
            
            {/* Gallery */}
            <View style={{ flex: 1, padding: 16 }}>
              <TouchableOpacity
                onPress={() => {
                  console.log("Nhấn nút 'Chọn từ thư viện'");
                  handleChooseFromLibrary();
                }}
                style={{
                  backgroundColor: '#2C2C2C',
                  borderRadius: 10,
                  padding: 15,
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginTop: 10
                }}
              >
                <Text style={{ color: 'white', fontWeight: '600' }}>Chọn từ thư viện</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}

      {/* Modal cho StoryLibraryScreen */}
      {isLibraryOpen && (
        <Modal
          visible={true}
          animationType="slide"
          onRequestClose={handleCloseLibrary2}
          presentationStyle="fullScreen"
        >
          <StoryLibraryScreen onClose={handleCloseLibrary2} />
        </Modal>
      )}

      {/* Modal cho StoryEditorScreen */}
      {selectedAsset && (
        <Modal
          visible={true}
          animationType="slide"
          onRequestClose={handleCloseEditor}
          presentationStyle="fullScreen"
        >
          <StoryEditorScreen
            asset={selectedAsset}
            onClose={handleCloseEditor}
          />
        </Modal>
      )}
    </>
  );
};

export default StoriesList; 