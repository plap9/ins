// app/feed/listmessage.tsx
import { SafeAreaView, View, Text, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import React from "react";

export default function ListMessageScreen() {
  const router = useRouter();

  return (
    <SafeAreaView>
      <View>
        <Text>Danh sách tin nhắn</Text>

        {/* Ví dụ 1 item trong list */}
        <TouchableOpacity onPress={() => router.push("/feed/message")}>
          <Text>Nhấn để mở tin nhắn chi tiết</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
