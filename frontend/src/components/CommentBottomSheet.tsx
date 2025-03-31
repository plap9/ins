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
import { AntDesign } from "@expo/vector-icons";
import {
  getComments,
  createComment,
  likeComment,
  unlikeComment,
  getReplies,
} from "../services/commentService";

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
  replies?: Comment[];
  isRepliesExpanded?: boolean;
  parent_id?: number;
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

interface LikeResponse {
  liked: boolean;
  like_count: number;
}

interface GetRepliesResponse {
  comments: Comment[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPage: number;
  };
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
  const [likeInProgress, setLikeInProgress] = useState<number | null>(null);
  const [replyToComment, setReplyToComment] = useState<Comment | null>(null);
  const [loadingReplies, setLoadingReplies] = useState<number | null>(null);

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

  const findAncestors = (comments: Comment[], targetId: number): number[] => {
    let path: number[] = [];
    
    const find = (comments: Comment[], targetId: number): boolean => {
      for (const comment of comments) {
        if (comment.comment_id === targetId) return true;
        if (comment.replies) {
          const found = find(comment.replies, targetId);
          if (found) {
            path.unshift(comment.comment_id);
            return true;
          }
        }
      }
      return false;
    };
    find(comments, targetId);
    return path;
  };

  const updateCommentsInTree = (
    comments: Comment[],
    targetIds: number[],
    updateFn: (comment: Comment) => Comment
  ): Comment[] => {
    return comments.map(comment => {
      let updatedComment = comment;
      if (targetIds.includes(comment.comment_id)) {
        updatedComment = updateFn(comment);
      }
      if (updatedComment.replies) {
        return {
          ...updatedComment,
          replies: updateCommentsInTree(updatedComment.replies, targetIds, updateFn)
        };
      }
      return updatedComment;
    });
  };

  const addReplyToComment = (
    comments: Comment[],
    parentId: number,
    newReply: Comment
  ): Comment[] => {
    const processComments = (comments: Comment[]): Comment[] => {
      return comments.map(comment => {
        if (comment.comment_id === parentId) {
          return { 
            ...comment, 
            reply_count: comment.reply_count + 1,
            replies: [...(comment.replies || []), newReply],
            isRepliesExpanded: true 
          };
        }
        
        if (comment.replies) {
          const updatedReplies = processComments(comment.replies);
          const hasChanges = JSON.stringify(updatedReplies) !== JSON.stringify(comment.replies);
          
          return hasChanges ? {
            ...comment,
            reply_count: comment.reply_count + 1,
            replies: updatedReplies
          } : comment;
        }
        
        return comment;
      });
    };
    
    return processComments(comments);
  };
  
  const updateWithFoundStatus = (
    comments: Comment[],
    parentId: number,
    newReply: Comment
  ): [Comment[], boolean] => {
    let found = false;

    const updated = comments.map((comment) => {
      if (comment.comment_id === parentId) {
        found = true;
        return {
          ...comment,
          reply_count: comment.reply_count + 1,
          replies: [...(comment.replies || []), newReply],
          isRepliesExpanded: true,
        };
      }

      if (comment.replies) {
        const [updatedReplies, childFound] = updateWithFoundStatus(
          comment.replies,
          parentId,
          newReply
        );

        if (childFound) {
          found = true;
          return {
            ...comment,
            reply_count: comment.reply_count + 1,
            replies: updatedReplies,
          };
        }
      }

      return comment;
    });

    return [updated, found];
  };

  const handlePostComment = async () => {
    if (!newComment.trim() || isPostingComment) return;
    if (postId === null && !replyToComment) return;

    setIsPostingComment(true);
    try {
      const result = (await createComment(postId!, {
        content: newComment,
        parent_id: replyToComment?.comment_id,
      })) as CreateCommentResponse;

      if (result && result.comment) {
        if (replyToComment) {
          setComments((prev) => {
            const newComments = addReplyToComment(
              prev,
              replyToComment.comment_id,
              {
                ...result.comment,
                parent_id: replyToComment.comment_id,
                replies: [],
                isRepliesExpanded: false,
              }
            );
            return [...newComments];
          });
        } else {
          setComments((prev) => [
            {
              ...result.comment,
              replies: [],
              isRepliesExpanded: false,
            },
            ...prev,
          ]);
        }

        setNewComment("");
        setReplyToComment(null);

        if (onCommentAdded) {
          onCommentAdded(postId!);
        }
      }
    } catch (error) {
      Alert.alert("Lỗi", "Không thể gửi bình luận.");
    } finally {
      setIsPostingComment(false);
    }
  };

