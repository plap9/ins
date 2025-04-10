import { useState, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  StatusBar,
} from "react-native";
import { router } from "expo-router";
import { useAuth } from "../context/AuthContext";
import axios from "axios";
import { SafeAreaView } from "react-native-safe-area-context";
import { Animated, Easing } from "react-native";
import apiClient from "~/services/apiClient";
import { ErrorCode } from "@backend-types/errorCode"

export default function LoginScreen() {
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { signIn } = useAuth();

  const [isFocused, setIsFocused] = useState(false);
  const labelPosition = useRef(new Animated.Value(0)).current;
  const labelSize = useRef(new Animated.Value(1)).current;
  const [isFocusedUsername, setIsFocusedUsername] = useState(false);

  const [isFocusedPassword, setIsFocusedPassword] = useState(false);
  const passwordLabelPosition = useRef(new Animated.Value(0)).current;
  const passwordLabelSize = useRef(new Animated.Value(1)).current;

  const handleLogin = async () => {
    if (!login || !password) {
      Alert.alert("Lỗi", "Vui lòng nhập đầy đủ thông tin");
      return;
    }
    try {
      setLoading(true);

      const response = await apiClient.post<{
        status?: string;
        data?: {
          token: string;
          refreshToken: string;
          user: any;
        };
      }>("/auth/login", {
        login,
        password,
      });

      if (!response.data.data?.token || !response.data.data?.user) {
        throw new Error("Invalid response format");
      }

      const { token, refreshToken, user } = response.data.data;

      if (!token || !refreshToken || !user) {
        throw new Error("Missing authentication data");
      }

      await signIn({ token, refreshToken, user });

      setTimeout(() => {
        router.replace("/(tabs)");
      }, 100);
    } catch (error: any) {
      let errorMessage = "Đăng nhập thất bại";

      if (error.response) {
        errorMessage = error.response.data?.message || errorMessage;
        console.error(
          "Server error:",
          error.response.status,
          error.response.data
        );
      } else if (error.request) {
        errorMessage = "Không thể kết nối đến server";
        console.error("No response:", error.request);
      } else {
        console.error("Request error:", error.message);
      }

      Alert.alert("Lỗi", errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const animatedLabelStyle = {
    top: labelPosition.interpolate({
      inputRange: [0, 1],
      outputRange: [23, 4],
    }),
    fontSize: labelSize.interpolate({
      inputRange: [0.8, 1],
      outputRange: [12, 14],
    }),
    color: labelPosition.interpolate({
      inputRange: [0, 1],
      outputRange: ["#8e8e8e", "#8e8e8e"],
    }),
  };

  const handleFocus = () => {
    setIsFocused(true);
    Animated.parallel([
      Animated.timing(labelPosition, {
        toValue: 1,
        duration: 200,
        easing: Easing.out(Easing.ease),
        useNativeDriver: false,
      }),
      Animated.timing(labelSize, {
        toValue: 0.8,
        duration: 200,
        easing: Easing.out(Easing.ease),
        useNativeDriver: false,
      }),
    ]).start();
  };

  const handleBlur = () => {
    if (!login) {
      setIsFocused(false);
      Animated.parallel([
        Animated.timing(labelPosition, {
          toValue: 0,
          duration: 200,
          easing: Easing.out(Easing.ease),
          useNativeDriver: false,
        }),
        Animated.timing(labelSize, {
          toValue: 1,
          duration: 200,
          easing: Easing.out(Easing.ease),
          useNativeDriver: false,
        }),
      ]).start();
    }
  };

  const handlePasswordFocus = () => {
    setIsFocusedPassword(true);
    Animated.parallel([
      Animated.timing(passwordLabelPosition, {
        toValue: 1,
        duration: 200,
        easing: Easing.out(Easing.ease),
        useNativeDriver: false,
      }),
      Animated.timing(passwordLabelSize, {
        toValue: 0.8,
        duration: 200,
        easing: Easing.out(Easing.ease),
        useNativeDriver: false,
      }),
    ]).start();
  };

  const handlePasswordBlur = () => {
    if (!password) {
      setIsFocusedPassword(false);
      Animated.parallel([
        Animated.timing(passwordLabelPosition, {
          toValue: 0,
          duration: 200,
          easing: Easing.out(Easing.ease),
          useNativeDriver: false,
        }),
        Animated.timing(passwordLabelSize, {
          toValue: 1,
          duration: 200,
          easing: Easing.out(Easing.ease),
          useNativeDriver: false,
        }),
      ]).start();
    }
  };

  const passwordAnimatedLabelStyle = {
    top: passwordLabelPosition.interpolate({
      inputRange: [0, 1],
      outputRange: [23, 4],
    }),
    fontSize: passwordLabelSize.interpolate({
      inputRange: [0.8, 1],
      outputRange: [12, 14],
    }),
    color: passwordLabelPosition.interpolate({
      inputRange: [0, 1],
      outputRange: ["#8e8e8e", "#8e8e8e"],
    }),
  };

  return (
    <SafeAreaView className="flex-1 bg-[#132026]">
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <View className="flex-row items-center px-4 py-2">
        <TouchableOpacity>
          <Text className="text-white text-2xl">&larr;</Text>
        </TouchableOpacity>
        <View className="flex-1 items-center">
          <TouchableOpacity className="flex-row items-center">
            <Text className="text-white text-base">Tiếng Việt</Text>
            <Text className="text-white ml-1">▼</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Main Content */}
      <View className="flex-1 justify-center items-center px-8">
        {/* Logo Instagram */}
        <View className="mb-12 bg-transparent">
          <Image
            source={{
              uri: "https://upload.wikimedia.org/wikipedia/commons/thumb/9/95/Instagram_logo_2022.svg/1200px-Instagram_logo_2022.svg.png",
            }}
            className="w-48 h-16"
            resizeMode="contain"
          />
        </View>

        {/* Input Fields */}
        <View className="w-full">
          <View className="mb-3 w-full rounded-[20px] px-4 pt-5 pb-2 border border-[#363636] relative">
            <Animated.View
              style={[
                animatedLabelStyle,
                {
                  position: "absolute",
                  left: 16,
                  zIndex: 1,
                  backgroundColor: "#132026",
                  paddingHorizontal: 4,
                },
              ]}
            >
              <Text className="text-[#8e8e8e]">
                Tên người dùng, email/số di động
              </Text>
            </Animated.View>
            <TextInput
              className="text-white text-base pt-1"
              placeholder=""
              placeholderTextColor="transparent"
              value={login}
              onChangeText={(text) => {
                setLogin(text);
                if (text) handleFocus();
              }}
              onFocus={handleFocus}
              onBlur={handleBlur}
              autoCapitalize="none"
              style={{
                backgroundColor: "transparent",
                height: 40,
              }}
            />
          </View>

          <View className="mb-2 w-full rounded-[20px] px-4 pt-4 pb-2 border border-[#363636] relative">
            <Animated.View
              style={[
                passwordAnimatedLabelStyle,
                {
                  position: "absolute",
                  left: 16,
                  zIndex: 1,
                  backgroundColor: "#132026",
                  paddingHorizontal: 4,
                },
              ]}
            >
              <Text className="text-[#8e8e8e]">Mật khẩu</Text>
            </Animated.View>
            <TextInput
              className="text-white text-base pt-1"
              placeholder=""
              placeholderTextColor="transparent"
              secureTextEntry
              value={password}
              onChangeText={(text) => {
                setPassword(text);
                if (text) handlePasswordFocus();
              }}
              onFocus={handlePasswordFocus}
              onBlur={handlePasswordBlur}
              style={{
                backgroundColor: "transparent",
                height: 40,
              }}
            />
          </View>
        </View>

        <TouchableOpacity
          className={`w-full bg-[#0095f6] rounded-[40px] py-2.5 items-center mt-3 ${loading ? "opacity-50" : ""}`}
          onPress={handleLogin}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="white" size="small" />
          ) : (
            <Text className="text-white font-bold text-base">Đăng nhập</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity 
          onPress={() => router.push("/auth/forgotPassword")}
          className="mt-8">
          <Text className="text-[#8e8e8e] text-sm font-semibold">
            Bạn quên mật khẩu ư?
          </Text>
        </TouchableOpacity>
      </View>

      <View className="pb-5 border-t border-[#262626]">
        <View className="py-4 items-center px-8">
          <TouchableOpacity
            onPress={() => router.push("/auth/register")}
            className="w-full rounded-[40px] border border-[#0095f6] bg-[#132026] py-2.5 items-center"
          >
            <Text className="text-[#0095f6] font-semibold text-base">
              Tạo tài khoản mới
            </Text>
          </TouchableOpacity>
        </View>

        <View className="items-center mt-4">
          <Text className="text-[#737373] text-sm">Beta</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}
