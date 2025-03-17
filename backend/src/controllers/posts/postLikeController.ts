import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from '../../middlewares/authMiddleware';
import PostLikeService from '../../services/PostLikeService';
import { AppError } from '../../middlewares/errorHandler';

export const likePost = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const postId = parseInt(req.params.id);
        const userId = req.user?.user_id;

        if (!userId) throw new AppError('Người dùng chưa xác thực', 401);
        if (isNaN(postId)) throw new AppError('ID bài viết không hợp lệ', 400);

        await PostLikeService.likePost(userId, postId);
        res.status(201).json({ message: 'Thích bài viết thành công' });
    } catch (error) {
        next(error);
    }
};

export const unlikePost = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const postId = parseInt(req.params.id);
        const userId = req.user?.user_id;

        if (!userId) throw new AppError('Người dùng chưa xác thực', 401);
        if (isNaN(postId)) throw new AppError('ID bài viết không hợp lệ', 400);

        await PostLikeService.unlikePost(userId, postId);
        res.status(200).json({ message: 'Bỏ thích bài viết thành công' });
    } catch (error) {
        next(error);
    }
};

export const getPostLikes = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const postId = parseInt(req.params.id);
        const page = Math.max(parseInt(req.query.page as string || '1', 10), 1);
        const limit = Math.min(Math.max(parseInt(req.query.limit as string || '20', 10), 5), 50);
        const userId = req.user?.user_id;

        if (!userId) throw new AppError('Người dùng chưa xác thực', 401);
        if (isNaN(postId)) throw new AppError('ID bài viết không hợp lệ', 400);

        const result = await PostLikeService.getPostLikes(userId, postId, page, limit);
        res.status(200).json(result);
    } catch (error) {
        next(error);
    }
};
