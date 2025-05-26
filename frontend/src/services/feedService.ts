import apiClient from './apiClient';

export interface FeedPost {
  post_id: number;
  user_id: number;
  content?: string;
  location?: string;
  post_privacy: string;
  created_at: string;
  updated_at: string;
  like_count: number;
  comment_count: number;
  username: string;
  profile_picture?: string;
  is_liked: boolean;
  media_urls: string[];
  media_types: string[];
  feed_type: 'following' | 'discover';
  engagement_score?: number;
}

export interface FeedResponse {
  success: boolean;
  posts: FeedPost[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
    feedType: string;
    isFollowingAnyone: boolean;
  };
  fromCache: boolean;
}

export type FeedType = 'following' | 'discover' | 'mixed';

// Global callback for refreshing feed
let refreshFeedCallback: (() => void) | null = null;

export const setRefreshFeedCallback = (callback: () => void) => {
  refreshFeedCallback = callback;
};

export const refreshFeed = () => {
  if (refreshFeedCallback) {
    refreshFeedCallback();
  }
};

// Get feed with new algorithm
export const getFeed = async (
  page: number = 1, 
  limit: number = 10, 
  feedType: FeedType = 'mixed',
  forceRefresh: boolean = false
): Promise<FeedResponse> => {
  try {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      type: feedType
    });

    if (forceRefresh) {
      params.append('_', Date.now().toString());
    }

    const response = await apiClient.get<FeedResponse>(`/feed?${params.toString()}`);
    return response.data;
  } catch (error) {
    console.error('[feedService] Lỗi khi lấy feed:', error);
    throw error;
  }
};

// Legacy function for backward compatibility
export const getUserPosts = async (userId: number): Promise<any> => {
  try {
    const response = await apiClient.get(`/posts?user_id=${userId}&page=1&limit=50`);
    return response.data;
  } catch (error) {
    console.error('[feedService] Lỗi trong getUserPosts:', error);
    throw error;
  }
};

// Clear feed cache
export const clearFeedCache = async (): Promise<void> => {
  try {
    await apiClient.get('/cache/clear/posts');
  } catch (error) {
    console.error('[feedService] Lỗi khi clear cache:', error);
    // Don't throw error for cache clearing
  }
}; 