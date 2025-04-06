import React, { createContext, useState, useContext, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import apiClient from "~/services/apiClient";

type User = {
  user_id: number;
  username: string;
  profile_picture?: string | null;
  full_name?: string | null;
  email?: string;
  phone_number?: string;
};

type AuthData = {
  token: string;
  refreshToken: string;
  user: User;
};

type AuthContextData = {
  authData: AuthData | null;
  isLoading: boolean;
  signIn: (data: any) => Promise<void>;
  signOut: () => Promise<void>;
  getToken: () => Promise<string | null>;
  updateUserData: (userData: Partial<User>) => Promise<void>;
};

const AuthContext = createContext<AuthContextData>({} as AuthContextData);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [authData, setAuthData] = useState<AuthData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadStorageData();
  }, []);

  async function loadStorageData(): Promise<void> {
    try {
      const authDataSerialized = await AsyncStorage.getItem("@AuthData");
      if (authDataSerialized) {
        const data = JSON.parse(authDataSerialized) as AuthData;
        setAuthData(data);
        if (
          data &&
          data.user &&
          typeof data.user.user_id === "number" &&
          data.token &&
          data.refreshToken
        ) {
          setAuthData(data as AuthData);
          apiClient.defaults.headers.common["Authorization"] =
            `Bearer ${data.token}`;
        } else {
          console.error(
            "[AuthContext] Parsed data structure INVALID. Clearing storage and state.",
            data
          );
          await AsyncStorage.removeItem("@AuthData");
          setAuthData(null);
          delete apiClient.defaults.headers.common["Authorization"];
        }
      } else {
        setAuthData(null);
      }
    } catch (error) {
      console.error(
        "[AuthContext] Error loading/parsing data from AsyncStorage:",
        error
      );
      setAuthData(null);
      delete apiClient.defaults.headers.common["Authorization"];
    } finally {
      setIsLoading(false);
    }
  }

  const signIn = async (apiLoginResponseData: any) => {
    try {
      const receivedToken = apiLoginResponseData?.token;
      const receivedRefreshToken = apiLoginResponseData?.refreshToken;
      const receivedUser = apiLoginResponseData?.user;
      if (
        !receivedToken ||
        !receivedRefreshToken ||
        !receivedUser ||
        typeof receivedUser.user_id !== "number"
      ) {
        console.error(
          "[AuthContext signIn] Invalid data structure received from login API:",
          apiLoginResponseData
        );
        throw new Error(
          "Dữ liệu đăng nhập từ server không hợp lệ (Thiếu token/refreshToken/user/user_id)."
        );
      }
      const dataToStore: AuthData = {
        token: receivedToken,
        refreshToken: receivedRefreshToken,
        user: {
          user_id: receivedUser.user_id,
          username: receivedUser.username || "", 
          profile_picture: receivedUser.profile_picture,
          full_name: receivedUser.full_name,
          email: receivedUser.email,
          phone_number: receivedUser.phone_number,
        },
      };
      await AsyncStorage.setItem("@AuthData", JSON.stringify(dataToStore)); 
      setAuthData(dataToStore); 
      apiClient.defaults.headers.common["Authorization"] =
        `Bearer ${dataToStore.token}`;
    } catch (error) {
      console.error(
        "[AuthContext signIn] Error processing or saving auth data:",
        error
      );
      await signOut(); 
      throw error; 
    }
  };

  const signOut = async () => {
    try {
      await AsyncStorage.removeItem("@AuthData");

      setAuthData(null);

      delete apiClient.defaults.headers.common["Authorization"];
    } catch (error) {
      throw error;
    }
  };

  const getToken = async () => {
    try {
      const authDataSerialized = await AsyncStorage.getItem("@AuthData");
      if (authDataSerialized) {
        const data = JSON.parse(authDataSerialized) as AuthData;
        return data.token;
      }
      return null;
    } catch (error) {
      return null;
    }
  };

  const updateUserData = async (userData: Partial<User>) => {
    try {
      if (!authData) {
        throw new Error("Không có dữ liệu người dùng. Vui lòng đăng nhập lại.");
      }

      const updatedAuthData = { 
        ...authData,
        user: { 
          ...authData.user,
          ...userData 
        }
      };

      await AsyncStorage.setItem("@AuthData", JSON.stringify(updatedAuthData));
      
      setAuthData(updatedAuthData);
      
    } catch (error) {
      console.error("[AuthContext] Lỗi khi cập nhật dữ liệu người dùng:", error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider
      value={{ authData, isLoading, signIn, signOut, getToken, updateUserData }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth(): AuthContextData {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth phải được sử dụng trong AuthProvider");
  }

  return context;
}
export default AuthContext;
