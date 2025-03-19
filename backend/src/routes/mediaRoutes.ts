import express from 'express';
import { authMiddleware } from '../middlewares/authMiddleware';
import {
  editMedia,
  getMediaLibrary,
} from '../controllers/media/mediaEditorController';

const router = express.Router();

router.post('/edit', authMiddleware, editMedia);

router.get('/library', authMiddleware, getMediaLibrary);


export default router;