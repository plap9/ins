import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  FlatList,
  Modal,
  Dimensions,
  Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams, usePathname } from 'expo-router';
import {
  AntDesign,
  Fontisto,
  Feather,
  Ionicons,
  MaterialIcons,
  MaterialCommunityIcons
} from '@expo/vector-icons';
import { StatusBar } from "expo-status-bar";
import * as Clipboard from 'expo-clipboard';
import StoryList from '~/components/StoryList';
import DiscoverPersonItem, { Person } from '~/components/DiscoverPerson';
import { searchUsers } from '~/services/searchService';
import ProfilePostList from "~/components/ProfilePostList";
import PostListItem from "~/components/PostListItem";
import * as userService from '~/services/userService';
import storyService from '~/services/storyService';
import * as postService from '~/services/postService';
import { getS3Url } from "~/utils/config";
import { likePost, unlikePost, getPostLikes } from "~/services/likeService";
import { getComments } from "~/services/commentService";
import CommentBottomSheet from "~/components/CommentBottomSheet";
import LikeBottomSheet from "~/components/LikeBottomSheet";
import { BottomSheetModal, BottomSheetModalProvider } from "@gorhom/bottom-sheet";

type UserProfileRouteParams = {
    username: string;
  }
  
interface Story {
  id: string;
  image: string;
  title: string;
  isHighlight?: boolean;
}

interface User {
  id: string;
  username: string;
  full_name: string;
  avatar_url: string;
  bio: string;
  is_private: boolean;
  posts_count: number;
  followers_count: number;
  following_count: number;
  is_following: boolean;
}

interface Highlight {
  highlight_id: number;
  title: string;
  cover_image_url: string | null;
  story_count: number;
}

interface Post {
  id: number;
  caption: string;
  media: Array<{
    id: number;
    media_url: string;
    media_type: string;
  }>;
  created_at: string;
  user_id: number;
  like_count?: number;
  comment_count?: number;
  is_liked?: boolean;
}

interface LikeResponse {
  success: boolean;
  likes: Array<{
    user_id: number;
    username: string;
    profile_picture?: string;
  }>;
}

