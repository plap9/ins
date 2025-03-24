import { Stack } from "expo-router";
import "../../global.css";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { Platform } from "react-native";

export default function RootLayout() {
  // Add viewport meta tag for web platform
  if (Platform.OS === 'web') {
    // This is a workaround for adding meta tags on web
    const meta = document.createElement('meta');
    meta.name = 'viewport';
    meta.content = 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no';
    document.head.appendChild(meta);
    
    const appleMeta = document.createElement('meta');
    appleMeta.name = 'apple-mobile-web-app-capable';
    appleMeta.content = 'yes';
    document.head.appendChild(appleMeta);
  }

  return (
    <SafeAreaProvider>
      {/* Set all headers to hidden by default */}
      <Stack 
        screenOptions={{
          headerShown: false,
          animation: "slide_from_right"
        }}
      >
        {/* Explicitly set all profile routes to have no header */}
        <Stack.Screen name="profile" options={{ headerShown: false }} />
        <Stack.Screen name="profile/index" options={{ headerShown: false }} />
        <Stack.Screen name="profile/settingsscreen" options={{ headerShown: false }} />
        <Stack.Screen name="profile/settingsscreen/index" options={{ headerShown: false }} />
      </Stack>
      <StatusBar style="auto" />
    </SafeAreaProvider>
  );
}
