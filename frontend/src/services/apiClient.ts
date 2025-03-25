import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

const apiClient = axios.create({
  baseURL: 'http://192.168.1.31:5000', 
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use(
  (config) => { 
    const addAuthHeader = async () => {
      try {
        const authDataSerialized = await AsyncStorage.getItem('@AuthData');
        if (authDataSerialized) {
          const authData = JSON.parse(authDataSerialized);
          config.headers = config.headers || {}; 
          config.headers.Authorization = `Bearer ${authData.token}`;
        }
      } catch (error) {
        console.error('Error adding token to request:', error);
      }
    };

    addAuthHeader(); 
    return config;
  },
  (error) => Promise.reject(error)
);

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const authDataSerialized = await AsyncStorage.getItem('@AuthData');
        if (authDataSerialized) {
          const authData = JSON.parse(authDataSerialized);

          const response = await axios.post<{ token: string}>('http://192.168.1.31:5000/auth/refresh-token', {
            refreshToken: authData.refreshToken
          });

          const { token: newToken } = response.data;

          const newAuthData = { ...authData, token: newToken };
          await AsyncStorage.setItem('@AuthData', JSON.stringify(newAuthData));

          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          return axios(originalRequest);
        }
      } catch (refreshError) {
        console.error('Refresh token failed', refreshError);
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default apiClient;