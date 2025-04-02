import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { Platform } from "react-native";

const API_URL = "http://192.168.1.31:5000";

const apiClient = axios.create({
  baseURL: API_URL,
  timeout: 45000,
  withCredentials: true,
});

apiClient.interceptors.request.use((config) => {
  if (Platform.OS === "android") {
    config.url = config.url?.replace(/^\/api/, "");
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.code === "ECONNABORTED") {
      console.error("Request timeout:", error);
      return Promise.reject(new Error("Không thể kết nối đến máy chủ. Vui lòng kiểm tra kết nối mạng."));
    }
    
    if (!error.response) {
      console.error("Network error:", error);
      return Promise.reject(new Error("Lỗi kết nối mạng. Vui lòng kiểm tra kết nối và thử lại."));
    }
    
    return Promise.reject(error);
  }
);

// Log request for debugging
apiClient.interceptors.request.use((config) => {
  console.log("Request URL:", config.url);
  console.log("Request Headers:", config.headers);
  return config;
});

apiClient.interceptors.request.use(
  async (config): Promise<any> => {
    try {
      const authDataSerialized = await AsyncStorage.getItem("@AuthData");
      if (authDataSerialized) {
        const authData = JSON.parse(authDataSerialized);
        config.headers = config.headers ?? {};
        config.headers.Authorization = `Bearer ${authData.token}`;
      }
    } catch (error) {
      console.error("Error adding token to request:", error);
    }

    if (config.data instanceof FormData) {
      config.headers = {
        ...config.headers,
        "Content-Type": "multipart/form-data",
      };

      delete config.headers["Content-Type"];
    }

    return config;
  },
  (error) => {
    console.error("Axios request interceptor error:", error);
    return Promise.reject(error);
  }
);

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config as any & { _retry?: boolean };

    if (
      error.response?.status === 401 &&
      originalRequest &&
      !originalRequest._retry
    ) {
      originalRequest._retry = true;

      try {
        const authDataSerialized = await AsyncStorage.getItem("@AuthData");
        if (authDataSerialized) {
          const authData = JSON.parse(authDataSerialized);

          const response = await axios.post<{ token: string }>(
            `${API_URL}/auth/refresh-token`,
            {
              refreshToken: authData.refreshToken,
            }
          );

          if (!response.data || !response.data.token) {
            console.error("Invalid response from refresh token endpoint");
            await AsyncStorage.removeItem("@AuthData");
            return Promise.reject(new Error("Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại."));
          }

          const { token: newToken } = response.data;

          const newAuthData = { ...authData, token: newToken };
          await AsyncStorage.setItem("@AuthData", JSON.stringify(newAuthData));

          if (originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
          } else {
            originalRequest.headers = { Authorization: `Bearer ${newToken}` };
          }

          return apiClient(originalRequest);
        } else {
          console.error("Cannot refresh token: No auth data found.");
          return Promise.reject(new Error("Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại."));
        }
      } catch (refreshError) {
        console.error("Refresh token failed:", refreshError);
        await AsyncStorage.removeItem("@AuthData");
        return Promise.reject(new Error("Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại."));
      }
    }
    return Promise.reject(error);
  }
);

export default apiClient;
