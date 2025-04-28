import { Request, Response } from "express";
import pool from "../../config/db";
import { AuthRequest } from "../../middlewares/authMiddleware"; 
import { AppException } from "../../middlewares/errorHandler";
import { ErrorCode } from "../../types/errorCode";
import { RowDataPacket, OkPacket, ResultSetHeader } from "mysql2";
import SocketService from "../../utils/socketService";
import { uploadToS3 } from "../../utils/s3Utils";
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';

let socketServiceInstance: SocketService;

export const initializeSocketService = (instance: SocketService) => {
  socketServiceInstance = instance;
};

interface MessageRow extends RowDataPacket {
  message_id: number;
  sender_id: number;
  receiver_id: number;
  content: string;
  message_type: 'text' | 'media' | 'call';
  is_read: number;
  sent_at: Date;
  call_status: 'none' | 'initiated' | 'accepted' | 'rejected' | 'ended' | 'missed';
  call_type: 'audio' | 'video' | null;
  call_duration: number | null;
  call_started_at: Date | null;
  group_id: number | null;
  reply_to_id: number | null;
  disappears_at: Date | null;
}

interface ConversationRow extends RowDataPacket {
  group_id: number;
  creator_id: number;
  group_name: string;
  group_avatar: string | null;
  created_at: Date;
}

interface ConversationMemberRow extends RowDataPacket {
  member_id: number;
  group_id: number;
  user_id: number;
  role: 'member' | 'admin';
  joined_at: Date;
}

export const sendMessage = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.user_id;
    
    if (!userId) {
      throw new AppException("Không xác định được người dùng", ErrorCode.USER_NOT_AUTHENTICATED, 401);
    }
    
    const { receiver_id, group_id, content, message_type = 'text' } = req.body;
    
    if ((!receiver_id && !group_id) || !content) {
      throw new AppException("Thiếu thông tin tin nhắn", ErrorCode.VALIDATION_ERROR, 400);
    }
    
    if (group_id) {
      const [memberCheck] = await pool.query<ConversationMemberRow[]>(
        "SELECT * FROM group_members WHERE group_id = ? AND user_id = ?",
        [group_id, userId]
      );
      
      if (memberCheck.length === 0) {
        throw new AppException("Bạn không thuộc nhóm chat này", ErrorCode.RESOURCE_ACCESS_DENIED, 403);
      }
    }

    const [result] = await pool.query<ResultSetHeader>(
      "INSERT INTO messages (sender_id, receiver_id, content, message_type, group_id) VALUES (?, ?, ?, ?, ?)",
      [userId, receiver_id || null, content, message_type, group_id || null]
    );
    
    const messageId = result.insertId;
    
    const [messages] = await pool.query<MessageRow[]>(
      `SELECT m.*, u.username, u.profile_picture 
       FROM messages m
       JOIN users u ON m.sender_id = u.user_id
       WHERE m.message_id = ?`,
      [messageId]
    );
    
    if (messages.length === 0) {
      throw new AppException("Lỗi khi tạo tin nhắn", ErrorCode.SERVER_ERROR, 500);
    }

    const message = messages[0];
    
    if (group_id) {
      await pool.query(
        "UPDATE chat_groups SET last_message_id = ? WHERE group_id = ?",
        [messageId, group_id]
      );
      
      const roomId = `group_${group_id}`;
      if (socketServiceInstance) {
        socketServiceInstance.notifyNewMessage(roomId, message);
      }
    } else if (receiver_id) {
      const receiverRoomId = `user_${receiver_id}`;
      if (socketServiceInstance) {
        socketServiceInstance.notifyNewMessage(receiverRoomId, message);
      }
    }

    res.status(201).json({
      status: "success",
      data: message
    });
  } catch (error) {
    if (error instanceof AppException) {
      throw error;
    }
    throw new AppException("Lỗi khi gửi tin nhắn", ErrorCode.SERVER_ERROR, 500);
  }
};

export const sendMediaMessage = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.user_id;
    
    if (!userId) {
      throw new AppException("Không xác định được người dùng", ErrorCode.USER_NOT_AUTHENTICATED, 401);
    }
    
    const { receiver_id, group_id, message_type, caption } = req.body;
    
    if ((!receiver_id && !group_id) || !message_type || !req.file) {
      throw new AppException("Thiếu thông tin tin nhắn", ErrorCode.VALIDATION_ERROR, 400);
    }
    
    if (group_id) {
      const [memberCheck] = await pool.query<ConversationMemberRow[]>(
        "SELECT * FROM group_members WHERE group_id = ? AND user_id = ?",
        [group_id, userId]
      );
      
      if (memberCheck.length === 0) {
        throw new AppException("Bạn không thuộc nhóm chat này", ErrorCode.RESOURCE_ACCESS_DENIED, 403);
      }
    }

    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      
      const [messageResult] = await connection.query<ResultSetHeader>(
        "INSERT INTO messages (sender_id, receiver_id, content, message_type, group_id) VALUES (?, ?, ?, ?, ?)",
        [userId, receiver_id || null, caption || '', 'media', group_id || null]
      );
      
      const messageId = messageResult.insertId;
      
      const mediaType = message_type === 'image' ? 'image' : message_type === 'video' ? 'video' : 'audio';
      
      await connection.query(
        "INSERT INTO media (media_url, media_type, message_id, content_type) VALUES (?, ?, ?, 'message')",
        [req.file.path, mediaType, messageId]
      );
      
      if (group_id) {
        await connection.query(
          "UPDATE chat_groups SET last_message_id = ? WHERE group_id = ?",
          [messageId, group_id]
        );
      }
      
      await connection.commit();
      
      const [messages] = await pool.query<MessageRow[]>(
        `SELECT m.*, u.username, u.profile_picture, med.media_url, med.media_type
         FROM messages m
         JOIN users u ON m.sender_id = u.user_id
         JOIN media med ON m.message_id = med.message_id
         WHERE m.message_id = ?`,
        [messageId]
      );
      
      const message = messages[0];
      
      if (group_id) {
        const roomId = `group_${group_id}`;
        if (socketServiceInstance) {
          socketServiceInstance.notifyNewMessage(roomId, message);
        }
      } else if (receiver_id) {
        const receiverRoomId = `user_${receiver_id}`;
        if (socketServiceInstance) {
          socketServiceInstance.notifyNewMessage(receiverRoomId, message);
        }
      }

      res.status(201).json({
        status: "success",
        data: message
      });
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    if (error instanceof AppException) {
      throw error;
    }
    throw new AppException("Lỗi khi gửi tin nhắn đa phương tiện", ErrorCode.SERVER_ERROR, 500);
  }
};

export const getMessages = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.user_id;
    
    if (!userId) {
      throw new AppException("Không xác định được người dùng", ErrorCode.USER_NOT_AUTHENTICATED, 401);
    }
    
    const { receiver_id, group_id } = req.query;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = (page - 1) * limit;
    
    if (!receiver_id && !group_id) {
      throw new AppException("Thiếu ID người nhận hoặc ID nhóm", ErrorCode.VALIDATION_ERROR, 400);
    }
    
    let query = '';
    let params: any[] = [];
    
    if (group_id) {
      const [memberCheck] = await pool.query<ConversationMemberRow[]>(
        "SELECT * FROM group_members WHERE group_id = ? AND user_id = ?",
        [group_id, userId]
      );
      
      if (memberCheck.length === 0) {
        throw new AppException("Bạn không thuộc nhóm chat này", ErrorCode.RESOURCE_ACCESS_DENIED, 403);
      }
      
      query = `
        SELECT m.*, u.username, u.profile_picture, 
               med.media_url, med.media_type, med.thumbnail_url,
               r.username as reply_username
        FROM messages m
        JOIN users u ON m.sender_id = u.user_id
        LEFT JOIN media med ON m.message_id = med.message_id AND med.content_type = 'message'
        LEFT JOIN messages rm ON m.reply_to_id = rm.message_id
        LEFT JOIN users r ON rm.sender_id = r.user_id
        WHERE m.group_id = ?
        ORDER BY m.sent_at DESC
        LIMIT ? OFFSET ?
      `;
      params = [group_id, limit, offset];
    } else {
      query = `
        SELECT m.*, u.username, u.profile_picture, 
               med.media_url, med.media_type, med.thumbnail_url,
               r.username as reply_username
        FROM messages m
        JOIN users u ON m.sender_id = u.user_id
        LEFT JOIN media med ON m.message_id = med.message_id AND med.content_type = 'message'
        LEFT JOIN messages rm ON m.reply_to_id = rm.message_id
        LEFT JOIN users r ON rm.sender_id = r.user_id
        WHERE (m.sender_id = ? AND m.receiver_id = ?) OR (m.sender_id = ? AND m.receiver_id = ?)
        ORDER BY m.sent_at DESC
        LIMIT ? OFFSET ?
      `;
      params = [userId, receiver_id, receiver_id, userId, limit, offset];
    }
    
    const [messages] = await pool.query<MessageRow[]>(query, params);
    
    if (messages.length > 0) {
      if (group_id) {
        await pool.query(
          "UPDATE messages SET is_read = 1 WHERE group_id = ? AND sender_id != ? AND is_read = 0",
          [group_id, userId]
        );
      } else {
        await pool.query(
          "UPDATE messages SET is_read = 1 WHERE sender_id = ? AND receiver_id = ? AND is_read = 0",
          [receiver_id, userId]
        );
      }
    }
    
    res.status(200).json({
      status: "success",
      data: messages.reverse() 
    });
  } catch (error) {
    if (error instanceof AppException) {
      throw error;
    }
    throw new AppException("Lỗi khi lấy tin nhắn", ErrorCode.SERVER_ERROR, 500);
  }
};

