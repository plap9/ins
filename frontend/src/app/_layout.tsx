import { Stack, Redirect } from "expo-router";
import { AuthProvider, useAuth } from "~/context/AuthContext";
import { ActivityIndicator, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

function RootLayoutNav() {
  const { authData, loading } = useAuth();

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center">
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      {!authData ? (
        <Stack.Screen name="(auth)" />
      ) : (
        <Redirect href="/(tabs)" />
      )}
      
      {!authData && <Redirect href="/(auth)/login" />}
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <RootLayoutNav />
      </AuthProvider>
    </SafeAreaProvider>
  );
}