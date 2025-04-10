import { Request, Response } from "express";
import pool from "../../config/db";
import { AuthRequest } from "../../middlewares/authMiddleware"; 
import { AppException } from "../../middlewares/errorHandler";
import { ErrorCode } from "../../types/errorCode";
import { RowDataPacket, OkPacket, ResultSetHeader } from "mysql2";
import SocketService from "../../utils/socketService";

let socketServiceInstance: SocketService;

export const initializeSocketService = (instance: SocketService) => {
  socketServiceInstance = instance;
};

interface MessageRow extends RowDataPacket {
  message_id: number;
  content: string;
  message_type: string;
  is_read: number;
  created_at: Date;
}

interface ConversationRow extends RowDataPacket {
  conversation_id: number;
  type: string;
  name?: string;
  creator_id: number;
  created_at: Date;
}

interface ConversationMemberRow extends RowDataPacket {
  id: number;
  conversation_id: number;
  user_id: number;
  role: string;
}

export const sendMessage = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.user_id;
    
    if (!userId) {
      throw new AppException("Không xác định được người dùng", ErrorCode.USER_NOT_AUTHENTICATED, 401);
    }
    
    const { conversation_id, content, message_type = 'text' } = req.body;
    
    if (!conversation_id || !content) {
      throw new AppException("Thiếu thông tin tin nhắn", ErrorCode.VALIDATION_ERROR, 400);
    }
    
    const [memberCheck] = await pool.query<ConversationMemberRow[]>(
      "SELECT * FROM group_members WHERE conversation_id = ? AND user_id = ?",
      [conversation_id, userId]
    );
    
    if (memberCheck.length === 0) {
      throw new AppException("Bạn không thuộc cuộc trò chuyện này", ErrorCode.RESOURCE_ACCESS_DENIED, 403);
    }

    const [result] = await pool.query<ResultSetHeader>(
      "INSERT INTO messages (conversation_id, sender_id, content, message_type) VALUES (?, ?, ?, ?)",
      [conversation_id, userId, content, message_type]
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
    
    await pool.query(
      "UPDATE chat_groups SET last_message_id = ? WHERE group_id = ?",
      [messageId, conversation_id]
    );
    
    const roomId = `conversation_${conversation_id}`;
    if (socketServiceInstance) {
      socketServiceInstance.notifyNewMessage(roomId, message);
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
    
    const { conversation_id, message_type, caption } = req.body;
    
    if (!conversation_id || !message_type || !req.file) {
      throw new AppException("Thiếu thông tin tin nhắn", ErrorCode.VALIDATION_ERROR, 400);
    }
    
    const [memberCheck] = await pool.query<ConversationMemberRow[]>(
      "SELECT * FROM group_members WHERE conversation_id = ? AND user_id = ?",
      [conversation_id, userId]
    );
    
    if (memberCheck.length === 0) {
      throw new AppException("Bạn không thuộc cuộc trò chuyện này", ErrorCode.RESOURCE_ACCESS_DENIED, 403);
    }

    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      
      const [messageResult] = await connection.query<ResultSetHeader>(
        "INSERT INTO messages (conversation_id, sender_id, content, message_type) VALUES (?, ?, ?, ?)",
        [conversation_id, userId, caption || '', message_type]
      );
      
      const messageId = messageResult.insertId;
      
      await connection.query(
        "INSERT INTO message_media (message_id, media_type, media_url) VALUES (?, ?, ?)",
        [messageId, message_type, req.file.path]
      );
      
      await connection.query(
        "UPDATE chat_groups SET last_message_id = ? WHERE group_id = ?",
        [messageId, conversation_id]
      );
      
      await connection.commit();
      
      const [messages] = await pool.query<MessageRow[]>(
        `SELECT m.*, u.username, u.profile_picture, mm.media_url, mm.media_type
         FROM messages m
         JOIN users u ON m.sender_id = u.user_id
         JOIN message_media mm ON m.message_id = mm.message_id
         WHERE m.message_id = ?`,
        [messageId]
      );
      
      const message = messages[0];
      
      const roomId = `conversation_${conversation_id}`;
      if (socketServiceInstance) {
        socketServiceInstance.notifyNewMessage(roomId, message);
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
    
    const conversationId = parseInt(req.params.conversationId);
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = (page - 1) * limit;
    
    if (!conversationId) {
      throw new AppException("ID cuộc trò chuyện không hợp lệ", ErrorCode.VALIDATION_ERROR, 400);
    }
    
    const [memberCheck] = await pool.query<ConversationMemberRow[]>(
      "SELECT * FROM group_members WHERE conversation_id = ? AND user_id = ?",
      [conversationId, userId]
    );
    
    if (memberCheck.length === 0) {
      throw new AppException("Bạn không thuộc cuộc trò chuyện này", ErrorCode.RESOURCE_ACCESS_DENIED, 403);
    }

    const [messages] = await pool.query<RowDataPacket[]>(
      `SELECT m.message_id, m.sender_id, m.content, m.message_type, m.is_read, m.created_at,
       u.username, u.profile_picture,
       mm.media_id, mm.media_type, mm.media_url, mm.thumbnail_url, mm.duration
       FROM messages m
       JOIN users u ON m.sender_id = u.user_id
       LEFT JOIN message_media mm ON m.message_id = mm.message_id
       WHERE m.conversation_id = ?
       ORDER BY m.created_at DESC
       LIMIT ? OFFSET ?`,
      [conversationId, limit, offset]
    );
    
    await pool.query(
      `UPDATE message_status 
       SET status = 'read', timestamp = NOW()
       WHERE message_id IN (
         SELECT message_id FROM messages 
         WHERE conversation_id = ? AND sender_id != ?
       ) AND user_id = ? AND status != 'read'`,
      [conversationId, userId, userId]
    );

    const maxAge = 60;
    res.setHeader('Cache-Control', `private, max-age=${maxAge}`);
    res.setHeader('Expires', new Date(Date.now() + maxAge * 1000).toUTCString());
    res.setHeader('Vary', 'Authorization');

    res.status(200).json({
      status: "success",
      data: messages,
      pagination: {
        page,
        limit,
        has_more: messages.length === limit
      }
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
    
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = (page - 1) * limit;

    const [conversations] = await pool.query<RowDataPacket[]>(
      `SELECT 
         cg.group_id AS conversation_id, 
         cg.name, 
         cg.type,
         cg.created_at,
         cg.creator_id,
         m.message_id AS last_message_id,
         m.content AS last_message_content,
         m.message_type AS last_message_type,
         m.created_at AS last_message_time,
         m.sender_id AS last_message_sender_id,
         u.username AS last_message_sender_name,
         (SELECT COUNT(*) FROM messages msg 
          JOIN message_status ms ON msg.message_id = ms.message_id
          WHERE msg.conversation_id = cg.group_id 
          AND msg.sender_id != ? 
          AND ms.user_id = ?
          AND ms.status = 'delivered') AS unread_count
       FROM chat_groups cg
       JOIN group_members gm ON cg.group_id = gm.group_id
       LEFT JOIN messages m ON cg.last_message_id = m.message_id
       LEFT JOIN users u ON m.sender_id = u.user_id
       WHERE gm.user_id = ?
       GROUP BY cg.group_id
       ORDER BY COALESCE(m.created_at, cg.created_at) DESC
       LIMIT ? OFFSET ?`,
      [userId, userId, userId, limit, offset]
    );
    
    const conversationsWithParticipants = await Promise.all(
      conversations.map(async (conv) => {
        const [participants] = await pool.query<RowDataPacket[]>(
          `SELECT u.user_id, u.username, u.profile_picture, u.is_verified, gm.role
           FROM group_members gm
           JOIN users u ON gm.user_id = u.user_id
           WHERE gm.group_id = ?`,
          [conv.conversation_id]
        );
        
        return {
          ...conv,
          participants
        };
      })
    );

    const maxAge = 30;
    res.setHeader('Cache-Control', `private, max-age=${maxAge}`);
    res.setHeader('Expires', new Date(Date.now() + maxAge * 1000).toUTCString());
    res.setHeader('Vary', 'Authorization');

    res.status(200).json({
      status: "success",
      data: conversationsWithParticipants,
      pagination: {
        page,
        limit,
        has_more: conversations.length === limit
      }
    });
  } catch (error) {
    if (error instanceof AppException) {
      throw error;
    }
    throw new AppException("Lỗi khi lấy danh sách cuộc trò chuyện", ErrorCode.SERVER_ERROR, 500);
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