export const createConversation = async (req: AuthRequest, res: Response): Promise<void> => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    
    const userId = req.user?.user_id;
    
    if (!userId) {
      throw new AppException("Không xác định được người dùng", ErrorCode.USER_NOT_AUTHENTICATED, 401);
    }
    
    const { participants, name, type = 'private' } = req.body;
    
    if (!participants || !Array.isArray(participants) || participants.length === 0) {
      throw new AppException("Danh sách người tham gia không hợp lệ", ErrorCode.VALIDATION_ERROR, 400);
    }
    
    if (type === 'private' && participants.length > 1) {
      throw new AppException("Cuộc trò chuyện riêng tư chỉ cho phép 2 người", ErrorCode.VALIDATION_ERROR, 400);
    }
    
    if (!participants.includes(userId)) {
      participants.push(userId);
    }
    
    if (type === 'private' && participants.length === 2) {
      const [existingConversation] = await connection.query<ConversationRow[]>(
        `SELECT cg.group_id AS conversation_id
         FROM chat_groups cg
         WHERE cg.type = 'private' AND cg.group_id IN (
           SELECT gm1.group_id
           FROM group_members gm1
           JOIN group_members gm2 ON gm1.group_id = gm2.group_id
           WHERE gm1.user_id = ? AND gm2.user_id = ?
           GROUP BY gm1.group_id
           HAVING COUNT(DISTINCT gm1.user_id, gm2.user_id) = 2
         )`,
        [userId, participants.find(id => id !== userId)]
      );
      
      if (existingConversation.length > 0) {
        const conversation = existingConversation[0];
        
        await connection.commit();
        
        res.status(200).json({
          status: "success",
          message: "Cuộc trò chuyện đã tồn tại",
          data: {
            conversation_id: conversation.conversation_id,
            type: 'private'
          }
        });
        return;
      }
    }
    
    const [conversationResult] = await connection.query<ResultSetHeader>(
      "INSERT INTO chat_groups (creator_id, name, type) VALUES (?, ?, ?)",
      [userId, name || null, type]
    );
    
    const conversationId = conversationResult.insertId;
    
    const memberValues = participants.map(participantId => {
      const role = participantId === userId ? 'admin' : 'member';
      return [conversationId, participantId, role];
    });
    
    const memberPlaceholders = memberValues.map(() => '(?, ?, ?)').join(',');
    await connection.query(
      `INSERT INTO group_members (group_id, user_id, role) VALUES ${memberPlaceholders}`,
      memberValues.flat()
    );
    
    await connection.commit();
    
    res.status(201).json({
      status: "success",
      data: {
        conversation_id: conversationId,
        type,
        name: name || null,
        creator_id: userId,
        participants
      }
    });
  } catch (error) {
    await connection.rollback();
    if (error instanceof AppException) {
      throw error;
    }
    throw new AppException("Lỗi khi tạo cuộc trò chuyện", ErrorCode.SERVER_ERROR, 500);
  } finally {
    connection.release();
  }
};

export const getConversations = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.user_id;
    
    if (!userId) {
      throw new AppException("Không xác định được người dùng", ErrorCode.USER_NOT_AUTHENTICATED, 401);
    }
    
    const [memberGroups] = await pool.query<ConversationRow[]>(`
      SELECT cg.* 
      FROM chat_groups cg
      JOIN group_members gm ON cg.group_id = gm.group_id
      WHERE gm.user_id = ?
      ORDER BY cg.created_at DESC
    `, [userId]);
    
    
    if (memberGroups.length === 0) {
      res.status(200).json({
        conversations: []
      });
      return;
    }
    
    const conversationIds = memberGroups.map(group => group.group_id);
    
    const placeholders = conversationIds.map(() => '?').join(',');
    const [lastMessages] = await pool.query<MessageRow[]>(`
      SELECT m.*
      FROM messages m
      INNER JOIN (
        SELECT MAX(message_id) as max_id, COALESCE(group_id, CONCAT(sender_id, '_', receiver_id)) as conversation_key
        FROM messages
        WHERE (group_id IN (${placeholders}) OR 
              (sender_id IN (${placeholders}) AND receiver_id = ?) OR
              (receiver_id IN (${placeholders}) AND sender_id = ?))
        GROUP BY conversation_key
      ) t ON m.message_id = t.max_id
    `, [...conversationIds, ...conversationIds, userId, ...conversationIds, userId]);
    
    
    const lastMessageMap = new Map();
    lastMessages.forEach(msg => {
      lastMessageMap.set(msg.group_id, msg);
    });
    
    const [groupMembers] = await pool.query<ConversationMemberRow[]>(`
      SELECT gm.*, u.username, u.profile_picture
      FROM group_members gm
      JOIN users u ON gm.user_id = u.user_id
      WHERE gm.group_id IN (${placeholders})
      ORDER BY gm.joined_at ASC
    `, [...conversationIds]);
    
    const memberMap = new Map();
    groupMembers.forEach(member => {
      if (!memberMap.has(member.group_id)) {
        memberMap.set(member.group_id, []);
      }
      memberMap.get(member.group_id).push({
        member_id: member.member_id,
        group_id: member.group_id,
        user_id: member.user_id,
        role: member.role,
        joined_at: member.joined_at,
        username: member.username,
        profile_picture: member.profile_picture
      });
    });
    
    const [unreadCounts] = await pool.query<RowDataPacket[]>(`
      SELECT m.group_id, COUNT(*) as unread_count
      FROM messages m
      LEFT JOIN message_status ms ON m.message_id = ms.message_id AND ms.user_id = ? 
      WHERE m.group_id IN (${placeholders})
      AND m.sender_id != ?
      AND (ms.status IS NULL OR ms.status = 'delivered')
      GROUP BY m.group_id
    `, [userId, ...conversationIds, userId]);
    
    const unreadMap = new Map();
    unreadCounts.forEach((item: RowDataPacket) => {
      unreadMap.set(item.group_id, item.unread_count);
    });
    
    const conversations = memberGroups.map(group => {
      const lastMessage = lastMessageMap.get(group.group_id);
      const members = memberMap.get(group.group_id) || [];
      const unreadCount = unreadMap.get(group.group_id) || 0;
      const isGroup = members.length > 2;
      
      if (!isGroup && members.length === 2) {
        const otherMember = members.find((m: any) => m.user_id !== userId);
        
        return {
          group_id: group.group_id,
          creator_id: group.creator_id,
          is_group: false,
          created_at: group.created_at,
          unread_count: unreadCount,
          members,
          last_message: lastMessage || null,
          recipient: otherMember ? {
            username: otherMember.username,
            profile_picture: otherMember.profile_picture,
            id: otherMember.user_id,
            is_online: false 
          } : null
        };
      }
      
      return {
        group_id: group.group_id,
        creator_id: group.creator_id,
        group_name: group.group_name,
        group_avatar: group.group_avatar,
        created_at: group.created_at,
        is_group: true,
        unread_count: unreadCount,
        members,
        last_message: lastMessage || null
      };
    });
    
    
    res.status(200).json({
      conversations
    });
  } catch (error) {
    console.error("Lỗi khi lấy danh sách cuộc trò chuyện:", error);
    res.status(200).json({
      conversations: []
    });
  }
};

export const markAsRead = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.user_id;
    
    if (!userId) {
      throw new AppException("Không xác định được người dùng", ErrorCode.USER_NOT_AUTHENTICATED, 401);
    }
    
    const { message_ids } = req.body;
    
    if (!message_ids || !Array.isArray(message_ids) || message_ids.length === 0) {
      throw new AppException("Danh sách ID tin nhắn không hợp lệ", ErrorCode.VALIDATION_ERROR, 400);
    }

    const placeholders = message_ids.map(() => '?').join(',');
    
    await pool.query(
      `UPDATE message_status 
       SET status = 'read', timestamp = NOW()
       WHERE message_id IN (${placeholders}) AND user_id = ?`,
      [...message_ids, userId]
    );
    
    const [messageInfo] = await pool.query<RowDataPacket[]>(
      `SELECT DISTINCT conversation_id, sender_id 
       FROM messages 
       WHERE message_id IN (${placeholders})`,
      [...message_ids]
    );
    
    if (messageInfo.length > 0) {
      const conversationId = messageInfo[0].conversation_id;
      const senderId = messageInfo[0].sender_id;
      
      if (senderId !== userId) {
        const roomId = `conversation_${conversationId}`;
        if (socketServiceInstance) {
          socketServiceInstance.broadcastEvent('message:read', {
            conversation_id: conversationId,
            reader_id: userId,
            message_ids
          });
        }
      }
    }

    res.status(200).json({
      status: "success",
      message: "Đã cập nhật trạng thái tin nhắn"
    });
  } catch (error) {
    if (error instanceof AppException) {
      throw error;
    }
    throw new AppException("Lỗi khi cập nhật trạng thái tin nhắn", ErrorCode.SERVER_ERROR, 500);
  }
};

