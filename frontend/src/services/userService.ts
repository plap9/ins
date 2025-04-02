import apiClient from './apiClient';

export interface UserProfile {
  user_id: number;
  username: string;
  full_name: string;
  bio: string;
  profile_picture: string;
  post_count: number;
  follower_count: number;
  following_count: number;
}

interface UserProfileResponse {
  success: boolean;
  user: UserProfile;
}

interface UserUpdateData {
  full_name?: string;
  bio?: string;
  profile_picture?: string;
  phone_number?: string;
  website?: string;
  gender?: string;
  date_of_birth?: string;
  is_private?: boolean;
}

interface UserSettingsData {
  notification_preferences?: object;
  privacy_settings?: object;
  language?: string;
  theme?: string;
  two_factor_auth_enabled?: boolean;
}

export const getUserProfile = async (userId: number): Promise<UserProfileResponse> => {
  try {
    console.log(`[userService] Gọi API getUserProfile với userId: ${userId}`);
    const response = await apiClient.get<UserProfileResponse>(`/user/${userId}`);
    console.log(`[userService] Kết quả API getUserProfile:`, response.data);
    return response.data;
  } catch (error) {
    console.error('[userService] Lỗi trong getUserProfile:', error);
    throw error;
  }
};

export const updateUserProfile = async (userId: number, data: UserUpdateData) => {
  try {
    const response = await apiClient.put(`/users/${userId}`, data);
    return response.data;
  } catch (error) {
    console.error('Error updating user profile:', error);
    throw error;
  }
};

export const uploadAvatar = async (userId: number, file: File) => {
  try {
    const formData = new FormData();
    formData.append('avatar', file);

    const response = await apiClient.post(`/users/${userId}/avatar`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    
    return response.data;
  } catch (error) {
    console.error('Error uploading avatar:', error);
    throw error;
  }
};

export const searchUsers = async (searchTerm: string, page = 1, limit = 20) => {
  try {
    const response = await apiClient.get('/users/search', {
      params: {
        query: searchTerm,
        page,
        limit,
      },
    });
    return response.data;
  } catch (error) {
    console.error('Error searching users:', error);
    throw error;
  }
};

export const getUserSettings = async (userId: number) => {
  try {
    const response = await apiClient.get(`/users/${userId}/settings`);
    return response.data;
  } catch (error) {
    console.error('Error fetching user settings:', error);
    throw error;
  }
};

export const updateUserSettings = async (userId: number, data: UserSettingsData) => {
  try {
    const response = await apiClient.put(`/users/${userId}/settings`, data);
    return response.data;
  } catch (error) {
    console.error('Error updating user settings:', error);
    throw error;
  }
}; 