// ~/components/ProfilePostList.tsx
import React from "react";
import { View, Image, FlatList } from "react-native";

// Bạn có thể đặt dữ liệu ở đây hoặc nhận từ props tùy ý
const postsData: string[] = [
  "https://f1rstmotors.com/_next/image?url=https%3A%2F%2Ff1rst-motors.s3.me-central-1.amazonaws.com%2Fblog%2F1714770083545-blob&w=3840&q=75",
  "https://f1rstmotors.com/_next/image?url=https%3A%2F%2Ff1rst-motors.s3.me-central-1.amazonaws.com%2Fblog%2F1714770083545-blob&w=3840&q=75",
  "https://f1rstmotors.com/_next/image?url=https%3A%2F%2Ff1rst-motors.s3.me-central-1.amazonaws.com%2Fblog%2F1714770083545-blob&w=3840&q=75",
];
const reelsData: string[] = [
  "https://f1rstmotors.com/_next/image?url=https%3A%2F%2Ff1rst-motors.s3.me-central-1.amazonaws.com%2Fblog%2F1714770083545-blob&w=3840&q=75",
  "https://f1rstmotors.com/_next/image?url=https%3A%2F%2Ff1rst-motors.s3.me-central-1.amazonaws.com%2Fblog%2F1714770083545-blob&w=3840&q=75",
];
const tagsData: string[] = [
  "https://f1rstmotors.com/_next/image?url=https%3A%2F%2Ff1rst-motors.s3.me-central-1.amazonaws.com%2Fblog%2F1714770083545-blob&w=3840&q=75",
  "https://f1rstmotors.com/_next/image?url=https%3A%2F%2Ff1rst-motors.s3.me-central-1.amazonaws.com%2Fblog%2F1714770083545-blob&w=3840&q=75",
];

// Xác định kiểu cho props
interface ProfilePostListProps {
  activeTab: "posts" | "reels" | "tags";
}

const ProfilePostList: React.FC<ProfilePostListProps> = ({ activeTab }) => {
  // Chọn dữ liệu tương ứng với tab
  let data: string[] = [];
  if (activeTab === "posts") data = postsData;
  if (activeTab === "reels") data = reelsData;
  if (activeTab === "tags") data = tagsData;

  return (
    <View className="w-full">
      <FlatList
        data={data}
        numColumns={3}
        renderItem={({ item }) => (
          <View className="w-1/3 border border-black">
            <Image source={{ uri: item }} className="w-full aspect-square" />
          </View>
        )}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
};

export default ProfilePostList;
