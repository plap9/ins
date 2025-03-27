import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios'; 

const apiClient = axios.create({
  baseURL: 'http://192.168.1.31:5000',
  
});

apiClient.interceptors.request.use(
  async (config): Promise<any> => {
    try {
      const authDataSerialized = await AsyncStorage.getItem('@AuthData');
      if (authDataSerialized) {
        const authData = JSON.parse(authDataSerialized);
        config.headers = config.headers ?? {};
        config.headers.Authorization = `Bearer ${authData.token}`;
      }
    } catch (error) {
      console.error('Error adding token to request:', error);
    }

    if (config.data instanceof FormData) {
      if (config.headers) {

           const headers = config.headers as any; 
           delete headers['Content-Type'];
       }
    }
    return config as any;
  },
  (error) => {
      console.error('Axios request interceptor error:', error);
      return Promise.reject(error);
  }
);

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config as any & { _retry?: boolean }; 

    if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const authDataSerialized = await AsyncStorage.getItem('@AuthData');
        if (authDataSerialized) {
          const authData = JSON.parse(authDataSerialized);

          const response = await axios.post<{ token: string }>('http://192.168.1.31:5000/auth/refresh-token', {
            refreshToken: authData.refreshToken
          });

          const { token: newToken } = response.data;

          const newAuthData = { ...authData, token: newToken };
          await AsyncStorage.setItem('@AuthData', JSON.stringify(newAuthData));

          if (originalRequest.headers) {
             originalRequest.headers.Authorization = `Bearer ${newToken}`;
          } else {
             originalRequest.headers = { Authorization: `Bearer ${newToken}` };
          }

          return apiClient(originalRequest);
        } else {
           console.error('Cannot refresh token: No auth data found.');
           return Promise.reject(error); 
        }
      } catch (refreshError) {
        console.error('Refresh token failed:', refreshError);
        return Promise.reject(refreshError); 
      }
    }
    return Promise.reject(error);
  }
);
  
export default apiClient;