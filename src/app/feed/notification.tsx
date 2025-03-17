// app/feed/listmessage.tsx
import { SafeAreaView, View, Text, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import React from "react";

export default function ListMessageScreen() {
  const router = useRouter();

  return (
    <SafeAreaView>
      <View>
        <Text>Thông báo</Text>
      </View>
    </SafeAreaView>
  );
}