export const deleteMessage = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.user_id;
    
    if (!userId) {
      throw new AppException("Không xác định được người dùng", ErrorCode.USER_NOT_AUTHENTICATED, 401);
    }
    
    const messageId = parseInt(req.params.messageId);
    
    if (!messageId) {
      throw new AppException("ID tin nhắn không hợp lệ", ErrorCode.VALIDATION_ERROR, 400);
    }
    
    const [message] = await pool.query<MessageRow[]>(
      "SELECT sender_id, conversation_id FROM messages WHERE message_id = ?",
      [messageId]
    );
    
    if (message.length === 0) {
      throw new AppException("Tin nhắn không tồn tại", ErrorCode.NOT_FOUND, 404);
    }
    
    if (message[0].sender_id !== userId) {
      const [adminCheck] = await pool.query<ConversationMemberRow[]>(
        "SELECT * FROM group_members WHERE group_id = ? AND user_id = ? AND role = 'admin'",
        [message[0].conversation_id, userId]
      );
      
      if (adminCheck.length === 0) {
        throw new AppException("Bạn không có quyền xóa tin nhắn này", ErrorCode.RESOURCE_ACCESS_DENIED, 403);
      }
    }
    
    await pool.query(
      "UPDATE messages SET is_deleted = 1 WHERE message_id = ?",
      [messageId]
    );
    
    const roomId = `conversation_${message[0].conversation_id}`;
    if (socketServiceInstance) {
      socketServiceInstance.broadcastEvent('message:deleted', {
        conversation_id: message[0].conversation_id,
        message_id: messageId,
        deleted_by: userId
      });
    }

    res.status(200).json({
      status: "success",
      message: "Đã xóa tin nhắn"
    });
  } catch (error) {
    if (error instanceof AppException) {
      throw error;
    }
    throw new AppException("Lỗi khi xóa tin nhắn", ErrorCode.SERVER_ERROR, 500);
  }
};

export const addMembersToGroup = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.user_id;
    
    if (!userId) {
      throw new AppException("Không xác định được người dùng", ErrorCode.USER_NOT_AUTHENTICATED, 401);
    }
    
    const groupId = parseInt(req.params.groupId);
    const { user_ids } = req.body;
    
    if (!groupId) {
      throw new AppException("ID nhóm không hợp lệ", ErrorCode.VALIDATION_ERROR, 400);
    }
    
    if (!user_ids || !Array.isArray(user_ids) || user_ids.length === 0) {
      throw new AppException("Danh sách ID người dùng không hợp lệ", ErrorCode.VALIDATION_ERROR, 400);
    }
    
    const [adminCheck] = await pool.query<ConversationMemberRow[]>(
      "SELECT * FROM group_members WHERE group_id = ? AND user_id = ? AND role = 'admin'",
      [groupId, userId]
    );
    
    if (adminCheck.length === 0) {
      throw new AppException("Bạn không có quyền thêm thành viên vào nhóm này", ErrorCode.RESOURCE_ACCESS_DENIED, 403);
    }
    
    const [groupInfo] = await pool.query<ConversationRow[]>(
      "SELECT * FROM chat_groups WHERE group_id = ?",
      [groupId]
    );
    
    if (groupInfo.length === 0) {
      throw new AppException("Nhóm không tồn tại", ErrorCode.NOT_FOUND, 404);
    }
    
    if (groupInfo[0].type === 'private') {
      throw new AppException("Không thể thêm thành viên vào cuộc trò chuyện riêng tư", ErrorCode.VALIDATION_ERROR, 400);
    }
    
    const existingMembersQuery = `
      SELECT user_id FROM group_members 
      WHERE group_id = ? AND user_id IN (${user_ids.map(() => '?').join(',')})
    `;
    
    const [existingMembers] = await pool.query<RowDataPacket[]>(
      existingMembersQuery,
      [groupId, ...user_ids]
    );
    
    const existingMemberIds = existingMembers.map((member: any) => member.user_id);
    const newMemberIds = user_ids.filter((id: number) => !existingMemberIds.includes(id));
    
    if (newMemberIds.length === 0) {
      throw new AppException("Tất cả người dùng đã có trong nhóm", ErrorCode.VALIDATION_ERROR, 400);
    }
    
    const memberValues = newMemberIds.map((id: number) => [groupId, id, 'member']);
    const memberPlaceholders = memberValues.map(() => '(?, ?, ?)').join(',');
    
    await pool.query(
      `INSERT INTO group_members (group_id, user_id, role) VALUES ${memberPlaceholders}`,
      memberValues.flat()
    );
    
    const roomId = `conversation_${groupId}`;
    if (socketServiceInstance) {
      socketServiceInstance.broadcastEvent('group:members-added', {
        conversation_id: groupId,
        added_by: userId,
        new_members: newMemberIds
      });
    }

    res.status(200).json({
      status: "success",
      message: "Đã thêm thành viên vào nhóm",
      data: {
        group_id: groupId,
        added_members: newMemberIds
      }
    });
  } catch (error) {
    if (error instanceof AppException) {
      throw error;
    }
    throw new AppException("Lỗi khi thêm thành viên vào nhóm", ErrorCode.SERVER_ERROR, 500);
  }
};

export const leaveGroup = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.user_id;
    
    if (!userId) {
      throw new AppException("Không xác định được người dùng", ErrorCode.USER_NOT_AUTHENTICATED, 401);
    }
    
    const groupId = parseInt(req.params.groupId);
    
    if (!groupId) {
      throw new AppException("ID nhóm không hợp lệ", ErrorCode.VALIDATION_ERROR, 400);
    }
    
    const [memberCheck] = await pool.query<ConversationMemberRow[]>(
      "SELECT * FROM group_members WHERE group_id = ? AND user_id = ?",
      [groupId, userId]
    );
    
    if (memberCheck.length === 0) {
      throw new AppException("Bạn không thuộc nhóm này", ErrorCode.NOT_FOUND, 404);
    }
    
    const [groupInfo] = await pool.query<ConversationRow[]>(
      "SELECT * FROM chat_groups WHERE group_id = ?",
      [groupId]
    );
    
    if (groupInfo.length === 0) {
      throw new AppException("Nhóm không tồn tại", ErrorCode.NOT_FOUND, 404);
    }
    
    if (groupInfo[0].type === 'private') {
      throw new AppException("Không thể rời khỏi cuộc trò chuyện riêng tư", ErrorCode.VALIDATION_ERROR, 400);
    }
    
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      
      if (memberCheck[0].role === 'admin') {
        const [otherAdmins] = await connection.query<RowDataPacket[]>(
          "SELECT * FROM group_members WHERE group_id = ? AND role = 'admin' AND user_id != ?",
          [groupId, userId]
        );
        
        if (otherAdmins.length === 0) {
          const [otherMembers] = await connection.query<RowDataPacket[]>(
            "SELECT * FROM group_members WHERE group_id = ? AND user_id != ? LIMIT 1",
            [groupId, userId]
          );
          
          if (otherMembers.length > 0) {
            await connection.query(
              "UPDATE group_members SET role = 'admin' WHERE group_id = ? AND user_id = ?",
              [groupId, otherMembers[0].user_id]
            );
          } else {
            await connection.query(
              "DELETE FROM chat_groups WHERE group_id = ?",
              [groupId]
            );
            
            await connection.commit();
            
            res.status(200).json({
              status: "success",
              message: "Đã xóa nhóm do không còn thành viên"
            });
            return;
          }
        }
      }
      
      await connection.query(
        "DELETE FROM group_members WHERE group_id = ? AND user_id = ?",
        [groupId, userId]
      );
      
      await connection.commit();
      
      const roomId = `conversation_${groupId}`;
      if (socketServiceInstance) {
        socketServiceInstance.broadcastEvent('group:member-left', {
          conversation_id: groupId,
          user_id: userId
        });
      }

      res.status(200).json({
        status: "success",
        message: "Đã rời khỏi nhóm"
      });
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    if (error instanceof AppException) {
      throw error;
    }
    throw new AppException("Lỗi khi rời khỏi nhóm", ErrorCode.SERVER_ERROR, 500);
  }
};

