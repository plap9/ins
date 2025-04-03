import React, { useState } from "react";
import { View, Text, TouchableOpacity, ScrollView, Modal, Pressable, } from "react-native";
import { Avatar } from "react-native-elements";
import { SafeAreaView } from "react-native-safe-area-context";
import { FontAwesome5, Ionicons, Feather, FontAwesome, MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

import NotificationModal from "~/components/NotificationModal";
import OptionsModal from "~/components/OptionsModal";


const ProfileScreen = () => {

  const router = useRouter();

  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [showOptionsModal, setShowOptionsModal] = useState(false);

  const [messageNotification, setMessageNotification] = useState(false);
  const [callNotification, setCallNotification] = useState(false);
  const [previewNotification, setPreviewNotification] = useState(false);

  const [selectedTab, setSelectedTab] = useState<"shared" | "sent">("shared");

  

  return (
    <SafeAreaView className="flex-1 bg-white">
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 py-3 border-b border-gray-300 bg-white">
        <TouchableOpacity onPress={() => router.back()}>
          <MaterialIcons name="keyboard-arrow-left" size={24} color="black" />
        </TouchableOpacity>
        <Text className="text-lg font-bold">Chat Details</Text>
        <View className="w-6" />
      </View>

      {/* Avatar và 4 nút điều khiển */}
      <View className="items-center my-5">
        <View className="rounded-full bg-gray-300 items-center justify-center" style={{ width: 80, height: 80 }}>
          <Text className="text-gray-500 font-bold text-xl">U</Text>
        </View>
        <Text className="text-2xl font-bold mt-2">Username</Text>
        <View className="flex-row mt-5">
          <TouchableOpacity className="items-center mx-4">
            <FontAwesome name="user" size={24} color="black" />
            <Text className="text-xs mt-1">Trang cá nhân</Text>
          </TouchableOpacity>
          <TouchableOpacity className="items-center mx-4">
            <Ionicons name="search" size={24} color="black" />
            <Text className="text-xs mt-1">Tìm kiếm</Text>
          </TouchableOpacity>
          <TouchableOpacity
            className="items-center mx-4"
            onPress={() => setShowNotificationModal(true)}
          >
            <Ionicons name="notifications-off" size={24} color="black" />
            <Text className="text-xs mt-1">Tắt thông báo</Text>
          </TouchableOpacity>
          <TouchableOpacity
            className="items-center mx-4"
            onPress={() => setShowOptionsModal(true)}
          >
            <Feather name="more-horizontal" size={24} color="black" />
            <Text className="text-xs mt-1">Tùy chọn</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Phần nội dung chat: Các tác vụ chính */}
      <View className="border-t border-gray-300">
        <TouchableOpacity
          onPress={() => alert("Thay đổi biệt danh")}
          className="flex-row justify-between items-center p-4 border-b border-gray-300"
        >
          <Text className="text-base">Thay đổi biệt danh</Text>
          <MaterialIcons name="navigate-next" size={24} color="black" />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => alert("Chủ đề")}
          className="flex-row justify-between items-center p-4 border-b border-gray-300"
        >
          <Text className="text-base">Chủ đề</Text>
          <MaterialIcons name="navigate-next" size={24} color="black" />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => alert("Tin nhắn tự hủy")}
          className="flex-row justify-between items-center p-4 border-b border-gray-300"
        >
          <Text className="text-base">Tin nhắn tự hủy</Text>
          <MaterialIcons name="navigate-next" size={24} color="black" />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => alert("Tạo nhóm chat")}
          className="flex-row justify-between items-center p-4"
        >
          <Text className="text-base">Tạo nhóm chat</Text>
          <MaterialIcons name="navigate-next" size={24} color="black" />
        </TouchableOpacity>
      </View>

      {/* Pagination */}
      <View className="border-t border-gray-300 flex-row justify-around py-2 bg-gray-100">
        <TouchableOpacity onPress={() => setSelectedTab("shared")}>
          <Text
            className={`text-base ${
              selectedTab === "shared"
                ? "font-bold text-black"
                : "text-gray-500"
            }`}
          >
            Đã chia sẻ
          </Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setSelectedTab("sent")}>
          <Text
            className={`text-base ${
              selectedTab === "sent"
                ? "font-bold text-black"
                : "text-gray-500"
            }`}
          >
            Đã gửi
          </Text>
        </TouchableOpacity>
      </View>

      {/* Nội dung của pagination */}
      <ScrollView className="flex-1 p-4">
        {selectedTab === "shared" ? (
          <View>
            <Text className="text-base font-bold mb-2">
              Bài viết & Reels đã chia sẻ
            </Text>
            <Text className="text-sm text-gray-500">
              Danh sách các bài post & reels của app...
            </Text>
          </View>
        ) : (
          <View>
            <Text className="text-base font-bold mb-2">
              Ảnh & Video đã gửi
            </Text>
            <Text className="text-sm text-gray-500">
              Danh sách ảnh/video đã gửi từ thiết bị...
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Render Modal */}
      <NotificationModal
        visible={showNotificationModal}
        onClose={() => setShowNotificationModal(false)}
        messageNotification={messageNotification}
        setMessageNotification={setMessageNotification}
        callNotification={callNotification}
        setCallNotification={setCallNotification}
        previewNotification={previewNotification}
        setPreviewNotification={setPreviewNotification}
      />
      <OptionsModal visible={showOptionsModal} onClose={() => setShowOptionsModal(false)} />
    </SafeAreaView>
  );
};

export default ProfileScreen;


