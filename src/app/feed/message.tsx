import React, { useState } from "react";
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Avatar } from "react-native-elements";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";

export const unstable_settings = {
  headerShown: false,
};

interface Message {
  id: number;
  name: string;
  message: string;
  time: string;
}

// Dữ liệu giả, chú ý: tin nhắn của mình có name là "You"
const messagesData: Message[] = [
  { id: 1, name: "Alice", message: "Xin chào! Đây là tin nhắn đầu tiên.", time: "10:00 AM" },
  { id: 2, name: "You", message: "Chào bạn! Mình đến rồi.", time: "10:05 AM" },
  { id: 3, name: "Alice", message: "Hôm nay bạn có bận không?", time: "10:10 AM" },
  { id: 4, name: "You", message: "Không, mình rảnh. Gọi cho mình nhé.", time: "10:15 AM" },
];

export default function ChatDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>(messagesData);
  const [newMessage, setNewMessage] = useState("");

  const sendMessage = () => {
    if (!newMessage.trim()) return;
    const newMsg: Message = {
      id: messages.length + 1,
      name: "You",
      message: newMessage,
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };
    setMessages([...messages, newMsg]);
    setNewMessage("");
  };

  // Giả sử đối phương là tin nhắn không phải của "You"
  const conversationPartner =
    messages.find((msg) => msg.name !== "You")?.name || "Chat";

  return (
    <View className="flex-1 bg-white">
      {/* Custom Header */}
      <View className="flex-row items-center p-4 border-b border-gray-200">
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="black" />
        </TouchableOpacity>
        <Avatar
          rounded
          title={conversationPartner.charAt(0)}
          containerStyle={{ backgroundColor: "gray", marginLeft: 16 }}
          size="medium"
        />
        <Text className="ml-2 font-bold text-lg">{conversationPartner}</Text>
      </View>

      {/* Danh sách tin nhắn */}
      <FlatList
        data={messages}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={{ paddingVertical: 10 }}
        renderItem={({ item }) => (
          <View
            className={`flex-row items-start p-4 ${
              item.name === "You" ? "justify-end" : "justify-start"
            }`}
          >
            {item.name !== "You" && (
              <Avatar
                rounded
                title={item.name.charAt(0)}
                containerStyle={{ backgroundColor: "gray" }}
                size="small"
              />
            )}
            <View
              className={`mx-2 p-3 rounded-lg max-w-[70%] ${
                item.name === "You" ? "bg-green-100" : "bg-gray-200"
              }`}
            >
              <Text>{item.message}</Text>
              <Text className="text-xs text-gray-500 mt-1 text-right">
                {item.time}
              </Text>
            </View>
            {item.name === "You" && (
              <Avatar
                rounded
                title="You"
                containerStyle={{ backgroundColor: "blue" }}
                size="small"
              />
            )}
          </View>
        )}
      />

      {/* Phần nhập tin nhắn */}
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="p-4 border-t border-gray-200"
      >
        <View className="flex-row items-center">
          <TextInput
            value={newMessage}
            onChangeText={setNewMessage}
            placeholder="Nhập tin nhắn..."
            className="flex-1 p-3 border border-gray-300 rounded-full"
          />
          <TouchableOpacity onPress={sendMessage} className="ml-2">
            <Ionicons name="send" size={24} color="blue" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}
