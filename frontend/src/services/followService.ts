import apiClient from './apiClient';

export interface User {
  user_id: number;
  username: string;
  full_name?: string;
  profile_picture?: string;
  bio?: string;
  followers_count?: number;
  following_count?: number;
  mutual_follows_count?: number;
  is_following: boolean;
  is_self?: boolean;
}

export interface FollowResponse {
  success: boolean;
  message: string;
  following: {
    user_id: number;
    username: string;
    is_following: boolean;
  };
}

export interface FollowListResponse {
  success: boolean;
  followers?: User[];
  following?: User[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPage: number;
  };
}

export interface SuggestedUsersResponse {
  success: boolean;
  suggested_users: User[];
}

export interface FollowStatusResponse {
  success: boolean;
  is_following: boolean;
  user_id: number;
}

export interface FollowingStatusResponse {
  success: boolean;
  user_id: number;
  following_count: number;
  followers_count: number;
  is_following_anyone: boolean;
  feed_recommendation: 'mixed' | 'discover';
}

// Follow/Unfollow actions
export const followUser = async (userId: number): Promise<FollowResponse> => {
  try {
    const response = await apiClient.post<FollowResponse>(`/follow/${userId}/follow`);
    return response.data;
  } catch (error) {
    console.error('[followService] Lỗi khi follow user:', error);
    throw error;
  }
};

export const unfollowUser = async (userId: number): Promise<FollowResponse> => {
  try {
    const response = await apiClient.delete<FollowResponse>(`/follow/${userId}/follow`);
    return response.data;
  } catch (error) {
    console.error('[followService] Lỗi khi unfollow user:', error);
    throw error;
  }
};

// Get followers/following lists
export const getFollowers = async (userId: number, page: number = 1, limit: number = 20): Promise<FollowListResponse> => {
  try {
    const response = await apiClient.get<FollowListResponse>(`/follow/${userId}/followers?page=${page}&limit=${limit}`);
    return response.data;
  } catch (error) {
    console.error('[followService] Lỗi khi lấy danh sách followers:', error);
    throw error;
  }
};

export const getFollowing = async (userId: number, page: number = 1, limit: number = 20): Promise<FollowListResponse> => {
  try {
    const response = await apiClient.get<FollowListResponse>(`/follow/${userId}/following?page=${page}&limit=${limit}`);
    return response.data;
  } catch (error) {
    console.error('[followService] Lỗi khi lấy danh sách following:', error);
    throw error;
  }
};

// Check follow status
export const checkFollowStatus = async (userId: number): Promise<FollowStatusResponse> => {
  try {
    const response = await apiClient.get<FollowStatusResponse>(`/follow/${userId}/status`);
    return response.data;
  } catch (error) {
    console.error('[followService] Lỗi khi kiểm tra follow status:', error);
    throw error;
  }
};

// Get suggested users
export const getSuggestedUsers = async (limit: number = 10): Promise<SuggestedUsersResponse> => {
  try {
    const response = await apiClient.get<SuggestedUsersResponse>(`/feed/suggested-users?limit=${limit}`);
    return response.data;
  } catch (error) {
    console.error('[followService] Lỗi khi lấy suggested users:', error);
    throw error;
  }
};

// Get following status (for feed recommendations)
export const getFollowingStatus = async (): Promise<FollowingStatusResponse> => {
  try {
    const response = await apiClient.get<FollowingStatusResponse>('/feed/following-status');
    return response.data;
  } catch (error) {
    console.error('[followService] Lỗi khi lấy following status:', error);
    throw error;
  }
}; 