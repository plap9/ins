import React from 'react';
import { Stack } from 'expo-router';

const ReelsLayout = () => {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
    </Stack>
  );
};

export default ReelsLayout;
