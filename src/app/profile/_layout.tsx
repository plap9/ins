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
      <Stack.Screen 
        name="create" 
        options={{ title: "Create New Post", headerShown: true }} 
      />
      <Stack.Screen
        name="gender"
        options={{ title: "Gender", headerShown: false }}
      />
      <Stack.Screen
        name="settingsscreen"
        options={{ title: "Settings", headerShown: false }}
      />
    </Stack>
  );
}
