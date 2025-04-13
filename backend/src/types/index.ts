export interface User {
  user_id: number;
  username: string;
  email?: string;
  full_name?: string;
  profile_picture?: string;
  bio?: string;
  is_private?: boolean;
  is_verified?: boolean;
}

export interface Message {
  message_id: number;
  sender_id: number;
  receiver_id?: number;
  group_id?: number;
  content: string;
  message_type: 'text' | 'media' | 'call';
  is_read: boolean;
  sent_at: Date;
  media_url?: string;
  media_type?: string;
}

export type ReactionType = 'like' | 'love' | 'haha' | 'wow' | 'sad' | 'angry'; 