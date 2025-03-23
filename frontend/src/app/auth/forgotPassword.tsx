import React, { useState, useRef } from "react";
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

axios.defaults.baseURL = 'http://192.168.1.31:5000';
axios.defaults.headers.post['Content-Type'] = 'application/json';

export default function ForgotPasswordScreen() {
  const [contact, setContact] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1); 
  const [isEmail, setIsEmail] = useState(true);

  const contactLabelPosition = useRef(new Animated.Value(0)).current;
  const contactLabelSize = useRef(new Animated.Value(1)).current;
  const codeLabelPosition = useRef(new Animated.Value(0)).current;
  const codeLabelSize = useRef(new Animated.Value(1)).current;
  const passwordLabelPosition = useRef(new Animated.Value(0)).current;
  const passwordLabelSize = useRef(new Animated.Value(1)).current;

  const [isFocusedContact, setIsFocusedContact] = useState(false);
  const [isFocusedCode, setIsFocusedCode] = useState(false);
  const [isFocusedPassword, setIsFocusedPassword] = useState(false);

  const handleRequestCode = async () => {
    if (!contact) {
      Alert.alert("Lỗi", `Vui lòng nhập ${isEmail ? 'email' : 'số điện thoại'}`);
      return;
    }

    try {
      setLoading(true);
      
      const response = await axios.post<{ message: string }>("/auth/forgot-password", { contact: contact});
      
      Alert.alert("Thành công", response.data.message);
      setStep(2);
    } catch (error: any) {
      const message = error.response?.data?.message || 'Yêu cầu thất bại';
      Alert.alert("Lỗi", message);
    } finally {
      setLoading(false);
    }
  };

  const validatePassword = (password: string) => {
    const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    return regex.test(password);
  };

  const handleResetPassword = async () => {
    if (!code || !newPassword) {
      Alert.alert("Lỗi", "Vui lòng nhập đầy đủ thông tin");
      return;
    }
    if (!validatePassword(newPassword)) {
      Alert.alert(
        "Lỗi", 
        "Mật khẩu cần có:\n- Tối thiểu 8 ký tự\n- Ít nhất 1 chữ hoa\n- 1 chữ thường\n- 1 số\n- 1 ký tự đặc biệt (@$!%*?&)"
      );
      return;
    }
    try {
      setLoading(true);
      const response = await axios.post<{ message: string}>("/auth/reset-password", {
        contact,
        code,
        newPassword,
        verificationType: isEmail ? 'email' : 'phone'
      });

      Alert.alert("Thành công", response.data.message, [
        { text: "Đăng nhập", onPress: () => router.replace("/auth/login") }
      ]);
    } catch (error: any) {
      const message = error.response?.data?.message || 'Đặt lại mật khẩu thất bại';
      Alert.alert("Lỗi", message);
    } finally {
      setLoading(false);
    }
  };

  const createAnimationHandler = (labelPosition: Animated.Value, labelSize: Animated.Value, setIsFocused: any) => ({
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

  const contactHandlers = createAnimationHandler(
    contactLabelPosition,
    contactLabelSize,
    setIsFocusedContact
  );

  const codeHandlers = createAnimationHandler(
    codeLabelPosition,
    codeLabelSize,
    setIsFocusedCode
  );

  const passwordHandlers = createAnimationHandler(
    passwordLabelPosition,
    passwordLabelSize,
    setIsFocusedPassword
  );

  const createAnimatedStyle = (position: Animated.Value, size: Animated.Value) => ({
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

  const contactAnimatedStyle = createAnimatedStyle(contactLabelPosition, contactLabelSize);
  const codeAnimatedStyle = createAnimatedStyle(codeLabelPosition, codeLabelSize);
  const passwordAnimatedStyle = createAnimatedStyle(passwordLabelPosition, passwordLabelSize);

  return (
    <SafeAreaView className="flex-1 bg-[#132026]">
      <StatusBar barStyle="light-content" />

      <View className="flex-row items-center px-4 py-2">
        <TouchableOpacity onPress={() => router.back()}>
          <Text className="text-white text-2xl">&larr;</Text>
        </TouchableOpacity>
      </View>

      <View className="flex-1 justify-center items-center px-8">
        <Image
          source={{ uri: "https://upload.wikimedia.org/wikipedia/commons/thumb/9/95/Instagram_logo_2022.svg/1200px-Instagram_logo_2022.svg.png" }}
          className="w-48 h-16 mb-8"
          resizeMode="contain"
        />

        {step === 1 ? (
          <>
            <Text className="text-white text-center mb-6">
              Nhập {isEmail ? 'email' : 'số điện thoại'} để lấy lại mật khẩu
            </Text>

            <View className="w-full">
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
                  <Text className="text-[#8e8e8e]">
                    {isEmail ? 'Email' : 'Số điện thoại'}
                  </Text>
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
                  keyboardType={isEmail ? "email-address" : "phone-pad"}
                  autoCapitalize="none"
                  style={{ height: 40, backgroundColor: 'transparent' }}
                />
              </View>
            </View>

            <TouchableOpacity
              className="mb-4"
              onPress={() => setIsEmail(!isEmail)}
            >
              <Text className="text-[#0095f6] text-sm">
                Sử dụng {isEmail ? 'số điện thoại' : 'email'} thay thế
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              className={`w-full bg-[#0095f6] rounded-[40px] py-3 items-center ${loading ? 'opacity-50' : ''}`}
              onPress={handleRequestCode}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text className="text-white font-bold text-base">Gửi mã xác thực</Text>
              )}
            </TouchableOpacity>
          </>
        ) : (
          <>
            <Text className="text-white text-center mb-6">
              Nhập mã xác thực và mật khẩu mới
            </Text>

            <View className="w-full">
              <View className="mb-3 w-full rounded-[20px] px-4 pt-5 pb-2 border border-[#363636] relative">
                <Animated.View
                  style={[
                    codeAnimatedStyle,
                    {
                      position: "absolute",
                      left: 16,
                      zIndex: 1,
                      backgroundColor: "#132026",
                      paddingHorizontal: 4,
                    },
                  ]}
                >
                  <Text className="text-[#8e8e8e]">Mã xác thực</Text>
                </Animated.View>
                <TextInput
                  className="text-white text-base pt-1"
                  placeholder=""
                  placeholderTextColor="transparent"
                  value={code}
                  onChangeText={(text) => {
                    setCode(text);
                    if (text) codeHandlers.handleFocus();
                  }}
                  onFocus={codeHandlers.handleFocus}
                  onBlur={() => codeHandlers.handleBlur(code)}
                  keyboardType="number-pad"
                  autoCapitalize="none"
                  style={{ height: 40, backgroundColor: 'transparent' }}
                />
              </View>

              <View className="mb-3 w-full rounded-[20px] px-4 pt-5 pb-2 border border-[#363636] relative">
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
                  <Text className="text-[#8e8e8e]">Mật khẩu mới</Text>
                </Animated.View>
                <TextInput
                  className="text-white text-base pt-1"
                  placeholder=""
                  placeholderTextColor="transparent"
                  value={newPassword}
                  onChangeText={(text) => {
                    setNewPassword(text);
                    if (text) passwordHandlers.handleFocus();
                  }}
                  onFocus={passwordHandlers.handleFocus}
                  onBlur={() => passwordHandlers.handleBlur(newPassword)}
                  secureTextEntry
                  style={{ height: 40, backgroundColor: 'transparent' }}
                />
              </View>
            </View>

            <TouchableOpacity
              className={`w-full bg-[#0095f6] rounded-[40px] py-3 items-center mt-4 ${loading ? 'opacity-50' : ''}`}
              onPress={handleResetPassword}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text className="text-white font-bold text-base">Đặt lại mật khẩu</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              className="mt-4"
              onPress={handleRequestCode}
            >
              <Text className="text-[#0095f6] font-medium">
                Gửi lại mã xác thực
              </Text>
            </TouchableOpacity>
          </>
        )}
      </View>

      <View className="pb-5 items-center">
        <TouchableOpacity onPress={() => router.replace("/auth/login")}>
          <Text className="text-[#0095f6] font-semibold">Quay lại đăng nhập</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}