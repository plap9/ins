import { Stack } from "expo-router";
import { AuthProvider } from "./context/AuthContext";
import { SafeAreaProvider } from "react-native-safe-area-context";
import "../../global.css";
import { StatusBar } from "expo-status-bar";
import { Platform } from "react-native";
import React from "react";

export default function RootLayout() {
  // Thêm meta tags cho web platform
  if (Platform.OS === 'web') {
    const addMetaTag = (name: string, content: string) => {
      const meta = document.createElement('meta');
      meta.name = name;
      meta.content = content;
      document.head.appendChild(meta);
    };

    addMetaTag('viewport', 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no');
    addMetaTag('apple-mobile-web-app-capable', 'yes');
  }

  return (
    <AuthProvider>
      <SafeAreaProvider>
        {/* Cấu hình chung cho tất cả các màn hình */}
        <Stack 
          screenOptions={{
            headerShown: false,
            animation: "slide_from_right"
          }}
        >
          {/* Các màn hình chính */}
          <Stack.Screen name="index" />
          <Stack.Screen name="auth" />
          
          {/* Các màn hình profile */}
          <Stack.Screen name="profile" />
          <Stack.Screen name="profile/index" />
          <Stack.Screen name="profile/settingsscreen" />
          <Stack.Screen name="profile/settingsscreen/index" />
        </Stack>

        <StatusBar style="auto" />
      </SafeAreaProvider>
    </AuthProvider>
  );
}