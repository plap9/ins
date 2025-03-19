import { Stack } from 'expo-router';
import { AuthProvider } from '~/context/AuthContext';
import { useEffect } from 'react';
import axios from 'axios';

export default function RootLayout() {
  useEffect(() => {
    axios.defaults.baseURL = 'http://localhost:5000'; 
  }, []);

  return (
    <AuthProvider>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="auth/login" options={{ headerShown: false }} />
        <Stack.Screen name="auth/register" options={{ headerShown: false }} />
        <Stack.Screen name="auth/verification" options={{ headerShown: false }} />
      </Stack>
    </AuthProvider>
  );
}