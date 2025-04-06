import apiClient from './apiClient';

interface Post {
  post_id: number;
  content: string;
  location?: string;
  post_privacy: string;
  created_at: string;
  updated_at: string;
  like_count: number;
  comment_count: number;
  user_id: number;
  username: string;
  profile_picture: string | null;
  media_urls: string[];
  media_types: string[];
  is_liked?: boolean;
}

let refreshFeedCallback: (() => void) | null = null;

let lastRefreshTime = 0;
const REFRESH_THROTTLE_MS = 2000;

export const setRefreshFeedCallback = (callback: () => void) => {
  refreshFeedCallback = callback;
};

export const refreshFeed = () => {
  const now = Date.now();
  
  if (now - lastRefreshTime < REFRESH_THROTTLE_MS) {
    return;
  }
  
  lastRefreshTime = now;
  
  if (refreshFeedCallback) {
    const callback = refreshFeedCallback; 
    
    try {
      const timestamp = Date.now();
      
      apiClient.get(`/cache/clear/posts?_=${timestamp}`)
        .then(() => {
          console.log('Đã xóa cache posts thành công');
          
          if (callback) callback();
        })
        .catch(err => {
          console.warn('Không thể xóa cache posts:', err);
          if (callback) callback();
        });
    } catch (error) {
      console.warn('Lỗi khi gọi API xóa cache:', error);
      if (callback) callback();
    }
  } else {
    console.warn('Hàm refresh feed chưa được đăng ký');
  }
};

export const fetchPosts = async (page: number = 1, limit: number = 10): Promise<Post[]> => {
  try {
    const response = await apiClient.get<{ message: string; posts: Post[] }>(`/posts?page=${page}&limit=${limit}`);
    return response.data.posts || [];
  } catch (error) {
    console.error('Lỗi khi lấy danh sách bài viết:', error);
    throw error;
  }
}; 