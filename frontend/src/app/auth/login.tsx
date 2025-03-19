import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Image, ActivityIndicator, Alert } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '~/context/AuthContext';
import axios from 'axios';

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
      const response = await axios.post('/api/auth/login', {
        login,
        password
      });

      const { token, refreshToken, user } = response.data;
      await signIn({ token, refreshToken, user });
      
      router.replace('/(tabs)');
    } catch (error: any) {
      const message = error.response?.data?.message || 'Đăng nhập thất bại';
      Alert.alert('Lỗi', message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="flex-1 items-center justify-center px-5">
        <Image 
          source={require('~/assets/instagram-logo.png')} 
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
          />
          
          <TextInput
            className="border border-gray-300 rounded-sm px-4 py-2 mb-3 w-full"
            placeholder="Mật khẩu"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
          
          <TouchableOpacity 
            className="bg-blue-500 rounded-sm py-3 items-center mb-3 w-full"
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text className="text-white font-semibold">Đăng nhập</Text>
            )}
          </TouchableOpacity>
          
          <TouchableOpacity className="items-center my-3">
            <Text className="text-blue-500 text-sm">Quên mật khẩu?</Text>
          </TouchableOpacity>
        </View>
        
        <View className="absolute bottom-10 w-full border-t border-gray-300 pt-5">
          <TouchableOpacity 
            className="flex-row justify-center items-center"
            onPress={() => router.push('/auth/register')}
          >
            <Text className="text-sm">Bạn chưa có tài khoản? </Text>
            <Text className="text-blue-500 font-semibold text-sm">Đăng ký</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}