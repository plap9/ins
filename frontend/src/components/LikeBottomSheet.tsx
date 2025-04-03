import React, {
  forwardRef,
  useMemo,
  useState,
  useEffect,
  useCallback,
  ForwardedRef,
  useContext,
} from "react";
import {
  View,
  Text,
  ActivityIndicator,
  TouchableOpacity,
  Image,
  StyleSheet,
  Alert,
  FlatList,
} from "react-native";
import {
  BottomSheetModal,
  BottomSheetFlatList,
  BottomSheetBackdrop,
  BottomSheetView,
} from "@gorhom/bottom-sheet";
import { getPostLikes } from "../services/likeService";
import { useAuth } from "../app/context/AuthContext";

interface Liker {
  user_id: number;
  username: string;
  profile_picture: string | null;
  full_name?: string;
  is_following?: boolean;
}
interface GetLikesResponse {
  users: Liker[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPage: number;
  };
  message?: string;
}
interface LikeBottomSheetProps {
  postId: number | null;
}

const LikeBottomSheet = forwardRef<BottomSheetModal, LikeBottomSheetProps>(
  ({ postId }, ref: ForwardedRef<BottomSheetModal>) => {
    const [likers, setLikers] = useState<Liker[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [allLikesLoaded, setAllLikesLoaded] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [loadedPostId, setLoadedPostId] = useState<number | null>(null);
    const [isBottomSheetOpen, setIsBottomSheetOpen] = useState(false);
    const { authData } = useAuth();
    const currentUserId = authData?.user.user_id;

    const snapPoints = useMemo(() => ["50%", "85%"], []);
   
    const fetchLikersForPost = useCallback(
      async (postIdToFetch: number, fetchPage = 1) => {
        if (isLoading) return;
        if (allLikesLoaded && fetchPage > 1) return;
        if (fetchPage > totalPages && fetchPage > 1) return;

        setIsLoading(true);
        setError(null);

        try {
          const data = (await getPostLikes(
            postIdToFetch,
            fetchPage,
            30
          )) as GetLikesResponse;
          const fetchedLikers = data.users || [];

          setTotalPages(data.pagination?.totalPage || 1);
          if (fetchedLikers.length === 0) {
            setAllLikesLoaded(true);
            if (fetchPage === 1) setLikers([]);
          } else {
            if (fetchPage === 1) setAllLikesLoaded(false);
            setLikers((prev) =>
              fetchPage === 1 ? fetchedLikers : [...prev, ...fetchedLikers]
            );
            if (
              fetchPage >= (data.pagination?.totalPage || 1) ||
              fetchedLikers.length < 30
            ) {
              setAllLikesLoaded(true);
            }
          }
        } catch (err: any) {
          console.error("Failed to fetch likers:", err.response?.data || err);
          setError("Không thể tải danh sách người thích.");
          setLikers([]);
          setAllLikesLoaded(true);
        } finally {
          setIsLoading(false);
        }
      },
      [isLoading, allLikesLoaded, totalPages]
    );
    useEffect(() => {
      if (postId !== null && postId !== loadedPostId && isBottomSheetOpen) {
        setLikers([]);
        setPage(1);
        setAllLikesLoaded(false);
        setTotalPages(1);
        setError(null);
        setLoadedPostId(postId);
        fetchLikersForPost(postId, 1);
      }
    }, [postId, loadedPostId, fetchLikersForPost, isBottomSheetOpen]);
    const loadMoreLikers = () => {
      const nextPage = page + 1;
      if (
        postId !== null &&
        !isLoading &&
        !allLikesLoaded &&
        nextPage <= totalPages
      ) {
        setPage(nextPage);
        fetchLikersForPost(postId, nextPage);
      }
    };
    const handleFollowToggle = async (
      userId: number,
      currentlyFollowing?: boolean
    ) => {
      const originalLikers = [...likers];
      setLikers((prevLikers) =>
        prevLikers.map((liker) =>
          liker.user_id === userId
            ? { ...liker, is_following: !currentlyFollowing }
            : liker
        )
      );
      try {
      } catch (apiError) {
        console.error("Failed to toggle follow:", apiError);
        setLikers(originalLikers);
        Alert.alert("Lỗi", "Không thể thay đổi trạng thái theo dõi.");
      }
    };
    const renderLikerItem = ({ item }: { item: Liker }) => {
      const likerIdString = item.user_id.toString();
      const currentUserIdFromAuth = authData?.user?.user_id;
      const isCurrentUser = typeof currentUserId === 'number' && item.user_id === currentUserId;
      return (
        <View className="flex-row items-center px-4 py-2.5">
          {item.profile_picture ? (
            <Image
              source={{ uri: item.profile_picture }}
              className="w-11 h-11 rounded-full mr-3 bg-gray-200"
            />
          ) : (
            <View className="w-11 h-11 rounded-full mr-3 bg-gray-300 items-center justify-center">
              <Text className="text-gray-500 font-bold">{item.username.charAt(0).toUpperCase()}</Text>
            </View>
          )}
          <View className="flex-1 justify-center">
               <Text className="font-bold text-sm">{item.username}</Text>
            {item.full_name && (
              <Text className="text-gray-500 text-xs">{item.full_name}</Text>
            )}
          </View>
          {!isCurrentUser && (
            <TouchableOpacity
              className={`py-1.5 px-4 rounded-lg border ${
                item.is_following
                  ? "bg-white border-gray-300"
                  : "bg-blue-500 border-blue-500"
              }`}
              onPress={() =>
                handleFollowToggle(item.user_id, item.is_following)
              }
            >
              <Text
                className={`font-semibold text-xs ${
                  item.is_following ? "text-black" : "text-white"
                }`}
              >
                {item.is_following ? "Đang theo dõi" : "Theo dõi"}   
              </Text>
            </TouchableOpacity>
          )}
        </View>
      );
    };

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
      if (isLoading && page > 1) {
        return (
          <View className="py-5">
             <ActivityIndicator size="small" color="#888" />       
          </View>
        );
      }
      return null;
    };
    const handleSheetChanges = useCallback(
      (index: number) => {
        setIsBottomSheetOpen(index >= 0);
        if (index >= 0 && postId !== null && postId !== loadedPostId) {
          setLikers([]);
          setPage(1);
          setAllLikesLoaded(false);
          setTotalPages(1);
          setError(null);
          setLoadedPostId(postId);
          fetchLikersForPost(postId, 1);
        }
      },
      [postId, loadedPostId, fetchLikersForPost]
    );

    return (
      <BottomSheetModal
        ref={ref}
        index={0}
        snapPoints={snapPoints}
        backdropComponent={renderBackdrop}
        style={styles.sheetContainer}
        handleIndicatorStyle={{ backgroundColor: "#ccc" }}
        onChange={handleSheetChanges}
      >
        <View className="items-center py-3 border-b border-gray-200">
          <Text className="text-base font-semibold">Lượt thích</Text>       
        </View>
        <BottomSheetFlatList
          data={likers}
          renderItem={renderLikerItem}
          keyExtractor={(item) => item.user_id.toString()}
          onEndReached={loadMoreLikers}
          onEndReachedThreshold={0.5}
          ListFooterComponent={renderListFooter}
          contentContainerStyle={styles.listContentContainer}
          ListEmptyComponent={
            isLoading && page === 1 ? (
              <View className="py-20 items-center">
                 <ActivityIndicator size="large" />           
              </View>
            ) : !isLoading && likers.length === 0 ? (
              <View className="py-20 items-center">
                <Text className="text-gray-500">Chưa có lượt thích nào.</Text> 
              </View>
            ) : null
          }
        />
        {error && (
          <View className="p-4 bg-red-100 border-t border-red-200 items-center">
            <Text className="text-red-700 text-center mb-2">{error}</Text>     
            <TouchableOpacity
              onPress={() => {
                if (postId !== null) {
                  fetchLikersForPost(postId, 1);
                }
              }}
              className="py-1 px-3 bg-red-200 rounded"
            >
              <Text className="text-red-800 font-semibold text-xs">
                Thử lại
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </BottomSheetModal>
    );
  }
);
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
    paddingBottom: 20,
  },
});
export default LikeBottomSheet;
