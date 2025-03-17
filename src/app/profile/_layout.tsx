import { Stack } from "expo-router";

export default function LayoutProfile() {
  return (
    <Stack>
      <Stack.Screen 
        name="index" 
        options={{ title: "Profile", headerShown: false }} 
      />
      <Stack.Screen 
        name="update" 
        options={{ title: "Update Profile", headerShown: false }} 
      />
    </Stack>
  );
}
