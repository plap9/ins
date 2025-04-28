import { Stack } from "expo-router";
import { AuthProvider } from "./context/AuthContext";
import { WebRTCProvider } from "./context/WebRTCContext";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import "../../global.css";

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style="dark" />
        <AuthProvider>
          <WebRTCProvider>
            <Stack 
              screenOptions={{
                headerShown: false,
                animation: "slide_from_right",
              }}
            />
          </WebRTCProvider>
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}