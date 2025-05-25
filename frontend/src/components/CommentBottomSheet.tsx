import React, {
  forwardRef,
  useMemo,
  useState,
  useEffect,
  useCallback,
  ForwardedRef,
  useRef,
} from "react";
import {
  View,
  Text,
  ActivityIndicator,
  TouchableOpacity,
  Image,
  StyleSheet,
  Alert,
  Platform,
  TextInput as RNTextInput,
} from "react-native";
import {
  BottomSheetModal,
  BottomSheetFlatList,
  BottomSheetBackdrop,
  BottomSheetTextInput,
} from "@gorhom/bottom-sheet";
import { AntDesign, Feather } from "@expo/vector-icons";
import {
  getComments,
  createComment,
  likeComment,
  unlikeComment,
  getReplies,
  deleteComment,
} from "../services/commentService";
import { TextInput as RNGHTextInput } from 'react-native-gesture-handler';
import { useAuth } from "~/app/context/AuthContext";

interface Comment {
  comment_id: number;
  content: string;
  username: string;
  profile_picture: string;
  created_at: string;
  like_count: number;
  reply_count: number;
  total_reply_count: number;
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

const MAX_COMMENT_DEPTH = 5;
const MAX_UPDATE_DEPTH = 10;

const commentsCache = new Map<number, {
  comments: Comment[];
  page: number;
  totalPages: number;
  allCommentsLoaded: boolean;
}>();

const timestampCache = new Map<number, number>();

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
  const textInputRef = useRef<RNGHTextInput>(null);
  const currentPostIdRef = useRef<number | null>(null);
  const { authData } = useAuth();
  const currentUser = authData?.user;
  

  const snapPoints = useMemo(() => ["60%", "90%"], []);

  useEffect(() => {
    if (postId !== null && comments.length > 0) {
      commentsCache.set(postId, {
        comments: [...comments],
        page,
        totalPages,
        allCommentsLoaded,
      });
      timestampCache.set(postId, Date.now());
    }
  }, [comments, page, totalPages, allCommentsLoaded, postId]);

  const fetchCommentsForPost = useCallback(
    async (postIdToFetch: number, fetchPage = 1, force = false) => {
      if (isLoading && fetchPage === 1 && !force) return;
      if (allCommentsLoaded && fetchPage > 1 && !force) return;

      const isInitialLoadOrForce = fetchPage === 1 || force;
      setIsLoading(true);

      try {
        const currentTime = Date.now();
        const cacheTimestamp = timestampCache.get(postIdToFetch) || 0;
        const cacheIsValid = currentTime - cacheTimestamp < 5 * 60 * 1000;
        if (isInitialLoadOrForce && !force && commentsCache.has(postIdToFetch) && cacheIsValid) {
          const cachedData = commentsCache.get(postIdToFetch);
          if (cachedData) {
            setComments(cachedData.comments);
            setPage(cachedData.page);
            setTotalPages(cachedData.totalPages);
            setAllCommentsLoaded(cachedData.allCommentsLoaded);
            setIsLoading(false);
            return;
          }
        }

        const data = (await getComments(postIdToFetch, {
          page: fetchPage,
          limit: 20,
          parent_id: null,
        })) as GetCommentsResponse;


        const fetched = data.comments || [];
        const processedComments = fetched.map((c) => ({
          ...c,
          replies: c.replies || [],
          isRepliesExpanded: c.isRepliesExpanded || false,
        }));

        setTotalPages(data.pagination.totalPage);
        const newAllLoaded =
          processedComments.length < 20 ||
          fetchPage >= data.pagination.totalPage;

        if (isInitialLoadOrForce) {
          setComments(processedComments);
        } else {
          setComments((prev) => [...prev, ...processedComments]);
        }
        setAllCommentsLoaded(newAllLoaded);

        if (isInitialLoadOrForce) {
        commentsCache.set(postIdToFetch, {
        comments: processedComments,
        page: fetchPage,
        totalPages: data.pagination.totalPage,
        allCommentsLoaded: newAllLoaded,
        });
        timestampCache.set(postIdToFetch, Date.now());
        }
      } catch (error) {
        console.error("Lỗi khi tải bình luận:", error);
        if (isInitialLoadOrForce) setComments([]);
      } finally {
        setIsLoading(false);
      }
    },
    [isLoading, allCommentsLoaded, totalPages]
  );

