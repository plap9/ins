import { useState, useEffect, useRef } from 'react';
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
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import axios from 'axios';
import { Animated, Easing } from 'react-native';
import apiClient from '~/services/apiClient';

export default function VerificationScreen() {
  const params = useLocalSearchParams();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const contact = params.contact as string;
  const verificationType = params.verificationType as 'email' | 'phone';

  const codeLabelPosition = useRef(new Animated.Value(0)).current;
  const codeLabelSize = useRef(new Animated.Value(1)).current;
  const [isFocusedCode, setIsFocusedCode] = useState(false);

  useEffect(() => {
    if (!contact || !verificationType) {
      Alert.alert('Lỗi', 'Thiếu thông tin xác thực', [
        { text: 'OK', onPress: () => router.push('/auth/login') }
      ]);
    }
  }, []);

  const handleVerify = async () => {
    try {
      setLoading(true);
      const response = await apiClient.post('/auth/verify', {
        contact,
        code,
        verificationType
      });

      Alert.alert(
        'Thành công',
        '🎉 Xác thực tài khoản thành công!',
        [
          { 
            text: 'OK', 
            onPress: () => router.replace('/auth/login') 
          }
        ],
        { cancelable: false }
      );
    } catch (error: any) {
      const message = error.response?.data?.message || 'Xác thực thất bại';
      Alert.alert('Lỗi', message);
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    try {
      setLoading(true);
      const response = await apiClient.post('/auth/resend-verification', { 
        contact,
        verificationType 
      });
      Alert.alert('Thành công', 'Mã xác thực đã được gửi lại');
    } catch (error: any) {
      const message = error.response?.data?.message || 'Gửi lại thất bại';
      Alert.alert('Lỗi', message);
    } finally {
      setLoading(false);
    }
  };

  const handleCodeFocus = () => {
    setIsFocusedCode(true);
    Animated.parallel([
      Animated.timing(codeLabelPosition, {
        toValue: 1,
        duration: 200,
        easing: Easing.out(Easing.ease),
        useNativeDriver: false,
      }),
      Animated.timing(codeLabelSize, {
        toValue: 0.8,
        duration: 200,
        easing: Easing.out(Easing.ease),
        useNativeDriver: false,
      }),
    ]).start();
  };

  const handleCodeBlur = () => {
    if (!code) {
      setIsFocusedCode(false);
      Animated.parallel([
        Animated.timing(codeLabelPosition, {
          toValue: 0,
          duration: 200,
          easing: Easing.out(Easing.ease),
          useNativeDriver: false,
        }),
        Animated.timing(codeLabelSize, {
          toValue: 1,
          duration: 200,
          easing: Easing.out(Easing.ease),
          useNativeDriver: false,
        }),
      ]).start();
    }
  };

  const codeAnimatedStyle = {
    top: codeLabelPosition.interpolate({
      inputRange: [0, 1],
      outputRange: [23, 4],
    }),
    fontSize: codeLabelSize.interpolate({
      inputRange: [0.8, 1],
      outputRange: [12, 14],
    }),
    color: codeLabelPosition.interpolate({
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
      </View>

      <View className="flex-1 justify-center items-center px-8">
        <Image
          source={{ uri: "https://upload.wikimedia.org/wikipedia/commons/thumb/9/95/Instagram_logo_2022.svg/1200px-Instagram_logo_2022.svg.png" }}
          className="w-48 h-16 mb-8"
          resizeMode="contain"
        />

        <Text className="text-white text-center text-lg mb-4">
          Nhập mã xác thực 6 chữ số
        </Text>
        
        <Text className="text-gray-400 text-center mb-8">
          Đã gửi đến {verificationType === 'email' ? 'email' : 'số điện thoại'}
          <Text className="font-semibold"> {contact}</Text>
        </Text>

        <View className="w-full mb-6">
          <View className="rounded-[20px] border border-[#363636] px-4 pt-5 pb-2 relative">
            <Animated.View
              style={[
                codeAnimatedStyle,
                {
                  position: 'absolute',
                  left: 16,
                  zIndex: 1,
                  backgroundColor: '#132026',
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
              onChangeText={setCode}
              onFocus={handleCodeFocus}
              onBlur={handleCodeBlur}
              keyboardType="number-pad"
              maxLength={6}
              style={{ height: 40, backgroundColor: 'transparent' }}
            />
          </View>
        </View>

        <TouchableOpacity
          className={`w-full bg-[#0095f6] rounded-[40px] py-3 items-center mb-4 ${loading ? 'opacity-50' : ''}`}
          onPress={handleVerify}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text className="text-white font-bold text-base">Xác thực</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          className="py-2"
          onPress={handleResendCode}
          disabled={loading}
        >
          <Text className="text-[#0095f6] text-sm font-semibold">
            Gửi lại mã
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}