export const updateGroupInfo = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.user_id;
    
    if (!userId) {
      throw new AppException("Không xác định được người dùng", ErrorCode.USER_NOT_AUTHENTICATED, 401);
    }
    
    const groupId = parseInt(req.params.groupId);
    const { name, avatar_url, theme_id } = req.body;
    
    if (!groupId) {
      throw new AppException("ID nhóm không hợp lệ", ErrorCode.VALIDATION_ERROR, 400);
    }
    
    if (!name && !avatar_url && !theme_id) {
      throw new AppException("Không có thông tin cần cập nhật", ErrorCode.VALIDATION_ERROR, 400);
    }
    
    const [adminCheck] = await pool.query<ConversationMemberRow[]>(
      "SELECT * FROM group_members WHERE group_id = ? AND user_id = ? AND role = 'admin'",
      [groupId, userId]
    );
    
    if (adminCheck.length === 0) {
      throw new AppException("Bạn không có quyền cập nhật thông tin nhóm", ErrorCode.RESOURCE_ACCESS_DENIED, 403);
    }
    
    const [groupInfo] = await pool.query<ConversationRow[]>(
      "SELECT * FROM chat_groups WHERE group_id = ?",
      [groupId]
    );
    
    if (groupInfo.length === 0) {
      throw new AppException("Nhóm không tồn tại", ErrorCode.NOT_FOUND, 404);
    }
    
    if (groupInfo[0].type === 'private') {
      throw new AppException("Không thể cập nhật thông tin cuộc trò chuyện riêng tư", ErrorCode.VALIDATION_ERROR, 400);
    }
    
    const updateFields = [];
    const queryParams = [];
    
    if (name) {
      updateFields.push("name = ?");
      queryParams.push(name);
    }
    
    if (avatar_url) {
      updateFields.push("avatar_url = ?");
      queryParams.push(avatar_url);
    }
    
    if (theme_id) {
      updateFields.push("theme_id = ?");
      queryParams.push(theme_id);
    }
    
    if (updateFields.length > 0) {
      queryParams.push(groupId);
      
      await pool.query(
        `UPDATE chat_groups SET ${updateFields.join(", ")} WHERE group_id = ?`,
        queryParams
      );
      
      const roomId = `conversation_${groupId}`;
      if (socketServiceInstance) {
        socketServiceInstance.broadcastEvent('group:updated', {
          conversation_id: groupId,
          updated_by: userId,
          name,
          avatar_url,
          theme_id
        });
      }
    }

    res.status(200).json({
      status: "success",
      message: "Đã cập nhật thông tin nhóm"
    });
  } catch (error) {
    if (error instanceof AppException) {
      throw error;
    }
    throw new AppException("Lỗi khi cập nhật thông tin nhóm", ErrorCode.SERVER_ERROR, 500);
  }
};

export const getConversationWithUser = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.user_id;
    
    if (!userId) {
      throw new AppException("Không xác định được người dùng", ErrorCode.USER_NOT_AUTHENTICATED, 401);
    }
    
    const targetUserId = req.params.userId;
    
    if (!targetUserId) {
      throw new AppException("Thiếu ID người dùng", ErrorCode.VALIDATION_ERROR, 400);
    }
    
    const conversationId = `${userId}_${targetUserId}`;
    
    try {
      const [userInfo] = await pool.query<RowDataPacket[]>(
        `SELECT user_id as id, username, profile_picture 
         FROM users 
         WHERE user_id = ?`,
        [targetUserId]
      );
      
      res.json({
        conversation: {
          id: conversationId,
          recipient: userInfo.length > 0 ? {
            id: userInfo[0].id,
            username: userInfo[0].username,
            profile_picture: userInfo[0].profile_picture || "https://randomuser.me/api/portraits/lego/1.jpg",
            is_online: true,
            last_active: new Date().toISOString()
          } : {
            id: targetUserId,
            username: "Người dùng",
            profile_picture: "https://randomuser.me/api/portraits/lego/1.jpg",
            is_online: false,
            last_active: new Date().toISOString()
          },
          is_group: false,
          created_at: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error("Lỗi khi tìm thông tin người dùng:", error);
      res.json({
        conversation: {
          id: conversationId,
          recipient: {
            id: targetUserId,
            username: "Người dùng",
            profile_picture: "https://randomuser.me/api/portraits/lego/1.jpg",
            is_online: false,
            last_active: new Date().toISOString()
          },
          is_group: false,
          created_at: new Date().toISOString()
        }
      });
    }
  } catch (error) {
    console.error("Lỗi khi kiểm tra cuộc trò chuyện:", error);
    res.status(200).json({
      conversation: null
    });
  }
};

export const getConversationMessages = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.user_id;
    if (!userId) {
      throw new AppException("Không xác định được người dùng", ErrorCode.USER_NOT_AUTHENTICATED, 401);
    }

    const conversationId = req.params.conversationId;
    if (!conversationId) {
      throw new AppException("Thiếu ID cuộc trò chuyện", ErrorCode.VALIDATION_ERROR, 400);
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = (page - 1) * limit;

    let messages: any[] = [];
    let query = '';
    let params: any[] = [];
    let totalCount = 0;

    if (conversationId.includes('_')) {
      const userIds = conversationId.split('_');
      
      if (userIds.length !== 2) {
        throw new AppException("ID cuộc trò chuyện không hợp lệ", ErrorCode.VALIDATION_ERROR, 400);
      }
      
      if (userIds[0] !== userId.toString() && userIds[1] !== userId.toString()) {
        throw new AppException("Bạn không thuộc cuộc trò chuyện này", ErrorCode.RESOURCE_ACCESS_DENIED, 403);
      }

      const otherUserId = userIds[0] === userId.toString() ? userIds[1] : userIds[0];
      
      query = `
        SELECT m.message_id, m.sender_id, m.receiver_id, m.content, m.message_type, 
               m.is_read, m.sent_at, m.group_id as conversation_id, 
               u.username, u.profile_picture, med.media_url, med.media_type
        FROM messages m
        JOIN users u ON m.sender_id = u.user_id
        LEFT JOIN media med ON m.message_id = med.message_id AND med.content_type = 'message'
        WHERE ((m.sender_id = ? AND m.receiver_id = ?) OR (m.sender_id = ? AND m.receiver_id = ?))
        ORDER BY m.sent_at DESC
        LIMIT ? OFFSET ?
      `;
      params = [userId, otherUserId, otherUserId, userId, limit, offset];
      
      const [countResult] = await pool.query<RowDataPacket[]>(
        `SELECT COUNT(*) as total
         FROM messages 
         WHERE ((sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?))`,
        [userId, otherUserId, otherUserId, userId]
      );
      totalCount = countResult[0].total;

      await pool.query(
        "UPDATE messages SET is_read = 1 WHERE sender_id = ? AND receiver_id = ? AND is_read = 0",
        [otherUserId, userId]
      );
    } else {
      const [memberCheck] = await pool.query<RowDataPacket[]>(
        "SELECT * FROM group_members WHERE group_id = ? AND user_id = ?",
        [conversationId, userId]
      );
      
      if (memberCheck.length === 0) {
        throw new AppException("Bạn không thuộc nhóm chat này", ErrorCode.RESOURCE_ACCESS_DENIED, 403);
      }
      
      query = `
        SELECT m.message_id, m.sender_id, m.content, m.message_type, 
               m.is_read, m.sent_at, m.group_id as conversation_id, 
               u.username, u.profile_picture, med.media_url, med.media_type
        FROM messages m
        JOIN users u ON m.sender_id = u.user_id
        LEFT JOIN media med ON m.message_id = med.message_id AND med.content_type = 'message'
        WHERE m.group_id = ?
        ORDER BY m.sent_at DESC
        LIMIT ? OFFSET ?
      `;
      params = [conversationId, limit, offset];
      
      const [countResult] = await pool.query<RowDataPacket[]>(
        `SELECT COUNT(*) as total
         FROM messages 
         WHERE group_id = ?`,
        [conversationId]
      );
      totalCount = countResult[0].total;
      
      await pool.query(
        "UPDATE messages SET is_read = 1 WHERE group_id = ? AND sender_id != ? AND is_read = 0",
        [conversationId, userId]
      );
    }

    const [results] = await pool.query<RowDataPacket[]>(query, params);
    
    messages = results.map(row => ({
      id: row.message_id.toString(),
      message_id: row.message_id,
      conversation_id: row.conversation_id || parseInt(conversationId),
      content: row.content || '',
      message_type: row.message_type || 'text',
      is_read: !!row.is_read,
      sent_at: row.sent_at,
      sender_id: row.sender_id,
      username: row.username,
      profile_picture: row.profile_picture,
      media_url: row.media_url,
      media_type: row.media_type
    }));

    res.status(200).json({
      status: "success",
      data: messages.reverse(),
      pagination: {
        hasMore: offset + limit < totalCount,
        page: page,
        limit: limit,
        total: totalCount
      }
    });
  } catch (error) {
    console.error("Lỗi khi lấy tin nhắn cuộc trò chuyện:", error);
    if (error instanceof AppException) {
      res.status(error.status || 500).json({
        status: "error",
        message: error.message
      });
    } else {
      res.status(500).json({
        status: "error",
        message: "Lỗi khi lấy tin nhắn cuộc trò chuyện"
      });
    }
  }
};

