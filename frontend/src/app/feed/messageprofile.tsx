import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Modal,
  Pressable,
} from "react-native";
import { Avatar } from "react-native-elements";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  MaterialIcons,
  Ionicons,
  Feather,
  FontAwesome,
} from "@expo/vector-icons";

const ProfileScreen = () => {
  // State cho modal Thông báo và Tùy chọn
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [showOptionsModal, setShowOptionsModal] = useState(false);

  // State cho các toggle trong modal Thông báo
  const [messageNotification, setMessageNotification] = useState(true);
  const [callNotification, setCallNotification] = useState(true);
  const [previewNotification, setPreviewNotification] = useState(true);

  // State cho pagination
  const [selectedTab, setSelectedTab] = useState<"shared" | "sent">("shared");

  // Modal Thông báo
  const renderNotificationModal = () => (
    <Modal
      transparent
      animationType="none"
      visible={showNotificationModal}
      onRequestClose={() => setShowNotificationModal(false)}
    >
      <Pressable
        className="flex-1 justify-end bg-black/30"
        onPress={() => setShowNotificationModal(false)}
      >
        <View className="bg-white p-5 rounded-t-lg">
          <Text className="text-lg font-bold mb-5">Thông báo</Text>
          {/* Tác vụ: Tắt thông báo về tin nhắn */}
          <View className="flex-row justify-between items-center py-2 border-b border-gray-300">
            <Text className="text-base">Tắt thông báo về tin nhắn</Text>
            <TouchableOpacity
              onPress={() => setMessageNotification(!messageNotification)}
            >
              {messageNotification ? (
                <MaterialIcons name="toggle-on" size={24} color="black" />
              ) : (
                <MaterialIcons name="toggle-off" size={24} color="black" />
              )}
            </TouchableOpacity>
          </View>
          {/* Tác vụ: Tắt thông báo về cuộc gọi */}
          <View className="flex-row justify-between items-center py-2 border-b border-gray-300">
            <Text className="text-base">Tắt thông báo về cuộc gọi</Text>
            <TouchableOpacity
              onPress={() => setCallNotification(!callNotification)}
            >
              {callNotification ? (
                <MaterialIcons name="toggle-on" size={24} color="black" />
              ) : (
                <MaterialIcons name="toggle-off" size={24} color="black" />
              )}
            </TouchableOpacity>
          </View>
          {/* Tác vụ: Ẩn bản xem trước tin nhắn */}
          <View className="flex-row justify-between items-center py-2">
            <View>
              <Text className="text-base">Ẩn bản xem trước tin nhắn</Text>
              <Text className="text-xs text-gray-500">
                Không hiển thị bản xem trước trong thông báo đẩy
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => setPreviewNotification(!previewNotification)}
            >
              {previewNotification ? (
                <MaterialIcons name="toggle-on" size={24} color="black" />
              ) : (
                <MaterialIcons name="toggle-off" size={24} color="black" />
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Pressable>
    </Modal>
  );

  // Modal Tùy chọn
  const renderOptionsModal = () => (
    <Modal
      transparent
      animationType="none"
      visible={showOptionsModal}
      onRequestClose={() => setShowOptionsModal(false)}
    >
      <Pressable
        className="flex-1 justify-end bg-black/30"
        onPress={() => setShowOptionsModal(false)}
      >
        <View className="bg-white p-5 rounded-t-lg">
          <Text className="text-lg font-bold mb-5">Tùy chọn</Text>
          <TouchableOpacity
            onPress={() => alert("Hạn Chế")}
            className="py-2 border-b border-gray-300"
          >
            <Text className="text-base">Hạn Chế</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => alert("Chặn")}
            className="py-2 border-b border-gray-300"
          >
            <Text className="text-base">Chặn</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => alert("Báo Cáo")} className="py-2">
            <Text className="text-base">Báo Cáo</Text>
          </TouchableOpacity>
        </View>
      </Pressable>
    </Modal>
  );

  return (
    <SafeAreaView className="flex-1 bg-white">
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 py-3 border-b border-gray-300 bg-white">
        <TouchableOpacity onPress={() => alert("Go back")}>
          <MaterialIcons name="keyboard-arrow-left" size={24} color="black" />
        </TouchableOpacity>
        <Text className="text-lg font-bold">Chat Details</Text>
        <View className="w-6" />
      </View>

      {/* Avatar và 4 nút điều khiển */}
      <View className="items-center my-5">
        <Avatar
          rounded
          size="large"
          source={{ uri: "https://www.motortrend.com/uploads/2022/07/1993-nissan-s13-kis-front-viewt.jpg" }}
        />
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
      {renderNotificationModal()}
      {renderOptionsModal()}
    </SafeAreaView>
  );
};

export default ProfileScreen;
