import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, Image, ActivityIndicator, Alert } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import axios from 'axios';

export default function VerificationScreen() {
  const params = useLocalSearchParams();
  const [phone, setPhone] = useState(params.phone as string || '');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!phone) {
      Alert.alert('Lỗi', 'Không tìm thấy số điện thoại', [
        { text: 'OK', onPress: () => router.push('/auth/login') }
      ]);
    }
  }, [phone]);

  const handleVerify = async () => {
    if (!phone || !otp) {
      Alert.alert('Lỗi', 'Vui lòng nhập đầy đủ thông tin');
      return;
    }

    try {
      setLoading(true);
      const response = await axios.post('/auth/verify-phone', {
        phone,
        otp
      });

      Alert.alert('Thành công', response.data.message, [
        { text: 'OK', onPress: () => router.push('/auth/login') }
      ]);
    } catch (error: any) {
      const message = error.response?.data?.message || 'Xác thực thất bại';
      Alert.alert('Lỗi', message);
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = async () => {
    if (!phone) {
      Alert.alert('Lỗi', 'Không tìm thấy số điện thoại');
      return;
    }

    try {
      setLoading(true);
      await axios.post('/auth/resend-otp', { phone });
      Alert.alert('Thành công', 'Mã OTP đã được gửi lại');
    } catch (error: any) {
      const message = error.response?.data?.message || 'Gửi lại OTP thất bại';
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
            placeholder="Số điện thoại"
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            editable={!params.phone}
          />
          
          <TextInput
            className="border border-gray-300 rounded-sm px-4 py-2 mb-3 w-full"
            placeholder="Mã OTP"
            value={otp}
            onChangeText={setOtp}
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
            onPress={handleResendOTP}
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