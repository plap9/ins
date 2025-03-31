import { Stack } from "expo-router";

export default function AuthLayout() {
  return (
    <Stack screenOptions={{ 
      headerShown: false,
      animation: 'fade' 
    }}>
      <Stack.Screen name="login" />
      <Stack.Screen name="register" />
      <Stack.Screen name="verification" />
      <Stack.Screen name="forgotPassword" />
      <Stack.Screen name="resendVerification" />
    </Stack>
  );
}