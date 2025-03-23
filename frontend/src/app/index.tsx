import { Redirect } from "expo-router";
import { useAuth } from "./context/AuthContext";
import { View, ActivityIndicator } from "react-native";

export default function Index() {
  const { authData, isLoading } = useAuth();
  
  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    ); 
  }
  
  return authData ? <Redirect href="/(tabs)" /> : <Redirect href="/auth/login" />;
}