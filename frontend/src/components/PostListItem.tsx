import { Text, View, Image, TouchableOpacity, Alert } from "react-native";
import { Ionicons, Feather, AntDesign } from '@expo/vector-icons';
import { useState } from 'react';
import { likePost, unlikePost } from '../services/likeService';

interface PostListItemProps {
  posts: { 
    post_id: number;
    content: string; 
    location?: string;
    post_privacy: string;
    created_at: string;
    updated_at: string;
    like_count: number;
    comment_count: number;
    user_id: number;
    username: string;
    profile_picture: string; 
    media_urls: string[]; 
    media_types: string[];
    is_liked?: boolean; 
  };
  onRefresh?: () => void;
  onLikeCountPress? : (postId: number) => void;
}

const DEFAULT_AVATAR = 'https://via.placeholder.com/100';
const DEFAULT_POST_IMAGE = 'https://via.placeholder.com/400'; 

export default function PostListItem({ posts, onRefresh, onLikeCountPress }: PostListItemProps) {
    const [isLiked, setIsLiked] = useState(posts.is_liked || false);
    const [likeCount, setLikeCount] = useState(posts.like_count || 0);
    const [isProcessing, setIsProcessing] = useState(false);

    const displayMediaUrl = posts.media_urls && posts.media_urls.length > 0
                            ? posts.media_urls[0]
                            : undefined; 

    const profileImageUrl = posts.profile_picture || DEFAULT_AVATAR;

    const formatDate = (dateString: string) => {
        try {
            return new Date(dateString).toLocaleDateString('vi-VN'); 
        } catch (e) {
            return dateString; 
        }
    }

    const handleLikePress = async () => {
        if (isProcessing) return;
    
        setIsProcessing(true);
        const originalIsLiked = isLiked;
        const originalLikeCount = likeCount;
    
        // Optimistic Update
        const newIsLiked = !isLiked;
        const newLikeCount = newIsLiked ? likeCount + 1 : Math.max(0, likeCount - 1);
        setIsLiked(newIsLiked);
        setLikeCount(newLikeCount);
    
        try {
            if (newIsLiked) {
                await likePost(posts.post_id);
            } else {
                await unlikePost(posts.post_id);
            }
    
        } catch (error) {
            console.error('Lỗi khi xử lý like/unlike:', error);
    
            let shouldRollback = true; 
            let alertMessage: string | null = 'Có lỗi xảy ra khi thực hiện thao tác. Vui lòng thử lại sau.';
    
            if ((error as any).response?.data) {
                const errorCode = (error as any).response.data.errorCode;
                const serverMessage = (error as any).response.data.message; 
    
                if (newIsLiked === true && errorCode === 'GEN_002') {
                     console.warn("Frontend đang cố LIKE, nhưng Server báo 'Đã thích'. Đồng bộ lại UI theo server.");
                     shouldRollback = false; 
                     alertMessage = null; // Không cần hiển thị lỗi này cho người dùng
                     // Đảm bảo trạng thái khớp với lỗi này (đã like)
                     if (!isLiked) setIsLiked(true); // Nếu UI đang là unlike thì chuyển thành like
                     // Có thể cần gọi API lấy like_count mới nhất cho bài này nếu cần chính xác tuyệt đối
                }
                 // *** Xử lý đặc biệt cho lỗi "Chưa thích" khi đang cố gắng UNLIKE (ví dụ) ***
                // else if (newIsLiked === false && errorCode === 'POST_NOT_LIKED_CODE') { // Thay 'POST_NOT_LIKED_CODE' bằng mã lỗi thực tế
                //      console.warn("Frontend đang cố UNLIKE, nhưng Server báo 'Chưa thích'. Đồng bộ lại UI theo server.");
                //      shouldRollback = false; // Không rollback, giữ UI ở trạng thái CHƯA LIKE
                //      alertMessage = null;
                //      // Đảm bảo trạng thái khớp
                //      if (isLiked) setIsLiked(false);
                // }
                 else {
                     // Với các lỗi khác, có thể dùng message từ server nếu có
                     alertMessage = serverMessage || alertMessage;
                }
            }
    
            // Chỉ rollback nếu cần thiết
            if (shouldRollback) {
                console.log("Rolling back UI state.");
                setIsLiked(originalIsLiked);
                setLikeCount(originalLikeCount);
            }
    
            // Hiển thị Alert nếu có thông báo
            if (alertMessage) {
                Alert.alert('Thông báo', alertMessage);
            }
    
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <View className="bg-white mb-2 border-b border-gray-100"> 
            <View className="p-3 flex-row items-center gap-3">
                <Image
                    source={{uri: profileImageUrl}} 
                    className="w-10 h-10 rounded-full bg-gray-200" 
                />
                <Text className="font-semibold flex-1" numberOfLines={1}>
                    {posts.username || 'Người dùng ẩn'} 
                </Text>
                <Feather name="more-horizontal" size={20} color="black" />
            </View>

            {displayMediaUrl ? (
                 <Image
                     source={{uri: displayMediaUrl }} 
                     className="w-full aspect-square bg-gray-200" 
                 />
            ) : null }
            <View className="flex-row justify-between p-3">
                <View className="flex-row gap-4">
                    <TouchableOpacity
                        onPress={handleLikePress}
                        disabled={isProcessing}
                    >
                        {isLiked ? (
                            <AntDesign name="heart" size={24} color="red" />
                        ) : (
                            <AntDesign name="hearto" size={24} color="black" />
                        )}
                    </TouchableOpacity>
                    <Ionicons name="chatbubble-outline" size={24} color="black" />
                    <Feather name="send" size={24} color="black" />
                </View>
                <Feather name="bookmark" size={24} color="black" />
            </View>

             {likeCount > 0 && (
                <TouchableOpacity onPress={() => onLikeCountPress?.(posts.post_id)} activeOpacity={0.7}>
                    <Text className="font-semibold px-3 pb-1">{likeCount} lượt thích</Text>
                </TouchableOpacity>
             )}

             {posts.content && posts.content.trim() !== "" && (
                 <View className="px-3 pt-1 pb-1">
                     <Text numberOfLines={2}>
                         <Text className="font-semibold">{posts.username}</Text>
                         {' '} 
                         {posts.content}
                     </Text>
                 </View>
             )}

             {posts.comment_count > 0 && (
                <TouchableOpacity>
                    <Text className="text-gray-500 px-3 pb-1">
                        Xem tất cả {posts.comment_count} bình luận
                    </Text>
                </TouchableOpacity>
             )}

             <Text className="text-gray-400 text-xs px-3 pb-3">
                {formatDate(posts.created_at)}
             </Text>

        </View>
    );
}