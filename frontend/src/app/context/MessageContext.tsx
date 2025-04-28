import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import messageService, { Message, Conversation } from '../../services/messageService';
import socketService from '../../services/socketService';
import { useAuth } from './AuthContext';

interface MessageContextType {
  conversations: Conversation[];
  activeConversation: Conversation | null;
  messages: Message[];
  loading: boolean;
  hasMoreMessages: boolean;
  unreadCount: number;
  
  sendMessage: (content: string, type?: 'text' | 'media' | 'call') => Promise<void>;
  sendMediaMessage: (file: File, caption?: string) => Promise<void>;
  loadMessages: (conversationId: number, refresh?: boolean) => Promise<void>;
  loadMoreMessages: () => Promise<void>;
  markAsRead: (messageIds: number[]) => Promise<void>;
  setActiveConversation: (conversation: Conversation | null) => void;
  getConversations: () => Promise<Conversation[]>;
  createConversation: (userIds: number[], isGroup?: boolean, groupName?: string) => Promise<Conversation>;
  updateTypingStatus: (isTyping: boolean) => void;
  deleteMessage: (messageId: number) => Promise<void>;
  leaveGroup: (groupId: number) => Promise<void>;
  addMembersToGroup: (groupId: number, userIds: number[]) => Promise<void>;
  updateGroupInfo: (groupId: number, groupName?: string, groupAvatar?: File) => Promise<void>;
}

const MessageContext = createContext<MessageContextType | undefined>(undefined);

