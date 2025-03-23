import { Stack } from "expo-router";

export default function LayoutFeed() {
  return (
    <Stack>
      {/* Trang chính */}
      <Stack.Screen 
        name="index" 
        options={{ title: "Profile", headerShown: false }} 
      />

      {/* Camera */}
      <Stack.Screen 
        name="camera" 
        options={{ title: "camera", headerShown: false }} 
      />

      {/* Tin nhắn */}
      <Stack.Screen 
        name="listmessage" 
        options={{ title: "listmessage", headerShown: false }} 
      />
      <Stack.Screen
        name="message"
        options={{ title: "message", headerShown: false }}
      >
      </Stack.Screen>
      <Stack.Screen
        name="messageprofile"
        options={{ title: "messageprofile", headerShown: false }}
      >
      </Stack.Screen>
      <Stack.Screen
        name="creategroup"
        options={{ title: "new group chat", headerShown: false }}
      >
      </Stack.Screen>

      {/* Thông báo */}
      <Stack.Screen 
        name="notification" 
        options={{ title: "notification", headerShown: false }} 
      />
    </Stack>
  );
}
