import apiClient from "./apiClient";

interface CommentPayload {
  content: string;
  parent_id?: number | null;
}

interface PaginationParams {
  page?: number;
  limit?: number;
}

export const createComment = async (
  postId: number,
  payload: CommentPayload
) => {
  if (!payload.content || payload.content.trim() === "") {
    return Promise.reject(new Error("Nội dung bình luận không được để trống"));
  }
  try {
    const response = await apiClient.post(`/posts/${postId}/comments`, payload);
    return response.data;
  } catch (error: any) {
    console.error(
      `Lỗi khi tạo bình luận cho bài viết ${postId}:`,
      error.response?.data || error
    );
    throw error;
  }
};

export const getComments = async (
  postId: number,
  params?: PaginationParams & { parent_id?: number | null }
) => {
  const requestUrl = `/posts/${postId}/comments`;
  const requestParams = {
    page: params?.page || 1,
    limit: params?.limit || 20,
    parent_id: params?.parent_id,
  };

  try {
    const response = await apiClient.get(requestUrl, { params: requestParams });
    return response.data;
  } catch (error: any) {
    console.error(
      `Lỗi khi lấy bình luận cho bài viết ${postId}:`,
      error.response?.data || error
    );
    throw error;
  }
};

export const getReplies = async (
  commentId: number,
  params?: PaginationParams
) => {
  try {
    const response = await apiClient.get(`/comments/${commentId}/replies`, {
      params: {
        page: params?.page || 1,
        limit: params?.limit || 10,
      },
    });
    return response.data;
  } catch (error: any) {
    console.error(
      `Lỗi khi lấy phản hồi cho bình luận ${commentId}:`,
      error.response?.data || error
    );
    throw error;
  }
};

export const updateComment = async (commentId: number, content: string) => {
  if (!content || content.trim() === "") {
    return Promise.reject(new Error("Nội dung bình luận không được để trống"));
  }
  try {
    const response = await apiClient.put(`/comments/${commentId}`, { content });
    return response.data;
  } catch (error: any) {
    console.error(
      `Lỗi khi cập nhật bình luận ${commentId}:`,
      error.response?.data || error
    );
    throw error;
  }
};

export const deleteComment = async (commentId: number) => {
  try {
    const response = await apiClient.delete(`/comments/${commentId}`);
    return response.data;
  } catch (error: any) {
    console.error(
      `Lỗi khi xóa bình luận ${commentId}:`,
      error.response?.data || error
    );
    throw error;
  }
};

export const likeComment = async (commentId: number) => {
  try {
    const response = await apiClient.post(`/comments/${commentId}/like`);
    return response.data;
  } catch (error: any) {
    console.error(
      `Lỗi khi thích bình luận ${commentId}:`,
      error.response?.data || error
    );
    throw error;
  }
};

export const unlikeComment = async (commentId: number) => {
  try {
    const response = await apiClient.delete(`/comments/${commentId}/like`);
    return response.data;
  } catch (error: any) {
    console.error(
      `Lỗi khi bỏ thích bình luận ${commentId}:`,
      error.response?.data || error
    );
    throw error;
  }
};

export const getCommentLikes = async (
  commentId: number,
  params?: PaginationParams
) => {
  try {
    const response = await apiClient.get(`/comments/${commentId}/likes`, {
      params: {
        page: params?.page || 1,
        limit: params?.limit || 20,
      },
    });
    return response.data;
  } catch (error: any) {
    console.error(
      `Lỗi khi lấy danh sách thích bình luận ${commentId}:`,
      error.response?.data || error
    );
    throw error;
  }
};
