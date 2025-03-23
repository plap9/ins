import  { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Image, ActivityIndicator, Alert } from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '../context/AuthContext'
import axios from 'axios';
import { SafeAreaView } from 'react-native-safe-area-context';


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
      
      const response = await axios.post<{ 
        token?: string; 
        refreshToken?: string;
        user?: any 
      }>('/auth/login', {
        login,
        password
      });

      if (!response.data.token || !response.data.user) {
        throw new Error('Invalid response format');
      }

      const { token, refreshToken, user } = response.data;

      if (!token || !refreshToken || !user) {
        throw new Error('Missing authentication data');
      }

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
      <View className="flex-1 items-center px-5 mt-20">
        <Image 
          source={require('../../../assets/instagram-logo.png')} 
          className="w-48 h-48 mb-16" 
          resizeMode="contain"
        />
        
        <View className="w-full space-y-2">
          <TextInput
            className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 text-sm"
            placeholder="Số điện thoại, tên người dùng hoặc email"
            placeholderTextColor="#8e8e8e"
            value={login}
            onChangeText={setLogin}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
          />
          
          <TextInput
            className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 text-sm"
            placeholder="Mật khẩu"
            placeholderTextColor="#8e8e8e"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoCorrect={false}
          />
          
          <TouchableOpacity 
            className="bg-blue-500 rounded-lg py-3 items-center mt-4"
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text className="text-white font-semibold text-sm">Đăng nhập</Text>
            )}
          </TouchableOpacity>
          
          <View className="flex-row items-center justify-center space-x-2 my-6">
            <View className="flex-1 h-px bg-gray-200" />
            <Text className="text-gray-500 text-sm font-semibold">HOẶC</Text>
            <View className="flex-1 h-px bg-gray-200" />
          </View>

          <TouchableOpacity className="items-center mb-6">
            <Text className="text-blue-900 text-sm font-semibold">Đăng nhập bằng Facebook</Text>
          </TouchableOpacity>
          
          <TouchableOpacity className="items-center">
            <Text className="text-gray-500 text-xs">Quên mật khẩu?</Text>
          </TouchableOpacity>
        </View>
        
        <View className="absolute bottom-10 w-full border-t border-gray-200 pt-5">
          <TouchableOpacity 
            className="flex-row justify-center items-center"
            onPress={() => router.push('/auth/register')}
          >
            <Text className="text-sm text-gray-500">Bạn không có tài khoản? </Text>
            <Text className="text-blue-500 font-semibold text-sm">Đăng ký</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

console.log(
  'Debug classes:',
  'bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 text-sm'
);