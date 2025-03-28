import React from 'react';
import { View, Text, Image } from 'react-native';
import { useLocalSearchParams } from 'expo-router';

const UserProfileScreen = () => {
  
interface User {
  id: string;
  username: string;
  fullName: string;
  profileImage: string;
}

const sampleUsers: User[] = [
  {
    id: "1",
    username: "lap_pham",
    fullName: "Lập Phạm",
    profileImage: "https://anhnail.vn/wp-content/uploads/2024/10/anh-meme-ech-xanh-5.webp",
  },
  {
    id: "2",
    username: "thang_doan",
    fullName: "Thắng Đoàn",
    profileImage: "https://anhnail.vn/wp-content/uploads/2024/10/anh-meme-ech-xanh-5.webp",
  },
  {
    id: "3",
    username: "hiep_le",
    fullName: "Hiệp Lê",
    profileImage: "https://anhnail.vn/wp-content/uploads/2024/10/anh-meme-ech-xanh-5.webp",
  },
  {
    id: "4",
    username: "nam_pham",
    fullName: "Nam Phạm",
    profileImage: "https://anhnail.vn/wp-content/uploads/2024/10/anh-meme-ech-xanh-5.webp",
  },
  {
    id: "5",
    username: "phuc_nguyen",
    fullName: "Phúc Nguyễn",
    profileImage: "https://anhnail.vn/wp-content/uploads/2024/10/anh-meme-ech-xanh-5.webp",
  },
];
  const { username } = useLocalSearchParams();
  
  // Trong thực tế, bạn sẽ fetch user data từ API dựa trên username
  // Ở đây tôi dùng sampleUsers từ file search của bạn
  const user = sampleUsers.find(u => u.username === username);

  if (!user) {
    return (
      <View className="flex-1 justify-center items-center">
        <Text>User not found</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 p-4">
      <View className="items-center">
        <Image
          source={{ uri: user.profileImage }}
          className="w-32 h-32 rounded-full"
        />
        <Text className="text-2xl font-bold mt-4">{user.fullName}</Text>
        <Text className="text-gray-500">@{user.username}</Text>
      </View>
      {/* Thêm các thông tin khác của user ở đây */}
    </View>
  );
};

export default UserProfileScreen;