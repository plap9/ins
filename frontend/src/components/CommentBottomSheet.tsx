import React, {
  forwardRef,
  useMemo,
  useState,
  useEffect,
  useCallback,
  ForwardedRef,
} from "react";
import {
  View,
  Text,
  ActivityIndicator,
  TouchableOpacity,
  Image,
  StyleSheet,
  Alert,
} from "react-native";
import {
  BottomSheetModal,
  BottomSheetFlatList,
  BottomSheetBackdrop,
  BottomSheetTextInput,
} from "@gorhom/bottom-sheet";
import { Ionicons, AntDesign } from "@expo/vector-icons";
import { getComments, createComment } from "../services/commentService";
import apiClient from "~/services/apiClient";

interface Comment {
  comment_id: number;
  content: string;
  username: string;
  profile_picture: string;
  created_at: string;
  like_count: number;
  reply_count: number;
  is_liked: boolean;
  user_id?: number;
}
interface GetCommentsResponse {
  comments: Comment[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPage: number;
  };
}

interface CommentBottomSheetProps {
  postId: number | null;
  onCommentAdded: (updatedPostId: number) => void;
}
interface CreateCommentResponse {
  message: string;
  comment: Comment;
}

const DEFAULT_AVATAR = "https://via.placeholder.com/100";

const formatDate = (dateString: string): string => {
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString("vi-VN", {
      day: "numeric",
      month: "numeric",
    });
  } catch (e) {
    return dateString;
  }
};

const CommentBottomSheet = forwardRef<
  BottomSheetModal,
  CommentBottomSheetProps
