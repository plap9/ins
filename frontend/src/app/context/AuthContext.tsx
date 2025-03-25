import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import apiClient from '~/services/apiClient';

type User = {
  id: string;
  username: string;
};

type AuthData = {
  token: string;
  refreshToken: string;
  user: User;
};

type AuthContextData = {
  authData: AuthData | null;
  isLoading: boolean;
  signIn: (data: AuthData) => Promise<void>;
  signOut: () => Promise<void>;
  getToken: () => Promise<string | null>;
};

const AuthContext = createContext<AuthContextData>({} as AuthContextData);

export const AuthProvider: React.FC<{children: React.ReactNode}> = ({ children }) => {
  const [authData, setAuthData] = useState<AuthData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadStorageData();
  }, []);

  async function loadStorageData(): Promise<void> {
    try {
      const authDataSerialized = await AsyncStorage.getItem('@AuthData');
      if (authDataSerialized) {
        const data = JSON.parse(authDataSerialized) as AuthData;
        setAuthData(data);
        
        apiClient.defaults.headers.common['Authorization'] = `Bearer ${data.token}`;
      }
    } catch (error) {
      console.log('Lỗi khi tải dữ liệu xác thực từ bộ nhớ:', error);
    } finally {
      setIsLoading(false);
    }
  }

  const signIn = async (data: AuthData) => {
    try {
      console.log("Đăng nhập thành công! Token:", data.token);
      console.log("Refresh Token:", data.refreshToken);
      await AsyncStorage.setItem('@AuthData', JSON.stringify(data));
      
      setAuthData(data);
      
      apiClient.defaults.headers.common['Authorization'] = `Bearer ${data.token}`;
    } catch (error) {
      console.log('Lỗi khi lưu trữ dữ liệu xác thực:', error);
      throw error;
    }
  };

  const signOut = async () => {
    try {
      await AsyncStorage.removeItem('@AuthData');
      
      setAuthData(null);
      
      delete apiClient.defaults.headers.common['Authorization'];
    } catch (error) {
      console.log('Lỗi khi gỡ bỏ dữ liệu xác thực:', error);
      throw error;
    }
  };

  const getToken = async () => {
    try {
      const authDataSerialized = await AsyncStorage.getItem('@AuthData');
      if (authDataSerialized) {
        const data = JSON.parse(authDataSerialized) as AuthData;
        return data.token;
      }
      return null;
    } catch (error) {
      console.log('Lỗi khi lấy token:', error);
      return null;
    }
  };

  return (
    <AuthContext.Provider value={{ authData, isLoading, signIn, signOut, getToken }}>
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth(): AuthContextData {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth phải được sử dụng trong AuthProvider');
  }

  return context;
}