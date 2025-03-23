import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, Image, ActivityIndicator, Alert } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import axios from 'axios';

export default function VerificationScreen() {
  const params = useLocalSearchParams();
  const [contact, setContact] = useState(params.contact as string || '');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const verificationType = params.verificationType as 'email' | 'phone';

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
      const endpoint = verificationType === 'email' 
        ? '/auth/verify-email' 
        : '/auth/verify-phone';

      const response = await axios.post(endpoint, {
        [verificationType]: contact,
        code
      });

      router.replace('/auth/login');
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
      const endpoint = verificationType === 'email' 
        ? '/auth/resend-email' 
        : '/auth/resend-otp';

      await axios.post(endpoint, { [verificationType]: contact });
      Alert.alert('Thành công', 'Mã xác thực đã được gửi lại');
    } catch (error: any) {
      const message = error.response?.data?.message || 'Gửi lại thất bại';
      Alert.alert('Lỗi', message);
    } finally {
      setLoading(false);
    }
  };


  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="flex-1 items-center justify-center px-5">
        <Image 
          source={require('../../../assets/instagram-logo.png')} 
          className="w-48 h-16 mb-10" 
          resizeMode="contain"
        />
        
        <Text className="text-lg text-center text-gray-500 mb-5">
          Xác thực tài khoản của bạn
        </Text>
        
        <View className="w-full">
          <TextInput
            className="border border-gray-300 rounded-sm px-4 py-2 mb-3 w-full"
            placeholder={verificationType === 'email' ? 'Email' : 'Số điện thoại'}
            value={contact}
            keyboardType="phone-pad"
            editable={!params.phone}
          />
          
          <TextInput
            className="border border-gray-300 rounded-sm px-4 py-2 mb-3 w-full"
            placeholder={verificationType === 'email' ? 'Mã xác thực email' : 'Mã OTP'}
            value={code}
            onChangeText={setCode}
            keyboardType="number-pad"
          />
          
          <TouchableOpacity 
            className="bg-blue-500 rounded-sm py-3 items-center mb-3 w-full"
            onPress={handleVerify}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text className="text-white font-semibold">Xác thực</Text>
            )}
          </TouchableOpacity>
          
          <TouchableOpacity 
            className="items-center my-3"
            onPress={handleResendCode}
            disabled={loading}
          >
            <Text className="text-blue-500 text-sm">Gửi lại mã OTP</Text>
          </TouchableOpacity>
        </View>
        
        <View className="absolute bottom-10 w-full border-t border-gray-300 pt-5">
          <TouchableOpacity 
            className="flex-row justify-center items-center"
            onPress={() => router.push('/auth/login')}
          >
            <Text className="text-sm">Quay lại </Text>
            <Text className="text-blue-500 font-semibold text-sm">Đăng nhập</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}