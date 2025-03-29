import apiClient from './apiClient';

export const likePost = async (postId: number) => {
  try {
    const response = await apiClient.post(`/posts/${postId}/like`);
    return response.data;
  } catch (error) {
    console.error('Lỗi khi thích bài viết:', error);
    throw error;
  }
};

export const unlikePost = async (postId: number) => {
  try {
    const response = await apiClient.delete(`/posts/${postId}/like`);
    return response.data;
  } catch (error) {
    console.error('Lỗi khi bỏ thích bài viết:', error);
    throw error;
  }
};

export const getPostLikes = async (postId: number, page = 1, limit = 20) => {
  try {
    const response = await apiClient.get(`/posts/${postId}/like`, {
      params: { page, limit }
    });
    return response.data;
  } catch (error) {
    console.error('Lỗi khi lấy danh sách thích:', error);
    throw error;
  }
};