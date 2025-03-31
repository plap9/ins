import React, { useState } from "react";
import { View, Text, TextInput, FlatList, TouchableOpacity } from "react-native";
import { Avatar } from "react-native-elements";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { MaterialIcons, AntDesign, Entypo } from "@expo/vector-icons";

interface User {
  id: number;
  name: string;
  isOnline: boolean;
}

const usersData: User[] = [
  { id: 1, name: "Lập", isOnline: true },
  { id: 2, name: "Thắng", isOnline: false },
  { id: 3, name: "Hiệp", isOnline: true },
  { id: 4, name: "Nam", isOnline: false },
  { id: 5, name: "Phucs", isOnline: true },
];

const NewMessage = () => {
  const [search, setSearch] = useState("");
  const [groupName, setGroupName] = useState("");
  const [selectedUsers, setSelectedUsers] = useState<number[]>([]);
  const router = useRouter();

  const toggleSelectUser = (id: number) => {
    setSelectedUsers((prev) =>
      prev.includes(id) ? prev.filter((userId) => userId !== id) : [...prev, id]
    );
  };

  const filteredUsers = usersData.filter((user) =>
    user.name.toLowerCase().includes(search.toLowerCase())
  );

  const showCreateGroupButton = selectedUsers.length >= 2;

  return (
    <SafeAreaView className="flex-1 bg-white">
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 py-3 border-b border-gray-300 bg-white">
        <TouchableOpacity onPress={() => router.back()}>
          <MaterialIcons name="keyboard-arrow-left" size={24} color="black" />
        </TouchableOpacity>
        <Text className="text-lg font-bold">New Group</Text>
        <View style={{ width: 24 }} /> {/* Để căn giữa title */}
      </View>

      {/* Thanh nhập tên nhóm */}
      <View className="p-4">
        <TextInput
          value={groupName}
          onChangeText={setGroupName}
          placeholder="Tên nhóm (không bắt buộc)"
          className="bg-gray-200 rounded-full px-4 py-3"
        />
      </View>

      {/* Thanh tìm kiếm */}
      <View className="p-4">
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search"
          className="bg-gray-200 rounded-full px-4 py-3"
        />
      </View>

      {/* Danh sách bạn bè */}
      <FlatList
        data={filteredUsers}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => {
          const isSelected = selectedUsers.includes(item.id);
          return (
            <TouchableOpacity
              onPress={() => toggleSelectUser(item.id)}
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
                <Text className={item.isOnline ? "text-green-500" : "text-gray-500"}>
                  {item.isOnline ? "Online" : "Offline"}
                </Text>
              </View>
              {isSelected ? (
                <AntDesign name="checkcircle" size={20} color="blue" />
              ) : (
                <Entypo name="circle" size={20} color="black" />
              )}
            </TouchableOpacity>
          );
        }}
      />

      {/* Nút tạo nhóm - chỉ hiển thị khi chọn từ 2 người trở lên */}
      {showCreateGroupButton && (
        <View className="p-4">
          <TouchableOpacity
            className="bg-blue-500 p-4 rounded-full items-center"
            onPress={() => alert("Create Group Successfully")}
          >
            <Text className="text-white font-bold">Create Group</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
};

export default NewMessage;