export const sendMessageToConversation = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.user_id;
    
    if (!userId) {
      throw new AppException("Không xác định được người dùng", ErrorCode.USER_NOT_AUTHENTICATED, 401);
    }
    
    const conversationId = req.params.conversationId;
    const { content, type = 'text' } = req.body;
    
    if (!conversationId || !content) {
      throw new AppException("Thiếu thông tin tin nhắn", ErrorCode.VALIDATION_ERROR, 400);
    }
    
    try {
      let receiverId = null;
      let groupId = null;
      
      if (conversationId.includes('_')) {
        const userIds = conversationId.split('_');
        
        if (userIds.length !== 2) {
          throw new AppException("ID cuộc trò chuyện không hợp lệ", ErrorCode.VALIDATION_ERROR, 400);
        }
        
        if (userIds[0] !== userId.toString() && userIds[1] !== userId.toString()) {
          throw new AppException("Bạn không thuộc cuộc trò chuyện này", ErrorCode.RESOURCE_ACCESS_DENIED, 403);
        }
        
        receiverId = userIds[0] === userId.toString() ? parseInt(userIds[1]) : parseInt(userIds[0]);
      } else {
        const [memberCheck] = await pool.query<RowDataPacket[]>(
          "SELECT * FROM group_members WHERE group_id = ? AND user_id = ?",
          [conversationId, userId]
        );
        
        if (memberCheck.length === 0) {
          throw new AppException("Bạn không thuộc nhóm chat này", ErrorCode.RESOURCE_ACCESS_DENIED, 403);
        }
        
        groupId = parseInt(conversationId);
      }
      
      let senderUsername = "Bạn";
      let senderProfilePicture = null;
      
      if (userId) {
        const [userInfo] = await pool.query<RowDataPacket[]>(
          "SELECT username, profile_picture FROM users WHERE user_id = ?",
          [userId]
        );
        
        if (userInfo.length > 0) {
          senderUsername = userInfo[0].username;
          senderProfilePicture = userInfo[0].profile_picture;
        }
      }
      
      let query = '';
      let queryParams = [];

      if (groupId) {
        const [members] = await pool.query<RowDataPacket[]>(
          "SELECT user_id FROM group_members WHERE group_id = ? AND user_id != ? LIMIT 1",
          [groupId, userId]
        );
        
        let tempReceiverId = members.length > 0 ? members[0].user_id : null;
        
        if (!tempReceiverId) {
          const [groupInfo] = await pool.query<RowDataPacket[]>(
            "SELECT creator_id FROM chat_groups WHERE group_id = ?",
            [groupId]
          );
          
          tempReceiverId = groupInfo.length > 0 ? groupInfo[0].creator_id : userId;
        }
        
        query = "INSERT INTO messages (sender_id, receiver_id, content, message_type, group_id) VALUES (?, ?, ?, ?, ?)";
        queryParams = [userId, tempReceiverId, content, type, groupId];
      } else {
        query = "INSERT INTO messages (sender_id, receiver_id, content, message_type) VALUES (?, ?, ?, ?)";
        queryParams = [userId, receiverId, content, type];
      }

      const [result] = await pool.query<ResultSetHeader>(query, queryParams);
      
      const messageId = result.insertId;
      
      const [messages] = await pool.query<MessageRow[]>(
        `SELECT m.*, u.username, u.profile_picture
         FROM messages m
         JOIN users u ON m.sender_id = u.user_id
         WHERE m.message_id = ?`,
        [messageId]
      );
      
      if (messages.length === 0) {
        throw new AppException("Lỗi khi tạo tin nhắn", ErrorCode.SERVER_ERROR, 500);
      }
      
      const message = messages[0];
      
      if (groupId && socketServiceInstance) {
        socketServiceInstance.notifyNewMessage(`group_${groupId}`, message);
      } else if (receiverId && socketServiceInstance) {
        socketServiceInstance.notifyNewMessage(`user_${receiverId}`, message);
      }
      
      res.status(201).json({
        message: {
          id: messageId.toString(),
          message_id: messageId,
          content: content,
          message_type: type,
          is_read: false,
          sent_at: new Date().toISOString(),
          sender_id: userId,
          username: senderUsername,
          profile_picture: senderProfilePicture
        }
      });
    } catch (error) {
      console.error("Lỗi xử lý tin nhắn:", error);
      throw error;
    }
  } catch (error) {
    console.error("Lỗi khi gửi tin nhắn:", error);
    res.status(500).json({
      error: "Lỗi khi gửi tin nhắn"
    });
  }
};

export const sendMediaToConversation = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.user_id;
    
    if (!userId) {
      throw new AppException("Không xác định được người dùng", ErrorCode.USER_NOT_AUTHENTICATED, 401);
    }
    
    const conversationId = req.params.conversationId;
    const { type = 'image', caption = '' } = req.body;
    
    if (!conversationId || !req.file) {
      throw new AppException("Thiếu thông tin tin nhắn", ErrorCode.VALIDATION_ERROR, 400);
    }
    
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      
      let receiverId = null;
      let groupId = null;
      
      if (conversationId.includes('_')) {
        const userIds = conversationId.split('_');
        
        if (userIds.length !== 2) {
          throw new AppException("ID cuộc trò chuyện không hợp lệ", ErrorCode.VALIDATION_ERROR, 400);
        }
        
        if (userIds[0] !== userId.toString() && userIds[1] !== userId.toString()) {
          throw new AppException("Bạn không thuộc cuộc trò chuyện này", ErrorCode.RESOURCE_ACCESS_DENIED, 403);
        }
        
        receiverId = userIds[0] === userId.toString() ? parseInt(userIds[1]) : parseInt(userIds[0]);
      } else {
        const [memberCheck] = await connection.query<RowDataPacket[]>(
          "SELECT * FROM group_members WHERE group_id = ? AND user_id = ?",
          [conversationId, userId]
        );
        
        if (memberCheck.length === 0) {
          throw new AppException("Bạn không thuộc nhóm chat này", ErrorCode.RESOURCE_ACCESS_DENIED, 403);
        }
        
        groupId = parseInt(conversationId);
      }
      
      let senderUsername = "Bạn";
      let senderProfilePicture = null;
      
      if (userId) {
        const [userInfo] = await pool.query<RowDataPacket[]>(
          "SELECT username, profile_picture FROM users WHERE user_id = ?",
          [userId]
        );
        
        if (userInfo.length > 0) {
          senderUsername = userInfo[0].username;
          senderProfilePicture = userInfo[0].profile_picture;
        }
      }
      
      let query = '';
      let queryParams = [];

      if (groupId) {
        const [members] = await connection.query<RowDataPacket[]>(
          "SELECT user_id FROM group_members WHERE group_id = ? AND user_id != ? LIMIT 1",
          [groupId, userId]
        );
        
        let tempReceiverId = members.length > 0 ? members[0].user_id : null;
        
        if (!tempReceiverId) {
          const [groupInfo] = await connection.query<RowDataPacket[]>(
            "SELECT creator_id FROM chat_groups WHERE group_id = ?",
            [groupId]
          );
          
          tempReceiverId = groupInfo.length > 0 ? groupInfo[0].creator_id : userId;
        }
        
        query = "INSERT INTO messages (sender_id, receiver_id, content, message_type, group_id) VALUES (?, ?, ?, ?, ?)";
        queryParams = [userId, tempReceiverId, caption, 'media', groupId];
      } else {
        query = "INSERT INTO messages (sender_id, receiver_id, content, message_type) VALUES (?, ?, ?, ?)";
        queryParams = [userId, receiverId, caption, 'media'];
      }

      const [messageResult] = await connection.query<ResultSetHeader>(query, queryParams);
      
      const messageId = messageResult.insertId;
      
      const mediaType = type === 'image' ? 'image' : 'video';
      
      await connection.query(
        "INSERT INTO media (media_url, media_type, message_id, content_type) VALUES (?, ?, ?, 'message')",
        [req.file.path, mediaType, messageId]
      );
      
      await connection.commit();
      
      const [messages] = await pool.query<RowDataPacket[]>(
        `SELECT m.*, u.username, u.profile_picture, med.media_url, med.media_type 
         FROM messages m
         JOIN users u ON m.sender_id = u.user_id
         JOIN media med ON m.message_id = med.message_id
         WHERE m.message_id = ?`,
        [messageId]
      );
      
      if (messages.length === 0) {
        throw new AppException("Lỗi khi tạo tin nhắn", ErrorCode.SERVER_ERROR, 500);
      }
      
      const message = messages[0];
      
      if (groupId && socketServiceInstance) {
        socketServiceInstance.notifyNewMessage(`group_${groupId}`, message);
      } else if (receiverId && socketServiceInstance) {
        socketServiceInstance.notifyNewMessage(`user_${receiverId}`, message);
      }
      
      res.status(201).json({
        message: {
          id: messageId.toString(),
          message_id: messageId,
          content: caption,
          message_type: 'media',
          media_type: mediaType,
          media_url: req.file.path,
          is_read: false,
          sent_at: new Date().toISOString(),
          sender_id: userId,
          username: senderUsername,
          profile_picture: senderProfilePicture
        }
      });
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error("Lỗi khi gửi tin nhắn đa phương tiện:", error);
    if (error instanceof AppException) {
      res.status(error.status || 500).json({
        status: "error",
        message: error.message
      });
    } else {
      res.status(500).json({
        status: "error",
        message: "Lỗi khi gửi tin nhắn đa phương tiện"
      });
    }
  }
};

