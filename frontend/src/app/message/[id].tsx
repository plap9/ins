import React, { useState, useEffect, useRef } from 'react';
import { View, FlatList, KeyboardAvoidingView, Platform, ActivityIndicator, Text, Image, TouchableOpacity } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView, Edge } from 'react-native-safe-area-context';
import apiClient from '../../services/apiClient';

// Import các components
import MessageHeader from '../../components/message/MessageHeader';
import MessageBubble from '../../components/message/MessageBubble';
import MessageInput from '../../components/message/MessageInput';
import MessageReaction from '../../components/message/MessageReaction';

// Định nghĩa kiểu tin nhắn
type MessageType = {
  id: string;
  content: string;
  timestamp: string;
  isRead: boolean;
  isSent: boolean;
  isDelivered: boolean;
  type: 'text' | 'image' | 'video';
  mediaUrl?: string;
  senderId?: string;
};

// Định nghĩa kiểu người dùng
type UserType = {
  id: string;
  username: string;
  avatar: string;
  isOnline: boolean;
  lastSeen: string;
};

// Định nghĩa kiểu dữ liệu API response
interface ConversationResponse {
  conversation: {
    id: string;
    recipient?: {
      id: string;
      username: string;
      profile_picture?: string;
      is_online?: boolean;
      last_active?: string;
    };
    is_group?: boolean;
    created_at: string;
  };
}

interface MessagesResponse {
  messages: Array<{
    id?: string;
    _id?: string;
    content?: string;
    created_at?: string;
    is_read?: boolean;
    media_type?: string;
    media_url?: string;
    sender_id?: string;
  }>;
}

interface MessageResponse {
  message: {
    id?: string;
    _id?: string;
    content?: string;
    media_url?: string;
  };
}