  const handleLikeComment = async (
    commentId: number,
    currentlyLiked: boolean
  ) => {
    if (likeInProgress === commentId) return;

    const originalComments = [...comments];

    try {
      setLikeInProgress(commentId);

      const updatedComments = updateCommentsInTree(
        comments,
        [commentId],
        (comment) => ({
          ...comment,
          is_liked: !currentlyLiked,
          like_count: currentlyLiked
            ? comment.like_count - 1
            : comment.like_count + 1,
        })
      );
      setComments(updatedComments);

      const response = (await (currentlyLiked
        ? unlikeComment(commentId)
        : likeComment(commentId))) as LikeResponse;

      const serverUpdatedComments = updateCommentsInTree(
        updatedComments,
        [commentId],
        (comment) => ({
          ...comment,
          is_liked: response.liked,
          like_count: response.like_count,
        })
      );

      setComments(serverUpdatedComments);
    } catch (error: any) {
      setComments(originalComments);
      const errorMessage =
        error.response?.data?.message || "Thao tác thất bại, vui lòng thử lại";
      if (error.response?.status !== 401) {
        Alert.alert("Lỗi", errorMessage);
      }
    } finally {
      setLikeInProgress(null);
    }
  };
  const handleReplyToComment = (comment: Comment) => {
    setReplyToComment(comment);
    setNewComment("");
  };

  const handleCancelReply = () => {
    setReplyToComment(null);
  };

  const loadReplies = async (commentId: number, page: number = 1) => {
    setLoadingReplies(commentId);
    try {
      const response = (await getReplies(commentId, {
        page,
        limit: 20,
      })) as GetRepliesResponse;
  
      setComments(prev =>
        updateCommentsInTree(prev, [commentId], comment => ({
          ...comment,
          replies: page === 1 
            ? response.comments.map(r => ({ 
                ...r, 
                replies: [], 
                isRepliesExpanded: false 
              }))
            : [...(comment.replies || []), ...response.comments],
          isRepliesExpanded: true,
        }))
      );
    } catch (error) {
      console.error("Error loading replies:", error);
      Alert.alert("Lỗi", "Không thể tải phản hồi.");
    } finally {
      setLoadingReplies(null);
    }
  };

  const toggleReplies = (commentId: number) => {
    setComments(prev =>
      updateCommentsInTree(prev, [commentId], comment => ({
        ...comment,
        isRepliesExpanded: !comment.isRepliesExpanded,
      }))
    );
  };

  const renderReplyItem = ({ item, level = 1 }: { item: Comment, level?: number }) => (
    <View>
      <View className={`flex-row items-start py-2 pl-${7 + level} mt-1`}>
        <Image
          source={{ uri: item.profile_picture || DEFAULT_AVATAR }}
          className="w-7 h-7 rounded-full mr-2 bg-gray-200"
        />
        <View className="flex-1 mr-2">
          <Text>
            <Text className="font-semibold">{item.username}</Text> {item.content}
          </Text>
          <View className="flex-row items-center mt-1 gap-2">
            <Text className="text-xs text-gray-500">
              {formatDate(item.created_at)}
            </Text>
            {item.like_count > 0 && (
              <Text className="text-xs text-gray-500 font-medium">
                {item.like_count} lượt thích
              </Text>
            )}
            <TouchableOpacity onPress={() => handleReplyToComment(item)}>
              <Text className="text-xs text-gray-500 font-medium">Trả lời</Text>
            </TouchableOpacity>
          </View>
        </View>
        <TouchableOpacity
          className="p-1"
          onPress={() => handleLikeComment(item.comment_id, item.is_liked)}
          disabled={likeInProgress === item.comment_id}
        >
          <AntDesign
            name={item.is_liked ? "heart" : "hearto"}
            size={14}
            color={item.is_liked ? "red" : "grey"}
          />
        </TouchableOpacity>
      </View>
      
      {item.reply_count > 0 && (
        <TouchableOpacity
          className={`flex-row items-center ml-${11 + level} mb-2`}
          onPress={() => toggleReplies(item.comment_id)}
        >
          <View className="w-6 border-l-2 border-b-2 border-gray-300 h-6 -ml-2 rounded-bl-lg" />
          <Text className="text-xs text-gray-500 font-medium ml-2">
            {!item.isRepliesExpanded ||
            (item.replies && item.replies.length < item.reply_count)
              ? `Xem ${item.reply_count} phản hồi`
              : "Ẩn phản hồi"}
          </Text>
          {loadingReplies === item.comment_id && (
            <ActivityIndicator
              size="small"
              color="#999"
              style={{ marginLeft: 5 }}
            />
          )}
        </TouchableOpacity>
      )}
  
      {item.isRepliesExpanded && item.replies && item.replies.length > 0 && (
        <View className="mb-2">
          {item.replies.map((reply) => (
            <View key={`reply-${reply.comment_id}`}>
              {renderReplyItem({ item: reply, level: level + 1 })}
            </View>
          ))}
        </View>
      )}
    </View>
  );