export const createGroupConversation = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.user_id;
    
    if (!userId) {
      throw new AppException("Không xác định được người dùng", ErrorCode.USER_NOT_AUTHENTICATED, 401);
    }
    
    const { name, member_ids } = req.body;
    
    if (!name || !member_ids || !Array.isArray(member_ids) || member_ids.length === 0) {
      throw new AppException("Thiếu thông tin nhóm chat", ErrorCode.VALIDATION_ERROR, 400);
    }
    
    res.status(201).json({
      conversation: {
        id: Date.now().toString(),
        name,
        is_group: true,
        created_at: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error("Lỗi khi tạo nhóm chat:", error);
    res.status(500).json({
      error: "Lỗi khi tạo nhóm chat"
    });
  }
};

export const uploadMediaMessage = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.user_id;
    
    if (!userId) {
      throw new AppException("Không xác định được người dùng", ErrorCode.USER_NOT_AUTHENTICATED, 401);
    }
    
    const conversationId = req.params.conversationId;
    const { type = 'image', caption = '', base64Data, fileName } = req.body;
    
    if (!conversationId) {
      throw new AppException("Thiếu thông tin tin nhắn", ErrorCode.VALIDATION_ERROR, 400);
    }
    
    let mediaUrl = '';
    let mediaKey = '';
    
    if (req.file) {
      try {
        const fileBuffer = req.file.buffer;
        const key = `messages/${conversationId}/${Date.now()}-${uuidv4()}${path.extname(req.file.originalname)}`;
        
        const uploadResult = await uploadToS3(fileBuffer, key, req.file.mimetype);
        mediaUrl = uploadResult.Location;
        mediaKey = uploadResult.Key;
      } catch (error) {
        console.error('Lỗi khi upload file lên S3:', error);
        throw new AppException("Không thể upload file", ErrorCode.FILE_PROCESSING_ERROR, 500);
      }
    } else if (base64Data) {
      try {
        const base64Content = base64Data.replace(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,/, '');
        
        const fileBuffer = Buffer.from(base64Content, 'base64');
        
        const fileExt = type === 'image' ? '.jpg' : '.mp4';
        const key = `messages/${conversationId}/${Date.now()}-${uuidv4()}${fileExt}`;
        
        const contentType = type === 'image' ? 'image/jpeg' : 'video/mp4';
        
        const uploadResult = await uploadToS3(fileBuffer, key, contentType);
        mediaUrl = uploadResult.Location;
        mediaKey = uploadResult.Key;
      } catch (error) {
        console.error('Lỗi khi xử lý dữ liệu base64:', error);
        throw new AppException("Không thể xử lý dữ liệu ảnh/video", ErrorCode.FILE_PROCESSING_ERROR, 500);
      }
    } else {
      throw new AppException("Không có tệp tin hoặc dữ liệu base64", ErrorCode.VALIDATION_ERROR, 400);
    }
    
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      
      let receiverId = null;
      let groupId = null;
      
      if (conversationId.includes('_')) {
        const userIds = conversationId.split('_');
        
        if (userIds.length !== 2) {
          throw new AppException("ID cuộc trò chuyện không hợp lệ", ErrorCode.VALIDATION_ERROR, 400);
        }
        
        if (userIds[0] !== userId.toString() && userIds[1] !== userId.toString()) {
          throw new AppException("Bạn không thuộc cuộc trò chuyện này", ErrorCode.RESOURCE_ACCESS_DENIED, 403);
        }
        
        receiverId = userIds[0] === userId.toString() ? parseInt(userIds[1]) : parseInt(userIds[0]);
      } else {
        const [memberCheck] = await connection.query<RowDataPacket[]>(
          "SELECT * FROM group_members WHERE group_id = ? AND user_id = ?",
          [conversationId, userId]
        );
        
        if (memberCheck.length === 0) {
          throw new AppException("Bạn không thuộc nhóm chat này", ErrorCode.RESOURCE_ACCESS_DENIED, 403);
        }
        
        groupId = parseInt(conversationId);
      }
      
      let senderUsername = "Bạn";
      let senderProfilePicture = null;
      
      if (userId) {
        const [userInfo] = await pool.query<RowDataPacket[]>(
          "SELECT username, profile_picture FROM users WHERE user_id = ?",
          [userId]
        );
        
        if (userInfo.length > 0) {
          senderUsername = userInfo[0].username;
          senderProfilePicture = userInfo[0].profile_picture;
        }
      }
      
      let query = '';
      let queryParams = [];

      if (groupId) {
        const [members] = await connection.query<RowDataPacket[]>(
          "SELECT user_id FROM group_members WHERE group_id = ? AND user_id != ? LIMIT 1",
          [groupId, userId]
        );
        
        let tempReceiverId = members.length > 0 ? members[0].user_id : null;
        
        if (!tempReceiverId) {
          const [groupInfo] = await connection.query<RowDataPacket[]>(
            "SELECT creator_id FROM chat_groups WHERE group_id = ?",
            [groupId]
          );
          
          tempReceiverId = groupInfo.length > 0 ? groupInfo[0].creator_id : userId;
        }
        
        query = "INSERT INTO messages (sender_id, receiver_id, content, message_type, group_id) VALUES (?, ?, ?, ?, ?)";
        queryParams = [userId, tempReceiverId, caption, 'media', groupId];
      } else {
        query = "INSERT INTO messages (sender_id, receiver_id, content, message_type) VALUES (?, ?, ?, ?)";
        queryParams = [userId, receiverId, caption, 'media'];
      }

      const [messageResult] = await connection.query<ResultSetHeader>(query, queryParams);
      
      const messageId = messageResult.insertId;
      
      const mediaType = type === 'image' ? 'image' : 'video';
      
      await connection.query(
        "INSERT INTO media (media_url, media_type, message_id, content_type) VALUES (?, ?, ?, 'message')",
        [mediaUrl, mediaType, messageId]
      );
      
      await connection.commit();
      
      const [messages] = await pool.query<RowDataPacket[]>(
        `SELECT m.*, u.username, u.profile_picture, med.media_url, med.media_type 
         FROM messages m
         JOIN users u ON m.sender_id = u.user_id
         JOIN media med ON m.message_id = med.message_id
         WHERE m.message_id = ?`,
        [messageId]
      );
      
      if (messages.length === 0) {
        throw new AppException("Lỗi khi tạo tin nhắn", ErrorCode.SERVER_ERROR, 500);
      }
      
      const message = messages[0];
      
      if (groupId && socketServiceInstance) {
        socketServiceInstance.notifyNewMessage(`group_${groupId}`, message);
      } else if (receiverId && socketServiceInstance) {
        socketServiceInstance.notifyNewMessage(`user_${receiverId}`, message);
      }
      
      res.status(201).json({
        message: {
          id: messageId.toString(),
          message_id: messageId,
          content: caption,
          message_type: 'media',
          media_type: mediaType,
          media_url: mediaUrl,
          is_read: false,
          sent_at: new Date().toISOString(),
          sender_id: userId,
          username: senderUsername,
          profile_picture: senderProfilePicture
        }
      });
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error("Lỗi khi gửi tin nhắn đa phương tiện từ camera:", error);
    if (error instanceof AppException) {
      res.status(error.status || 500).json({
        status: "error",
        message: error.message
      });
    } else {
      res.status(500).json({
        status: "error",
        message: "Lỗi khi gửi tin nhắn đa phương tiện từ camera"
      });
    }
  }
};

export const searchMessages = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.user_id;
    
    if (!userId) {
      throw new AppException("Không xác định được người dùng", ErrorCode.USER_NOT_AUTHENTICATED, 401);
    }
    
    const { keyword, conversation_id, limit = 20, page = 1 } = req.query;
    
    if (!keyword) {
      throw new AppException("Chưa nhập từ khóa tìm kiếm", ErrorCode.VALIDATION_ERROR, 400);
    }
    
    const offset = (Number(page) - 1) * Number(limit);
    const searchTerm = `%${keyword}%`;
    
    let query = `
      SELECT m.*, u.username, u.profile_picture,
             med.media_url, med.media_type
      FROM messages m
      JOIN users u ON m.sender_id = u.user_id
      LEFT JOIN media med ON m.message_id = med.message_id
      WHERE m.content LIKE ?
    `;
    
    let params: any[] = [searchTerm];
    
    if (conversation_id) {
      query += " AND m.conversation_id = ?";
      params.push(conversation_id);
      
      const [memberCheck] = await pool.query<RowDataPacket[]>(
        "SELECT * FROM group_members WHERE group_id = ? AND user_id = ?",
        [conversation_id, userId]
      );
      
      if (memberCheck.length === 0) {
        throw new AppException("Bạn không có quyền truy cập cuộc trò chuyện này", ErrorCode.RESOURCE_ACCESS_DENIED, 403);
      }
    } else {
      query += ` AND m.conversation_id IN (
        SELECT group_id FROM group_members WHERE user_id = ?
      )`;
      params.push(userId);
    }
    
    query += " ORDER BY m.sent_at DESC LIMIT ? OFFSET ?";
    params.push(Number(limit), offset);
    
    const [results] = await pool.query<RowDataPacket[]>(query, params);
    
    let countQuery = `
      SELECT COUNT(*) as total 
      FROM messages m
      WHERE m.content LIKE ?
    `;
    
    let countParams: any[] = [searchTerm];
    
    if (conversation_id) {
      countQuery += " AND m.conversation_id = ?";
      countParams.push(conversation_id);
    } else {
      countQuery += ` AND m.conversation_id IN (
        SELECT group_id FROM group_members WHERE user_id = ?
      )`;
      countParams.push(userId);
    }
    
    const [countResult] = await pool.query<RowDataPacket[]>(countQuery, countParams);
    const totalCount = countResult[0].total;
    
    const messages = results.map(row => ({
      id: row.message_id.toString(),
      message_id: row.message_id,
      conversation_id: row.conversation_id,
      content: row.content || '',
      message_type: row.message_type || 'text',
      is_read: !!row.is_read,
      sent_at: row.sent_at,
      sender_id: row.sender_id,
      username: row.username,
      profile_picture: row.profile_picture,
      media_url: row.media_url,
      media_type: row.media_type
    }));
    
    res.status(200).json({
      status: "success",
      data: messages,
      pagination: {
        hasMore: offset + Number(limit) < totalCount,
        page: Number(page),
        limit: Number(limit),
        total: totalCount
      }
    });
  } catch (error) {
    console.error("Lỗi khi tìm kiếm tin nhắn:", error);
    if (error instanceof AppException) {
      throw error;
    }
    throw new AppException("Lỗi khi tìm kiếm tin nhắn", ErrorCode.SERVER_ERROR, 500);
  }
};

