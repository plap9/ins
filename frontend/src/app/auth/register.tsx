import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Image, ActivityIndicator, Alert } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import axios from 'axios';

export default function RegisterScreen() {
  const [username, setUsername] = useState('');
  const [contact, setContact] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (!username || !contact || !password) {
      Alert.alert('Lỗi', 'Vui lòng nhập đầy đủ thông tin');
      return;
    }

    try {
      setLoading(true);
      const response = await axios.post('/auth/register', {
        username,
        contact,
        password
      });

      Alert.alert('Thành công', response.data.message, [
        { 
          text: 'OK', 
          onPress: () => {
            const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact);
            if (isEmail) {
              Alert.alert('Thông báo', 'Vui lòng kiểm tra email để xác thực tài khoản');
              router.push('/auth/login');
            } else {
              router.push({
                pathname: '/auth/verification',
                params: { phone: contact }
              });
            }
          } 
        }
      ]);
    } catch (error: any) {
      const message = error.response?.data?.message || 'Đăng ký thất bại';
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
          Đăng ký tài khoản mới
        </Text>
        
        <View className="w-full">
          <TextInput
            className="border border-gray-300 rounded-sm px-4 py-2 mb-3 w-full"
            placeholder="Tên người dùng"
            value={username}
            onChangeText={setUsername}
          />
          
          <TextInput
            className="border border-gray-300 rounded-sm px-4 py-2 mb-3 w-full"
            placeholder="Email hoặc số điện thoại"
            value={contact}
            onChangeText={setContact}
            autoCapitalize="none"
            keyboardType="email-address"
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
            onPress={handleRegister}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text className="text-white font-semibold">Đăng ký</Text>
            )}
          </TouchableOpacity>
        </View>
        
        <View className="absolute bottom-10 w-full border-t border-gray-300 pt-5">
          <TouchableOpacity 
            className="flex-row justify-center items-center"
            onPress={() => router.push('/auth/login')}
          >
            <Text className="text-sm">Đã có tài khoản? </Text>
            <Text className="text-blue-500 font-semibold text-sm">Đăng nhập</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}