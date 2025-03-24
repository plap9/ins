import { NextFunction, Request, Response } from 'express';
import pool from '../../../config/db';
import { AuthRequest } from '../../../middlewares/authMiddleware';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import { AppError } from '../../../middlewares/errorHandler';
import { ErrorCode } from '../../../types/errorCode';
import { 
    invalidateLikesCache, 
    cacheUserLikeStatus, 
    invalidateUserLikeStatus, 
    updateCachedLikeCount,
    cacheLikes, 
    getCacheLikes 
  } from '../../../utils/cacheUtils';

export const likePost = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction(); 

        const postId = parseInt(req.params.id);
        const userId = req.user?.user_id;

        if (!userId) throw new AppError('Người dùng chưa xác thực', 401, ErrorCode.USER_NOT_AUTHENTICATED);
        if (isNaN(postId)) throw new AppError('ID bài viết không hợp lệ', 400, ErrorCode.VALIDATION_ERROR);

        const [[post]] = await connection.query<RowDataPacket[]>(`
            SELECT p.post_id, 
                (SELECT COUNT(*) FROM likes WHERE post_id = ? AND user_id = ?) AS liked
            FROM posts p 
            WHERE p.post_id = ?`, 
            [postId, userId, postId]
        );

        if (!post) throw new AppError('Bài viết không tồn tại', 404);
        if (post.liked) throw new AppError('Bài viết đã được thích', 400);

        const [insertResult] = await connection.query<ResultSetHeader>(
            "INSERT INTO likes (post_id, user_id) VALUES (?, ?)",
            [postId, userId]
        );

        if (insertResult.affectedRows === 0) throw new AppError('Lỗi cơ sở dữ liệu', 500, ErrorCode.SERVER_ERROR);

        await connection.query("UPDATE posts SET like_count = like_count + 1 WHERE post_id = ?", [postId]);

        await connection.commit();

        await invalidateLikesCache(postId);
        await cacheUserLikeStatus(userId, postId, true);
        await updateCachedLikeCount(postId, true);

        res.status(201).json({ message: 'Thích bài viết thành công' });
    } catch (error) {
        await connection.rollback(); 
        next(error);
    } finally {
        connection.release(); 
    }
};


export const unlikePost = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction(); 

        const postId = parseInt(req.params.id);
        const userId = req.user?.user_id;

        if (!userId) throw new AppError('Người dùng chưa xác thực', 401, ErrorCode.USER_NOT_AUTHENTICATED);
        if (isNaN(postId)) throw new AppError('ID bài viết không hợp lệ', 400, ErrorCode.VALIDATION_ERROR);

        const [[post]] = await connection.query<RowDataPacket[]>(`
            SELECT p.post_id, 
                (SELECT like_id FROM likes WHERE post_id = ? AND user_id = ?) AS like_id
            FROM posts p 
            WHERE p.post_id = ?`, 
            [postId, userId, postId]
        );

        if (!post) throw new AppError('Bài viết không tồn tại', 404, ErrorCode.NOT_FOUND);
        if (!post.like_id) throw new AppError('Bài viết chưa được thích', 400, ErrorCode.INVALID_OPERATION);

        const [deleteResult] = await connection.query<ResultSetHeader>(
            "DELETE FROM likes WHERE post_id = ? AND user_id = ?",
            [postId, userId]
        );

        if (deleteResult.affectedRows === 0) throw new AppError('Lỗi cơ sở dữ liệu', 500, ErrorCode.SERVER_ERROR);

        await connection.query("UPDATE posts SET like_count = like_count - 1 WHERE post_id = ?", [postId]);

        await connection.commit();

        await invalidateLikesCache(postId);
        await cacheUserLikeStatus(userId, postId, false);
        await updateCachedLikeCount(postId, false);

        res.status(200).json({ message: 'Bỏ thích bài viết thành công' });
    } catch (error) {
        await connection.rollback(); 
        next(error);
    } finally {
        connection.release(); 
    }
};


export const getPostLikes = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        const postId = parseInt(req.params.id);
        const page = Math.max(parseInt(req.query.page as string || '1', 10), 1);
        const limit = Math.min(Math.max(parseInt(req.query.limit as string || '20', 10), 5), 50);

        if (!req.user?.user_id) return next(new AppError('Người dùng chưa xác thực', 401));
        if (isNaN(postId)) return next(new AppError('ID bài viết không hợp lệ', 400));

        const cachedLikes = await getCacheLikes(postId, page, limit);
        if (cachedLikes) {
            res.status(200).json(cachedLikes);
            return;
        }
        

        const [[post]] = await pool.query<RowDataPacket[]>(`
            SELECT post_id FROM posts WHERE post_id = ?`, 
            [postId]
        );
        if (!post) return next(new AppError('Bài viết không tồn tại', 404));

        const offset = (page - 1) * limit;

        const [likes] = await pool.query<RowDataPacket[]>(`
            SELECT
                l.like_id,
                l.user_id,
                l.created_at,
                u.username,
                u.full_name,
                u.profile_picture,
                CASE 
                    WHEN f.follower_id IS NOT NULL THEN TRUE ELSE FALSE END AS is_following
            FROM likes l
            INNER JOIN users u ON l.user_id = u.user_id
            LEFT JOIN followers f ON f.following_id = l.user_id AND f.follower_id = ?
            WHERE l.post_id = ?
            ORDER BY l.created_at DESC
            LIMIT ?
            OFFSET ?`,
            [req.user.user_id, postId, limit, offset]
        );

        const [[totalRow]] = await pool.query<RowDataPacket[]>(`
            SELECT COUNT(*) AS total FROM likes WHERE post_id = ?`,
            [postId]
        );

        const total = totalRow?.total || 0;

        const result = {
            likes,
            pagination: {
                page,
                limit,
                total,
                totalPage: Math.ceil(total / limit)
            }
        };

        await cacheLikes(postId, result, page, limit);

        res.status(200).json(result);
    } catch (error) {
        next(error);
    }
};
