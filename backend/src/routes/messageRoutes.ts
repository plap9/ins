import express from 'express';
import * as messageController from '../controllers/messages/messageController';
import { authMiddleware } from '../middlewares/authMiddleware';
import { createUploadMiddleware } from '../middlewares/upload';

const router = express.Router();

const uploadMessageMedia = createUploadMiddleware(
  'media',
  ['jpg', 'jpeg', 'png', 'gif', 'mp4', 'mov', 'mp3', 'wav', 'ogg', 'webm', 'webp'],
  25 * 1024 * 1024
);

router.use(authMiddleware);

router.post('/send', messageController.sendMessage);
router.post('/media', uploadMessageMedia, messageController.sendMediaMessage);
router.delete('/:messageId', messageController.deleteMessage);
router.post('/read', messageController.markAsRead);

router.get('/conversations', messageController.getConversations);
router.post('/conversations', messageController.createConversation);
router.post('/conversations/group', messageController.createGroupConversation);
router.get('/conversations/with/:userId', messageController.getConversationWithUser);

router.get('/conversations/:conversationId', messageController.getConversationMessages);
router.get('/conversations/:conversationId/messages', messageController.getConversationMessages);
router.post('/conversations/:conversationId/messages', messageController.sendMessageToConversation);
router.post('/conversations/:conversationId/messages/media', uploadMessageMedia, messageController.sendMediaToConversation);

router.get('/messages/conversations/:conversationId', messageController.getConversationMessages);

router.post('/groups/:groupId/members', messageController.addMembersToGroup);
router.delete('/groups/:groupId/leave', messageController.leaveGroup);
router.put('/groups/:groupId', messageController.updateGroupInfo);

export default router; 