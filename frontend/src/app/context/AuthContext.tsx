import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
      }
    } catch (error) {
      console.log('Error loading auth data from storage:', error);
    } finally {
      setIsLoading(false);
    }
  }

  const signIn = async (data: AuthData) => {
    try {
      await AsyncStorage.setItem('@AuthData', JSON.stringify(data));
      setAuthData(data);
    } catch (error) {
      console.log('Error storing auth data:', error);
      throw error;
    }
  };

  const signOut = async () => {
    try {
      await AsyncStorage.removeItem('@AuthData');
      setAuthData(null);
    } catch (error) {
      console.log('Error removing auth data:', error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider value={{ authData, isLoading, signIn, signOut }}>
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