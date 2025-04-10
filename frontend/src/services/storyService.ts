import apiClient from './apiClient';
import { Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { getKeyFromS3Url } from '../utils/config';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface Media {
  media_id: number;
  story_id: number;
  media_url: string;
  media_type: string;
}

export interface Story {
  story_id: number;
  user_id: number;
  username: string;
  profile_picture: string;
  created_at: string;
  expires_at: string;
  has_text: boolean;
  sticker_data: string | null;
  filter_data: string | null;
  view_count: number;
  close_friends_only: boolean;
  is_viewed: boolean;
  media?: Media[];
  media_url?: string;
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

export interface Highlight {
  highlight_id: number;
  title: string;
  cover_image_url: string | null;
  created_at: string;
  updated_at: string;
  story_count: number;
}

export interface HighlightsResponse {
  success: boolean;
  highlights: Highlight[];
}

interface PresignedUrlResponse {
  success: boolean;
  presignedUrl?: string;
  key?: string;
  message?: string;
  metadata?: any;
  expiresIn?: number;
}

let refreshStoriesCallback: (() => void) | null = null;
let lastStoriesRefreshTime = 0;
const STORIES_REFRESH_THROTTLE_MS = 2000;

export const setRefreshStoriesCallback = (callback: () => void) => {
  refreshStoriesCallback = callback;
};

export const refreshStories = () => {
  const now = Date.now();
  
  if (now - lastStoriesRefreshTime < STORIES_REFRESH_THROTTLE_MS) {
    return;
  }
  
  lastStoriesRefreshTime = now;
  
  if (refreshStoriesCallback) {
    const callback = refreshStoriesCallback;
    
    try {
      console.log('Refreshing stories...');
      callback();
    } catch (error) {
      console.warn('Lỗi khi refresh stories:', error);
    }
  } else {
    console.warn('Hàm refresh stories chưa được đăng ký');
  }
};

class StoryService {
  private async getToken(): Promise<string | null> {
    try {
      const authData = await AsyncStorage.getItem('@AuthData');
      if (authData) {
        const parsed = JSON.parse(authData);
        return parsed.token || null;
      }
      return null;
    } catch (error) {
      console.error('Lỗi khi lấy token:', error);
      return null;
    }
  }
  
  async getPresignedUrl(key: string): Promise<string> {
    try {
      if (key.includes('amazonaws.com/')) {
        key = getKeyFromS3Url(key);
      }
      const token = await this.getToken();
      
      const headers: Record<string, string> = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const response = await apiClient.get<PresignedUrlResponse>('/stories/presigned-url', {
        params: {
          key,
          expiresIn: 3600 
        },
        headers: headers
      });
      
      if (response.data && response.data.success && response.data.presignedUrl) {
        return response.data.presignedUrl;
      } else {
        throw new Error(response.data?.message || 'Không thể lấy presigned URL');
      }
    } catch (error) {
      console.error('Lỗi khi lấy presigned URL:', error);
      throw error;
    }
  }

  async getStories(): Promise<StoryGroup[]> {
    try {
      const response = await apiClient.get<{success: boolean, storyGroups: StoryGroup[]}>('/stories', {
        params: {
          user_id: 0 
        }
      });
      
      if (response.data.success && response.data.storyGroups) {
        const storyGroups = response.data.storyGroups.map(group => {
          const updatedStories = group.stories.map(story => {
            if (story.media && story.media.length > 0) {
              return {
                ...story,
                media_url: story.media[0].media_url
              };
            }
            return story;
          });
          return {
            ...group,
            stories: updatedStories
          };
        });
        return storyGroups;
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
      const token = await this.getToken();
      const headers: Record<string, string> = {};
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      console.log("FormData trước khi gửi:", {
        headers: {
          ...headers,
          'Content-Type': 'multipart/form-data',
        },
        timeout: 300000 
      });
      
      try {
        // @ts-ignore - FormData._parts là thuộc tính không tiêu chuẩn của React Native FormData
        const parts = formData._parts;
        if (parts && Array.isArray(parts)) {
          for (let i = 0; i < parts.length; i++) {
            const [key, value] = parts[i];
            
            if (typeof value === 'object' && value !== null && 'uri' in value) {
              const { uri, type, name } = value as { uri?: string; type?: string; name?: string };
              const isVideo = type && type.includes('video');
              
              console.log(`FormData field ${key}:`, {
                uri: uri ? uri.substring(0, 100) + (uri.length > 100 ? '...' : '') : '[undefined]',
                name,
                type,
                isVideo
              });
              
              if (isVideo) {
                console.log("Đang upload video, quá trình này có thể mất nhiều thời gian...");
              }
            } else {
              console.log(`FormData field ${key}:`, value);
            }
          }
        }
      } catch (formDataError) {
        console.log("Không thể log chi tiết FormData:", formDataError);
      }
      
      const uploadTimeout = 300000; 
      
      const response = await apiClient.post<Story>('/stories', formData, {
        headers: {
          ...headers,
          'Content-Type': 'multipart/form-data',
        },
        timeout: uploadTimeout,
        // @ts-ignore - onUploadProgress có trong axios nhưng có thể không được khai báo đầy đủ trong type
        onUploadProgress: (progressEvent: { loaded: number; total?: number }) => {
          if (progressEvent.total) {
            const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            console.log(`Upload tiến độ: ${percentCompleted}%`);
          }
        }
      });
      
      return response.data;
    } catch (error: any) {
      console.error('Lỗi khi tạo story:', error);
      
      if (error.message && error.message.includes('timeout')) {
        throw new Error('Upload bị quá thời gian. File có thể quá lớn hoặc kết nối mạng không ổn định.');
      }
      
      if (error.response) {
        const errorMessage = error.response.data?.message || 'Lỗi từ server';
        const errorCode = error.response.status;
        console.error(`Server trả về lỗi [${errorCode}]:`, errorMessage);
        
        if (errorCode === 413) {
          throw new Error('File quá lớn. Vui lòng giảm kích thước video hoặc chọn file nhỏ hơn.');
        }
        
        throw new Error(errorMessage);
      }
      
      throw new Error('Lỗi kết nối mạng. Vui lòng kiểm tra kết nối và thử lại.');
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

  async getHighlightById(highlightId: number): Promise<Highlight | null> {
    try {
      const response = await apiClient.get<HighlightsResponse>(`/stories/highlight/${highlightId}`);
      if (response.data.success && response.data.highlights.length > 0) {
        return response.data.highlights[0];
      }
      return null;
    } catch (error) {
      console.error(`Lỗi khi lấy highlight ID ${highlightId}:`, error);
      return null;
    }
  }

  async getUserHighlights(userId?: number, username?: string): Promise<Highlight[]> {
    try {
      const params: Record<string, string | number> = {};
      if (userId) {
        params.user_id = userId;
      }
      if (username) {
        params.username = username;
      }

      const response = await apiClient.get<HighlightsResponse>('/stories/highlights', { params });
      if (response.data.success && response.data.highlights) {
        return response.data.highlights;
      }
      
      return [];
    } catch (error) {
      console.error('Lỗi khi lấy highlights của người dùng:', error);
      return [];
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