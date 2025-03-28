import { Text, View, Image, TouchableOpacity } from "react-native";
import {Ionicons, Feather, AntDesign} from '@expo/vector-icons';

// Định nghĩa kiểu cho prop rõ ràng hơn là any
interface PostListItemProps {
  posts: { // Kiểu Post từ FeedScreen
    post_id: number;
    content: string; // <-- Thêm content để hiển thị
    location?: string;
    post_privacy: string;
    created_at: string;
    updated_at: string;
    like_count: number;
    comment_count: number;
    user_id: number;
    username: string; // <-- Tên người dùng
    profile_picture: string; // <-- Ảnh đại diện
    media_urls: string[]; // <-- Mảng URL media
    media_types: string[];
  };
}

// Ảnh mặc định nếu không có ảnh
const DEFAULT_AVATAR = 'https://via.placeholder.com/100'; // Ảnh đại diện mặc định
const DEFAULT_POST_IMAGE = 'https://via.placeholder.com/400'; // Ảnh bài viết mặc định

export default function PostListItem ({posts}: PostListItemProps) {

    // Lấy ảnh/video đầu tiên, hoặc không hiển thị nếu không có
    const displayMediaUrl = posts.media_urls && posts.media_urls.length > 0
                            ? posts.media_urls[0]
                            : undefined; // Sẽ không render Image nếu undefined

    // Lấy ảnh đại diện, hoặc ảnh mặc định
    const profileImageUrl = posts.profile_picture || DEFAULT_AVATAR;

    // Định dạng thời gian (ví dụ đơn giản)
    const formatDate = (dateString: string) => {
        try {
            return new Date(dateString).toLocaleDateString('vi-VN'); // Format Vietnamese locale
        } catch (e) {
            return dateString; // Trả về chuỗi gốc nếu không parse được
        }
    }

    return (
        <View className="bg-white mb-2 border-b border-gray-100"> {/* Thêm border dưới */}
            {/* Header */}
            <View className="p-3 flex-row items-center gap-3">
                <Image
                    source={{uri: profileImageUrl}} // <-- Sửa: Dùng profile_picture
                    className="w-10 h-10 rounded-full bg-gray-200" // Thêm màu nền cho ảnh chờ
                />
                <Text className="font-semibold flex-1" numberOfLines={1}>
                    {posts.username || 'Người dùng ẩn'} {/* Sửa: Dùng username */}
                </Text>
                <Feather name="more-horizontal" size={20} color="black" />
            </View>

            {/* Ảnh/Video Bài viết */}
            {/* Chỉ render Image nếu có displayMediaUrl */}
            {displayMediaUrl ? (
                 <Image
                     source={{uri: displayMediaUrl }} // <-- Sửa: Dùng media_urls[0]
                     className="w-full aspect-square bg-gray-200" // Giữ tỉ lệ 1:1, thêm màu nền
                 />
            ) : (
                 // Có thể không hiển thị gì nếu bài viết chỉ có text
                 null
            )}
            {/* TODO: Xử lý hiển thị video hoặc nhiều ảnh */}

            {/* Actions Icons */}
            <View className="flex-row justify-between p-3">
                <View className="flex-row gap-4">
                    <AntDesign name="hearto" size={24} color="black" />
                    <Ionicons name="chatbubble-outline" size={24} color="black" />
                    <Feather name="send" size={24} color="black" />
                </View>
                <Feather name="bookmark" size={24} color="black" />
            </View>

            {/* Lượt thích */}
             {posts.like_count > 0 && (
                <Text className="font-semibold px-3 pb-1">{posts.like_count} lượt thích</Text>
             )}

             {/* Caption/Nội dung bài viết */}
             {posts.content && posts.content.trim() !== "" && (
                 <View className="px-3 pt-1 pb-1">
                     <Text numberOfLines={2}> {/* Giới hạn số dòng caption */}
                         <Text className="font-semibold">{posts.username}</Text>
                         {' '} {/* Khoảng trắng */}
                         {posts.content}
                     </Text>
                 </View>
             )}

             {/* Số bình luận */}
             {posts.comment_count > 0 && (
                <TouchableOpacity>
                    <Text className="text-gray-500 px-3 pb-1">
                        Xem tất cả {posts.comment_count} bình luận
                    </Text>
                </TouchableOpacity>
             )}

             {/* Thời gian đăng */}
             <Text className="text-gray-400 text-xs px-3 pb-3">
                {formatDate(posts.created_at)}
             </Text>

        </View>
    );
}