export const getRecentConversations = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.user_id;
    
    if (!userId) {
      throw new AppException("Không xác định được người dùng", ErrorCode.USER_NOT_AUTHENTICATED, 401);
    }
    
    const { limit = 20, page = 1 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);
    
    const query = `
      SELECT 
        c.conversation_id,
        c.type,
        c.name,
        c.avatar,
        c.created_at,
        COALESCE(u.user_id, g.creator_id) as other_user_id,
        COALESCE(u.username, g.name) as display_name,
        COALESCE(u.profile_picture, g.avatar) as avatar_url,
        MAX(m.sent_at) as last_message_time,
        SUBSTRING(
          (SELECT content FROM messages 
           WHERE conversation_id = c.conversation_id 
           ORDER BY sent_at DESC LIMIT 1), 1, 100
        ) as last_message,
        (SELECT message_type FROM messages 
         WHERE conversation_id = c.conversation_id 
         ORDER BY sent_at DESC LIMIT 1) as last_message_type,
        (SELECT COUNT(*) FROM messages 
         WHERE conversation_id = c.conversation_id 
         AND sender_id != ? 
         AND is_read = 0) as unread_count
      FROM conversations c
      JOIN conversation_members cm ON c.conversation_id = cm.conversation_id
      LEFT JOIN messages m ON c.conversation_id = m.conversation_id
      LEFT JOIN (
        SELECT cm1.conversation_id, u1.user_id, u1.username, u1.profile_picture
        FROM conversation_members cm1
        JOIN users u1 ON cm1.user_id = u1.user_id
        WHERE cm1.user_id != ? AND cm1.conversation_id IN (
          SELECT conversation_id FROM conversation_members 
          WHERE user_id = ? AND 
          conversation_id IN (
            SELECT conversation_id FROM conversations WHERE type = 'private'
          )
        )
      ) u ON c.conversation_id = u.conversation_id AND c.type = 'private'
      LEFT JOIN (
        SELECT c2.conversation_id, c2.name, c2.avatar, c2.creator_id
        FROM conversations c2
        WHERE c2.type = 'group'
      ) g ON c.conversation_id = g.conversation_id AND c.type = 'group'
      WHERE cm.user_id = ?
      GROUP BY c.conversation_id
      ORDER BY last_message_time DESC
      LIMIT ? OFFSET ?
    `;
    
    const [rows] = await pool.query<RowDataPacket[]>(
      query,
      [userId, userId, userId, userId, Number(limit), offset]
    );
    
    const [countResult] = await pool.query<RowDataPacket[]>(
      `SELECT COUNT(DISTINCT c.conversation_id) as total
       FROM conversations c
       JOIN conversation_members cm ON c.conversation_id = cm.conversation_id
       WHERE cm.user_id = ?`,
      [userId]
    );
    
    const totalCount = countResult[0].total;
    
    const conversations = rows.map(row => ({
      conversation_id: row.conversation_id,
      type: row.type,
      name: row.type === 'private' ? row.display_name : row.name,
      avatar: row.avatar_url,
      other_user_id: row.type === 'private' ? row.other_user_id : null,
      last_message: {
        content: row.last_message,
        type: row.last_message_type,
        time: row.last_message_time
      },
      unread_count: row.unread_count,
      created_at: row.created_at
    }));
    
    res.status(200).json({
      status: "success",
      data: conversations,
      pagination: {
        hasMore: offset + Number(limit) < totalCount,
        page: Number(page),
        limit: Number(limit),
        total: totalCount
      }
    });
  } catch (error) {
    console.error("Lỗi khi lấy danh sách cuộc trò chuyện gần đây:", error);
    if (error instanceof AppException) {
      throw error;
    }
    throw new AppException("Lỗi khi lấy danh sách cuộc trò chuyện gần đây", ErrorCode.SERVER_ERROR, 500);
  }
};

export const sendReaction = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.user_id;
    
    if (!userId) {
      throw new AppException("Không xác định được người dùng", ErrorCode.USER_NOT_AUTHENTICATED, 401);
    }
    
    const { message_id } = req.params;
    const { reaction } = req.body;
    
    if (!message_id || !reaction) {
      throw new AppException("Thiếu thông tin cảm xúc", ErrorCode.VALIDATION_ERROR, 400);
    }
    
    const [messageCheck] = await pool.query<RowDataPacket[]>(
      `SELECT m.*, gm.user_id as is_member
       FROM messages m
       LEFT JOIN group_members gm ON m.conversation_id = gm.group_id AND gm.user_id = ?
       WHERE m.message_id = ?`,
      [userId, message_id]
    );
    
    if (messageCheck.length === 0) {
      throw new AppException("Không tìm thấy tin nhắn", ErrorCode.NOT_FOUND, 404);
    }
    
    if (!messageCheck[0].is_member) {
      throw new AppException("Bạn không có quyền phản ứng tin nhắn này", ErrorCode.RESOURCE_ACCESS_DENIED, 403);
    }
    
    const [existingReaction] = await pool.query<RowDataPacket[]>(
      "SELECT * FROM message_reactions WHERE message_id = ? AND user_id = ?",
      [message_id, userId]
    );
    
    let result;
    if (existingReaction.length > 0) {
      [result] = await pool.query(
        "UPDATE message_reactions SET reaction = ?, updated_at = NOW() WHERE message_id = ? AND user_id = ?",
        [reaction, message_id, userId]
      );
    } else {
      [result] = await pool.query(
        "INSERT INTO message_reactions (message_id, user_id, reaction) VALUES (?, ?, ?)",
        [message_id, userId, reaction]
      );
    }
    
    const [reactions] = await pool.query<RowDataPacket[]>(
      `SELECT mr.reaction, mr.user_id, u.username
       FROM message_reactions mr
       JOIN users u ON mr.user_id = u.user_id
       WHERE mr.message_id = ?`,
      [message_id]
    );
    
    const conversationId = messageCheck[0].conversation_id;
    if (socketServiceInstance) {
      const roomId = `conversation_${conversationId}`;
      socketServiceInstance.notifyNewMessage(roomId, {
        type: 'reaction',
        message_id,
        user_id: userId,
        reaction,
        reactions: reactions.map(r => ({
          reaction: r.reaction,
          user_id: r.user_id,
          username: r.username
        }))
      });
    }
    
    res.status(200).json({
      status: "success",
      data: {
        message_id,
        reaction,
        all_reactions: reactions.map(r => ({
          reaction: r.reaction,
          user_id: r.user_id,
          username: r.username
        }))
      }
    });
  } catch (error) {
    console.error("Lỗi khi gửi cảm xúc:", error);
    if (error instanceof AppException) {
      throw error;
    }
    throw new AppException("Lỗi khi gửi cảm xúc", ErrorCode.SERVER_ERROR, 500);
  }
}; 