const UserProfileScreen = () => {
  const router = useRouter();
  const { username } = useLocalSearchParams<UserProfileRouteParams>();
  const [user, setUser] = useState<User | null>(null);
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"posts" | "saved">("posts");
  const [posts, setPosts] = useState<Post[]>([]);
  const [savedPosts, setSavedPosts] = useState<Post[]>([]);
  const [isFollowing, setIsFollowing] = useState(false);
  const [isLoadingFollow, setIsLoadingFollow] = useState(false);
  const [isLoadingPosts, setIsLoadingPosts] = useState(false);
  const [isLoadingSaved, setIsLoadingSaved] = useState(false);
  const [isLoadingHighlights, setIsLoadingHighlights] = useState(false);
  
  // State cho modal
  const [showPostModal, setShowPostModal] = useState<boolean>(false);
  const [selectedPost, setSelectedPost] = useState<number | null>(null);
  const [selectedPostsCollection, setSelectedPostsCollection] = useState<Post[]>([]);
  
  // References cho BottomSheet
  const commentBottomSheetRef = useRef<BottomSheetModal>(null);
  const likeBottomSheetRef = useRef<BottomSheetModal>(null);
  const [commentPostId, setCommentPostId] = useState<number | null>(null);
  const [likePostId, setLikePostId] = useState<number | null>(null);
  
  const screenWidth = Dimensions.get("window").width;
  const itemSize = screenWidth / 3;

  const fetchUserData = async () => {
    try {
      setLoading(true);
      setError(null);

      const userResponse = await userService.getUserByUsername(username);

      if (userResponse.success) {
        const userData = userResponse.data || userResponse.user;
        
        if (!userData) {
          throw new Error('Không tìm thấy thông tin người dùng');
        }
        
        const user = {
          id: (userData as any).id?.toString() || (userData as any).user_id?.toString() || '',
          username: (userData as any).username || '',
          full_name: (userData as any).full_name || '',
          avatar_url: (userData as any).avatar_url || (userData as any).profile_picture || '',
          bio: (userData as any).bio || '',
          is_private: !!(userData as any).is_private,
          posts_count: Number((userData as any).posts_count || (userData as any).post_count || 0),
          followers_count: Number((userData as any).followers_count || (userData as any).follower_count || 0),
          following_count: Number((userData as any).following_count || (userData as any).following_count || 0),
          is_following: !!(userData as any).is_following || false
        };
        
        setUser(user);
        
        setIsLoadingHighlights(true);
        try {
          const highlightsResponse = await storyService.getUserHighlights(undefined, username);
          if (Array.isArray(highlightsResponse)) {
            setHighlights(highlightsResponse);
          }
        } catch (highlightError) {
          console.error('Lỗi khi lấy highlights:', highlightError);
          setHighlights([]);
        }
        setIsLoadingHighlights(false);

        try {
          setIsLoadingPosts(true);
          const userId = Number(user.id);
          
          if (isNaN(userId)) {
            throw new Error('ID người dùng không hợp lệ');
          }
          
          const postsResponse = await postService.getUserPosts(userId);
          if (postsResponse.success && (postsResponse.data || postsResponse.posts)) {
            const postsData = postsResponse.data || postsResponse.posts || [];
            setPosts(postsData.map(post => ({
              id: post.post_id,
              caption: post.content || '',
              media: Array.isArray(post.media_urls) 
                ? post.media_urls.map((url, index) => ({
                    id: index,
                    media_url: url,
                    media_type: Array.isArray(post.media_types) ? post.media_types[index] : 'image'
                  }))
                : [{ id: 0, media_url: post.media_urls as string, media_type: 'image' }],
              created_at: post.created_at,
              user_id: post.user_id,
              like_count: post.like_count,
              comment_count: post.comment_count,
              is_liked: post.is_liked
            })));
          }
        } catch (postsError) {
          console.error('Lỗi khi lấy bài viết:', postsError);
          setPosts([]);
        } finally {
          setIsLoadingPosts(false);
        }

        try {
          setIsLoadingSaved(true);
          const userId = Number(user.id);
          
          if (isNaN(userId)) {
            throw new Error('ID người dùng không hợp lệ');
          }
          
          const savedResponse = await postService.getUserPosts(userId);
          if (savedResponse.success && (savedResponse.data || savedResponse.posts)) {
            const savedData = savedResponse.data || savedResponse.posts || [];
            setSavedPosts(savedData.map(post => ({
              id: post.post_id,
              caption: post.content || '',
              media: Array.isArray(post.media_urls) 
                ? post.media_urls.map((url, index) => ({
                    id: index,
                    media_url: url,
                    media_type: Array.isArray(post.media_types) ? post.media_types[index] : 'image'
                  }))
                : [{ id: 0, media_url: post.media_urls as string, media_type: 'image' }],
              created_at: post.created_at,
              user_id: post.user_id,
              like_count: post.like_count,
              comment_count: post.comment_count,
              is_liked: post.is_liked
            })));
          }
        } catch (savedError) {
          console.error('Lỗi khi lấy bài viết đã lưu:', savedError);
          setSavedPosts([]);
        } finally {
          setIsLoadingSaved(false);
        }
      } else {
        throw new Error('Không tìm thấy người dùng');
      }
    } catch (err) {
      console.error('Lỗi khi tải dữ liệu:', err);
      setError(err instanceof Error ? err.message : 'Có lỗi xảy ra');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUserData();
  }, [username]);

  const handleFollow = async () => {
    if (!user || !user.id) return;
    
    try {
      setIsLoadingFollow(true);
      const userId = Number(user.id);
      
      if (isNaN(userId)) {
        throw new Error('ID người dùng không hợp lệ');
      }
      
      if (isFollowing) {
        await userService.unfollowUser(userId);
        setIsFollowing(false);
      } else {
        await userService.followUser(userId);
        setIsFollowing(true);
      }
    } catch (err) {
      console.error('Lỗi khi thực hiện follow:', err);
    } finally {
      setIsLoadingFollow(false);
    }
    };
  
    const pathname = usePathname();
  
    const handleShare = async () => {
      const fullUrl = `http://localhost:8081${pathname}`;
      await Clipboard.setStringAsync(fullUrl);
      alert('Đường dẫn đã được copy vào clipboard!');
    };
  
  // Thêm các hàm xử lý modal
  const handlePostPress = (postId: number) => {
    const currentPosts = activeTab === 'posts' ? posts : savedPosts;
    const post = currentPosts.find((p) => p.id === postId);
    if (!post) return;

    const sortedPosts = [...currentPosts].sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    setSelectedPost(postId);
    setSelectedPostsCollection(sortedPosts);
    setShowPostModal(true);
  };

  const handleCloseModal = () => {
    setShowPostModal(false);
    setSelectedPost(null);
  };

  // Update post data khi có thay đổi like/comment
  const handleCommentAdded = (updatedPostId: number) => {
    setPosts((prev) => {
      const updated = [...prev];
      const postIndex = updated.findIndex(p => p.id === updatedPostId);
      if (postIndex !== -1) {
        updated[postIndex] = {
          ...updated[postIndex],
          comment_count: (updated[postIndex].comment_count || 0) + 1
        };
      }
      return updated;
    });
  };

  // Xử lý khi nhấn vào số lượt like
  const handleLikeCountPress = (postId: number) => {
    setLikePostId(postId);
    likeBottomSheetRef.current?.present();
  };

  // Xử lý khi nhấn vào biểu tượng comment
  const handleCommentPress = (postId: number) => {
    setCommentPostId(postId);
    commentBottomSheetRef.current?.present();
  };

  if (loading) {
    return (
      <BottomSheetModalProvider>
        <SafeAreaView style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <ActivityIndicator size="large" color="#0095F6" />
            <Text style={{ marginTop: 16, color: '#8E8E8E', fontSize: 14 }}>Đang tải thông tin người dùng...</Text>
          </View>
        </SafeAreaView>
      </BottomSheetModalProvider>
    );
  }

  if (!user || error) {
    return (
      <BottomSheetModalProvider>
        <SafeAreaView style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 16 }}>
            <Text style={{ fontSize: 16, textAlign: 'center', marginBottom: 16, color: '#262626' }}>
              {error || "Không tìm thấy người dùng"}
            </Text>
            <TouchableOpacity 
              style={{ backgroundColor: '#0095F6', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 8 }}
              onPress={() => router.back()}
            >
              <Text style={{ color: '#FFFFFF', fontWeight: 'bold', fontSize: 14 }}>Quay lại</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </BottomSheetModalProvider>
    );
  }

  return (
    <BottomSheetModalProvider>
      <SafeAreaView style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
        {/* Header */}
        <View style={{ 
          flexDirection: 'row', 
          alignItems: 'center', 
          justifyContent: 'space-between', 
          paddingHorizontal: 16, 
          paddingVertical: 12,
          borderBottomWidth: 0.5,
          borderBottomColor: '#DBDBDB'
        }}>
          {/* Back button */}
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <TouchableOpacity onPress={() => router.back()} style={{ marginRight: 16 }}>
              <Ionicons name="chevron-back" size={28} color="#262626" />
            </TouchableOpacity>
            <Text style={{ fontSize: 16, fontWeight: '600', color: '#262626' }}>{user.username}</Text>
          </View>
          
          {/* Right side buttons */}
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <TouchableOpacity style={{ marginRight: 20 }} onPress={handleShare}>
              <Feather name="send" size={24} color="#262626" />
            </TouchableOpacity>
                <TouchableOpacity>
              <Feather name="more-vertical" size={24} color="#262626" />
                </TouchableOpacity>
            </View>
        </View>
             
        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={{ backgroundColor: '#FFFFFF', paddingHorizontal: 16 }}>
            <StatusBar style="dark" />
            
            {/* Profile info section */}
            <View style={{ flexDirection: 'row', paddingVertical: 16, alignItems: 'center' }}>
              {/* Profile picture */}
              <View style={{ marginRight: 28 }}>
            <Image
                  source={{ uri: user.avatar_url || "https://www.gravatar.com/avatar/00000000000000000000000000000000?d=mp&f=y" }}
                  style={{ 
                    width: 86, 
                    height: 86, 
                    borderRadius: 43,
                    borderWidth: 0.5,
                    borderColor: '#DBDBDB'
                  }}
                />
              </View>
              
            {/* Stats */}
              <View style={{ flex: 1, flexDirection: 'row', justifyContent: 'space-around' }}>
                <TouchableOpacity style={{ alignItems: 'center' }}>
                  <Text style={{ fontSize: 16, fontWeight: '600', color: '#262626' }}>{user.posts_count}</Text>
                  <Text style={{ fontSize: 14, color: '#262626' }}>Bài viết</Text>
                </TouchableOpacity>
                
                <TouchableOpacity style={{ alignItems: 'center' }}>
                  <Text style={{ fontSize: 16, fontWeight: '600', color: '#262626' }}>{user.followers_count}</Text>
                  <Text style={{ fontSize: 14, color: '#262626' }}>Người theo dõi</Text>
                </TouchableOpacity>
                
                <TouchableOpacity style={{ alignItems: 'center' }}>
                  <Text style={{ fontSize: 16, fontWeight: '600', color: '#262626' }}>{user.following_count}</Text>
                  <Text style={{ fontSize: 14, color: '#262626' }}>Đang theo dõi</Text>
                </TouchableOpacity>
              </View>
            </View>
            
            {/* Bio section */}
            <View style={{ marginBottom: 14 }}>
              <Text style={{ fontSize: 14, fontWeight: '600', color: '#262626' }}>{user.full_name}</Text>
              {user.bio && <Text style={{ fontSize: 14, color: '#262626', marginTop: 2 }}>{user.bio}</Text>}
          </View>
            
            {/* Action buttons */}
            <View style={{ flexDirection: 'row', marginBottom: 16 }}>
              <TouchableOpacity 
                style={{ 
                  flex: 1, 
                  backgroundColor: isFollowing ? '#EFEFEF' : '#0095F6', 
                  borderRadius: 8, 
                  paddingVertical: 7,
                  marginRight: 4,
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
                onPress={handleFollow}
                disabled={isLoadingFollow}
              >
                <Text style={{ 
                  color: isFollowing ? '#262626' : '#FFFFFF', 
                  fontWeight: '600',
                  fontSize: 14
                }}>
                  {isLoadingFollow ? 'Đang xử lý...' : (isFollowing ? 'Đang theo dõi' : 'Theo dõi')}
                </Text>
          </TouchableOpacity>
              
              <TouchableOpacity 
                style={{ 
                  flex: 1, 
                  backgroundColor: '#EFEFEF', 
                  borderRadius: 8, 
                  paddingVertical: 7,
                  marginLeft: 4,
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <Text style={{ color: '#262626', fontWeight: '600', fontSize: 14 }}>Nhắn tin</Text>
          </TouchableOpacity>
              
          <TouchableOpacity 
                style={{ 
                  width: 30, 
                  backgroundColor: '#EFEFEF', 
                  borderRadius: 8, 
                  marginLeft: 8,
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <Ionicons name="person-add-outline" size={18} color="#262626" />
          </TouchableOpacity>
        </View>
        
            {/* Highlights */}
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              style={{ marginBottom: 16, paddingVertical: 8 }}
            >
              {isLoadingHighlights ? (
                <ActivityIndicator size="small" color="#262626" style={{ marginRight: 16 }} />
              ) : highlights.length > 0 ? (
                highlights.map((highlight) => (
                  <TouchableOpacity 
                    key={highlight.highlight_id} 
                    style={{ alignItems: 'center', marginRight: 16 }}
                  >
                    <View style={{ 
                      width: 64, 
                      height: 64, 
                      borderRadius: 32, 
                      borderWidth: 1, 
                      borderColor: '#DBDBDB', 
                      overflow: 'hidden',
                      marginBottom: 4,
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <Image
                        source={{ uri: highlight.cover_image_url || 'https://via.placeholder.com/80' }}
                        style={{ width: 60, height: 60, borderRadius: 30 }}
                      />
                    </View>
                    <Text style={{ fontSize: 12, color: '#262626' }}>{highlight.title}</Text>
                  </TouchableOpacity>
                ))
              ) : (
                <Text style={{ color: '#8E8E8E', fontSize: 14 }}>Chưa có highlights</Text>
              )}
            </ScrollView>
            
            {/* Tabs */}
            <View style={{ 
              flexDirection: 'row', 
              borderTopWidth: 0.5, 
              borderTopColor: '#DBDBDB'
            }}>
              <TouchableOpacity 
                style={{ 
                  flex: 1, 
                  alignItems: 'center', 
                  paddingVertical: 10, 
                  borderBottomWidth: activeTab === 'posts' ? 1 : 0,
                  borderBottomColor: activeTab === 'posts' ? '#262626' : 'transparent'
                }}
                onPress={() => setActiveTab('posts')}
              >
                <Ionicons 
                  name="grid-outline" 
                  size={24} 
                  color={activeTab === 'posts' ? '#262626' : '#8E8E8E'} 
                />
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={{ 
                  flex: 1, 
                  alignItems: 'center', 
                  paddingVertical: 10,
                  borderBottomWidth: activeTab === 'saved' ? 1 : 0,
                  borderBottomColor: activeTab === 'saved' ? '#262626' : 'transparent'
                }}
                onPress={() => setActiveTab('saved')}
              >
                <Ionicons 
                  name="bookmark-outline" 
                  size={24} 
                  color={activeTab === 'saved' ? '#262626' : '#8E8E8E'} 
                />
              </TouchableOpacity>
            </View>
            
            {/* Posts Grid */}
            {isLoadingPosts || isLoadingSaved ? (
              <View style={{ paddingVertical: 32, alignItems: 'center' }}>
                <ActivityIndicator size="large" color="#262626" />
              </View>
            ) : (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -1 }}>
                {(activeTab === 'posts' ? posts : savedPosts).map((post) => (
                  <TouchableOpacity 
                    key={post.id} 
                    style={{ width: '33.33%', aspectRatio: 1, padding: 1 }}
                    onPress={() => handlePostPress(post.id)}
                  >
                    <Image
                      source={{ uri: post.media[0]?.media_url || 'https://via.placeholder.com/150' }}
                      style={{ width: '100%', height: '100%' }}
                    />
                    {post.media.length > 1 && (
                      <View style={{ position: 'absolute', top: 8, right: 8 }}>
                        <Ionicons name="copy-outline" size={16} color="#FFFFFF" />
                      </View>
                    )}
                  </TouchableOpacity>
                ))}
          </View>
        )}
        
            {/* Empty state for no posts */}
            {!isLoadingPosts && !isLoadingSaved && 
             ((activeTab === 'posts' && posts.length === 0) || 
              (activeTab === 'saved' && savedPosts.length === 0)) && (
              <View style={{ alignItems: 'center', paddingVertical: 40 }}>
                <Feather name={activeTab === 'posts' ? 'camera' : 'bookmark'} size={40} color="#8E8E8E" />
                <Text style={{ fontSize: 16, fontWeight: '600', color: '#262626', marginTop: 16 }}>
                  {activeTab === 'posts' ? 'Chưa có bài viết' : 'Chưa có bài viết đã lưu'}
                </Text>
              </View>
            )}
          </View>
        </ScrollView>

        {/* Modal hiển thị chi tiết bài viết */}
        <Modal
          visible={showPostModal}
          animationType="slide"
          onRequestClose={handleCloseModal}
        >
          <BottomSheetModalProvider>
            <View style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
              <View style={{ 
                flexDirection: 'row', 
                alignItems: 'center', 
                padding: 12, 
                borderBottomWidth: 0.5, 
                borderBottomColor: '#DBDBDB' 
              }}>
                <TouchableOpacity onPress={handleCloseModal} style={{ padding: 8 }}>
                  <Text style={{ color: '#0095F6', fontWeight: '600' }}>Đóng</Text>
                </TouchableOpacity>
                <Text style={{ 
                  flex: 1, 
                  textAlign: 'center', 
                  fontSize: 16, 
                  fontWeight: '600', 
                  color: '#262626' 
                }}>
                  Bài viết
                </Text>
                <View style={{ width: 50 }}></View>
              </View>

              <FlatList
                data={selectedPostsCollection}
                keyExtractor={(item) => item.id.toString()}
                renderItem={({ item }) => (
                  <PostListItem
                    posts={{
                      post_id: item.id,
                      content: item.caption,
                      media_urls: item.media.map(m => m.media_url),
                      media_types: item.media.map(m => m.media_type),
                      created_at: item.created_at,
                      user_id: Number(user?.id),
                      username: user?.username || '',
                      profile_picture: user?.avatar_url || '',
                      like_count: item.like_count || 0,
                      comment_count: item.comment_count || 0,
                      is_liked: item.is_liked || false,
                      post_privacy: 'public',
                      updated_at: item.created_at
                    }}
                    onLikeCountPress={handleLikeCountPress}
                    onCommentPress={handleCommentPress}
                  />
                )}
                initialScrollIndex={selectedPostsCollection.findIndex(
                  (p) => p.id === selectedPost
                )}
                getItemLayout={(data, index) => ({
                  length: 500, 
                  offset: 500 * index,
                  index,
                })}
                showsVerticalScrollIndicator={true}
              />
              
              {/* BottomSheets bên trong modal */}
              <CommentBottomSheet 
                ref={commentBottomSheetRef}
                postId={commentPostId}
                onCommentAdded={handleCommentAdded}
              />

              <LikeBottomSheet
                ref={likeBottomSheetRef}
                postId={likePostId}
              />
            </View>
          </BottomSheetModalProvider>
        </Modal>

        {/* BottomSheets ở bên ngoài modal chỉ cho profile */}
        <CommentBottomSheet 
          ref={commentBottomSheetRef}
          postId={commentPostId}
          onCommentAdded={handleCommentAdded}
        />

        <LikeBottomSheet
          ref={likeBottomSheetRef}
          postId={likePostId}
        />
    </SafeAreaView>
    </BottomSheetModalProvider>
  );
};

export default UserProfileScreen;
