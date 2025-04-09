import { Socket } from 'socket.io';
import pool from '../../config/db';
import { RowDataPacket } from 'mysql2';
import SocketService from '../../utils/socketService';

let socketServiceInstance: SocketService;

export const initializeSocketService = (instance: SocketService) => {
  socketServiceInstance = instance;
};

export const setupMessageSocketHandlers = (socket: Socket, userId: number): void => {
  socket.on('message:typing', ({ conversation_id, is_typing }: { conversation_id: number, is_typing: boolean }) => {
    const roomId = `conversation_${conversation_id}`;
    socket.to(roomId).emit('message:typing', {
      conversation_id,
      user_id: userId,
      is_typing
    });
  });

  socket.on('conversation:join', async ({ conversation_id }: { conversation_id: number }) => {
    try {
      const [memberCheck] = await pool.query<RowDataPacket[]>(
        "SELECT * FROM group_members WHERE group_id = ? AND user_id = ?",
        [conversation_id, userId]
      );
      
      if (memberCheck.length === 0) {
        socket.emit('error', {
          message: 'Bạn không thuộc cuộc trò chuyện này',
          code: 'FORBIDDEN'
        });
        return;
      }

      const roomId = `conversation_${conversation_id}`;
      socket.join(roomId);

      await pool.query(
        `UPDATE message_status 
         SET status = 'delivered', timestamp = NOW()
         WHERE message_id IN (
           SELECT message_id FROM messages 
           WHERE conversation_id = ? AND sender_id != ?
         ) AND user_id = ? AND status = 'sent'`,
        [conversation_id, userId, userId]
      );

      socket.to(roomId).emit('user:online', {
        conversation_id,
        user_id: userId,
        online: true
      });

      const [undeliveredMessages] = await pool.query<RowDataPacket[]>(
        `SELECT m.message_id, m.sender_id 
         FROM messages m
         JOIN message_status ms ON m.message_id = ms.message_id
         WHERE m.conversation_id = ? AND m.sender_id != ? 
         AND ms.user_id = ? AND ms.status = 'delivered'`,
        [conversation_id, userId, userId]
      );

      if (undeliveredMessages.length > 0) {
        const messageIds = undeliveredMessages.map(msg => msg.message_id);
        const uniqueSenders = [...new Set(undeliveredMessages.map(msg => msg.sender_id))];

        for (const senderId of uniqueSenders) {
          socket.to(`user_${senderId}`).emit('message:delivered', {
            conversation_id,
            user_id: userId,
            message_ids: messageIds.filter(id => 
              undeliveredMessages.find(msg => msg.message_id === id && msg.sender_id === senderId)
            )
          });
        }
      }
    } catch (error) {
      console.error('Error in conversation:join handler:', error);
      socket.emit('error', {
        message: 'Lỗi khi tham gia cuộc trò chuyện',
        code: 'SERVER_ERROR'
      });
    }
  });

  socket.on('conversation:leave', ({ conversation_id }: { conversation_id: number }) => {
    const roomId = `conversation_${conversation_id}`;
    socket.leave(roomId);

    socket.to(roomId).emit('user:offline', {
      conversation_id,
      user_id: userId
    });
  });

  socket.on('message:read', async ({ conversation_id, message_ids }: { conversation_id: number, message_ids: number[] }) => {
    try {
      if (!message_ids || message_ids.length === 0) return;

      const placeholders = message_ids.map(() => '?').join(',');
      
      await pool.query(
        `UPDATE message_status 
         SET status = 'read', timestamp = NOW()
         WHERE message_id IN (${placeholders}) AND user_id = ?`,
        [...message_ids, userId]
      );
      
      const [messageInfo] = await pool.query<RowDataPacket[]>(
        `SELECT message_id, sender_id 
         FROM messages 
         WHERE message_id IN (${placeholders})`,
        [...message_ids]
      );
      
      const messagesBySender: Record<number, number[]> = {};
      messageInfo.forEach((msg: any) => {
        if (msg.sender_id !== userId) {
          if (!messagesBySender[msg.sender_id]) {
            messagesBySender[msg.sender_id] = [];
          }
          messagesBySender[msg.sender_id].push(msg.message_id);
        }
      });
      
      for (const senderId in messagesBySender) {
        socket.to(`user_${senderId}`).emit('message:read', {
          conversation_id,
          reader_id: userId,
          message_ids: messagesBySender[senderId]
        });
      }
      
      const roomId = `conversation_${conversation_id}`;
      socket.to(roomId).emit('conversation:updated', {
        conversation_id,
        last_read_by: userId
      });
    } catch (error) {
      console.error('Error in message:read handler:', error);
    }
  });

  socket.on('message:send', async (messageData: any) => {
    try {
      const { conversation_id, content, message_type = 'text' } = messageData;
      
      if (!conversation_id || !content) {
        socket.emit('error', {
          message: 'Thiếu thông tin tin nhắn',
          code: 'VALIDATION_ERROR'
        });
        return;
      }
      
      const [memberCheck] = await pool.query<RowDataPacket[]>(
        "SELECT * FROM group_members WHERE group_id = ? AND user_id = ?",
        [conversation_id, userId]
      );
      
      if (memberCheck.length === 0) {
        socket.emit('error', {
          message: 'Bạn không thuộc cuộc trò chuyện này',
          code: 'FORBIDDEN'
        });
        return;
      }

      const connection = await pool.getConnection();
      try {
        await connection.beginTransaction();
        
        const [result] = await connection.query<RowDataPacket[]>(
          "INSERT INTO messages (conversation_id, sender_id, content, message_type) VALUES (?, ?, ?, ?)",
          [conversation_id, userId, content, message_type]
        );
        
        const messageId = (result as any).insertId;
        
        const [members] = await connection.query<RowDataPacket[]>(
          "SELECT user_id FROM group_members WHERE group_id = ? AND user_id != ?",
          [conversation_id, userId]
        );
        
        if (members.length > 0) {
          const statusValues = members.map((member: any) => [
            messageId, member.user_id, 'sent'
          ]);
          
          const statusPlaceholders = statusValues.map(() => '(?, ?, ?)').join(',');
          await connection.query(
            `INSERT INTO message_status (message_id, user_id, status) VALUES ${statusPlaceholders}`,
            statusValues.flat()
          );
        }
        
        await connection.query(
          "UPDATE chat_groups SET last_message_id = ? WHERE group_id = ?",
          [messageId, conversation_id]
        );
        
        await connection.commit();
        
        const [messages] = await pool.query<RowDataPacket[]>(
          `SELECT m.*, u.username, u.profile_picture 
           FROM messages m
           JOIN users u ON m.sender_id = u.user_id
           WHERE m.message_id = ?`,
          [messageId]
        );
        
        const message = messages[0];
        
        const roomId = `conversation_${conversation_id}`;
        if (socketServiceInstance) {
          socketServiceInstance.notifyNewMessage(roomId, message);
        } else {
          socket.to(roomId).emit('chat:message', {
            roomId,
            message
          });
        }
        
        members.forEach((member: any) => {
          pool.query(
            "UPDATE message_status SET status = 'delivered', timestamp = NOW() WHERE message_id = ? AND user_id = ?",
            [messageId, member.user_id]
          );
          
          socket.to(`user_${member.user_id}`).emit('message:new', {
            conversation_id,
            message
          });
        });
      } catch (error) {
        await connection.rollback();
        throw error;
      } finally {
        connection.release();
      }
    } catch (error) {
      console.error('Error in message:send handler:', error);
      socket.emit('error', {
        message: 'Lỗi khi gửi tin nhắn',
        code: 'SERVER_ERROR'
      });
    }
  });
}; 