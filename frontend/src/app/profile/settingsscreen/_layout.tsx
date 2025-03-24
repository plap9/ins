import { Stack } from "expo-router";

export default function SettingsLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen 
        name="index" 
        options={{ 
          title: "Settings",
          headerShown: false 
        }} 
      />
      <Stack.Screen 
        name="saved" 
        options={{ 
          title: "Saved", 
          headerShown: false,
          headerBackTitle: "Back"
        }} 
      />
      <Stack.Screen 
        name="archive" 
        options={{ 
          title: "Archive", 
          headerShown: false,
          headerBackTitle: "Back"
        }} 
      />
      <Stack.Screen 
        name="activity" 
        options={{ 
          title: "Your Activity", 
          headerShown: false,
          headerBackTitle: "Back"
        }} 
      />
      <Stack.Screen 
        name="notifications" 
        options={{ 
          title: "Notifications", 
          headerShown: false,
          headerBackTitle: "Back"
        }} 
      />
      <Stack.Screen 
        name="time-management" 
        options={{ 
          title: "Time Management", 
          headerShown: false,
          headerBackTitle: "Back"
        }} 
      />
      <Stack.Screen 
        name="privacy" 
        options={{ 
          title: "Privacy", 
          headerShown: false,
          headerBackTitle: "Back"
        }} 
      />
      <Stack.Screen 
        name="close-friends" 
        options={{ 
          title: "Close Friends", 
          headerShown: false,
          headerBackTitle: "Back"
        }} 
      />
      <Stack.Screen 
        name="blocked" 
        options={{ 
          title: "Blocked Accounts", 
          headerShown: false,
          headerBackTitle: "Back"
        }} 
      />
      <Stack.Screen 
        name="hide-story" 
        options={{ 
          title: "Hide Story and Live", 
          headerShown: false,
          headerBackTitle: "Back"
        }} 
      />
      <Stack.Screen 
        name="message-replies" 
        options={{ 
          title: "Message and Story Replies", 
          headerShown: false,
          headerBackTitle: "Back"
        }} 
      />
      <Stack.Screen 
        name="tags-mentions" 
        options={{ 
          title: "Tags and Mentions", 
          headerShown: false,
          headerBackTitle: "Back"
        }} 
      />
      <Stack.Screen 
        name="comments" 
        options={{ 
          title: "Comments", 
          headerShown: false,
          headerBackTitle: "Back"
        }} 
      />
      <Stack.Screen 
        name="sharing" 
        options={{ 
          title: "Sharing", 
          headerShown: false,
          headerBackTitle: "Back"
        }} 
      />
      <Stack.Screen 
        name="restricted" 
        options={{ 
          title: "Restricted Accounts", 
          headerShown: false,
          headerBackTitle: "Back"
        }} 
      />
      <Stack.Screen 
        name="favorites" 
        options={{ 
          title: "Favorites", 
          headerShown: false,
          headerBackTitle: "Back"
        }} 
      />
      <Stack.Screen 
        name="muted" 
        options={{ 
          title: "Muted Accounts", 
          headerShown: false,
          headerBackTitle: "Back"
        }} 
      />
      <Stack.Screen 
        name="like-share-counts" 
        options={{ 
          title: "Like and Share Counts", 
          headerShown: false,
          headerBackTitle: "Back"
        }} 
      />
      <Stack.Screen 
        name="account-status" 
        options={{ 
          title: "Account Status", 
          headerShown: false,
          headerBackTitle: "Back"
        }} 
      />
    </Stack>
  );
}
