import { Socket } from 'socket.io';
import pool from '../../config/db';
import { RowDataPacket, OkPacket, ResultSetHeader } from 'mysql2';
import SocketService from '../../utils/socketService';
import { ErrorCode } from '../../types/errorCode';
import { logError } from '../../utils/errorUtils';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';

let socketServiceInstance: SocketService;

export const initializeSocketService = (instance: SocketService) => {
  socketServiceInstance = instance;
};

// Thêm các interface cho dữ liệu cuộc gọi
interface CallStatusData {
  call_id: number;
  status: string;
  recipient_id?: number;
}

interface CallOfferData {
  call_id: number;
  recipient_id: number;
  sdp: any;
}

interface CallAnswerData {
  call_id: number;
  initiator_id: number;
  sdp: any;
}

interface CallIceData {
  call_id: number;
  user_id: number;
  candidate: any;
}

// Mở rộng interface Socket để thêm thuộc tính user
declare module 'socket.io' {
  interface Socket {
    user?: {
      user_id: number;
      username: string;
    };
  }
}

export const setupMessageSocketHandlers = (socket: Socket, userId: number): void => {
  socket.on('message:typing', ({ conversation_id, is_typing }: { conversation_id: number, is_typing: boolean }) => {
    const roomId = `conversation_${conversation_id}`;
    socket.to(roomId).emit('message:typing', {
      conversation_id,
      user_id: userId,
      is_typing,
      timestamp: Date.now()
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
      
      socket.emit('conversation:joined', {
        conversation_id,
        room_id: roomId
      });
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

  socket.on('connection:status', ({ status }: { status: 'stable' | 'unstable' | 'reconnecting' }) => {
    const userRooms = Array.from(socket.rooms).filter(room => room !== socket.id);
    if (status === 'reconnecting') {
      console.log(`[${new Date().toISOString()}] Người dùng ${userId} đang cố gắng kết nối lại`);
    } else if (status === 'stable') {
      console.log(`[${new Date().toISOString()}] Kết nối của người dùng ${userId} đã ổn định`);
      
      userRooms.forEach(roomId => {
        if (roomId.startsWith('conversation_')) {
          const conversationId = parseInt(roomId.replace('conversation_', ''));
          socket.to(roomId).emit('user:online', {
            user_id: userId,
            online: true,
            conversation_id: conversationId
          });
        }
      });
    }
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
      const { conversation_id, content, message_type = 'text', reply_to_id, clientId } = messageData;
      
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
        
        const [result] = await connection.query<ResultSetHeader>(
          "INSERT INTO messages (conversation_id, sender_id, content, message_type, reply_to_id) VALUES (?, ?, ?, ?, ?)",
          [conversation_id, userId, content, message_type, reply_to_id || null]
        );
        
        const messageId = result.insertId;
        
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
          `SELECT m.*, u.username, u.profile_picture,
                  rm.message_id as reply_message_id, 
                  rm.content as reply_content,
                  ru.username as reply_username
           FROM messages m
           JOIN users u ON m.sender_id = u.user_id
           LEFT JOIN messages rm ON m.reply_to_id = rm.message_id
           LEFT JOIN users ru ON rm.sender_id = ru.user_id
           WHERE m.message_id = ?`,
          [messageId]
        );
        
        const message = {
          ...messages[0],
          clientId: clientId
        };
        
        const roomId = `conversation_${conversation_id}`;
        socket.to(roomId).emit('chat:message', {
          roomId,
          message
        });
        
        socket.emit('message:sent', {
          messageId,
          clientId,
          conversationId: conversation_id,
          timestamp: new Date().toISOString()
        });
        
        members.forEach((member: any) => {
          const userSocket = socketServiceInstance?.getUserSocket(member.user_id);
          if (userSocket) {
            connection.query(
              "UPDATE message_status SET status = 'delivered', timestamp = NOW() WHERE message_id = ? AND user_id = ?",
              [messageId, member.user_id]
            );
            
            socket.to(`user_${member.user_id}`).emit('message:new', {
              conversation_id,
              message_id: messageId,
              sender_id: userId
            });
          }
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

  socket.on('message:delete', async ({ conversation_id, message_id }: { conversation_id: number, message_id: number }) => {
    try {
      const [messageCheck] = await pool.query<RowDataPacket[]>(
        "SELECT * FROM messages WHERE message_id = ? AND sender_id = ?",
        [message_id, userId]
      );
      
      if (messageCheck.length === 0) {
        socket.emit('error', {
          message: 'Bạn không có quyền xóa tin nhắn này',
          code: 'FORBIDDEN'
        });
        return;
      }
      
      await pool.query(
        "UPDATE messages SET content = '[Tin nhắn đã bị xóa]', deleted_at = NOW() WHERE message_id = ?",
        [message_id]
      );
      
      const roomId = `conversation_${conversation_id}`;
      socket.to(roomId).emit('message:deleted', {
        conversation_id,
        message_id,
        deleted_by: userId
      });
      
      socket.emit('message:delete-confirmed', {
        message_id
      });
    } catch (error) {
      console.error('Error in message:delete handler:', error);
      socket.emit('error', {
        message: 'Lỗi khi xóa tin nhắn',
        code: 'SERVER_ERROR'
      });
    }
  });

  socket.on('media:upload', async ({ file, conversation_id, type = 'image', caption = '' }: {
    file: { data: Buffer, name: string, type: string },
    conversation_id: number,
    type: 'image' | 'video' | 'audio',
    caption?: string
  }) => {
    try {
      if (!file || !conversation_id) {
        socket.emit('error', {
          message: 'Thiếu thông tin tải lên',
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
      
      const uploadDir = path.join(process.cwd(), 'uploads', 'messages');
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      
      const fileExt = path.extname(file.name);
      const fileName = `${crypto.randomBytes(16).toString('hex')}${fileExt}`;
      const filePath = path.join(uploadDir, fileName);
      
      fs.writeFileSync(filePath, file.data);
      
      const mediaUrl = `/uploads/messages/${fileName}`;
      
      const connection = await pool.getConnection();
      try {
        await connection.beginTransaction();
        
        const [result] = await connection.query<ResultSetHeader>(
          "INSERT INTO messages (conversation_id, sender_id, content, message_type) VALUES (?, ?, ?, ?)",
          [conversation_id, userId, caption, 'media']
        );
        
        const messageId = result.insertId;
        
        await connection.query(
          "INSERT INTO media (media_url, media_type, message_id, content_type) VALUES (?, ?, ?, 'message')",
          [mediaUrl, type, messageId]
        );
        
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
          `SELECT m.*, u.username, u.profile_picture, med.media_url, med.media_type
           FROM messages m
           JOIN users u ON m.sender_id = u.user_id
           JOIN media med ON m.message_id = med.message_id
           WHERE m.message_id = ?`,
          [messageId]
        );
        
        const message = messages[0];
        
        const roomId = `conversation_${conversation_id}`;
        socket.to(roomId).emit('chat:message', {
          roomId,
          message
        });
        
        socket.emit('media:upload-complete', {
          messageId,
          mediaUrl,
          conversation_id
        });
        
        members.forEach((member: any) => {
          const userSocket = socketServiceInstance?.getUserSocket(member.user_id);
          if (userSocket) {
            connection.query(
              "UPDATE message_status SET status = 'delivered', timestamp = NOW() WHERE message_id = ? AND user_id = ?",
              [messageId, member.user_id]
            );
            
            socket.to(`user_${member.user_id}`).emit('message:new', {
              conversation_id,
              message_id: messageId,
              sender_id: userId,
              is_media: true
            });
          }
        });
      } catch (error) {
        await connection.rollback();
        throw error;
      } finally {
        connection.release();
      }
    } catch (error) {
      console.error('Error in media:upload handler:', error);
      socket.emit('error', {
        message: 'Lỗi khi tải lên phương tiện',
        code: 'SERVER_ERROR'
      });
    }
  });
  
  socket.on('conversation:create', async ({ user_id, type = 'private', name, members }: {
    user_id?: number,
    type: 'private' | 'group',
    name?: string,
    members?: number[]
  }) => {
    try {
      const connection = await pool.getConnection();
      try {
        await connection.beginTransaction();
        
        if (type === 'private' && user_id) {
          const [existingCheck] = await connection.query<RowDataPacket[]>(
            `SELECT c.* 
             FROM conversations c
             JOIN conversation_members cm1 ON c.conversation_id = cm1.conversation_id
             JOIN conversation_members cm2 ON c.conversation_id = cm2.conversation_id
             WHERE c.type = 'private' 
             AND cm1.user_id = ? AND cm2.user_id = ?
             AND (SELECT COUNT(*) FROM conversation_members WHERE conversation_id = c.conversation_id) = 2`,
            [userId, user_id]
          );
          
          if (existingCheck.length > 0) {
            const conversationId = existingCheck[0].conversation_id;
            socket.emit('conversation:created', {
              conversation_id: conversationId,
              type: 'private',
              already_exists: true
            });
            
            await connection.commit();
            return;
          }
          
          const [result] = await connection.query<ResultSetHeader>(
            "INSERT INTO conversations (creator_id, type, name) VALUES (?, ?, ?)",
            [userId, 'private', null]
          );
          
          const conversationId = result.insertId;
          
          await connection.query(
            "INSERT INTO conversation_members (conversation_id, user_id, role) VALUES (?, ?, ?), (?, ?, ?)",
            [conversationId, userId, 'admin', conversationId, user_id, 'member']
          );
          
          await connection.commit();
          
          socket.emit('conversation:created', {
            conversation_id: conversationId,
            type: 'private'
          });
          
          const userRoom = `user_${user_id}`;
          socket.to(userRoom).emit('conversation:added', {
            conversation_id: conversationId,
            added_by: userId
          });
        } else if (type === 'group') {
          if (!name || !members || members.length === 0) {
            socket.emit('error', {
              message: 'Thiếu thông tin nhóm chat',
              code: 'VALIDATION_ERROR'
            });
            return;
          }
          
          const [result] = await connection.query<ResultSetHeader>(
            "INSERT INTO conversations (creator_id, type, name) VALUES (?, ?, ?)",
            [userId, 'group', name]
          );
          
          const conversationId = result.insertId;
          
          await connection.query(
            "INSERT INTO conversation_members (conversation_id, user_id, role) VALUES (?, ?, ?)",
            [conversationId, userId, 'admin']
          );
          
          if (members.length > 0) {
            const values = members
              .filter(memberId => memberId !== userId)
              .map(memberId => [conversationId, memberId, 'member']);
            
            if (values.length > 0) {
              const placeholders = values.map(() => '(?, ?, ?)').join(',');
              await connection.query(
                `INSERT INTO conversation_members (conversation_id, user_id, role) VALUES ${placeholders}`,
                values.flat()
              );
            }
          }
          
          await connection.commit();
          
          socket.emit('conversation:created', {
            conversation_id: conversationId,
            type: 'group'
          });
          
          members.forEach(memberId => {
            if (memberId !== userId) {
              const userRoom = `user_${memberId}`;
              socket.to(userRoom).emit('conversation:added', {
                conversation_id: conversationId,
                added_by: userId,
                type: 'group',
                name
              });
            }
          });
        }
      } catch (error) {
        await connection.rollback();
        throw error;
      } finally {
        connection.release();
      }
    } catch (error) {
      console.error('Error in conversation:create handler:', error);
      socket.emit('error', {
        message: 'Lỗi khi tạo cuộc trò chuyện',
        code: 'SERVER_ERROR'
      });
    }
  });

  socket.on('call:signal', async ({ call_id, recipient_id, signal_data, signal_type }: {
    call_id: number,
    recipient_id: number,
    signal_data: any,
    signal_type: 'offer' | 'answer' | 'ice-candidate'
  }) => {
    try {
      if (!call_id || !recipient_id || !signal_data) {
        socket.emit('error', {
          message: 'Thiếu thông tin tín hiệu cuộc gọi',
          code: 'VALIDATION_ERROR'
        });
        return;
      }
      
      const [participantCheck] = await pool.query<RowDataPacket[]>(
        "SELECT * FROM call_participants WHERE call_id = ? AND user_id = ?",
        [call_id, userId]
      );
      
      if (participantCheck.length === 0) {
        socket.emit('error', {
          message: 'Bạn không tham gia cuộc gọi này',
          code: 'FORBIDDEN'
        });
        return;
      }
      
      const [recipientCheck] = await pool.query<RowDataPacket[]>(
        "SELECT * FROM call_participants WHERE call_id = ? AND user_id = ?",
        [call_id, recipient_id]
      );
      
      if (recipientCheck.length === 0) {
        socket.emit('error', {
          message: 'Người nhận không tham gia cuộc gọi này',
          code: 'FORBIDDEN'
        });
        return;
      }
      
      const recipientUserRoom = `user_${recipient_id}`;
      const recipientSocket = socketServiceInstance?.getUserSocket(recipient_id);
      
      if (!recipientSocket) {
        socket.emit('call:recipient-offline', {
          call_id,
          recipient_id,
          message: 'Người nhận hiện không trực tuyến'
        });
        
        await pool.query(
          "UPDATE messages SET call_status = 'missed' WHERE message_id = ?",
          [call_id]
        );
        
        return;
      }
      
      socket.to(recipientUserRoom).emit('call:signal', {
        call_id,
        sender_id: userId,
        signal_data,
        signal_type
      });
    } catch (error) {
      console.error('Error in call:signal handler:', error);
      socket.emit('error', {
        message: 'Lỗi khi gửi tín hiệu cuộc gọi',
        code: 'SERVER_ERROR'
      });
    }
  });

  socket.on('call:status', async (data: CallStatusData) => {
    try {
      const userId = socket.user?.user_id;
      
      if (!userId || !data.call_id || !data.status) {
        console.error("Missing required data for call:status event", {
          userId,
          callId: data.call_id,
          status: data.status
        });
        return;
      }
      
      const [callInfo] = await pool.query<RowDataPacket[]>(
        `SELECT * FROM messages
         WHERE message_id = ? AND message_type = 'call'`,
        [data.call_id]
      );
      
      if (callInfo.length === 0) {
        console.error(`Call not found with ID: ${data.call_id}`);
        return;
      }
      
      const call = callInfo[0];
      const isInitiator = call.sender_id === userId;
      
      if (call.sender_id !== userId && call.receiver_id !== userId) {
        console.error(`User ${userId} is not related to call ${data.call_id}`);
        return;
      }
      
      const receiverId = isInitiator ? call.receiver_id : call.sender_id;
      
      await pool.query(
        "UPDATE messages SET call_status = ? WHERE message_id = ?",
        [data.status, data.call_id]
      );
      
      if (data.status === 'ended') {
        const callStartTime = new Date(call.sent_at).getTime();
        const callEndTime = new Date().getTime();
        const callDuration = Math.floor((callEndTime - callStartTime) / 1000);
        
        await pool.query(
          "UPDATE messages SET call_duration = ? WHERE message_id = ?",
          [callDuration, data.call_id]
        );
      }
      
      const callData = {
        call_id: Number(data.call_id),
        initiator_id: call.sender_id,
        recipient_id: call.receiver_id,
        call_type: call.call_type,
        status: data.status,
        updated_by: userId,
        updated_at: new Date().toISOString()
      };
      
      const receiverSocketId = `user_${receiverId}`;
      socket.to(receiverSocketId).emit(`call:${data.status}`, callData);
      
    } catch (error) {
      console.error("Error in call:status event", error);
    }
  });

  socket.on('call:mute', ({ call_id, muted }: { call_id: number, muted: boolean }) => {
    try {
      pool.query<RowDataPacket[]>(
        "SELECT receiver_id FROM messages WHERE message_id = ?",
        [call_id]
      ).then(([messageInfo]) => {
        if (messageInfo.length === 0) {
          return;
        }
        
        const recipientUserRoom = `user_${messageInfo[0].receiver_id}`;
        
        socket.to(recipientUserRoom).emit('call:user-muted', {
          call_id,
          user_id: userId,
          muted
        });
      }).catch(error => {
        console.error('Error getting message info:', error);
      });
    } catch (error) {
      console.error('Error in call:mute handler:', error);
    }
  });

  socket.on('call:camera', ({ call_id, enabled }: { call_id: number, enabled: boolean }) => {
    try {
      pool.query<RowDataPacket[]>(
        "SELECT receiver_id FROM messages WHERE message_id = ?",
        [call_id]
      ).then(([messageInfo]) => {
        if (messageInfo.length === 0) {
          return;
        }
        
        const recipientUserRoom = `user_${messageInfo[0].receiver_id}`;
        
        socket.to(recipientUserRoom).emit('call:user-camera', {
          call_id,
          user_id: userId,
          enabled
        });
      }).catch(error => {
        console.error('Error getting message info:', error);
      });
    } catch (error) {
      console.error('Error in call:camera handler:', error);
    }
  });

  socket.on("call:offer", async (data: CallOfferData) => {
    try {
      const userId = socket.user?.user_id;
      
      if (!userId || !data.call_id || !data.recipient_id || !data.sdp) {
        console.error("Missing required data for call:offer event", {
          userId,
          callId: data.call_id,
          recipientId: data.recipient_id
        });
        return;
      }
      
      const [callCheck] = await pool.query<RowDataPacket[]>(
        `SELECT * FROM messages 
         WHERE message_id = ? AND message_type = 'call' 
         AND sender_id = ? AND receiver_id = ?`,
        [data.call_id, userId, data.recipient_id]
      );
      
      if (callCheck.length === 0) {
        console.error(`Call verification failed: ${data.call_id}, sender: ${userId}, receiver: ${data.recipient_id}`);
        return;
      }
      
      const recipientSocketId = `user_${data.recipient_id}`;
      
      socket.to(recipientSocketId).emit("call:offer", {
        call_id: data.call_id,
        initiator_id: userId,
        sdp: data.sdp
      });
      
    } catch (error) {
      console.error("Error in call:offer event", error);
    }
  });

  socket.on("call:answer", async (data: CallAnswerData) => {
    try {
      const userId = socket.user?.user_id;
      
      if (!userId || !data.call_id || !data.initiator_id || !data.sdp) {
        console.error("Missing required data for call:answer event", {
          userId,
          callId: data.call_id,
          initiatorId: data.initiator_id
        });
        return;
      }
      
      const [callCheck] = await pool.query<RowDataPacket[]>(
        `SELECT * FROM messages 
         WHERE message_id = ? AND message_type = 'call' 
         AND sender_id = ? AND receiver_id = ?`,
        [data.call_id, data.initiator_id, userId]
      );
      
      if (callCheck.length === 0) {
        console.error(`Call verification failed: ${data.call_id}, sender: ${data.initiator_id}, receiver: ${userId}`);
        return;
      }
      
      const initiatorSocketId = `user_${data.initiator_id}`;
      
      socket.to(initiatorSocketId).emit("call:answer", {
        call_id: data.call_id,
        recipient_id: userId,
        sdp: data.sdp
      });
    } catch (error) {
      console.error("Error in call:answer event", error);
    }
  });

  socket.on("call:ice", async (data: CallIceData) => {
    try {
      const userId = socket.user?.user_id;
      const targetUserId = data.user_id;
      
      if (!userId || !targetUserId || !data.call_id || !data.candidate) {
        console.error("Missing required data for call:ice event", {
          userId,
          targetUserId,
          callId: data.call_id
        });
        return;
      }
      
      const [callCheck] = await pool.query<RowDataPacket[]>(
        `SELECT * FROM messages 
         WHERE message_id = ? AND message_type = 'call' 
         AND ((sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?))`,
        [data.call_id, userId, targetUserId, targetUserId, userId]
      );
      
      if (callCheck.length === 0) {
        console.error(`Call verification failed for ICE candidate: ${data.call_id}, users: ${userId} and ${targetUserId}`);
        return;
      }
      
      const targetSocketId = `user_${targetUserId}`;
      
      socket.to(targetSocketId).emit("call:ice", {
        call_id: data.call_id,
        user_id: userId,
        candidate: data.candidate
      });
    } catch (error) {
      console.error("Error in call:ice event", error);
    }
  });
}; 