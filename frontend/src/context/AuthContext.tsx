import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

type User = {
  user_id: string;
  username: string;
  email?: string;
  phone_number?: string;
  // Thêm các trường khác nếu cần
};

type AuthData = {
  token: string;
  refreshToken: string;
  user: User;
};

type AuthContextData = {
  authData: AuthData | null;
  loading: boolean;
  signIn: (data: AuthData) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextData>({} as AuthContextData);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [authData, setAuthData] = useState<AuthData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStorageData();
    setupAxiosInterceptors();
  }, []);

  async function loadStorageData(): Promise<void> {
    try {
      const authDataSerialized = await AsyncStorage.getItem('@AuthData');
      if (authDataSerialized) {
        const data = JSON.parse(authDataSerialized) as AuthData;
        setAuthData(data);
        axios.defaults.headers.common['Authorization'] = `Bearer ${data.token}`;
      }
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  }

  function setupAxiosInterceptors(): void {
    axios.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;
        if (error.response?.status === 401 && !originalRequest._retry && authData) {
          originalRequest._retry = true;
          try {
            const response = await axios.post('/api/auth/refresh-token', {
              refreshToken: authData.refreshToken
            });
            const { token } = response.data;
            
            const newAuthData = {
              ...authData,
              token
            };
            
            await AsyncStorage.setItem('@AuthData', JSON.stringify(newAuthData));
            setAuthData(newAuthData);
            
            axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
            originalRequest.headers['Authorization'] = `Bearer ${token}`;
            
            return axios(originalRequest);
          } catch (refreshError) {
            await signOut();
            return Promise.reject(refreshError);
          }
        }
        return Promise.reject(error);
      }
    );
  }

  async function signIn(data: AuthData): Promise<void> {
    await AsyncStorage.setItem('@AuthData', JSON.stringify(data));
    
    axios.defaults.headers.common['Authorization'] = `Bearer ${data.token}`;
    
    setAuthData(data);
  }

  async function signOut(): Promise<void> {
    try {
      if (authData) {
        await axios.post('/api/auth/logout', {
          refreshToken: authData.refreshToken
        });
      }
    } catch (error) {
      console.log(error);
    } finally {
      await AsyncStorage.removeItem('@AuthData');
      delete axios.defaults.headers.common['Authorization'];
      setAuthData(null);
    }
  }

  return (
    <AuthContext.Provider value={{ authData, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth(): AuthContextData {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}