import React, { useState } from "react";
import { View, Text, TextInput, FlatList, TouchableOpacity } from "react-native";
import { Avatar } from "react-native-elements";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import {MaterialIcons, AntDesign } from '@expo/vector-icons';
interface Message {
  id: number;
  name: string;
  message: string;
  time: string;
}

const messagesData: Message[] = [
  { id: 1, name: "Lập", message: "Xin chào! Đây là tin nhắn đầu tiên.", time: "10:00 AM" },
  { id: 2, name: "Hiệp", message: "Chào bạn! Mình đến rồi.", time: "10:05 AM" },
  { id: 3, name: "Lập", message: "Hôm nay bạn có bận không?", time: "10:10 AM" },
  { id: 4, name: "Hiệp", message: "Không, mình rảnh. Gọi cho mình nhé.", time: "10:15 AM" },
];

const ListMessage = () => {
  const [search, setSearch] = useState("");
  const [messages] = useState<Message[]>(messagesData);
  const router = useRouter();

  const filteredMessages = messages.filter((msg) =>
    msg.name.toLowerCase().includes(search.toLowerCase()) ||
    msg.message.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className=" bg-white">
        {/* Header */}
        <View className="flex-row items-center justify-between px-4 py-3 border-b border-gray-300 bg-white">
        {/* Nút trở về */}
        <TouchableOpacity onPress={() => router.back()}>
          <MaterialIcons name="keyboard-arrow-left" size={24} color="black" />
        </TouchableOpacity>

        {/* Tên người dùng */}
          <Text className="text-lg font-bold">Username</Text>

        {/* Nút Create */}
        <TouchableOpacity onPress={() => router.push("/feed/creategroup")}>
          <AntDesign name="plus" size={24} color="black" />
        </TouchableOpacity>
      </View>

        {/* Thanh tìm kiếm */}
        <View className="p-4">
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Tìm kiếm"
            className="bg-gray-200 rounded-full px-4 py-3"
          />
        </View>

        {/* Danh sách tin nhắn */}
        <FlatList
          data={filteredMessages}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() => router.push("/feed/message")}
              className="flex-row items-center p-4 border-b border-gray-200"
            >
              <Avatar
                rounded
                title={item.name.charAt(0)}
                containerStyle={{ backgroundColor: "gray" }}
                size="medium"
              />
              <View className="ml-4 flex-1">
                <Text className="font-bold text-base">{item.name}</Text>
                <Text className="text-gray-600 text-sm" numberOfLines={1}>
                  {item.message}
                </Text>
              </View>
              <Text className="text-gray-500 text-xs">{item.time}</Text>
            </TouchableOpacity>
          )}
        />
      </View>
    </SafeAreaView>
  );
};

export default ListMessage;