export default function ConversationScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [isLoading, setIsLoading] = useState(true);
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<'image' | 'video'>('image');
  const [showReactions, setShowReactions] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null);
  const [messages, setMessages] = useState<MessageType[]>([]);
  const [user, setUser] = useState<UserType>({
    id: '',
    username: '',
    avatar: '',
    isOnline: false,
    lastSeen: '',
  });
  const [error, setError] = useState<string | null>(null);
  const flatListRef = useRef<FlatList>(null);

  // Fetch conversation and messages from API
  useEffect(() => {
    const fetchConversation = async () => {
      if (!id) return;
      
      setIsLoading(true);
      setError(null);
      
      try {
        // Fetch conversation details
        const convResponse = await apiClient.get<ConversationResponse>(`/messages/conversations/${id}`);
        
        if (convResponse.data && convResponse.data.conversation) {
          const conv = convResponse.data.conversation;
          setUser({
            id: conv.recipient?.id || '',
            username: conv.recipient?.username || 'Người dùng',
            avatar: conv.recipient?.profile_picture || 'https://randomuser.me/api/portraits/lego/1.jpg',
            isOnline: conv.recipient?.is_online || false,
            lastSeen: formatLastSeen(conv.recipient?.last_active),
          });
          
          // Fetch messages
          const messagesResponse = await apiClient.get<MessagesResponse>(`/messages/conversations/${id}/messages`);
          
          if (messagesResponse.data && messagesResponse.data.messages) {
            const apiMessages = messagesResponse.data.messages.map((msg) => ({
              id: msg.id || msg._id || '',
              content: msg.content || '',
              timestamp: msg.created_at || new Date().toISOString(),
              isRead: msg.is_read || false,
              isSent: true,
              isDelivered: true,
              type: msg.media_type ? (msg.media_type === 'photo' ? 'image' : 'video') : 'text' as 'text' | 'image' | 'video',
              mediaUrl: msg.media_url || undefined,
              senderId: msg.sender_id,
            }));
            
            setMessages(apiMessages);
          }
        }
      } catch (err) {
        console.error('Lỗi khi tải cuộc trò chuyện:', err);
        setError('Không thể tải cuộc trò chuyện, vui lòng thử lại sau.');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchConversation();
  }, [id]);

  // Format last seen time
  const formatLastSeen = (lastActive?: string) => {
    if (!lastActive) return 'Không hoạt động';
    
    const lastActiveDate = new Date(lastActive);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - lastActiveDate.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) {
      return 'Vừa hoạt động';
    } else if (diffInMinutes < 60) {
      return `Hoạt động ${diffInMinutes} phút trước`;
    } else if (diffInMinutes < 1440) {
      return `Hoạt động ${Math.floor(diffInMinutes / 60)} giờ trước`;
    } else {
      return `Hoạt động ${Math.floor(diffInMinutes / 1440)} ngày trước`;
    }
  };

  const handleSendMessage = async (text: string) => {
    if (!text.trim() || !id) return;
    
    const tempId = Date.now().toString();
    const newMessage: MessageType = {
      id: tempId,
      content: text,
      timestamp: new Date().toISOString(),
      isRead: false,
      isSent: true,
      isDelivered: false,
      type: 'text',
    };

    // Optimistic update
    setMessages(prev => [newMessage, ...prev]);

    try {
      // Send message to server
      const response = await apiClient.post<MessageResponse>(`/messages/conversations/${id}/messages`, {
        content: text,
        type: 'text'
      });
      
      if (response.data && response.data.message) {
        // Update with server data
        setMessages(prev => 
          prev.map(msg => 
            msg.id === tempId
              ? {
                  ...msg,
                  id: response.data.message.id || response.data.message._id || tempId,
                  isRead: false,
                  isDelivered: true
                }
              : msg
          )
        );
        
        // Giả lập đánh dấu đã đọc sau 2 giây
        setTimeout(() => {
          setMessages(prev => 
            prev.map(msg => 
              msg.id === (response.data.message.id || response.data.message._id || tempId)
                ? { ...msg, isRead: true }
                : msg
            )
          );
        }, 2000);
      }
    } catch (err) {
      console.error('Lỗi khi gửi tin nhắn:', err);
      
      // Update message to show error
      setMessages(prev => 
        prev.map(msg => 
          msg.id === tempId
            ? { ...msg, isSent: false, isDelivered: false }
            : msg
        )
      );
    }
  };

  const handleSendMedia = async (uri: string, type: 'image' | 'video') => {
    if (!uri || !id) return;
    
    const tempId = Date.now().toString();
    const newMessage: MessageType = {
      id: tempId,
      content: '',
      timestamp: new Date().toISOString(),
      isRead: false,
      isSent: true,
      isDelivered: false,
      type,
      mediaUrl: uri,
    };

    // Optimistic update
    setMessages(prev => [newMessage, ...prev]);

    try {
      // Create form data
      const formData = new FormData();
      // Thêm typecast để không xảy ra lỗi TypeScript
      formData.append('media', {
        uri,
        type: type === 'image' ? 'image/jpeg' : 'video/mp4',
        name: `${type}_${Date.now()}.${type === 'image' ? 'jpg' : 'mp4'}`
      } as unknown as Blob);
      formData.append('type', type);
      
      // Send media to server
      const response = await apiClient.post<MessageResponse>(`/messages/conversations/${id}/messages/media`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      if (response.data && response.data.message) {
        // Update with server data
        setMessages(prev => 
          prev.map(msg => 
            msg.id === tempId
              ? {
                  ...msg,
                  id: response.data.message.id || response.data.message._id || tempId,
                  mediaUrl: response.data.message.media_url || uri,
                  isRead: false,
                  isDelivered: true
                }
              : msg
          )
        );
        
        // Giả lập đánh dấu đã đọc sau 2 giây
        setTimeout(() => {
          setMessages(prev => 
            prev.map(msg => 
              msg.id === (response.data.message.id || response.data.message._id || tempId)
                ? { ...msg, isRead: true }
                : msg
            )
          );
        }, 2000);
      }
    } catch (err) {
      console.error('Lỗi khi gửi media:', err);
      
      // Update message to show error
      setMessages(prev => 
        prev.map(msg => 
          msg.id === tempId
            ? { ...msg, isSent: false, isDelivered: false }
            : msg
        )
      );
    }
  };

  const handleLongPressMessage = (messageId: string) => {
    setSelectedMessageId(messageId);
    setShowOptions(true);
  };

  const handleReaction = (emoji: string) => {
    // Xử lý phản ứng tin nhắn
    setShowReactions(false);
  };

  const renderMessage = ({ item }: { item: MessageType }) => {
    const isOwn = item.senderId !== user.id;
    
    return (
      <MessageBubble
        message={item}
        isOwn={isOwn}
        showAvatar={!isOwn && true}
        avatar={user.avatar}
        onLongPress={() => handleLongPressMessage(item.id)}
        onReactionPress={() => setShowReactions(true)}
        onMediaPress={() => {
          if (item.type === 'image' || item.type === 'video') {
            setMediaPreview(item.mediaUrl || null);
            setMediaType(item.type);
          }
        }}
      />
    );
  };

  const renderErrorState = () => (
    <View className="flex-1 justify-center items-center p-5">
      <Ionicons name="alert-circle-outline" size={60} color="#ff3b30" />
      <Text className="text-white text-lg mt-4 text-center">{error}</Text>
      <TouchableOpacity 
        className="mt-6 bg-blue-500 px-6 py-3 rounded-full"
        onPress={() => setIsLoading(true)}
      >
        <Text className="text-white font-medium">Thử lại</Text>
      </TouchableOpacity>
    </View>
  );

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-black">
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#0095f6" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['top' as Edge]} className="flex-1 bg-black">
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <StatusBar style="light" />
        
        <MessageHeader
          username={user.username}
          avatar={user.avatar}
          userId={user.id}
          isOnline={user.isOnline}
          lastSeen={user.lastSeen}
          showCallButtons={true}
        />
        
        {error ? (
          renderErrorState()
        ) : (
          <>
            <View className="flex-1 px-2">
              <FlatList
                ref={flatListRef}
                data={messages}
                renderItem={renderMessage}
                keyExtractor={item => item.id}
                inverted
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingVertical: 10 }}
              />
            </View>
            
            <MessageInput
              onSendMessage={handleSendMessage}
              onSendMedia={handleSendMedia}
              onTypingStatusChange={(isTyping) => {
                // Xử lý trạng thái đang nhập
              }}
            />
          </>
        )}
        
        {/* Hiển thị phản ứng tin nhắn */}
        {showReactions && (
          <View className="absolute bottom-16 left-0 right-0 mx-4">
            <MessageReaction
              reactions={[
                { emoji: '❤️', count: 2, userReacted: true },
                { emoji: '😂', count: 1, userReacted: false },
                { emoji: '👍', count: 0, userReacted: false },
                { emoji: '😮', count: 0, userReacted: false },
                { emoji: '😢', count: 0, userReacted: false },
                { emoji: '🔥', count: 0, userReacted: false },
              ]}
              onReactionPress={handleReaction}
              onShowAllReactions={() => {}}
            />
          </View>
        )}
        
        {/* Hiển thị tùy chọn tin nhắn */}
        {showOptions && (
          <View className="absolute bottom-16 left-0 right-0 mx-4">
            <View className="bg-[#333333] rounded-lg p-2">
              <View className="flex-row flex-wrap justify-around">
                <TouchableOpacity 
                  className="items-center p-3"
                  onPress={() => {
                    setShowOptions(false);
                    setShowReactions(true);
                  }}
                >
                  <Ionicons name="happy-outline" size={24} color="white" />
                  <Text className="text-white text-xs mt-1">Reaction</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  className="items-center p-3"
                  onPress={() => setShowOptions(false)}
                >
                  <Ionicons name="arrow-undo-outline" size={24} color="white" />
                  <Text className="text-white text-xs mt-1">Reply</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  className="items-center p-3"
                  onPress={() => setShowOptions(false)}
                >
                  <Ionicons name="arrow-redo-outline" size={24} color="white" />
                  <Text className="text-white text-xs mt-1">Forward</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  className="items-center p-3"
                  onPress={() => setShowOptions(false)}
                >
                  <Ionicons name="copy-outline" size={24} color="white" />
                  <Text className="text-white text-xs mt-1">Copy</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  className="items-center p-3"
                  onPress={() => setShowOptions(false)}
                >
                  <Ionicons name="trash-outline" size={24} color="white" />
                  <Text className="text-white text-xs mt-1">Delete</Text>
                </TouchableOpacity>
              </View>
              
              <TouchableOpacity 
                className="self-end mt-2 px-3 py-1"
                onPress={() => setShowOptions(false)}
              >
                <Text className="text-blue-500">Đóng</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
        
        {/* Hiển thị xem trước media */}
        {mediaPreview && (
          <View className="absolute inset-0 bg-black/90 justify-center items-center">
            <View className="w-full h-full justify-center items-center">
              {mediaType === 'image' && (
                <Image source={{ uri: mediaPreview }} className="w-full h-3/4" resizeMode="contain" />
              )}
              
              {mediaType === 'video' && (
                <View className="w-full h-3/4 justify-center items-center">
                  <Image source={{ uri: mediaPreview }} className="w-full h-full" resizeMode="contain" />
                  <View className="absolute">
                    <Ionicons name="play-circle" size={60} color="white" />
                  </View>
                </View>
              )}
              
              <TouchableOpacity
                onPress={() => setMediaPreview(null)}
                className="absolute top-10 right-5"
              >
                <Ionicons name="close-circle" size={36} color="white" />
              </TouchableOpacity>
            </View>
          </View>
        )}
        
        {/* Thông báo "Vuốt lên để bật tính năng tin nhắn tự hủy" */}
        <View className="absolute bottom-16 left-0 right-0 items-center">
          <Text className="text-gray-500 text-xs">Vuốt lên để bật tính năng tin nhắn tự hủy</Text>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
