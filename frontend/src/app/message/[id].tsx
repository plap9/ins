import React, { useState, useEffect, useRef } from 'react';
import { View, FlatList, KeyboardAvoidingView, Platform, ActivityIndicator, Text, Image, TouchableOpacity } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView, Edge } from 'react-native-safe-area-context';
import apiClient from '../../services/apiClient';
import { useAuth } from '../context/AuthContext';
import * as FileSystem from 'expo-file-system';

import MessageHeader from '../../components/message/MessageHeader';
import MessageBubble from '../../components/message/MessageBubble';
import MessageInput from '../../components/message/MessageInput';
import MessageReaction from '../../components/message/MessageReaction';

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
  senderName?: string;
  senderAvatar?: string;
};

type UserType = {
  id: string;
  username: string;
  avatar: string;
  isOnline: boolean;
  lastSeen: string;
  isGroup?: boolean;
};

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
  status: string;
  data: Array<{
    id?: string;
    message_id: number;
    conversation_id: number;
    content: string;
    message_type: 'text' | 'media' | 'call';
    is_read: boolean;
    sent_at: string;
    sender_id: number;
    username?: string;
    profile_picture?: string | null;
    media_url?: string;
  }>;
  pagination?: {
    hasMore: boolean;
    page: number;
    limit: number;
    total: number;
  };
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
  const { id, recipientInfo } = useLocalSearchParams<{ id: string, recipientInfo?: string }>();
  const { authData } = useAuth();
  const currentUserId = authData?.user?.user_id || 0;
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

  useEffect(() => {
    const fetchConversation = async () => {
      if (!id) return;
      
      setIsLoading(true);
      setError(null);
      
      try {
        if (recipientInfo) {
          try {
            const recipientData = JSON.parse(recipientInfo);
            if (recipientData) {
              setUser({
                id: recipientData.id?.toString() || '0',
                username: recipientData.username || 'Người dùng',
                avatar: recipientData.profile_picture || `https://ui-avatars.com/api/?name=${encodeURIComponent(recipientData.username || 'User')}&background=random`,
                isOnline: recipientData.is_online || false,
                lastSeen: 'Hoạt động gần đây',
                isGroup: false
              });
            }
          } catch (parseErr) {
            console.error('Lỗi khi phân tích thông tin người dùng từ params:', parseErr);
          }
        }
        
        const response = await apiClient.get<MessagesResponse>(`/api/messages/conversations/${id}`);
        
        if (response.data && response.data.data && response.data.data.length > 0) {
          const uniqueSenders = Array.from(new Set(response.data.data.map(msg => msg.sender_id)));
          
          let senderInfoMap = new Map();
          
          if (recipientInfo) {
            try {
              const recipient = JSON.parse(recipientInfo);
              if (recipient && recipient.id) {
                senderInfoMap.set(recipient.id.toString(), {
                  username: recipient.username,
                  avatar: recipient.profile_picture
                });
              }
            } catch (e) {
              console.error('Lỗi khi phân tích thông tin recipient:', e);
            }
          }
          
          const isGroup = uniqueSenders.length > 2;
          
          if (!user.username && !isGroup) {
            const otherUserMessage = response.data.data.find(msg => msg.sender_id !== currentUserId);
            
            if (otherUserMessage) {
              const senderInfo = senderInfoMap.get(otherUserMessage.sender_id.toString());
              
              setUser({
                id: otherUserMessage.sender_id.toString(),
                username: senderInfo?.username || otherUserMessage.username || 'Người dùng',
                avatar: senderInfo?.avatar || otherUserMessage.profile_picture || `https://ui-avatars.com/api/?name=${encodeURIComponent(otherUserMessage.username || 'User')}&background=random`,
                isOnline: false,
                lastSeen: 'Hoạt động gần đây',
                isGroup: false
              });
            }
          } else if (isGroup && !user.isGroup) {
            setUser({
              id: id,
              username: 'Nhóm chat',
              avatar: `https://ui-avatars.com/api/?name=Group&background=random`,
              isOnline: false,
              lastSeen: `${uniqueSenders.length} thành viên`,
              isGroup: true
            });
          }
          
          const apiMessages = response.data.data.map((msg) => {
            let senderName, senderAvatar;
            
            if (msg.sender_id === currentUserId) {
              senderName = 'Bạn';
              senderAvatar = authData?.user?.profile_picture || `https://ui-avatars.com/api/?name=Me&background=random`;
            } 
            else if (msg.sender_id !== currentUserId && senderInfoMap.has(msg.sender_id.toString())) {
              const senderInfo = senderInfoMap.get(msg.sender_id.toString());
              senderName = senderInfo.username;
              senderAvatar = senderInfo.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(senderInfo.username)}&background=random`;
            }
            else if (msg.sender_id !== currentUserId && recipientInfo) {
              try {
                const recipient = JSON.parse(recipientInfo);
                senderName = recipient.username || msg.username || 'Người dùng';
                senderAvatar = recipient.profile_picture || msg.profile_picture || `https://ui-avatars.com/api/?name=${encodeURIComponent(senderName)}&background=random`;
              } catch (e) {
                senderName = msg.username || 'Người dùng';
                senderAvatar = msg.profile_picture || `https://ui-avatars.com/api/?name=${encodeURIComponent(msg.username || 'User')}&background=random`;
              }
            }
            else {
              senderName = msg.username || 'Người dùng';
              senderAvatar = msg.profile_picture || `https://ui-avatars.com/api/?name=${encodeURIComponent(msg.username || 'User')}&background=random`;
            }
            
            return {
              id: msg.message_id?.toString() || '',
              content: msg.content || '',
              timestamp: msg.sent_at || new Date().toISOString(),
              isRead: msg.is_read || false,
              isSent: true,
              isDelivered: true,
              type: msg.message_type === 'media' ? 'image' : (msg.message_type as 'text' | 'image' | 'video'),
              mediaUrl: msg.media_url || undefined,
              senderId: msg.sender_id?.toString() || '',
              senderName,
              senderAvatar,
            };
          });
          
          const sortedMessages = [...apiMessages].sort((a, b) => 
            new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
          );
          
          setMessages(sortedMessages);
        } else {
          setMessages([]);
        }
      } catch (err) {
        console.error('Lỗi khi tải cuộc trò chuyện:', err);
        setError('Không thể tải cuộc trò chuyện, vui lòng thử lại sau.');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchConversation();
  }, [id, recipientInfo, currentUserId]);

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
      senderName: 'Bạn',
      senderAvatar: authData?.user?.profile_picture || `https://ui-avatars.com/api/?name=Me&background=random`,
      senderId: currentUserId.toString(),
    };

    setMessages(prev => [...prev, newMessage]);

    try {
      const response = await apiClient.post<MessageResponse>(`/api/messages/conversations/${id}/messages`, {
        content: text,
        type: 'text'
      });
      
      if (response.data && response.data.message) {
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
    
    let processedUri = uri;
    
    const isCameraFile = uri.startsWith('file://') && (
      uri.includes('/cache/') || 
      uri.includes('/Camera/') || 
      uri.includes('/temporary/')
    );
    
    const tempId = Date.now().toString();
    const newMessage: MessageType = {
      id: tempId,
      content: '',
      timestamp: new Date().toISOString(),
      isRead: false,
      isSent: true,
      isDelivered: false,
      type,
      mediaUrl: processedUri, 
      senderName: 'Bạn',
      senderAvatar: authData?.user?.profile_picture || `https://ui-avatars.com/api/?name=Me&background=random`,
      senderId: currentUserId.toString(),
    };

    setMessages(prev => [...prev, newMessage]);

    try {
      let response;
      
      if (isCameraFile) {
        try {
          const base64Data = await FileSystem.readAsStringAsync(uri, {
            encoding: FileSystem.EncodingType.Base64
          });
          
          const contentType = type === 'image' ? 'image/jpeg' : 'video/mp4';
          
          const dataUri = `data:${contentType};base64,${base64Data}`;
          
          response = await apiClient.post<MessageResponse>(`/api/messages/conversations/${id}/upload-media`, {
            type,
            caption: `[${type === 'image' ? 'Hình ảnh' : 'Video'}] - ${new Date().toLocaleTimeString()}`,
            base64Data: dataUri
          });
        } catch (err) {
          console.error('Lỗi khi chuyển đổi URI thành base64:', err);
          throw err;
        }
      } else {
        response = await apiClient.post<MessageResponse>(`/api/messages/conversations/${id}/messages`, {
          content: `[${type === 'image' ? 'Hình ảnh' : 'Video'}] - ${new Date().toLocaleTimeString()}`,
          type: 'text'
        });
      }
      
      if (response?.data && response.data.message) {
        const mediaUrlFromServer = response.data.message.media_url;
        
        setMessages(prev => 
          prev.map(msg => 
            msg.id === tempId
              ? {
                  ...msg,
                  id: response.data.message.id || response.data.message._id || tempId,
                  mediaUrl: mediaUrlFromServer || processedUri,
                  isRead: false,
                  isDelivered: true
                }
              : msg
          )
        );
        
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
      console.error('Chi tiết lỗi:', JSON.stringify(err, null, 2));
      
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
    setShowReactions(false);
  };

  const renderMessage = ({ item }: { item: MessageType }) => {
    const isCurrentUser = item.senderId === currentUserId.toString();
    
    return (
      <MessageBubble
        message={item}
        isOwn={isCurrentUser}
        showAvatar={!isCurrentUser}
        avatar={isCurrentUser ? '' : (item.senderAvatar || user.avatar)}
        isGroup={user.isGroup}
        onLongPress={() => handleLongPressMessage(item.id)}
        onMediaPress={() => {
          if (item.type === 'image' || item.type === 'video') {
            setMediaPreview(item.mediaUrl || null);
            setMediaType(item.type);
            setShowOptions(true);
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
      <SafeAreaView edges={['bottom']} style={{ flex: 1 }} className="flex-1 bg-black">
        <View className="flex-1 items-center justify-center">
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
          user={user}
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
                inverted={true}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingVertical: 10, flexDirection: 'column-reverse' }}
              />
            </View>
            
            <MessageInput
              onSendMessage={handleSendMessage}
              onSendMedia={handleSendMedia}
              onTypingStatusChange={(isTyping) => {
              }}
            />
          </>
        )}
        
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
