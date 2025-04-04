import apiClient from './apiClient';
import { Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';

export interface Story {
  story_id: number;
  user_id: number;
  username: string;
  profile_picture: string;
  media_url: string;
  caption: string;
  created_at: string;
  expires_at: string;
  view_count: number;
  is_viewed: boolean;
}

export interface StoryGroup {
  user_id: number;
  username: string;
  profile_picture: string;
  stories: Story[];
  has_unviewed: boolean;
}

export interface StoryResponse {
  success: boolean;
  stories: Story[];
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
      const response = await apiClient.get<StoryGroup[]>('/api/stories');
      return response.data;
    } catch (error) {
      console.error('Lỗi khi lấy danh sách stories:', error);
      throw error;
    }
  }

  async getStoryById(storyId: number): Promise<Story> {
    try {
      const response = await apiClient.get<Story>(`/api/stories/${storyId}`);
      return response.data;
    } catch (error) {
      console.error(`Lỗi khi lấy story ID ${storyId}:`, error);
      throw error;
    }
  }

  async createStory(formData: FormData): Promise<Story> {
    try {
      const response = await apiClient.post<Story>('/api/stories', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    } catch (error) {
      console.error('Lỗi khi tạo story:', error);
      throw error;
    }
  }

  async deleteStory(storyId: number): Promise<void> {
    try {
      await apiClient.delete(`/api/stories/${storyId}`);
    } catch (error) {
      console.error(`Lỗi khi xóa story ID ${storyId}:`, error);
      throw error;
    }
  }

  async viewStory(storyId: number): Promise<void> {
    try {
      await apiClient.post(`/api/stories/${storyId}/view`);
    } catch (error) {
      console.error(`Lỗi khi đánh dấu đã xem story ID ${storyId}:`, error);
      // Không throw lỗi để không ảnh hưởng đến trải nghiệm người dùng
    }
  }

  async replyToStory(storyId: number, message: string): Promise<void> {
    try {
      await apiClient.post(`/api/stories/${storyId}/reply`, { message });
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
        `/api/stories/${storyId}/highlight`,
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