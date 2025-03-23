import { Redirect } from "expo-router";
import { useAuth } from "./context/AuthContext";

export default function Index() {
  const { authData, isLoading } = useAuth();
  
  if (isLoading) {
    return null; 
  }
  
  return authData ? <Redirect href="/(tabs)" /> : <Redirect href="/auth/login" />;
}