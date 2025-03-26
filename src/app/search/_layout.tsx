import { Stack } from "expo-router";

export default function LayoutSearch() {
  return (
    <Stack>
      <Stack.Screen
        name="index"
        options={{ title: "Search", headerShown: false }}
      />
    </Stack>
  );
}
