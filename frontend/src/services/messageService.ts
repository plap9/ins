import apiClient from './apiClient';
import socketService from './socketService';

export interface Message {
  message_id: number;
  conversation_id: number;
  sender_id: number;
  content: string;
  message_type: 'text' | 'media' | 'call';
  is_read: boolean;
  sent_at: Date;
  username?: string;
  profile_picture?: string;
  media_url?: string;
  media_type?: 'image' | 'video' | 'audio';
  call_status?: 'none' | 'initiated' | 'accepted' | 'rejected' | 'ended' | 'missed';
  call_type?: 'audio' | 'video';
  call_duration?: number;
  call_started_at?: Date;
  reply_to_id?: number;
  disappears_at?: Date;
}

export interface Conversation {
  group_id: number;
  creator_id?: number;
  group_name?: string;
  group_avatar?: string;
  created_at: Date;
  is_group: boolean;
  members?: ConversationMember[];
  last_message?: Message;
  unread_count?: number;
}

export interface ConversationMember {
  member_id: number;
  group_id: number;
  user_id: number;
  role: 'member' | 'admin';
  joined_at: Date;
  username?: string;
  profile_picture?: string;
}

interface ApiResponse<T> {
  status: string;
  data: T;
  pagination?: {
    hasMore: boolean;
    page: number;
    limit: number;
    total: number;
  };
}

class MessageService {
  async sendMessage(receiver_id?: number, group_id?: number, content?: string, message_type: 'text' | 'media' | 'call' = 'text'): Promise<Message> {
    const response = await apiClient.post<ApiResponse<Message>>('/api/messages/send', {
      receiver_id,
      group_id,
      content,
      message_type
    });
    return response.data.data;
  }

  async sendMediaMessage(formData: FormData): Promise<Message> {
    const response = await apiClient.post<ApiResponse<Message>>('/api/messages/media', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data.data;
  }

  async getMessages(conversationId: number, page: number = 1, limit: number = 20): Promise<{ messages: Message[], hasMore: boolean }> {
    try {
      const response = await apiClient.get<ApiResponse<Message[]>>(`/api/messages/conversations/${conversationId}`, {
        params: { page, limit }
      });
      return {
        messages: response.data.data,
        hasMore: response.data.pagination?.hasMore || false
      };
    } catch (error) {
      throw error;
    }
  }

  async markAsRead(messageIds: number[]): Promise<void> {
    await apiClient.post('/api/messages/read', { message_ids: messageIds });
  }

  async deleteMessage(messageId: number): Promise<void> {
    await apiClient.delete(`/api/messages/${messageId}`);
  }

  async createConversation(userIds: number[], isGroup: boolean = false, groupName?: string): Promise<Conversation> {
    const response = await apiClient.post<ApiResponse<Conversation>>('/api/messages/conversations', {
      user_ids: userIds,
      is_group: isGroup,
      group_name: groupName
    });
    return response.data.data;
  }

  async getConversations(page: number = 1, limit: number = 20): Promise<{ conversations: Conversation[], hasMore: boolean }> {
    try {
      const response = await apiClient.get<ApiResponse<Conversation[]>>('/api/messages/conversations', {
        params: { page, limit }
      });
      return {
        conversations: response.data.data,
        hasMore: response.data.pagination?.hasMore || false
      };
    } catch (error) {
      console.error(`Lỗi khi gọi API /api/messages/conversations:`, error);
      throw error;
    }
  }

  async addMembersToGroup(groupId: number, userIds: number[]): Promise<void> {
    await apiClient.post(`/api/messages/groups/${groupId}/members`, {
      user_ids: userIds
    });
  }

  async leaveGroup(groupId: number): Promise<void> {
    await apiClient.delete(`/api/messages/groups/${groupId}/leave`);
  }

  async updateGroupInfo(groupId: number, groupName?: string, groupAvatar?: File): Promise<Conversation> {
    const formData = new FormData();
    if (groupName) formData.append('group_name', groupName);
    if (groupAvatar) formData.append('group_avatar', groupAvatar);

    const response = await apiClient.put<ApiResponse<Conversation>>(`/api/messages/groups/${groupId}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data.data;
  }

  joinConversation(conversationId: number): void {
    socketService.joinRoom(`conversation_${conversationId}`, 'group');
  }

  leaveConversation(conversationId: number): void {
    socketService.leaveRoom(`conversation_${conversationId}`);
  }

  sendMessageViaSocket(conversationId: number, message: any): void {
    socketService.sendMessage(`conversation_${conversationId}`, message);
  }

  sendTypingStatus(conversationId: number, isTyping: boolean): void {
    socketService.sendTypingStatus(`conversation_${conversationId}`, isTyping);
  }

  onNewMessage(conversationId: number, callback: (message: Message) => void): () => void {
    return socketService.onRoomMessage(`conversation_${conversationId}`, callback);
  }

  onMessageRead(callback: (data: { conversation_id: number, reader_id: number, message_ids: number[] }) => void): () => void {
    return socketService.onRoomMessage('message_read', callback as any);
  }
}

export default new MessageService(); 