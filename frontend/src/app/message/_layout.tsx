import React from 'react';
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";

export default function MessageLayout() {
  return (
    <>
      <StatusBar style="light" />
      <Stack screenOptions={{ 
        headerShown: false,
        contentStyle: { backgroundColor: '#000' }
      }}>
        <Stack.Screen 
          name="index" 
          options={{ 
            title: "Messages", 
            animation: "slide_from_right"
          }} 
        />
        <Stack.Screen 
          name="[id]" 
          options={{ 
            title: "Conversation", 
            animation: "slide_from_right" 
          }} 
        />
        <Stack.Screen 
          name="new" 
          options={{ 
            title: "New Message", 
            animation: "slide_from_right" 
          }} 
        />
        <Stack.Screen 
          name="calls/index" 
          options={{ 
            title: "Calls", 
            animation: "slide_from_right" 
          }} 
        />
      </Stack>
    </>
  );
}

export const unstable_settings = {
  initialRouteName: "index",
  "[id]": {
    unstable_allowDynamic: true,
  },
}; 