export const initiateCall = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.user_id;
    
    if (!userId) {
      throw new AppException("Không xác định được người dùng", ErrorCode.USER_NOT_AUTHENTICATED, 401);
    }
    
    const { call_type, recipient_id } = req.body;
    
    if (!call_type || !recipient_id) {
      throw new AppException("Thiếu thông tin cuộc gọi", ErrorCode.VALIDATION_ERROR, 400);
    }
    
    const [userCheck] = await pool.query<RowDataPacket[]>(
      "SELECT * FROM users WHERE user_id = ?",
      [recipient_id]
    );
    
    if (userCheck.length === 0) {
      throw new AppException("Không tìm thấy người dùng", ErrorCode.NOT_FOUND, 404);
    }
    
    const [messageResult] = await pool.query<ResultSetHeader>(
      "INSERT INTO messages (sender_id, receiver_id, content, message_type, call_type, call_status) VALUES (?, ?, ?, ?, ?, ?)",
      [userId, recipient_id, '', 'call', call_type, 'initiated']
    );
    
    const messageId = messageResult.insertId;
    
    if (socketServiceInstance) {
      const userSocketId = `user_${recipient_id}`;
      
      const callData = {
        call_id: messageId,
        initiator_id: userId,
        recipient_id: recipient_id,
        call_type,
        is_group: false,
        status: 'initiated',
        started_at: new Date().toISOString(),
        message_id: messageId
      };
      
      socketServiceInstance.notifyCall(userSocketId, 'call:incoming', callData);
    }
    
    res.status(201).json({
      status: "success",
      data: {
        call_id: messageId,
        recipient_id: Number(recipient_id),
        call_type,
        status: 'initiated',
        started_at: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error("Lỗi khi bắt đầu cuộc gọi:", error);
    if (error instanceof AppException) {
      throw error;
    }
    throw new AppException("Lỗi khi bắt đầu cuộc gọi", ErrorCode.SERVER_ERROR, 500);
  }
};

export const answerCall = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.user_id;
    
    if (!userId) {
      throw new AppException("Không xác định được người dùng", ErrorCode.USER_NOT_AUTHENTICATED, 401);
    }
    
    const { call_id } = req.params;
    const { answer } = req.body;
    
    if (!call_id || !answer) {
      throw new AppException("Thiếu thông tin cuộc gọi", ErrorCode.VALIDATION_ERROR, 400);
    }
    
    const [callCheck] = await pool.query<RowDataPacket[]>(
      `SELECT * FROM messages 
       WHERE message_id = ? AND receiver_id = ? AND message_type = 'call'`,
      [call_id, userId]
    );
    
    if (callCheck.length === 0) {
      throw new AppException("Cuộc gọi không tồn tại hoặc bạn không phải người nhận cuộc gọi", ErrorCode.RESOURCE_ACCESS_DENIED, 403);
    }
    
    const call = callCheck[0];
    
    await pool.query(
      "UPDATE messages SET call_status = ? WHERE message_id = ?",
      [answer, call_id]
    );
    
    const callData = {
      call_id: Number(call_id),
      initiator_id: call.sender_id,
      recipient_id: userId,
      call_type: call.call_type,
      is_group: false,
      status: answer,
      started_at: call.sent_at.toISOString(),
      responded_at: new Date().toISOString(),
      responded_by: userId
    };
    
    if (socketServiceInstance) {
      const initiatorSocketId = `user_${call.sender_id}`;
      socketServiceInstance.notifyCall(initiatorSocketId, `call:${answer}`, callData);
    }
    
    res.status(200).json({
      status: "success",
      data: callData
    });
  } catch (error) {
    console.error("Lỗi khi trả lời cuộc gọi:", error);
    if (error instanceof AppException) {
      throw error;
    }
    throw new AppException("Lỗi khi trả lời cuộc gọi", ErrorCode.SERVER_ERROR, 500);
  }
};

export const endCall = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.user_id;
    
    if (!userId) {
      throw new AppException("Không xác định được người dùng", ErrorCode.USER_NOT_AUTHENTICATED, 401);
    }
    
    const { call_id } = req.params;
    
    if (!call_id) {
      throw new AppException("Thiếu thông tin cuộc gọi", ErrorCode.VALIDATION_ERROR, 400);
    }
    
    const [callCheck] = await pool.query<RowDataPacket[]>(
      `SELECT * FROM messages 
       WHERE message_id = ? AND message_type = 'call' 
       AND (sender_id = ? OR receiver_id = ?)`,
      [call_id, userId, userId]
    );
    
    if (callCheck.length === 0) {
      throw new AppException("Cuộc gọi không tồn tại hoặc bạn không tham gia cuộc gọi này", ErrorCode.RESOURCE_ACCESS_DENIED, 403);
    }
    
    const call = callCheck[0];
    const isInitiator = call.sender_id === userId;
    const otherUserId = isInitiator ? call.receiver_id : call.sender_id;
    
    const callStartTime = new Date(call.sent_at).getTime();
    const callEndTime = new Date().getTime();
    const callDuration = Math.floor((callEndTime - callStartTime) / 1000);
    
    await pool.query(
      "UPDATE messages SET call_status = ?, call_duration = ? WHERE message_id = ?",
      ['ended', callDuration, call_id]
    );
    
    const callData = {
      call_id: Number(call_id),
      initiator_id: call.sender_id,
      recipient_id: call.receiver_id,
      call_type: call.call_type,
      is_group: false,
      status: 'ended',
      started_at: call.sent_at.toISOString(),
      ended_at: new Date().toISOString(),
      duration: callDuration,
      ended_by: userId
    };
    
    if (socketServiceInstance) {
      const otherUserSocketId = `user_${otherUserId}`;
      socketServiceInstance.notifyCall(otherUserSocketId, 'call:ended', callData);
    }
    
    res.status(200).json({
      status: "success",
      data: callData
    });
  } catch (error) {
    console.error("Lỗi khi kết thúc cuộc gọi:", error);
    if (error instanceof AppException) {
      throw error;
    }
    throw new AppException("Lỗi khi kết thúc cuộc gọi", ErrorCode.SERVER_ERROR, 500);
  }
};

export const getCallHistory = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.user_id;
    
    if (!userId) {
      throw new AppException("Không xác định được người dùng", ErrorCode.USER_NOT_AUTHENTICATED, 401);
    }
    
    const { limit = 20, page = 1 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);
    
    const query = `
      SELECT m.*, 
             s.username as sender_name, 
             s.profile_picture as sender_avatar,
             r.username as receiver_name,
             r.profile_picture as receiver_avatar
      FROM messages m
      JOIN users s ON m.sender_id = s.user_id
      JOIN users r ON m.receiver_id = r.user_id
      WHERE m.message_type = 'call' AND (m.sender_id = ? OR m.receiver_id = ?)
      ORDER BY m.sent_at DESC
      LIMIT ? OFFSET ?
    `;
    
    const [calls] = await pool.query<RowDataPacket[]>(query, [userId, userId, Number(limit), offset]);
    
    const countQuery = `
      SELECT COUNT(*) as total
      FROM messages
      WHERE message_type = 'call' AND (sender_id = ? OR receiver_id = ?)
    `;
    
    const [countResult] = await pool.query<RowDataPacket[]>(countQuery, [userId, userId]);
    
    const formattedCalls = calls.map(call => {
      const isInitiator = call.sender_id === userId;
      return {
        call_id: call.message_id,
        initiator_id: call.sender_id,
        initiator_name: call.sender_name,
        initiator_avatar: call.sender_avatar,
        recipient_id: call.receiver_id,
        recipient_name: call.receiver_name,
        recipient_avatar: call.receiver_avatar,
        call_type: call.call_type,
        call_status: call.call_status,
        duration: call.call_duration,
        started_at: call.sent_at,
        is_missed: call.call_status === 'missed',
        is_outgoing: isInitiator
      };
    });
    
    res.status(200).json({
      status: "success",
      data: formattedCalls,
      pagination: {
        hasMore: (Number(page) * Number(limit)) < countResult[0].total,
        page: Number(page),
        limit: Number(limit),
        total: countResult[0].total
      }
    });
  } catch (error) {
    console.error("Lỗi khi lấy lịch sử cuộc gọi:", error);
    if (error instanceof AppException) {
      throw error;
    }
    throw new AppException("Lỗi khi lấy lịch sử cuộc gọi", ErrorCode.SERVER_ERROR, 500);
  }
};

export const getCallDetails = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.user_id;
    
    if (!userId) {
      throw new AppException("Không xác định được người dùng", ErrorCode.USER_NOT_AUTHENTICATED, 401);
    }
    
    const { call_id } = req.params;
    
    if (!call_id) {
      throw new AppException("Thiếu thông tin cuộc gọi", ErrorCode.VALIDATION_ERROR, 400);
    }
    
    const [callCheck] = await pool.query<RowDataPacket[]>(
      `SELECT * FROM messages 
       WHERE message_id = ? AND message_type = 'call' 
       AND (sender_id = ? OR receiver_id = ?)`,
      [call_id, userId, userId]
    );
    
    if (callCheck.length === 0) {
      throw new AppException("Cuộc gọi không tồn tại hoặc bạn không tham gia cuộc gọi này", ErrorCode.RESOURCE_ACCESS_DENIED, 403);
    }
    
    const [callInfo] = await pool.query<RowDataPacket[]>(
      `SELECT m.*, 
              s.username as initiator_name, 
              s.profile_picture as initiator_avatar,
              r.username as recipient_name,
              r.profile_picture as recipient_avatar
       FROM messages m
       JOIN users s ON m.sender_id = s.user_id
       JOIN users r ON m.receiver_id = r.user_id
       WHERE m.message_id = ? AND m.message_type = 'call'`,
      [call_id]
    );
    
    if (callInfo.length === 0) {
      throw new AppException("Không tìm thấy cuộc gọi", ErrorCode.NOT_FOUND, 404);
    }
    
    const call = callInfo[0];
    
    const callData = {
      call_id: Number(call_id),
      initiator: {
        user_id: call.sender_id,
        username: call.initiator_name,
        profile_picture: call.initiator_avatar
      },
      recipient: {
        user_id: call.receiver_id,
        username: call.recipient_name,
        profile_picture: call.recipient_avatar
      },
      call_type: call.call_type,
      call_status: call.call_status,
      started_at: call.sent_at,
      duration: call.call_duration,
      is_group: false
    };
    
    res.status(200).json({
      status: "success",
      data: callData
    });
  } catch (error) {
    console.error("Lỗi khi lấy chi tiết cuộc gọi:", error);
    if (error instanceof AppException) {
      throw error;
    }
    throw new AppException("Lỗi khi lấy chi tiết cuộc gọi", ErrorCode.SERVER_ERROR, 500);
  }
};