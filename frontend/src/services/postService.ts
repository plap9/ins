import apiClient from './apiClient';

export interface Post {
  post_id: number;
  user_id: number;
  content?: string;
  location?: string;
  post_privacy: string;
  created_at: string;
  updated_at: string;
  like_count: number;
  comment_count: number;
  username?: string;
  profile_picture?: string;
  is_liked?: boolean;
  media_urls: string[] | string;
  media_types?: string[] | string;
}

export interface PostResponse {
  success: boolean;
  data?: Post[];
  posts?: Post[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  fromCache?: boolean;
}

export const getUserPosts = async (userId: number): Promise<PostResponse> => {
  try {
    console.log(`[postService] Gọi API getUserPosts với userId: ${userId}`);
    const response = await apiClient.get<PostResponse>(`/posts?user_id=${userId}&page=1&limit=50`);
    console.log(`[postService] Kết quả API getUserPosts raw:`, JSON.stringify(response.data));
    
    if (!response.data.data && response.data.success && Array.isArray(response.data.posts)) {
      console.log(`[postService] Chuyển đổi cấu trúc dữ liệu từ posts sang data`);
      response.data.data = response.data.posts;
    }

    if (!response.data.data) {
      console.log(`[postService] Không tìm thấy danh sách bài viết, tạo mảng rỗng`);
      response.data.data = [];
    }
    
    console.log(`[postService] Xử lý media_urls cho ${response.data.data.length} bài viết`);
    response.data.data = response.data.data.map(post => {
      console.log(`[postService] Post ${post.post_id} media_urls:`, post.media_urls);
      return {
        ...post,
        media_urls: typeof post.media_urls === 'string' 
          ? post.media_urls.split('||').filter((url: string) => url) 
          : (Array.isArray(post.media_urls) ? post.media_urls : []),
        media_types: typeof post.media_types === 'string'
          ? post.media_types.split('||').filter((type: string) => type)
          : (Array.isArray(post.media_types) ? post.media_types : [])
      };
    });
    
    console.log(`[postService] Kết quả xử lý cuối cùng:`, response.data.data.length, 'bài viết');
    return response.data;
  } catch (error) {
    console.error('[postService] Lỗi trong getUserPosts:', error);
    throw error;
  }
}; 