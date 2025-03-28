import { Text, View, Image, TouchableOpacity } from "react-native";
import {Ionicons, Feather, AntDesign} from '@expo/vector-icons';

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
  };
}

const DEFAULT_AVATAR = 'https://via.placeholder.com/100'; 
const DEFAULT_POST_IMAGE = 'https://via.placeholder.com/400'; 

export default function PostListItem ({posts}: PostListItemProps) {

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
            ) : (
                 null
            )}

            <View className="flex-row justify-between p-3">
                <View className="flex-row gap-4">
                    <AntDesign name="hearto" size={24} color="black" />
                    <Ionicons name="chatbubble-outline" size={24} color="black" />
                    <Feather name="send" size={24} color="black" />
                </View>
                <Feather name="bookmark" size={24} color="black" />
            </View>

             {posts.like_count > 0 && (
                <Text className="font-semibold px-3 pb-1">{posts.like_count} lượt thích</Text>
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