import React from "react";
import { View, Text, TouchableOpacity, Modal, Pressable } from "react-native";
import { FontAwesome5 } from "@expo/vector-icons";

interface NotificationModalProps {
  visible: boolean;
  onClose: () => void;
  messageNotification: boolean;
  setMessageNotification: (value: boolean) => void;
  callNotification: boolean;
  setCallNotification: (value: boolean) => void;
  previewNotification: boolean;
  setPreviewNotification: (value: boolean) => void;
}

const NotificationModal: React.FC<NotificationModalProps> = ({
  visible,
  onClose,
  messageNotification,
  setMessageNotification,
  callNotification,
  setCallNotification,
  previewNotification,
  setPreviewNotification,
}) => {
  return (
    <Modal transparent animationType="none" visible={visible} onRequestClose={onClose}>
      <Pressable className="flex-1 justify-end bg-black/30" onPress={onClose}>
        <View className="bg-white p-5 rounded-t-[30px]">
          <Text className="text-lg font-bold mb-5 self-center">Thông báo</Text>

          {/* Tắt thông báo tin nhắn */}
          <View className="flex-row justify-between items-center py-2 border-t border-gray-200">
            <Text className="text-base">Tắt thông báo về tin nhắn</Text>
            <TouchableOpacity onPress={() => setMessageNotification(!messageNotification)}>
              <FontAwesome5 name={messageNotification ? "toggle-on" : "toggle-off"} size={42} color="black" />
            </TouchableOpacity>
          </View>

          {/* Tắt thông báo cuộc gọi */}
          <View className="flex-row justify-between items-center py-2 border-b border-gray-200">
            <Text className="text-base">Tắt thông báo về cuộc gọi</Text>
            <TouchableOpacity onPress={() => setCallNotification(!callNotification)}>
              <FontAwesome5 name={callNotification ? "toggle-on" : "toggle-off"} size={42} color="black" />
            </TouchableOpacity>
          </View>

          {/* Ẩn bản xem trước tin nhắn */}
          <View className="flex-row justify-between items-center py-2">
            <View>
              <Text className="text-base">Ẩn bản xem trước tin nhắn</Text>
              <Text className="text-xs text-gray-500">Không hiển thị bản xem trước trong thông báo đẩy</Text>
            </View>
            <TouchableOpacity onPress={() => setPreviewNotification(!previewNotification)}>
              <FontAwesome5 name={previewNotification ? "toggle-on" : "toggle-off"} size={42} color="black" />
            </TouchableOpacity>
          </View>
        </View>
      </Pressable>
    </Modal>
  );
};

export default NotificationModal;
