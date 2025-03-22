import { Redirect } from "expo-router";
import { useAuth } from "~/context/AuthContext";

export default function Index() {
  const { authData } = useAuth();
  
  return <Redirect href={"/auth/login"} />;
}