  useEffect(() => {
    if (postId !== null) {
      currentPostIdRef.current = postId;
      if (currentPostIdRef.current !== postId) {
        setComments([]);
        setPage(1);
        setAllCommentsLoaded(false);
        setTotalPages(1);
        setReplyToComment(null);
        setNewComment("");
      }
      fetchCommentsForPost(postId, 1, false);
    }
  }, [postId]);

  useEffect(() => {
  }, [comments]);

  const loadMoreComments = useCallback(() => {
    if (
      postId !== null &&
      !isLoading &&
      !allCommentsLoaded &&
      page < totalPages
    ) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchCommentsForPost(postId, nextPage);
    }
  }, [
    postId,
    isLoading,
    allCommentsLoaded,
    page,
    totalPages,
    fetchCommentsForPost,
  ]);

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

  const updateCommentsInTree = useCallback(
    (
      currentComments: Comment[],
      targetIds: number[],
      updateFn: (comment: Comment) => Comment,
      currentDepth: number = 0
    ): Comment[] => {
      if (currentDepth > MAX_UPDATE_DEPTH) {
        return currentComments;
      }
      return currentComments.map((comment) => {
        let updatedComment = { ...comment };
        if (targetIds.includes(comment.comment_id)) {
          updatedComment = updateFn(updatedComment);
        }
        if (updatedComment.replies && updatedComment.replies.length > 0) {
          updatedComment.replies = updateCommentsInTree(
            updatedComment.replies,
            targetIds,
            updateFn,
            currentDepth + 1
          );
        }
        return updatedComment;
      });
    },
    []
  );

  const insertReplyAtAnyLevel = useCallback(
    (comments: Comment[], parentId: number, newReply: Comment): Comment[] => {
      const processComments = (items: Comment[]): [Comment[], boolean] => {
        let found = false;
        const result = items.map((comment) => {
          if (comment.comment_id === parentId) {
            found = true;
            const updatedReplies = [...(comment.replies || []), newReply];
            return {
              ...comment,
              reply_count: comment.reply_count + 1,
              total_reply_count: comment.total_reply_count + 1,
              replies: updatedReplies,
              isRepliesExpanded: true,
            };
          }
          
          if (comment.replies && comment.replies.length > 0) {
            const [updatedReplies, foundInChild] = processComments(comment.replies);
            if (foundInChild) {
              found = true;
              return {
                ...comment,
                total_reply_count: comment.total_reply_count + 1,
                replies: updatedReplies,
              };
            }
          }
          
          return comment;
        });
        
        return [result, found];
      };
      
      const [updatedComments, found] = processComments(comments);
      
      if (!found && newReply.parent_id === null) {
        return [newReply, ...updatedComments];
      }
      
      return updatedComments;
    },
    []
  );

  const handlePostComment = useCallback(async () => {
    if (!newComment.trim() || isPostingComment) return;
    if (postId === null) {
      Alert.alert("Lỗi", "Không thể xác định bài viết.");
      return;
    }

    setIsPostingComment(true);
    const parentId = replyToComment?.comment_id;

    try {
      const result = (await createComment(postId, {
        content: newComment,
        parent_id: parentId,
      })) as CreateCommentResponse;

      if (result && result.comment) {
        const newCommentObj = {
          ...result.comment,
          replies: [],
          isRepliesExpanded: false,
        };

        if (parentId) {
          setComments((prev) => insertReplyAtAnyLevel(prev, parentId, newCommentObj));
        } else {
          setComments((prev) => [newCommentObj, ...prev]);
        }

        setNewComment("");
        setReplyToComment(null);

        if (onCommentAdded && postId) {
          onCommentAdded(postId);
        }

        if (commentsCache.has(postId)) {
          const cachedData = commentsCache.get(postId);
          if (cachedData) {
            const updatedComments = parentId ? insertReplyAtAnyLevel(cachedData.comments, parentId, newCommentObj) : [newCommentObj, ...cachedData.comments];

            commentsCache.set(postId, {
              ...cachedData,
              comments: updatedComments,
            });
          }
        }
      } else {
        throw new Error("API trả về dữ liệu không hợp lệ.");
      }
    } catch (error: any) {
      console.error("Lỗi khi đăng bình luận:", error);
      const errorMessage =
        error.response?.data?.message || "Không thể gửi bình luận.";
      Alert.alert("Lỗi", errorMessage);
    } finally {
      setIsPostingComment(false);
    }
  }, [
    postId,
    newComment,
    isPostingComment,
    replyToComment,
    insertReplyAtAnyLevel,
    onCommentAdded,
  ]);

  const handleLikeComment = useCallback(
    async (commentId: number, currentlyLiked: boolean) => {
      if (likeInProgress === commentId) return;
      setLikeInProgress(commentId);

      setComments((prev) =>
        updateCommentsInTree(
          prev,
          [commentId],
          (comment) => ({
            ...comment,
            is_liked: !currentlyLiked,
            like_count: currentlyLiked
              ? Math.max(0, comment.like_count - 1)
              : comment.like_count + 1,
          }),
          0
        )
      );

      try {
        const response = (await (currentlyLiked
          ? unlikeComment(commentId)
          : likeComment(commentId))) as LikeResponse;
        setComments((prev) =>
          updateCommentsInTree(
            prev,
            [commentId],
            (comment) => ({
              ...comment,
              is_liked: response.liked,
              like_count: response.like_count,
            }),
            0
          )
        );
      } catch (error: any) {
        setComments((prev) =>
          updateCommentsInTree(
            prev,
            [commentId],
            (comment) => ({
              ...comment,
              is_liked: currentlyLiked,
              like_count: currentlyLiked
                ? comment.like_count + 1
                : Math.max(0, comment.like_count - 1),
            }),
            0
          )
        );
        console.error("Lỗi khi like/unlike:", error);
        const errorMessage =
          error.response?.data?.message || "Thao tác thất bại.";
        if (error.response?.status !== 401) {
          Alert.alert("Lỗi", errorMessage);
        }
      } finally {
        setLikeInProgress(null);
      }
    },
    [likeInProgress, updateCommentsInTree]
  );

  const handleReplyToComment = useCallback((comment: Comment) => {
    setReplyToComment(comment);
    textInputRef.current?.focus();
  }, []);

  const handleCancelReply = useCallback(() => {
    setReplyToComment(null);
  }, []);

  const loadReplies = useCallback(
    async (commentId: number, page: number = 1) => {
      setLoadingReplies(commentId);
      try {
        const response = (await getReplies(commentId, {
          page,
          limit: 10,
        })) as GetRepliesResponse;

        const newReplies = response.comments.map((r) => ({
          ...r,
          replies: [],
          isRepliesExpanded: false,
        }));

        if (newReplies.length > 0) {
          setComments((prev) =>
            updateCommentsInTree(
              prev,
              [commentId],
              (comment) => ({
                ...comment,
                replies:
                  page === 1
                    ? newReplies
                    : [...(comment.replies || []), ...newReplies],
                isRepliesExpanded: true,
              }),
              0
            )
          );
        }
        return {
          fetchedReplies: newReplies,
          hasMore: page < response.pagination.totalPage,
          totalReplies: response.pagination.total,
        };
      } catch (error) {
        console.error("Lỗi khi tải phản hồi cho comment:", commentId, error);
        Alert.alert("Lỗi", "Không thể tải phản hồi.");
        throw error;
      } finally {
        setLoadingReplies(null);
      }
    },
    [updateCommentsInTree]
  );

  const toggleReplies = useCallback((commentId: number) => {
    setComments((prev) =>
      updateCommentsInTree(
        prev, 
        [commentId], 
        (comment) => ({
          ...comment,
          isRepliesExpanded: !comment.isRepliesExpanded,
        })
      )
    );
  }, [updateCommentsInTree]);

  const handleDeleteComment = useCallback(async (commentId: number) => {
    Alert.alert(
      "Xác nhận xóa",
      "Bạn có chắc chắn muốn xóa bình luận này?",
      [
        {
          text: "Hủy",
          style: "cancel"
        },
        {
          text: "Xóa",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteComment(commentId);
              // Remove comment from UI (backend handles cascade delete)
              setComments((prev) => {
                const removeComment = (comments: Comment[]): Comment[] => {
                  return comments.filter(comment => {
                    if (comment.comment_id === commentId) {
                      return false; // Remove this comment
                    }
                    // Also remove from replies if it's a nested comment
                    if (comment.replies) {
                      comment.replies = removeComment(comment.replies);
                    }
                    return true;
                  });
                };
                return removeComment(prev);
              });
              if (onCommentAdded && postId) {
                onCommentAdded(postId);
              }
            } catch (error) {
              console.error("Lỗi khi xóa bình luận:", error);
              Alert.alert("Lỗi", "Không thể xóa bình luận.");
            }
          }
        }
      ]
    );
  }, [postId, onCommentAdded]);

  const CommentItem = ({
    item,
    depth = 0,
  }: {
    item: Comment;
    depth?: number;
  }) => {
    const [localLoading, setLocalLoading] = useState(false);
    const isLoadingThisReply = loadingReplies === item.comment_id;

    const handleToggleReplies = async () => {
      if (item.isRepliesExpanded) {
        toggleReplies(item.comment_id);
        return;
      }

      const needsLoading =
        (!item.replies || item.replies.length === 0) &&
        item.total_reply_count > 0;

      if (needsLoading) {
        setLocalLoading(true);
        try {
          await loadReplies(item.comment_id, 1);
        } catch (error) {
          console.error(
            `Không thể tải/mở replies cho comment ${item.comment_id}`,
            error
          );
        } finally {
          setLocalLoading(false);
        }
      } else if (item.replies && item.replies.length > 0) {
        toggleReplies(item.comment_id);
      }
    };

    if (depth > MAX_COMMENT_DEPTH) {
      return null;
    }

    return (
      <View style={{ marginLeft: Math.min(depth * 15, 60) }}>
        <View className="flex-row items-start py-2.5">
          {item.profile_picture ? (
            <Image
              source={{ uri: item.profile_picture }}
              className="w-9 h-9 rounded-full mr-2.5 bg-gray-200"
            />
          ) : (
            <View className="w-9 h-9 rounded-full mr-2.5 bg-gray-300 items-center justify-center">
              <Text className="text-gray-500 font-bold">{item.username.charAt(0).toUpperCase()}</Text>
            </View>
          )}
          <View className="flex-1 mr-2.5">
            <Text>
              <Text className="font-semibold">{item.username}</Text>{" "}
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
                <Text className="text-xs text-gray-500 font-medium">
                  Trả lời
                </Text>
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
          {currentUser && currentUser.user_id === item.user_id && (
            <TouchableOpacity
              className="p-1 ml-2 mt-1"
              onPress={() => handleDeleteComment(item.comment_id)}
            >
              <Feather name="trash" size={14} color="red" />
            </TouchableOpacity>
          )}
        </View>

        {item.total_reply_count > 0 && (
          <TouchableOpacity
            className="flex-row items-center ml-11 mb-2"
            onPress={handleToggleReplies}
            disabled={localLoading || isLoadingThisReply}
          >
            <View className="w-5 border-l border-b border-gray-300 h-5 -ml-1 rounded-bl-md" />
            <Text className="text-xs text-gray-500 font-medium ml-2">
              {!item.isRepliesExpanded
                ? `Xem ${item.total_reply_count} phản hồi`
                : "Ẩn phản hồi"}
            </Text>
            {(localLoading || isLoadingThisReply) && (
              <ActivityIndicator
                size="small"
                color="#999"
                style={{ marginLeft: 5 }}
              />
            )}
          </TouchableOpacity>
        )}

        {item.isRepliesExpanded && item.replies && item.replies.length > 0 && (
          <View>
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

  const renderListFooter = () => {
    if (isLoading && page > 1) {
      return <ActivityIndicator style={{ marginVertical: 20 }} />;
    }
    return null;
  };

  const renderBackdrop = useCallback(
    (props: any) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
      />
    ),
    []
  );

  return (
    <BottomSheetModal
      ref={ref}
      index={0}
      snapPoints={snapPoints}
      backdropComponent={renderBackdrop}
      style={styles.sheetContainer}
      onDismiss={() => {
        console.log("BottomSheet dismissed");
      }}
    >
      <View className="items-center py-3 border-b border-gray-200">
        <Text className="text-base font-semibold">Bình luận</Text>
      </View>
      <BottomSheetFlatList
        data={comments}
        keyExtractor={(item) => item.comment_id.toString()}
        renderItem={({ item }) => <CommentItem item={item} depth={0} />}
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
          <View className="w-9 h-9 rounded-full mr-2.5 bg-gray-300 items-center justify-center">
            <Text className="text-gray-500 font-bold">U</Text>
          </View>
          <BottomSheetTextInput
            ref={textInputRef}
            style={styles.textInput}
            placeholder={
              replyToComment
                ? `Trả lời ${replyToComment.username}...`
                : "Thêm bình luận..."
            }
            value={newComment}
            onChangeText={setNewComment}
            placeholderTextColor="#8e8e8e"
          />
          <TouchableOpacity
            onPress={handlePostComment}
            disabled={!newComment.trim() || isPostingComment}
            className="pl-2.5"
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