>(({ postId, onCommentAdded }, ref: ForwardedRef<BottomSheetModal>) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [allCommentsLoaded, setAllCommentsLoaded] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [isPostingComment, setIsPostingComment] = useState(false);
  const [totalPages, setTotalPages] = useState(1);

  const snapPoints = useMemo(() => ["60%", "90%"], []);

  const fetchCommentsForPost = useCallback(
    async (postIdToFetch: number, fetchPage = 1) => {
      if (isLoading) return;
      if (allCommentsLoaded && fetchPage > 1) return;
      if (fetchPage > totalPages) return;

      setIsLoading(true);
      try {
        const data = (await getComments(postIdToFetch, {
          page: fetchPage,
          limit: 20,
          parent_id: null,
        })) as GetCommentsResponse;
        const fetched = data.comments || [];

        setTotalPages(data.pagination.totalPage);

        if (fetched.length === 0) {
          setAllCommentsLoaded(true);
          if (fetchPage === 1) setComments([]);
        } else {
          if (fetchPage === 1) {
            setComments(fetched);
            setAllCommentsLoaded(
              fetched.length < 20 || fetchPage >= data.pagination.totalPage
            );
          } else {
            setComments((prev) => [...prev, ...fetched]);
            setAllCommentsLoaded(
              fetched.length < 20 || fetchPage >= data.pagination.totalPage
            );
          }
        }
      } catch (error) {
        console.error("Error fetching comments:", error);
      } finally {
        setIsLoading(false);
      }
    },
    [isLoading, allCommentsLoaded, totalPages]
  );

  useEffect(() => {
    if (postId !== null) {
      setComments([]);
      setPage(1);
      setAllCommentsLoaded(false);
      setTotalPages(1);
      fetchCommentsForPost(postId, 1);
    } else {
      setComments([]);
      setPage(1);
      setAllCommentsLoaded(false);
      setTotalPages(1);
    }
  }, [postId]);

  const loadMoreComments = () => {
    if (postId !== null && !isLoading && !allCommentsLoaded) {
      const nextPage = page + 1;
      if (nextPage <= totalPages) {
        setPage(nextPage);
        fetchCommentsForPost(postId, nextPage);
      }
    }
  };

  const handlePostComment = async () => {
    if (!newComment.trim() || postId === null || isPostingComment) return;
    setIsPostingComment(true);
    try {
      const result = (await createComment(postId, {
        content: newComment,
      })) as CreateCommentResponse;
      if (result && result.comment) {
        setComments((prev) => [result.comment, ...(prev || [])]);
        setNewComment("");
        if (onCommentAdded) {
          onCommentAdded(postId);
        }
      }
    } catch (error) {
      Alert.alert("Lỗi", "Không thể gửi bình luận.");
    } finally {
      setIsPostingComment(false);
    }
  };

  const renderCommentItem = ({ item }: { item: Comment }) => (
    <View className="flex-row items-start py-2.5">
      <Image
        source={{ uri: item.profile_picture || DEFAULT_AVATAR }}
        className="w-9 h-9 rounded-full mr-2.5 bg-gray-200"
      />
      <View className="flex-1 mr-2.5">
        <Text>
          <Text className="font-semibold">{item.username}</Text> {item.content}
        </Text>
        <View className="flex-row items-center mt-1 gap-2.5">
          <Text className="text-xs text-gray-500">
            {formatDate(item.created_at)}
          </Text>
          {item.like_count > 0 && (
            <Text className="text-xs text-gray-500 font-medium">
              {item.like_count} lượt thích
            </Text>
          )}
          <TouchableOpacity>
            <Text className="text-xs text-gray-500 font-medium">Trả lời</Text>
          </TouchableOpacity>
        </View>
      </View>
      <TouchableOpacity className="p-1 mt-1">
        <AntDesign
          name={item.is_liked ? "heart" : "hearto"}
          size={14}
          color={item.is_liked ? "red" : "grey"}
        />
      </TouchableOpacity>
    </View>
  );

  const renderBackdrop = useCallback(
    (props: any) => (
      <BottomSheetBackdrop
        appearsOnIndex={0}
        disappearsOnIndex={-1}
        {...props}
      />
    ),
    []
  );

  const renderListFooter = () => {
    if (!isLoading) return null;
    return (
      <View className="py-5">
        <ActivityIndicator />
      </View>
    );
  };

  return (
    <BottomSheetModal
      ref={ref}
      index={0}
      snapPoints={snapPoints}
      backdropComponent={renderBackdrop}
      style={styles.sheetContainer}
      handleIndicatorStyle={{ backgroundColor: "#ccc" }}
    >
      <View className="items-center py-3 border-b border-gray-200">
        <Text className="text-base font-semibold">Bình luận</Text>
      </View>
      <BottomSheetFlatList
        data={comments}
        keyExtractor={(item) => item.comment_id.toString()}
        renderItem={renderCommentItem}
        contentContainerStyle={styles.listContentContainer}
        onEndReached={loadMoreComments}
        onEndReachedThreshold={0.5}
        ListFooterComponent={renderListFooter}
        ListEmptyComponent={
          isLoading && page === 1 ? (
            <ActivityIndicator style={{ marginTop: 50 }} size="large" />
          ) : !isLoading && comments.length === 0 ? (
            <Text className="text-center mt-12 text-gray-500">
              Chưa có bình luận nào.
            </Text>
          ) : null
        }
      />
      <View className="flex-row items-center px-2.5 py-2 border-t border-gray-200 bg-white absolute bottom-0 left-0 right-0">
        <Image
          source={{ uri: DEFAULT_AVATAR }}
          className="w-9 h-9 rounded-full mr-2.5 bg-gray-200"
        />
        <BottomSheetTextInput
          style={styles.textInput}
          placeholder="Thêm bình luận..."
          value={newComment}
          onChangeText={setNewComment}
        />
        <TouchableOpacity
          onPress={handlePostComment}
          disabled={!newComment.trim() || isPostingComment}
        >
          <Text
            className={`font-semibold ${!newComment.trim() || isPostingComment ? "text-blue-300" : "text-blue-500"}`}
          >
            {isPostingComment ? "Đang gửi..." : "Đăng"}
          </Text>
        </TouchableOpacity>
      </View>
    </BottomSheetModal>
  );
});

const styles = StyleSheet.create({
  sheetContainer: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    backgroundColor: "white",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 10,
  },
  listContentContainer: {
    paddingHorizontal: 15,
    paddingBottom: 100,
  },
  textInput: {
    flex: 1,
    paddingHorizontal: 15,
    paddingVertical: 8,
    marginRight: 10,
    maxHeight: 80,
    backgroundColor: "#f0f2f5",
    borderRadius: 18,
    fontSize: 15,
  },
});

export default CommentBottomSheet;
