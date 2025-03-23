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
import axios from "axios";
import { SafeAreaView } from "react-native-safe-area-context";
import { Animated, Easing } from "react-native";

axios.defaults.baseURL = "http://192.168.1.31:5000";
axios.defaults.headers.post["Content-Type"] = "application/json";

export default function RegisterScreen() {
  const [username, setUsername] = useState("");
  const [contact, setContact] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const usernameLabelPosition = useRef(new Animated.Value(0)).current;
  const usernameLabelSize = useRef(new Animated.Value(1)).current;
  const [isFocusedUsername, setIsFocusedUsername] = useState(false);

  const contactLabelPosition = useRef(new Animated.Value(0)).current;
  const contactLabelSize = useRef(new Animated.Value(1)).current;
  const [isFocusedContact, setIsFocusedContact] = useState(false);

  const passwordLabelPosition = useRef(new Animated.Value(0)).current;
  const passwordLabelSize = useRef(new Animated.Value(1)).current;
  const [isFocusedPassword, setIsFocusedPassword] = useState(false);

  const handleRegister = async () => {
    if (!username || !contact || !password) {
      Alert.alert("Lỗi", "Vui lòng nhập đầy đủ thông tin");
      return;
    }

    try {
      setLoading(true);
      await axios.post("/auth/register", {
        username,
        contact,
        password,
      });

      const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact);
      router.push({
        pathname: "/auth/verification",
        params: {
          contact: contact,
          verificationType: isEmail ? "email" : "phone",
        },
      });
    } catch (error: any) {
      const message = error.response?.data?.message || "Đăng ký thất bại";
      Alert.alert("Lỗi", message);
    } finally {
      setLoading(false);
    }
  };

  const createAnimationHandler = (
    labelPosition: Animated.Value,
    labelSize: Animated.Value,
    setIsFocused: React.Dispatch<React.SetStateAction<boolean>>
  ) => ({
    handleFocus: () => {
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
    },
    handleBlur: (value: string) => {
      if (!value) {
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
    },
  });

  const createAnimatedStyle = (
    position: Animated.Value,
    size: Animated.Value
  ) => ({
    top: position.interpolate({
      inputRange: [0, 1],
      outputRange: [23, 4],
    }),
    fontSize: size.interpolate({
      inputRange: [0.8, 1],
      outputRange: [12, 14],
    }),
    color: position.interpolate({
      inputRange: [0, 1],
      outputRange: ["#8e8e8e", "#8e8e8e"],
    }),
  });

  const usernameHandlers = createAnimationHandler(
    usernameLabelPosition,
    usernameLabelSize,
    setIsFocusedUsername
  );
  const usernameAnimatedStyle = createAnimatedStyle(
    usernameLabelPosition,
    usernameLabelSize
  );

  const contactHandlers = createAnimationHandler(
    contactLabelPosition,
    contactLabelSize,
    setIsFocusedContact
  );
  const contactAnimatedStyle = createAnimatedStyle(
    contactLabelPosition,
    contactLabelSize
  );

  const passwordHandlers = createAnimationHandler(
    passwordLabelPosition,
    passwordLabelSize,
    setIsFocusedPassword
  );
  const passwordAnimatedStyle = createAnimatedStyle(
    passwordLabelPosition,
    passwordLabelSize
  );

  return (
    <SafeAreaView className="flex-1 bg-[#132026]">
      <StatusBar barStyle="light-content" />

      <View className="flex-row items-center px-4 py-2">
        <TouchableOpacity onPress={() => router.back()}>
          <Text className="text-white text-2xl">&larr;</Text>
        </TouchableOpacity>
        <View className="flex-1 items-center">
          <TouchableOpacity className="flex-row items-center">
            <Text className="text-white text-base">Tiếng Việt</Text>
            <Text className="text-white ml-1">▼</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View className="flex-1 justify-center items-center px-8">
        <View className="mb-12 bg-transparent">
          <Image
            source={{
              uri: "https://upload.wikimedia.org/wikipedia/commons/thumb/9/95/Instagram_logo_2022.svg/1200px-Instagram_logo_2022.svg.png",
            }}
            className="w-48 h-16"
            resizeMode="contain"
          />
        </View>

        <View className="w-full">
          <View className="mb-3 w-full rounded-[20px] px-4 pt-5 pb-2 border border-[#363636] relative">
            <Animated.View
              style={[
                usernameAnimatedStyle,
                {
                  position: "absolute",
                  left: 16,
                  zIndex: 1,
                  backgroundColor: "#132026",
                  paddingHorizontal: 4,
                },
              ]}
            >
              <Text className="text-[#8e8e8e]">Tên người dùng</Text>
            </Animated.View>
            <TextInput
              className="text-white text-base pt-1"
              placeholder=""
              placeholderTextColor="transparent"
              value={username}
              onChangeText={(text) => {
                setUsername(text);
                if (text) usernameHandlers.handleFocus();
              }}
              onFocus={usernameHandlers.handleFocus}
              onBlur={() => usernameHandlers.handleBlur(username)}
              autoCapitalize="none"
              style={{ backgroundColor: "transparent", height: 40 }}
            />
          </View>

          <View className="mb-3 w-full rounded-[20px] px-4 pt-5 pb-2 border border-[#363636] relative">
            <Animated.View
              style={[
                contactAnimatedStyle,
                {
                  position: "absolute",
                  left: 16,
                  zIndex: 1,
                  backgroundColor: "#132026",
                  paddingHorizontal: 4,
                },
              ]}
            >
              <Text className="text-[#8e8e8e]">Email hoặc số điện thoại</Text>
            </Animated.View>
            <TextInput
              className="text-white text-base pt-1"
              placeholder=""
              placeholderTextColor="transparent"
              value={contact}
              onChangeText={(text) => {
                setContact(text);
                if (text) contactHandlers.handleFocus();
              }}
              onFocus={contactHandlers.handleFocus}
              onBlur={() => contactHandlers.handleBlur(contact)}
              autoCapitalize="none"
              keyboardType="email-address"
              style={{ backgroundColor: "transparent", height: 40 }}
            />
          </View>

          <View className="mb-6 w-full rounded-[20px] px-4 pt-5 pb-2 border border-[#363636] relative">
            <Animated.View
              style={[
                passwordAnimatedStyle,
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
                if (text) passwordHandlers.handleFocus();
              }}
              onFocus={passwordHandlers.handleFocus}
              onBlur={() => passwordHandlers.handleBlur(password)}
              style={{ backgroundColor: "transparent", height: 40 }}
            />
          </View>
        </View>

        <TouchableOpacity
          className={`w-full bg-[#0095f6] rounded-[40px] py-2.5 items-center mt-3 ${loading ? "opacity-50" : ""}`}
          onPress={handleRegister}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="white" size="small" />
          ) : (
            <Text className="text-white font-bold text-base">Đăng ký</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity className="mt-8">
          <Text className="text-[#8e8e8e] text-sm font-semibold">
            Bằng cách đăng ký, bạn đồng ý với Điều khoản của chúng tôi
          </Text>
        </TouchableOpacity>
      </View>

      <View className="pb-5 border-t border-[#262626]">
        <View className="py-4 items-center px-8">
          <TouchableOpacity
            onPress={() => router.push("/auth/login")}
            className="w-full rounded-[40px] border border-[#0095f6] bg-[#132026] py-2.5 items-center"
          >
            <Text className="text-[#0095f6] font-semibold text-base">
              Đã có tài khoản? Đăng nhập
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