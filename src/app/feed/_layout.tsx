import { Stack } from "expo-router";

export default function LayoutFeed() {
  return (
    <Stack>
      <Stack.Screen 
        name="index" 
        options={{ title: "Profile", headerShown: false }} 
      />
      <Stack.Screen 
        name="/feed/message" 
        options={{ title: "listmessage", headerShown: false }} 
      />
       <Stack.Screen 
        name="feed/notification" 
        options={{ title: "notification", headerShown: false }} 
      />
    </Stack>
  );
}
