import apiClient from './apiClient';
import { Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';

export interface Story {
  story_id: number;
  user_id: number;
  username: string;
  profile_picture: string;
  media_url: string;
  created_at: string;
  expires_at: string;
  has_text: boolean;
  sticker_data: string | null;
  filter_data: string | null;
  view_count: number;
  close_friends_only: boolean;
  is_viewed: boolean;
}

export interface StoryGroup {
  user: {
    user_id: number;
    username: string;
    profile_picture: string;
  };
  stories: Story[];
  has_unviewed?: boolean;
}

export interface StoryResponse {
  success: boolean;
  storyGroups: StoryGroup[];
}

export interface StoryReplyResponse {
  success: boolean;
  message: string;
  reply: {
    story_id: number;
    content: string;
    message_id: number;
  };
}

export interface StoryHighlightResponse {
  success: boolean;
  message: string;
  data: {
    highlight_id: number;
    story_id: number;
  };
}

class StoryService {
  async getStories(): Promise<StoryGroup[]> {
    try {
      const response = await apiClient.get<{success: boolean, storyGroups: StoryGroup[]}>('/stories', {
        params: {
          user_id: 0 // Truyền user_id=0 để lấy tất cả story của người dùng đang follow
        }
      });
      
      console.log("API Response:", response.data);
      if (response.data.success && response.data.storyGroups) {
        return response.data.storyGroups;
      }
      
      return [];
    } catch (error) {
      console.error('Lỗi khi lấy danh sách stories:', error);
      throw error;
    }
  }

  async getStoryById(storyId: number): Promise<Story> {
    try {
      const response = await apiClient.get<Story>(`/stories/${storyId}`);
      return response.data;
    } catch (error) {
      console.error(`Lỗi khi lấy story ID ${storyId}:`, error);
      throw error;
    }
  }

  async createStory(formData: FormData): Promise<Story> {
    try {
      console.log("StoryService: Bắt đầu gửi request createStory");
      console.log("FormData:", formData);
      
      // Log nội dung của FormData để debug
      // @ts-ignore
      for (let [key, value] of formData._parts) {
        if (typeof value === 'object' && value.uri) {
          console.log(`FormData field ${key}:`, {
            uri: value.uri,
            name: value.name,
            type: value.type
          });
        } else {
          console.log(`FormData field ${key}:`, value);
        }
      }
      
      const response = await apiClient.post<Story>('/stories', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      console.log("StoryService: Đã nhận phản hồi từ server:", response.data);
      return response.data;
    } catch (error) {
      console.error('Lỗi khi tạo story:', error);
      throw error;
    }
  }

  async deleteStory(storyId: number): Promise<void> {
    try {
      await apiClient.delete(`/stories/${storyId}`);
    } catch (error) {
      console.error(`Lỗi khi xóa story ID ${storyId}:`, error);
      throw error;
    }
  }

  async viewStory(storyId: number): Promise<any> {
    try {
      const response = await apiClient.post(`/stories/${storyId}/view`);
      return response.data;
    } catch (error) {
      console.error(`Lỗi khi đánh dấu đã xem story ID ${storyId}:`, error);
      // Không throw lỗi để không ảnh hưởng đến trải nghiệm người dùng
      return { success: false, view_count: 0 };
    }
  }

  async replyToStory(storyId: number, message: string): Promise<void> {
    try {
      await apiClient.post(`/stories/${storyId}/reply`, { message });
    } catch (error) {
      console.error(`Lỗi khi gửi phản hồi đến story ID ${storyId}:`, error);
      throw error;
    }
  }

  async addStoryToHighlight(
    storyId: number, 
    highlightId?: number, 
    highlightTitle?: string
  ): Promise<StoryHighlightResponse['data']> {
    try {
      const response = await apiClient.post<StoryHighlightResponse>(
        `/stories/${storyId}/highlight`,
        { highlight_id: highlightId, highlight_title: highlightTitle }
      );
      return response.data.data;
    } catch (error) {
      console.error(`Lỗi khi thêm story vào highlight:`, error);
      throw error;
    }
  }

  async pickImageFromLibrary(): Promise<ImagePicker.ImagePickerAsset | null> {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (!permissionResult.granted) {
      throw new Error('Cần cấp quyền truy cập thư viện ảnh để tiếp tục');
    }
    
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      allowsEditing: true,
      quality: 0.8,
      allowsMultipleSelection: false,
    });
    
    if (result.canceled) {
      return null;
    }
    
    return result.assets[0];
  }

  async takePhoto(): Promise<ImagePicker.ImagePickerAsset | null> {
    const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
    
    if (!permissionResult.granted) {
      throw new Error('Cần cấp quyền truy cập camera để tiếp tục');
    }
    
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      allowsEditing: true,
      quality: 0.8,
    });
    
    if (result.canceled) {
      return null;
    }
    
    return result.assets[0];
  }
}

export default new StoryService();