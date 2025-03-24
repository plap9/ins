import { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  StatusBar,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import axios from 'axios';
import { Animated, Easing } from 'react-native';
import apiClient from '~/services/apiClient';

export default function ResendVerificationScreen() {
  const [contact, setContact] = useState('');
  const [loading, setLoading] = useState(false);

  const contactLabelPosition = useRef(new Animated.Value(0)).current;
  const contactLabelSize = useRef(new Animated.Value(1)).current;
  const [isFocusedContact, setIsFocusedContact] = useState(false);

  const handleResend = async () => {
    if (!contact) {
      Alert.alert('Lỗi', 'Vui lòng nhập email hoặc số điện thoại');
      return;
    }

    try {
      setLoading(true);
      const response = await apiClient.post<{ 
        message: string;
        verificationType: string;
      }>('/auth/resend-verification', { contact });

      Alert.alert(
        'Thành công', 
        response.data.message,
        [
          { 
            text: 'OK', 
            onPress: () => router.push({
              pathname: '/auth/verification',
              params: {
                contact: contact,
                verificationType: response.data.verificationType
              }
            })
          }
        ]
      );
    } catch (error: any) {
      const message = error.response?.data?.message || 'Gửi lại thất bại';
      Alert.alert('Lỗi', message);
    } finally {
      setLoading(false);
    }
  };

  const handleContactFocus = () => {
    setIsFocusedContact(true);
    Animated.parallel([
      Animated.timing(contactLabelPosition, {
        toValue: 1,
        duration: 200,
        easing: Easing.out(Easing.ease),
        useNativeDriver: false,
      }),
      Animated.timing(contactLabelSize, {
        toValue: 0.8,
        duration: 200,
        easing: Easing.out(Easing.ease),
        useNativeDriver: false,
      }),
    ]).start();
  };

  const handleContactBlur = () => {
    if (!contact) {
      setIsFocusedContact(false);
      Animated.parallel([
        Animated.timing(contactLabelPosition, {
          toValue: 0,
          duration: 200,
          easing: Easing.out(Easing.ease),
          useNativeDriver: false,
        }),
        Animated.timing(contactLabelSize, {
          toValue: 1,
          duration: 200,
          easing: Easing.out(Easing.ease),
          useNativeDriver: false,
        }),
      ]).start();
    }
  };

  const contactAnimatedStyle = {
    top: contactLabelPosition.interpolate({
      inputRange: [0, 1],
      outputRange: [23, 4],
    }),
    fontSize: contactLabelSize.interpolate({
      inputRange: [0.8, 1],
      outputRange: [12, 14],
    }),
    color: contactLabelPosition.interpolate({
      inputRange: [0, 1],
      outputRange: ['#8e8e8e', '#8e8e8e'],
    }),
  };

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
        <Image
          source={{ uri: "https://upload.wikimedia.org/wikipedia/commons/thumb/9/95/Instagram_logo_2022.svg/1200px-Instagram_logo_2022.svg.png" }}
          className="w-48 h-16 mb-8"
          resizeMode="contain"
        />

        <Text className="text-white text-center text-lg mb-4">
          Gửi lại mã xác thực
        </Text>

        <Text className="text-gray-400 text-center mb-8">
          Nhập email hoặc số điện thoại đã đăng ký để nhận mã mới
        </Text>

        <View className="w-full mb-6">
          <View className="rounded-[20px] border border-[#363636] px-4 pt-5 pb-2 relative">
            <Animated.View
              style={[
                contactAnimatedStyle,
                {
                  position: 'absolute',
                  left: 16,
                  zIndex: 1,
                  backgroundColor: '#132026',
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
              onChangeText={setContact}
              onFocus={handleContactFocus}
              onBlur={handleContactBlur}
              autoCapitalize="none"
              keyboardType="email-address"
              style={{ height: 40, backgroundColor: 'transparent' }}
            />
          </View>
        </View>

        <TouchableOpacity
          className={`w-full bg-[#0095f6] rounded-[40px] py-3 items-center mb-4 ${loading ? 'opacity-50' : ''}`}
          onPress={handleResend}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text className="text-white font-bold text-base">Gửi lại mã</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          className="py-2"
          onPress={() => router.push('/auth/verification')}
        >
          <Text className="text-[#0095f6] text-sm font-semibold">
            Đã có mã xác thực? Nhập ngay
          </Text>
        </TouchableOpacity>
      </View>

      <View className="pb-5 border-t border-[#262626]">
        <View className="py-4 items-center px-8">
          <TouchableOpacity
            className="w-full rounded-[40px] border border-[#0095f6] py-2.5 items-center"
            onPress={() => router.push('/auth/login')}
          >
            <Text className="text-[#0095f6] font-semibold text-base">
              Quay lại đăng nhập
            </Text>
          </TouchableOpacity>
        </View>
        
        <View className="items-center mt-4">
          <Text className="text-[#737373] text-sm">Meta</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}