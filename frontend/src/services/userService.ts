import apiClient from './apiClient';
import { useAuth } from '../app/context/AuthContext';

// Khai báo các interface
export interface UserProfile {
  user_id: number;
  username: string;
  email?: string;
  full_name: string;
  bio: string;
  profile_picture: string;
  phone_number?: string;
  is_private?: boolean;
  is_verified?: boolean;
  website?: string;
  gender?: string;
  date_of_birth?: string;
  created_at?: string;
  updated_at?: string;
  last_login?: string;
  status?: string;
  post_count: number;
  follower_count: number;
  following_count: number;
}

interface UserProfileResponse {
  success: boolean;
  user: UserProfile;
  source?: string;
}

interface UserUpdateResponse {
  success: boolean;
  message: string;
  user: UserProfile;
}

export interface UpdateUserRequest {
  full_name?: string;
  bio?: string;
  profile_picture?: string;
  phone_number?: string;
  website?: string;
  gender?: string;
  date_of_birth?: string;
  is_private?: boolean;
  username?: string;
  avatar_base64?: string;
}

interface UserSettingsData {
  notification_preferences?: object;
  privacy_settings?: object;
  language?: string;
  theme?: string;
  two_factor_auth_enabled?: boolean;
}

interface UserSettingsResponse {
  success: boolean;
  settings: {
    notification_preferences?: object;
    privacy_settings?: object;
    language?: string;
    theme?: string;
    two_factor_auth_enabled?: boolean;
  };
  source?: string;
}

interface UserSettingsUpdateResponse {
  success: boolean;
  message: string;
  settings: {
    notification_preferences?: object;
    privacy_settings?: object;
    language?: string;
    theme?: string;
    two_factor_auth_enabled?: boolean;
  };
}

export interface User extends UserProfile {}

// Khai báo hằng số 
export const MAX_AVATAR_SIZE_MB = 5;

// Khởi tạo biến global để lưu trữ hàm cập nhật authData
let _updateAuthUserData: ((userData: any) => Promise<void>) | null = null;

// Hàm để đăng ký hàm cập nhật từ AuthContext
export const registerAuthUpdateFunction = (updateFn: (userData: any) => Promise<void>) => {
  _updateAuthUserData = updateFn;
  console.log("[userService] Đã đăng ký hàm cập nhật AuthContext");
};

export const getUserProfile = async (userId: number): Promise<UserProfileResponse> => {
  try {
    console.log(`[userService] Gọi API getUserProfile với userId: ${userId}`);
    const response = await apiClient.get<UserProfileResponse>(`/users/${userId}`);
    console.log(`[userService] Kết quả API getUserProfile:`, response.data);
    return response.data;
  } catch (error) {
    console.error('[userService] Lỗi trong getUserProfile:', error);
    throw error;
  }
};

export const updateUserProfile = async (userId: number, data: UpdateUserRequest): Promise<UserUpdateResponse> => {
  try {
    console.log(`[userService] Gọi API updateUserProfile với userId: ${userId}`);
    
    // Nếu có avatar_base64, kiểm tra kích thước
    if (data.avatar_base64) {
      // Ước tính kích thước (1 ký tự base64 ~ 0.75 byte)
      const estimatedSizeInBytes = Math.ceil(data.avatar_base64.length * 0.75);
      const estimatedSizeInMB = estimatedSizeInBytes / (1024 * 1024);
      
      console.log(`[userService] Kích thước ảnh base64: ~${estimatedSizeInMB.toFixed(2)}MB`);
      
      if (estimatedSizeInMB > MAX_AVATAR_SIZE_MB) {
        throw new Error(`Kích thước avatar không được vượt quá ${MAX_AVATAR_SIZE_MB}MB`);
      }
    }
    
    const response = await apiClient.put<UserUpdateResponse>(`/users/${userId}`, data);
    console.log(`[userService] Kết quả API updateUserProfile:`, response.data);
    
    // Nếu cập nhật thành công và có hàm cập nhật AuthContext
    if (response.data.success && _updateAuthUserData) {
      try {
        // Cập nhật thông tin trong AuthContext
        await _updateAuthUserData({
          profile_picture: response.data.user.profile_picture,
          username: response.data.user.username,
          full_name: response.data.user.full_name
        });
        console.log('[userService] Đã cập nhật thông tin người dùng trong AuthContext');
      } catch (authError) {
        console.error('[userService] Lỗi khi cập nhật AuthContext:', authError);
        // Không throw lỗi để vẫn trả về kết quả API thành công
      }
    }
    
    return response.data;
  } catch (error) {
    console.error('[userService] Lỗi trong updateUserProfile:', error);
    throw error;
  }
};

