import { Stack } from "expo-router";

export default function LayoutFeed() {
  return (
    <Stack>
      {/* Trang chính */}
      <Stack.Screen 
        name="index" 
        options={{ title: "discoverscreen", headerShown: false }} 
      />
      <Stack.Screen
        name="searchbarscreen"
        options={{ title: "searchbarscreen", headerShown: false }}
      />
    </Stack>
  );
}
