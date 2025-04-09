import apiClient from "./apiClient";

interface SearchUser {
  id: string;
  username: string;
  fullName: string;
  avatar: string;
  isVerified: boolean;
}

interface SearchHistoryItem {
  id: string;
  query: string;
  createdAt: string;
}

interface SearchResponse {
  success: boolean;
  users: SearchUser[];
  source: string;
}

interface SearchHistoryResponse {
  success: boolean;
  searchHistory: SearchHistoryItem[];
}

interface DeleteResponse {
  success: boolean;
  message: string;
}

export const searchUsers = async (query: string): Promise<SearchUser[]> => {
  try {
    const response = await apiClient.get<SearchResponse>(`/search/users`, {
      params: { query },
    });
    return response.data.users || [];
  } catch (error) {
    console.error("Lỗi khi tìm kiếm người dùng:", error);
    return [];
  }
};

export const getSearchHistory = async (): Promise<SearchHistoryItem[]> => {
  try {
    const response = await apiClient.get<SearchHistoryResponse>(`/search/history`);
    return response.data.searchHistory || [];
  } catch (error) {
    console.error("Lỗi khi lấy lịch sử tìm kiếm:", error);
    return [];
  }
};

export const deleteSearchHistoryItem = async (id: string): Promise<boolean> => {
  try {
    const response = await apiClient.delete<DeleteResponse>(`/search/history/${id}`);
    return response.data.success;
  } catch (error) {
    console.error("Lỗi khi xóa mục lịch sử tìm kiếm:", error);
    return false;
  }
};

export const clearSearchHistory = async (): Promise<boolean> => {
  try {
    const response = await apiClient.delete<DeleteResponse>(`/search/history`);
    return response.data.success;
  } catch (error) {
    console.error("Lỗi khi xóa lịch sử tìm kiếm:", error);
    return false;
  }
}; 