  const renderCommentItem = ({ item }: { item: Comment }) => (
    <CommentItem item={item} depth={0} />
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

  const CommentItem = ({ item, depth = 0 }: { item: Comment; depth?: number }) => {
    const [localLoading, setLocalLoading] = useState(false);
  
    const handleToggleReplies = async () => {
      if (!item.isRepliesExpanded && (!item.replies || item.replies.length < item.reply_count)) {
        setLocalLoading(true);
        await loadReplies(item.comment_id);
        setLocalLoading(false);
      }
      toggleReplies(item.comment_id);
    };
  
    return (
      <View style={{ marginLeft: depth * 20 }}>
        <View className="flex-row items-start py-2.5">
          <Image
            source={{ uri: item.profile_picture || DEFAULT_AVATAR }}
            className="w-9 h-9 rounded-full mr-2.5 bg-gray-200"
          />
          <View className="flex-1 mr-2.5">
            <Text>
              <Text className="font-semibold">{item.username}</Text>
              {item.content}
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
              <TouchableOpacity onPress={() => handleReplyToComment(item)}>
                <Text className="text-xs text-gray-500 font-medium">Trả lời</Text>
              </TouchableOpacity>
            </View>
          </View>
          <TouchableOpacity
            className="p-1 mt-1"
            onPress={() => handleLikeComment(item.comment_id, item.is_liked)}
            disabled={likeInProgress === item.comment_id}
          >
            <AntDesign
              name={item.is_liked ? "heart" : "hearto"}
              size={14}
              color={item.is_liked ? "red" : "grey"}
            />
          </TouchableOpacity>
        </View>
  
        {item.reply_count > 0 && (
          <TouchableOpacity
            className="flex-row items-center ml-12 mb-2"
            onPress={handleToggleReplies}
          >
            <View className="w-6 border-l-2 border-b-2 border-gray-300 h-6 -ml-2 rounded-bl-lg" />
            <Text className="text-xs text-gray-500 font-medium ml-2">
              {!item.isRepliesExpanded
                ? `Xem ${item.reply_count} phản hồi`
                : "Ẩn phản hồi"}
            </Text>
            {(loadingReplies === item.comment_id || localLoading) && (
              <ActivityIndicator size="small" color="#999" style={{ marginLeft: 5 }} />
            )}
          </TouchableOpacity>
        )}
  
        {item.isRepliesExpanded && item.replies && (
          <View className="mb-2">
            {item.replies.map((reply) => (
              <CommentItem 
                key={`reply-${reply.comment_id}`} 
                item={reply} 
                depth={depth + 1}
              />
            ))}
          </View>
        )}
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
      <View className="px-2.5 py-2 border-t border-gray-200 bg-white absolute bottom-0 left-0 right-0">
        {replyToComment && (
          <View className="flex-row justify-between items-center mb-2 px-2">
            <Text className="text-sm text-gray-600">
              Đang trả lời{" "}
              <Text className="font-semibold">{replyToComment.username}</Text>
            </Text>
            <TouchableOpacity onPress={handleCancelReply}>
              <AntDesign name="close" size={18} color="gray" />
            </TouchableOpacity>
          </View>
        )}
        <View className="flex-row items-center">
          <Image
            source={{ uri: DEFAULT_AVATAR }}
            className="w-9 h-9 rounded-full mr-2.5 bg-gray-200"
          />
          <BottomSheetTextInput
            style={styles.textInput}
            placeholder={
              replyToComment
                ? `Trả lời ${replyToComment.username}...`
                : "Thêm bình luận..."
            }
            value={newComment}
            onChangeText={setNewComment}
          />
          <TouchableOpacity
            onPress={handlePostComment}
            disabled={!newComment.trim() || isPostingComment}
          >
            {isPostingComment ? (
              <ActivityIndicator size="small" color="#blue" />
            ) : (
              <Text
                className={`font-semibold ${!newComment.trim() ? "text-blue-300" : "text-blue-500"}`}
              >
                Đăng
              </Text>
            )}
          </TouchableOpacity>
        </View>
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