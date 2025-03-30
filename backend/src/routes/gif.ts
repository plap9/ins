import express, { Router } from 'express';
import { authMiddleware } from '../middlewares/authMiddleware';
import {
    handleSearchGifs,
    handleGetTrendingGifs,
    handleGetGifById
} from '../controllers/posts/comments/gifController';

const router: Router = express.Router();

router.use(authMiddleware);
router.get('/search', handleSearchGifs);
router.get('/trending', handleGetTrendingGifs);
router.get('/:id', handleGetGifById);

export default router;