export const getUser = async (userId: number): Promise<User> => {
  const response = await getUserProfile(userId);
  return response.user;
};

export const updateUser = async (userId: number, updateData: UpdateUserRequest): Promise<User> => {
  const response = await updateUserProfile(userId, updateData);
  return response.user;
};

export const getCurrentUser = async (): Promise<User> => {
  try {
    const response = await apiClient.get<{success: boolean, user: User}>('/users/me');
    return response.data.user;
  } catch (error) {
    console.error('Lỗi khi lấy thông tin người dùng hiện tại:', error);
    throw error;
  }
};

export const followUser = async (userId: number): Promise<void> => {
  try {
    await apiClient.post(`/users/${userId}/follow`);
  } catch (error) {
    console.error('Lỗi khi theo dõi người dùng:', error);
    throw error;
  }
};

export const unfollowUser = async (userId: number): Promise<void> => {
  try {
    await apiClient.delete(`/users/${userId}/follow`);
  } catch (error) {
    console.error('Lỗi khi hủy theo dõi người dùng:', error);
    throw error;
  }
};

export const getUserFollowers = async (userId: number): Promise<User[]> => {
  try {
    const response = await apiClient.get<{success: boolean, followers: User[]}>(`/users/${userId}/followers`);
    return response.data.followers;
  } catch (error) {
    console.error('Lỗi khi lấy danh sách người theo dõi:', error);
    throw error;
  }
};

export const getUserFollowing = async (userId: number): Promise<User[]> => {
  try {
    const response = await apiClient.get<{success: boolean, following: User[]}>(`/users/${userId}/following`);
    return response.data.following;
  } catch (error) {
    console.error('Lỗi khi lấy danh sách đang theo dõi:', error);
    throw error;
  }
};

export const searchUsers = async (query: string): Promise<User[]> => {
  try {
    const response = await apiClient.get<{success: boolean, users: User[]}>(`/users/search?q=${encodeURIComponent(query)}`);
    return response.data.users;
  } catch (error) {
    console.error('Lỗi khi tìm kiếm người dùng:', error);
    throw error;
  }
};

export const getUserSettings = async (userId: number): Promise<UserSettingsResponse> => {
  try {
    console.log(`[userService] Gọi API getUserSettings với userId: ${userId}`);
    const response = await apiClient.get<UserSettingsResponse>(`/users/${userId}/settings`);
    console.log(`[userService] Kết quả API getUserSettings:`, response.data);
    return response.data;
  } catch (error) {
    console.error('[userService] Lỗi trong getUserSettings:', error);
    throw error;
  }
};

export const updateUserSettings = async (userId: number, data: UserSettingsData): Promise<UserSettingsUpdateResponse> => {
  try {
    console.log(`[userService] Gọi API updateUserSettings với userId: ${userId}`);
    const response = await apiClient.put<UserSettingsUpdateResponse>(`/users/${userId}/settings`, data);
    console.log(`[userService] Kết quả API updateUserSettings:`, response.data);
    return response.data;
  } catch (error) {
    console.error('[userService] Lỗi trong updateUserSettings:', error);
    throw error;
  }
};