import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Image, ActivityIndicator, Alert } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '~/context/AuthContext';
import axios from 'axios';

axios.defaults.baseURL = 'http://192.168.1.31:5000';
axios.defaults.headers.post['Content-Type'] = 'application/json';

export default function LoginScreen() {
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { signIn } = useAuth();

  const handleLogin = async () => {
    if (!login || !password) {
      Alert.alert('Lỗi', 'Vui lòng nhập đầy đủ thông tin');
      return;
    }

    try {
      setLoading(true);
      
      console.log('Sending login request:', { login, password });
      
      const response = await axios.post('/auth/login', {
        login,
        password
      });

      if (!response.data?.token || !response.data?.user) {
        throw new Error('Invalid response format');
      }

      const { token, refreshToken, user } = response.data;
      await signIn({ token, refreshToken, user });
      
      setTimeout(() => {
        router.replace('/(tabs)');
      }, 100);
      
    } catch (error: any) {
      let errorMessage = 'Đăng nhập thất bại';
      
      if (error.response) {
        errorMessage = error.response.data?.message || errorMessage;
        console.error('Server error:', error.response.status, error.response.data);
      } else if (error.request) {
        errorMessage = 'Không thể kết nối đến server';
        console.error('No response:', error.request);
      } else {
        console.error('Request error:', error.message);
      }
      
      Alert.alert('Lỗi', errorMessage);
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
        
        <View className="w-full">
          <TextInput
            className="border border-gray-300 rounded-sm px-4 py-2 mb-3 w-full"
            placeholder="Email hoặc số điện thoại"
            value={login}
            onChangeText={setLogin}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
          />
          
          <TextInput
            className="border border-gray-300 rounded-sm px-4 py-2 mb-3 w-full"
            placeholder="Mật khẩu"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoCorrect={false}
          />
          
          <TouchableOpacity 
            className="bg-blue-500 rounded-sm py-3 items-center mb-3 w-full"
            onPress={handleLogin}
            disabled={loading}
            accessibilityLabel="Đăng nhập"
          >
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text className="text-white font-semibold">Đăng nhập</Text>
            )}
          </TouchableOpacity>
          
          <TouchableOpacity 
            className="items-center my-3"
            onPress={() => Alert.alert('Thông báo', 'Chức năng đang phát triển')}
          >
            <Text className="text-blue-500 text-sm">Quên mật khẩu?</Text>
          </TouchableOpacity>
        </View>
        
        <View className="absolute bottom-10 w-full border-t border-gray-300 pt-5">
          <TouchableOpacity 
            className="flex-row justify-center items-center"
            onPress={() => router.push('/auth/register')}
            accessibilityLabel="Chuyển đến đăng ký"
          >
            <Text className="text-sm">Bạn chưa có tài khoản? </Text>
            <Text className="text-blue-500 font-semibold text-sm">Đăng ký</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}