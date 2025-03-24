import React from "react";
import { View, Text, TouchableOpacity, Modal, Pressable } from "react-native";

interface OptionsModalProps {
  visible: boolean;
  onClose: () => void;
}

const OptionsModal: React.FC<OptionsModalProps> = ({ visible, onClose }) => {
  return (
    <Modal transparent animationType="none" visible={visible} onRequestClose={onClose}>
      <Pressable className="flex-1 justify-end bg-black/30" onPress={onClose}>
        <View className="bg-white p-5 rounded-t-lg">
          <Text className="text-lg font-bold mb-5">Tùy chọn</Text>

          <TouchableOpacity onPress={() => alert("Hạn Chế")} className="py-2 border-b border-gray-300">
            <Text className="text-base">Hạn Chế</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => alert("Chặn")} className="py-2 border-b border-gray-300">
            <Text className="text-base">Chặn</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => alert("Báo Cáo")} className="py-2">
            <Text className="text-base">Báo Cáo</Text>
          </TouchableOpacity>
        </View>
      </Pressable>
    </Modal>
  );
};

export default OptionsModal;
