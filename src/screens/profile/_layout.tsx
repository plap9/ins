import { Stack } from "expo-router";

export default function Layout() {
  return (
    <Stack>
      <Stack.Screen 
        name="profile" 
        options={{ title: "Profile", headerShown: false }} 
      />
      <Stack.Screen 
        name="profile/update" 
        options={{ title: "Update Profile" }} 
      />
    </Stack>
  );
}
