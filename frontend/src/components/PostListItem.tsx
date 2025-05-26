import { Text, View, Image, TouchableOpacity, Alert } from "react-native";
import { Ionicons, Feather, AntDesign } from "@expo/vector-icons";
import { useState, useMemo } from "react";
import { likePost, unlikePost } from "../services/likeService";
import { getS3Url } from "../utils/config";
import { useRouter } from "expo-router";
import PostOptionsMenu from "./PostOptionsMenu";

interface PostListItemProps {
  posts: {
    post_id: number;
    content?: string;
    location?: string;
    post_privacy: string;
    created_at: string;
    updated_at: string;
    like_count: number;
    comment_count: number;
    user_id: number;
    username: string;
    profile_picture?: string;
    media_urls: string[];
    media_types: string[];
    is_liked?: boolean;
    feed_type?: 'following' | 'discover';
    engagement_score?: number;
  };
  onRefresh?: () => void;
  onLikeCountPress?: (postId: number) => void;
  onCommentPress?: (postId: number) => void;
  onPostDeleted?: (postId: number) => void;
}
const DEFAULT_AVATAR = "https://via.placeholder.com/100";


export default function PostListItem({
  posts,
  onRefresh,
  onLikeCountPress,
  onCommentPress,
  onPostDeleted,
}: PostListItemProps) {
  const router = useRouter();
  const [isLiked, setIsLiked] = useState(posts.is_liked || false);
  const [likeCount, setLikeCount] = useState(posts.like_count || 0);
  const [isProcessing, setIsProcessing] = useState(false);

  const displayMediaUrl = useMemo(() => {
    if (posts.media_urls && posts.media_urls.length > 0) {
      const url = posts.media_urls[0];
      if (!url) return null;
  const profileImageUrl = posts.profile_picture || DEFAULT_AVATAR;
      return getS3Url(url);
    }
    return null;
  }, [posts.media_urls, posts.post_id]);

  const profileImageUrl = posts.profile_picture ? getS3Url(posts.profile_picture) : null;
  const username = posts.username || "Người dùng ẩn";
  const content = posts.content || "";
  const commentCount = posts.comment_count || 0;

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });
    } catch (e) {
      return dateString;
    }
  };

  const handleLikePress = async () => {
    if (isProcessing) return;

    setIsProcessing(true);
    const originalIsLiked = isLiked;
    const originalLikeCount = likeCount;

    const newIsLiked = !isLiked;
    const newLikeCount = newIsLiked
      ? likeCount + 1
      : Math.max(0, likeCount - 1);
    setIsLiked(newIsLiked);
    setLikeCount(newLikeCount);

    try {
      if (newIsLiked) {
        await likePost(posts.post_id);
      } else {
        await unlikePost(posts.post_id);
      }
    } catch (error) {
      console.error("Lỗi khi xử lý like/unlike:", error);

      let shouldRollback = true;
      let alertMessage: string | null =
        "Có lỗi xảy ra khi thực hiện thao tác. Vui lòng thử lại sau.";

      if ((error as any).response?.data) {
        const errorCode = (error as any).response.data.errorCode;
        const serverMessage = (error as any).response.data.message;

        if (newIsLiked === true && errorCode === "GEN_002") {
          console.warn(
            "Frontend đang cố LIKE, nhưng Server báo 'Đã thích'. Đồng bộ lại UI theo server."
          );
          shouldRollback = false;
          alertMessage = null;
          if (!isLiked) setIsLiked(true);
        } else {
          alertMessage = serverMessage || alertMessage;
        }
      }

      if (shouldRollback) {
        setIsLiked(originalIsLiked);
        setLikeCount(originalLikeCount);
      }

      if (alertMessage) {
        Alert.alert("Thông báo", alertMessage);
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleLikeCountTextPress = () => {
    if (likeCount > 0 && onLikeCountPress) {
      onLikeCountPress(posts.post_id);
    }
  };

  const handleCommentPress = () => {
    if (onCommentPress) {
      onCommentPress(posts.post_id);
    } else {
      console.warn("onCommentPress không được cung cấp.");
    }
  };

  const handleSendMessage = () => {
    router.push({
      pathname: "/message/new",
      params: { 
        userId: posts.user_id.toString(),
        username: posts.username
      }
    });
  };

  return (
    <View className="bg-white mb-2 border-b border-gray-100">
      <View className="p-3 flex-row items-center gap-3">
        {profileImageUrl ? (
          <Image
            source={{ uri: profileImageUrl }}
            className="w-10 h-10 rounded-full bg-gray-200"
          />
        ) : (
          <View className="w-10 h-10 rounded-full bg-gray-300 items-center justify-center">
            <Text className="text-gray-500 font-bold">{username.charAt(0).toUpperCase()}</Text>
          </View>
        )}
        <Text className="font-semibold flex-1" numberOfLines={1}>
          {username}
        </Text>
        <PostOptionsMenu
          postId={posts.post_id}
          postUserId={posts.user_id}
          onPostDeleted={onPostDeleted}
        />
      </View>

      {displayMediaUrl ? (
        <Image
          source={{ uri: displayMediaUrl }}
          className="w-full aspect-square bg-gray-200"
        />
      ) : null}
      <View className="flex-row justify-between p-3">
        <View className="flex-row gap-4">
          <TouchableOpacity onPress={handleLikePress} disabled={isProcessing}>
            {isLiked ? (
              <AntDesign name="heart" size={24} color="red" />
            ) : (
              <AntDesign name="hearto" size={24} color="black" />
            )}
          </TouchableOpacity>
          <TouchableOpacity onPress={handleCommentPress}>
            <Ionicons name="chatbubble-outline" size={24} color="black" />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleSendMessage}>
            <Feather name="send" size={24} color="black" />
          </TouchableOpacity>
        </View>
        <Feather name="bookmark" size={24} color="black" />
      </View>

      {likeCount > 0 && (
        <TouchableOpacity
          onPress={() => onLikeCountPress?.(posts.post_id)}
          activeOpacity={0.7}
        >
          <Text className="font-semibold px-3 pb-1">
            {likeCount} lượt thích
          </Text>
        </TouchableOpacity>
      )}
      {content && content.trim() !== "" && (
        <View className="px-3 pt-1 pb-1">
          <Text numberOfLines={2}>
            <Text className="font-semibold">{username}</Text>{" "}
            {content}
          </Text>
        </View>
      )}
      {commentCount > 0 && (
        <TouchableOpacity onPress={handleCommentPress}>
          <Text className="text-gray-500 px-3 pb-1">
            Xem tất cả {commentCount} bình luận
          </Text>
        </TouchableOpacity>
      )}
      <Text className="text-gray-400 text-xs px-3 pb-3">
        {formatDate(posts.created_at)}
      </Text>
    </View>
  );
}
