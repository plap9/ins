import apiClient from './apiClient';

export interface Post {
  id: number;
  media_urls: string[];
  created_at: string;
}

export interface PostResponse {
  success: boolean;
  data: Post[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPage: number;
  };
}

export const getUserPosts = async (userId: number): Promise<PostResponse> => {
  try {
    const response = await apiClient.get<PostResponse>(`/posts?user_id=${userId}&page=1&limit=50`);
    return response.data;
  } catch (error) {
    console.error('Error in getUserPosts:', error);
    throw error;
  }
}; 