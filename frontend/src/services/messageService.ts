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
    const response = await apiClient.post<ApiResponse<Message>>('/messages/send', {
      receiver_id,
      group_id,
      content,
      message_type
    });
    return response.data.data;
  }

  async sendMediaMessage(formData: FormData): Promise<Message> {
    const response = await apiClient.post<ApiResponse<Message>>('/messages/media', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data.data;
  }

  async getMessages(conversationId: number, page: number = 1, limit: number = 20): Promise<{ messages: Message[], hasMore: boolean }> {
    try {
      const response = await apiClient.get<ApiResponse<Message[]>>(`/messages/conversations/${conversationId}`, {
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
    await apiClient.post('/messages/read', { message_ids: messageIds });
  }

  async deleteMessage(messageId: number): Promise<void> {
    await apiClient.delete(`/messages/${messageId}`);
  }

  async createConversation(userIds: number[], isGroup: boolean = false, groupName?: string): Promise<Conversation> {
    const response = await apiClient.post<ApiResponse<Conversation>>('/messages/conversations', {
      user_ids: userIds,
      is_group: isGroup,
      group_name: groupName
    });
    return response.data.data;
  }

  async getConversations(page: number = 1, limit: number = 20): Promise<{ conversations: Conversation[], hasMore: boolean }> {
    try {
      const response = await apiClient.get<ApiResponse<Conversation[]>>('/messages/conversations', {
        params: { page, limit }
      });
      return {
        conversations: response.data.data,
        hasMore: response.data.pagination?.hasMore || false
      };
    } catch (error) {
      console.error(`Lỗi khi gọi API /messages/conversations:`, error);
      throw error;
    }
  }

  async addMembersToGroup(groupId: number, userIds: number[]): Promise<void> {
    await apiClient.post(`/messages/groups/${groupId}/members`, {
      user_ids: userIds
    });
  }

  async leaveGroup(groupId: number): Promise<void> {
    await apiClient.delete(`/messages/groups/${groupId}/leave`);
  }

  async updateGroupInfo(groupId: number, groupName?: string, groupAvatar?: File): Promise<Conversation> {
    const formData = new FormData();
    if (groupName) formData.append('group_name', groupName);
    if (groupAvatar) formData.append('group_avatar', groupAvatar);

    const response = await apiClient.put<ApiResponse<Conversation>>(`/messages/groups/${groupId}`, formData, {
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

  async initiateCall(callData: { call_type: 'audio' | 'video', recipient_id?: number, conversation_id?: number }): Promise<any> {
    try {
      interface CallResponse {
        call_id: number;
        recipient_id?: number;
        conversation_id?: number;
        initiator_id?: number;
        participants?: number[];
        call_type: 'audio' | 'video';
        is_group?: boolean;
        started_at?: string;
        status?: string;
      }
      
      console.log('Gửi yêu cầu khởi tạo cuộc gọi đến API:', JSON.stringify(callData));
      const response = await apiClient.post<{status: string, data: CallResponse}>('/messages/calls', callData);
      
      console.log('URL: /messages/calls');
      console.log('Status:', response.status);
      console.log('Data:', JSON.stringify(response.data));
      
      const responseData = response.data.data || response.data;
      
      if (!responseData || !responseData.call_id) {
        console.error('Phản hồi từ API không hợp lệ:', response.data);
        throw new Error('Phản hồi từ server không hợp lệ');
      }
      
      const result: CallResponse = {
        call_id: responseData.call_id,
        call_type: responseData.call_type,
        recipient_id: responseData.recipient_id,
        initiator_id: responseData.initiator_id || undefined,
        conversation_id: responseData.conversation_id || undefined,
        participants: responseData.participants || [responseData.recipient_id!],
        is_group: responseData.is_group || false,
        status: responseData.status || 'initiated',
        started_at: responseData.started_at || new Date().toISOString(),
      };
      
      console.log('Dữ liệu cuộc gọi đã được xử lý:', JSON.stringify(result));
      return result;
    } catch (error: any) {
      console.error('Lỗi khi khởi tạo cuộc gọi:', error);
      console.error('Chi tiết lỗi:', error.response?.status, error.response?.data);
      
      if (error.message === 'Network Error') {
        throw new Error('Lỗi kết nối mạng. Vui lòng kiểm tra kết nối và thử lại.');
      }
      
      const errorMessage = error.response?.data?.message 
        || error.message 
        || 'Không thể khởi tạo cuộc gọi. Vui lòng kiểm tra kết nối mạng và thử lại sau.';
      
      if (error.response?.data?.error?.sqlMessage) {
        console.error('SQL Error:', error.response.data.error.sqlMessage);
      }
      
      throw new Error(errorMessage);
    }
  }

  async answerCall(callId: number, answer: 'accepted' | 'rejected' | 'missed'): Promise<any> {
    try {
      const response = await apiClient.put<ApiResponse<any>>(`/messages/calls/${callId}/answer`, { answer });
      return response.data.data;
    } catch (error) {
      console.error('Lỗi khi trả lời cuộc gọi:', error);
      throw error;
    }
  }

  async endCall(callId: number): Promise<any> {
    try {
      const response = await apiClient.put<ApiResponse<any>>(`/messages/calls/${callId}/end`, {});
      return response.data.data;
    } catch (error) {
      console.error('Lỗi khi kết thúc cuộc gọi:', error);
      throw error;
    }
  }

  async getCallHistory(conversationId?: number, page: number = 1, limit: number = 20): Promise<{ calls: any[], hasMore: boolean }> {
    try {
      const params: any = { page, limit };
      if (conversationId) params.conversation_id = conversationId;
      
      const response = await apiClient.get<ApiResponse<any[]>>(`/messages/calls`, { params });
      return {
        calls: response.data.data,
        hasMore: response.data.pagination?.hasMore || false
      };
    } catch (error) {
      console.error('Lỗi khi lấy lịch sử cuộc gọi:', error);
      throw error;
    }
  }

  async getCallDetails(callId: number): Promise<any> {
    try {
      const response = await apiClient.get<ApiResponse<any>>(`/messages/calls/${callId}`);
      return response.data.data;
    } catch (error) {
      console.error('Lỗi khi lấy chi tiết cuộc gọi:', error);
      throw error;
    }
  }

  async getUserDetails(userId: number): Promise<any> {
    try {
      console.log(`Bắt đầu gọi API lấy thông tin người dùng ID ${userId}`);
      const response = await apiClient.get<any>(`/users/${userId}`);
      console.log('Kết quả API thông tin người dùng:', JSON.stringify(response.data));
      
      // Kiểm tra xem response có cấu trúc nào
      let userData = null;
      
      if (response.data && response.data.data) {
        userData = response.data.data; // Cấu trúc ApiResponse
      } else if (response.data && response.data.user) {
        userData = response.data.user; // Cấu trúc {success, user, source}
      } else if (response.data) {
        userData = response.data; // Trả về trực tiếp
      }
      
      if (!userData || !userData.user_id) {
        console.error('Cấu trúc dữ liệu người dùng không hợp lệ:', response.data);
        throw new Error('Không thể lấy thông tin người dùng');
      }
      
      return userData;
    } catch (error) {
      console.error('Lỗi khi lấy thông tin người dùng:', error);
      throw error;
    }
  }
  
  async getConversationDetails(conversationId: number): Promise<any> {
    try {
      const response = await apiClient.get<ApiResponse<any>>(`/messages/conversations/${conversationId}/details`);
      return response.data.data;
    } catch (error) {
      console.error('Lỗi khi lấy chi tiết cuộc trò chuyện:', error);
      throw error;
    }
  }
}

export default new MessageService(); 