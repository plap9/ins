import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { deletePost } from '~/services/postService';
import { useAuth } from '~/app/context/AuthContext';

interface PostOptionsMenuProps {
  postId: number;
  postUserId: number;
  onPostDeleted?: (postId: number) => void;
  onClose?: () => void;
}

const PostOptionsMenu: React.FC<PostOptionsMenuProps> = ({
  postId,
  postUserId,
  onPostDeleted,
  onClose,
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const { authData } = useAuth();
  const currentUser = authData?.user;

  const isOwner = currentUser?.user_id === postUserId;

  const handleDeletePost = () => {
    Alert.alert(
      'Xóa bài viết',
      'Bạn có chắc chắn muốn xóa bài viết này? Hành động này không thể hoàn tác.',
      [
        {
          text: 'Hủy',
          style: 'cancel',
        },
        {
          text: 'Xóa',
          style: 'destructive',
          onPress: async () => {
            setIsDeleting(true);
            try {
              await deletePost(postId);
              setIsVisible(false);
              onPostDeleted?.(postId);
              Alert.alert('Thành công', 'Đã xóa bài viết thành công');
            } catch (error) {
              console.error('Lỗi khi xóa bài viết:', error);
              Alert.alert('Lỗi', 'Không thể xóa bài viết. Vui lòng thử lại.');
            } finally {
              setIsDeleting(false);
            }
          },
        },
      ]
    );
  };

  const openMenu = () => {
    setIsVisible(true);
  };

  const closeMenu = () => {
    setIsVisible(false);
    onClose?.();
  };

  return (
    <>
      <TouchableOpacity onPress={openMenu} className="p-2">
        <Feather name="more-horizontal" size={20} color="#666" />
      </TouchableOpacity>

      <Modal
        visible={isVisible}
        transparent
        animationType="fade"
        onRequestClose={closeMenu}
      >
        <TouchableOpacity
          className="flex-1 bg-black/50 justify-center items-center"
          activeOpacity={1}
          onPress={closeMenu}
        >
          <View className="bg-white rounded-lg w-80 max-w-[90%]">
            <View className="p-4 border-b border-gray-200">
              <Text className="text-lg font-semibold text-center">
                Tùy chọn bài viết
              </Text>
            </View>

            <View className="p-2">
              {isOwner && (
                <TouchableOpacity
                  className="flex-row items-center p-3 rounded-lg"
                  onPress={handleDeletePost}
                  disabled={isDeleting}
                >
                  {isDeleting ? (
                    <ActivityIndicator size="small" color="red" className="mr-3" />
                  ) : (
                    <Feather name="trash-2" size={20} color="red" className="mr-3" />
                  )}
                  <Text className="text-red-500 font-medium">
                    {isDeleting ? 'Đang xóa...' : 'Xóa bài viết'}
                  </Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                className="flex-row items-center p-3 rounded-lg"
                onPress={() => {
                  // TODO: Implement report functionality
                  Alert.alert('Thông báo', 'Chức năng báo cáo đang được phát triển');
                }}
              >
                <Feather name="flag" size={20} color="#666" className="mr-3" />
                <Text className="text-gray-700 font-medium">Báo cáo bài viết</Text>
              </TouchableOpacity>

              <TouchableOpacity
                className="flex-row items-center p-3 rounded-lg"
                onPress={closeMenu}
              >
                <Feather name="x" size={20} color="#666" className="mr-3" />
                <Text className="text-gray-700 font-medium">Hủy</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
};

export default PostOptionsMenu; 