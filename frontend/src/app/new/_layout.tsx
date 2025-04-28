import React from 'react';
import { Stack } from 'expo-router';

const NewLayout = () => {
  return (
    <Stack>
      <Stack.Screen
        name="index"
        options={{
          title: 'Tạo mới',
          headerShown: true
        }}
      />
    </Stack>
  );
};

export default NewLayout;
