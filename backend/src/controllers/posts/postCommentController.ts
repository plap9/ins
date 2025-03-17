import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from '../../middlewares/authMiddleware';
import { PostCommentService } from '../../services/PostCommentService';
import { AppError } from '../../middlewares/errorHandler';

export class PostCommentController {
    static async addComment(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const { postId, content, parentId } = req.body;
            if (!req.user) throw new AppError('Người dùng chưa xác thực', 401);
            if (!postId || !content) throw new AppError('Thiếu dữ liệu đầu vào', 400);
            
            const result = await PostCommentService.addComment(postId, req.user.user_id, content, parentId);
            res.status(201).json({ message: 'Bình luận thành công', commentId: result.commentId });
        } catch (error) {
            next(error);
        }
    }

    static async deleteComment(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const commentId = parseInt(req.params.id);
            if (!req.user) throw new AppError('Người dùng chưa xác thực', 401);
            if (isNaN(commentId)) throw new AppError('ID bình luận không hợp lệ', 400);
            
            await PostCommentService.deleteComment(commentId);
            res.status(200).json({ message: 'Xóa bình luận thành công' });
        } catch (error) {
            next(error);
        }
    }
}