export const MessageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [hasMoreMessages, setHasMoreMessages] = useState<boolean>(false);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const { authData } = useAuth();
  const user = authData?.user;

  useEffect(() => {
    if (user) {
      socketService.connect();
    }
    
    return () => {
      if (activeConversation) {
        socketService.leaveRoom(`conversation_${activeConversation.group_id}`);
      }
    };
  }, [user]);

  useEffect(() => {
    if (!activeConversation || !user) return;
    
    const conversationId = activeConversation.group_id;
    
    messageService.joinConversation(conversationId);
    
    const unsubscribeNewMessage = messageService.onNewMessage(conversationId, (newMessage) => {
      if (newMessage.sender_id !== user.user_id) {
        const messageIds = [newMessage.message_id];
        messageService.markAsRead(messageIds);
      }
      
      setMessages(prevMessages => [newMessage, ...prevMessages]);
    });
    
    const unsubscribeMessageRead = messageService.onMessageRead((data) => {
      if (data.conversation_id === conversationId) {
        setMessages(prevMessages => 
          prevMessages.map(msg => 
            data.message_ids.includes(msg.message_id) 
              ? { ...msg, is_read: true } 
              : msg
          )
        );
      }
    });
    
    return () => {
      messageService.leaveConversation(conversationId);
      unsubscribeNewMessage();
      unsubscribeMessageRead();
    };
  }, [activeConversation, user]);

  useEffect(() => {
    if (conversations.length > 0) {
      const total = conversations.reduce((sum, conv) => sum + (conv.unread_count || 0), 0);
      setUnreadCount(total);
    }
  }, [conversations]);

  const getConversations = useCallback(async (): Promise<Conversation[]> => {
    try {
      setLoading(true);
      const result = await messageService.getConversations();
      setConversations(result.conversations);
      return result.conversations;
    } catch (error) {
      console.error('Lỗi khi lấy danh sách cuộc trò chuyện:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const createConversation = useCallback(async (userIds: number[], isGroup: boolean = false, groupName?: string) => {
    try {
      setLoading(true);
      const newConversation = await messageService.createConversation(userIds, isGroup, groupName);
      setConversations(prev => [newConversation, ...prev]);
      return newConversation;
    } catch (error) {
      console.error('Lỗi khi tạo cuộc trò chuyện:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const loadMessages = useCallback(async (conversationId: number, refresh: boolean = false) => {
    try {
      setLoading(true);
      const page = refresh ? 1 : currentPage;
      const result = await messageService.getMessages(conversationId, page);
      
      if (refresh || page === 1) {
        setMessages(result.messages);
      } else {
        setMessages(prev => [...prev, ...result.messages]);
      }
      
      setHasMoreMessages(result.hasMore);
      
      if (!refresh) {
        setCurrentPage(prev => prev + 1);
      } else {
        setCurrentPage(2);
      }
    } catch (error) {
      console.error('Lỗi khi tải tin nhắn:', error);
    } finally {
      setLoading(false);
    }
  }, [currentPage]);

  const loadMoreMessages = useCallback(async () => {
    if (!activeConversation || loading || !hasMoreMessages) return;
    await loadMessages(activeConversation.group_id);
  }, [activeConversation, loading, hasMoreMessages, loadMessages]);

  const sendMessage = useCallback(async (content: string, type: 'text' | 'media' | 'call' = 'text') => {
    if (!activeConversation || !content) return;
    
    try {
      const isGroup = activeConversation.is_group;
      const group_id = isGroup ? activeConversation.group_id : undefined;
      const receiver_id = !isGroup ? activeConversation.group_id : undefined;
      
      await messageService.sendMessage(receiver_id, group_id, content, type);
    } catch (error) {
      console.error('Lỗi khi gửi tin nhắn:', error);
      throw error;
    }
  }, [activeConversation]);

  const sendMediaMessage = useCallback(async (file: File, caption?: string) => {
    if (!activeConversation || !file) return;
    
    try {
      const formData = new FormData();
      formData.append('media', file);
      
      if (caption) {
        formData.append('caption', caption);
      }
      
      if (activeConversation.is_group) {
        formData.append('group_id', activeConversation.group_id.toString());
      } else {
        formData.append('receiver_id', activeConversation.group_id.toString());
      }
      
      const message_type = file.type.startsWith('image/') 
        ? 'image' 
        : file.type.startsWith('video/') 
          ? 'video' 
          : 'audio';
      
      formData.append('message_type', message_type);
      
      await messageService.sendMediaMessage(formData);
    } catch (error) {
      console.error('Lỗi khi gửi tin nhắn đa phương tiện:', error);
      throw error;
    }
  }, [activeConversation]);

  const markAsRead = useCallback(async (messageIds: number[]) => {
    if (!messageIds.length) return;
    
    try {
      await messageService.markAsRead(messageIds);
      
      setMessages(prev => 
        prev.map(msg => 
          messageIds.includes(msg.message_id) 
            ? { ...msg, is_read: true } 
            : msg
        )
      );
      
      if (activeConversation) {
        setConversations(prev => 
          prev.map(conv => 
            conv.group_id === activeConversation.group_id 
              ? { ...conv, unread_count: 0 } 
              : conv
          )
        );
      }
    } catch (error) {
      console.error('Lỗi khi đánh dấu tin nhắn đã đọc:', error);
    }
  }, [activeConversation]);

  const updateTypingStatus = useCallback((isTyping: boolean) => {
    if (!activeConversation) return;
    messageService.sendTypingStatus(activeConversation.group_id, isTyping);
  }, [activeConversation]);

  const deleteMessage = useCallback(async (messageId: number) => {
    try {
      await messageService.deleteMessage(messageId);
      setMessages(prev => prev.filter(msg => msg.message_id !== messageId));
    } catch (error) {
      console.error('Lỗi khi xóa tin nhắn:', error);
      throw error;
    }
  }, []);

  const leaveGroup = useCallback(async (groupId: number) => {
    try {
      await messageService.leaveGroup(groupId);
      setConversations(prev => prev.filter(conv => conv.group_id !== groupId));
      
      if (activeConversation && activeConversation.group_id === groupId) {
        setActiveConversation(null);
      }
    } catch (error) {
      console.error('Lỗi khi rời nhóm:', error);
      throw error;
    }
  }, [activeConversation]);

  const addMembersToGroup = useCallback(async (groupId: number, userIds: number[]) => {
    try {
      await messageService.addMembersToGroup(groupId, userIds);
      
      if (activeConversation && activeConversation.group_id === groupId) {
        const conversations = await getConversations();
        const updatedConversation = conversations.find(c => c.group_id === groupId);
        if (updatedConversation) {
          setActiveConversation(updatedConversation);
        }
      }
    } catch (error) {
      console.error('Lỗi khi thêm thành viên vào nhóm:', error);
      throw error;
    }
  }, [activeConversation, getConversations]);

  const updateGroupInfo = useCallback(async (groupId: number, groupName?: string, groupAvatar?: File) => {
    try {
      const updatedGroup = await messageService.updateGroupInfo(groupId, groupName, groupAvatar);
      
      setConversations(prev => 
        prev.map(conv => 
          conv.group_id === groupId 
            ? { ...conv, group_name: updatedGroup.group_name, group_avatar: updatedGroup.group_avatar } 
            : conv
        )
      );
      
      if (activeConversation && activeConversation.group_id === groupId) {
        setActiveConversation({
          ...activeConversation,
          group_name: updatedGroup.group_name,
          group_avatar: updatedGroup.group_avatar
        });
      }
    } catch (error) {
      console.error('Lỗi khi cập nhật thông tin nhóm:', error);
      throw error;
    }
  }, [activeConversation]);

  const value = {
    conversations,
    activeConversation,
    messages,
    loading,
    hasMoreMessages,
    unreadCount,
    
    sendMessage,
    sendMediaMessage,
    loadMessages,
    loadMoreMessages,
    markAsRead,
    setActiveConversation,
    getConversations,
    createConversation,
    updateTypingStatus,
    deleteMessage,
    leaveGroup,
    addMembersToGroup,
    updateGroupInfo
  };

  return (
    <MessageContext.Provider value={value}>
      {children}
    </MessageContext.Provider>
  );
};

export const useMessages = (): MessageContextType => {
  const context = useContext(MessageContext);
  if (context === undefined) {
    throw new Error('useMessages must be used within a MessageProvider');
  }
  return context;
};

export default MessageContext; 