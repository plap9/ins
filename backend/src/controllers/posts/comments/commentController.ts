import { NextFunction, Response } from 'express';
import pool from '../../../config/db';
import { AuthRequest } from '../../../middlewares/authMiddleware';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import { AppError } from '../../../middlewares/errorHandler';
import { ErrorCode } from '../../../types/errorCode';
import { Pool, PoolConnection} from 'mysql2/promise';
import { getCachedCommentLikes, getCachedComments, invalidateCommentCache, invalidateCommentsCache, cacheComments, invalidateCommentLikesCache, cacheCommentLikes} from '../../../utils/cacheUtils';

async function countChildComments(connection: PoolConnection, commentId: number): Promise<number> {
    let count = 0;
    
    const [children] = await connection.query<RowDataPacket[]>(
        'SELECT comment_id FROM comments WHERE parent_id = ?',
        [commentId]
    );
    count += children.length;
    for (const child of children) {
        count += await countChildComments(connection, child.comment_id);
    }
    return count;
}

async function deleteCommentHierarchy(connection: PoolConnection, commentId: number): Promise<void> {
    const [children] = await connection.query<RowDataPacket[]>(
        'SELECT comment_id FROM comments WHERE parent_id = ?',
        [commentId]
    );
    for (const child of children) {
        await deleteCommentHierarchy(connection, child.comment_id);
    }
    await connection.query('DELETE FROM comments WHERE comment_id = ?', [commentId]);
}

export const createComment = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    const connection = await pool.getConnection();
    try {
        const postId = parseInt(req.params.id);
        const userId = req.user?.user_id;
        const { content, parent_id } = req.body;
        
        if (!userId) return next(new AppError('Người dùng chưa xác thực', 401, ErrorCode.USER_NOT_AUTHENTICATED));
        if (isNaN(postId)) return next(new AppError('ID bài viết không hợp lệ', 400 , ErrorCode.VALIDATION_ERROR));
        if (!content || content.trim() === '') return next(new AppError('Nội dung bình luận không được để trống', 400, ErrorCode.VALIDATION_ERROR, "content"));

        await connection.beginTransaction();

        const [[post]] = await connection.query<RowDataPacket[]>('SELECT post_id FROM posts WHERE post_id = ?', [postId]);
        if (!post) {
            await connection.rollback();
            return next(new AppError('Bài viết không tồn tại', 404, ErrorCode.NOT_FOUND));
        }

        if (parent_id) {
            const [[parentComment]] = await connection.query<RowDataPacket[]>(
                'SELECT comment_id FROM comments WHERE comment_id = ? AND post_id = ?',
                [parent_id, postId]
            );
            if (!parentComment) {
                await connection.rollback();
                return next(new AppError('Bình luận cha không tồn tại', 404, ErrorCode.VALIDATION_ERROR, "parent_id"));
            }
        }

        const [result] = await connection.query<ResultSetHeader>(
            'INSERT INTO comments (post_id, user_id, parent_id, content) VALUES (?, ?, ?, ?)',
            [postId, userId, parent_id || null, content]
        );

        if (result.affectedRows === 0) {
            await connection.rollback();
            return next(new AppError('Lỗi khi thêm bình luận', 500, ErrorCode.SERVER_ERROR));
        }

        await connection.query('UPDATE posts SET comment_count = comment_count + 1 WHERE post_id = ?', [postId]);

        const [[newComment]] = await connection.query<RowDataPacket[]>(`
            SELECT
                c.comment_id,
                c.post_id,
                c.user_id,
                c.parent_id,
                c.content,
                c.created_at,
                u.username,
                u.profile_picture
            FROM comments c
            JOIN users u ON c.user_id = u.user_id
            WHERE c.comment_id = ?
        `, [result.insertId]);

        await connection.commit();

        await invalidateCommentsCache(postId);
        if (parent_id) {
            await invalidateCommentCache(parent_id);
        }

        res.status(201).json({
            message: 'Thêm bình luận thành công',
            comment: newComment
        });
    } catch (error) {
        await connection.rollback();
        next(error);
        return;
    } finally {
        connection.release();
    }
};

export const getComments = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        const postId = parseInt(req.params.id);
        const page = Math.max(parseInt(req.query.page as string || '1', 10), 1);
        const limit = Math.min(Math.max(parseInt(req.query.limit as string || '20', 10), 5), 50);
        const parentId = req.query.parent_id ? parseInt(req.query.parent_id as string) : null;
        const userId = req.user?.user_id;

        if (!userId) return next(new AppError('Người dùng chưa xác thực', 401, ErrorCode.USER_NOT_AUTHENTICATED));
        if (isNaN(postId)) return next(new AppError('ID bài viết không hợp lệ', 400, ErrorCode.VALIDATION_ERROR, "post_id"));

        const cacheKey = `post:${postId}:page:${page}:limit:${limit}:parent:${parentId || 'null'}:user:${userId}`;
        const cachedData = await getCachedComments(cacheKey);
        if (cachedData) {
            res.status(200).json(cachedData);
            return;
        }

        const [[post]] = await pool.query<RowDataPacket[]>('SELECT post_id FROM posts WHERE post_id = ?', [postId]);
        if (!post) return next(new AppError('Bài viết không tồn tại', 404, ErrorCode.NOT_FOUND, "post_id"));

        const offset = (page - 1) * limit;

        let commentsQuery = `
            SELECT
                c.comment_id,
                c.post_id,
                c.user_id,
                c.parent_id,
                c.content,
                c.created_at,
                u.username,
                u.full_name,
                u.profile_picture,
                (SELECT COUNT(*) FROM comments WHERE parent_id = c.comment_id) AS reply_count,
                (SELECT COUNT(*) FROM likes WHERE comment_id = c.comment_id) AS like_count,
                (SELECT COUNT(*) FROM likes WHERE comment_id = c.comment_id AND user_id = ?) AS is_liked
            FROM comments c
            JOIN users u ON c.user_id = u.user_id
            WHERE c.post_id = ?
        `;

        const queryParams: any[] = [userId, postId];

        if (parentId !== null) {
            if (isNaN(parentId)) return next(new AppError('ID bình luận cha không hợp lệ', 400, ErrorCode.VALIDATION_ERROR, "parent_id"));
            commentsQuery += ' AND c.parent_id = ?';
            queryParams.push(parentId);
        } else {
            commentsQuery += ' AND c.parent_id IS NULL';
        }

        commentsQuery += ' ORDER BY c.created_at DESC LIMIT ? OFFSET ?';
        queryParams.push(limit, offset);

        const [comments] = await pool.query<RowDataPacket[]>(commentsQuery, queryParams);

        let countQuery = `
            SELECT COUNT(*) AS total 
            FROM comments 
            WHERE post_id = ?
        `;
        const countParams: any[] = [postId];

        if (parentId !== null) {
            countQuery += ' AND parent_id = ?';
            countParams.push(parentId);
        } else {
            countQuery += ' AND parent_id IS NULL';
        }

        const [[totalRow]] = await pool.query<RowDataPacket[]>(countQuery, countParams);
        const total = totalRow?.total || 0;

        const result = {
            comments,
            pagination: {
                page,
                limit,
                total,
                totalPage: Math.ceil(total / limit)
            }
        };
        
        await cacheComments(cacheKey, result);
        res.status(200).json(result);
        return;
    } catch (error) {
        next(error);
        return;
    }
};

export const getReplies = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        const commentId = parseInt(req.params.id);
        const page = Math.max(parseInt(req.query.page as string || '1', 10), 1);
        const limit = Math.min(Math.max(parseInt(req.query.limit as string || '20', 10), 5), 50);
        const offset = (page - 1) * limit;
        const userId = req.user?.user_id;

        if (!userId) return next(new AppError("Người dùng chưa xác thực", 401, ErrorCode.USER_NOT_AUTHENTICATED));
        if (isNaN(commentId)) return next(new AppError("ID bình luận không hợp lệ", 400, ErrorCode.VALIDATION_ERROR, "comment_id"));

        const cacheKey = `comment:${commentId}:replies:page:${page}:limit:${limit}:user:${userId}`;
        
        const cachedData = await getCachedComments(cacheKey);
        if (cachedData) {
            res.status(200).json(cachedData);
            return;
        }
        const [[comment]] = await pool.query<RowDataPacket[]>(
            "SELECT comment_id, post_id FROM comments WHERE comment_id = ?",
            [commentId]
        );
        if (!comment) return next(new AppError("Bình luận không tồn tại", 404, ErrorCode.NOT_FOUND, "comment_id"));

        const [replies] = await pool.query<RowDataPacket[]>(
            `SELECT 
                c.comment_id, 
                c.post_id, 
                c.user_id, 
                c.parent_id, 
                c.content, 
                c.created_at,
                u.username,
                u.full_name,
                u.profile_picture,
                (SELECT COUNT(*) FROM comments WHERE parent_id = c.comment_id) AS reply_count,
                (SELECT COUNT(*) FROM likes WHERE comment_id = c.comment_id) AS like_count,
                (SELECT COUNT(*) FROM likes WHERE comment_id = c.comment_id AND user_id = ?) AS is_liked
            FROM comments c
            JOIN users u ON c.user_id = u.user_id
            WHERE c.parent_id = ?
            ORDER BY c.created_at ASC
            LIMIT ? OFFSET ?`,
            [userId, commentId, limit, offset]
        );

        const [[totalRow]] = await pool.query<RowDataPacket[]>(
            "SELECT COUNT(*) AS total FROM comments WHERE parent_id = ?",
            [commentId]
        );
        const total = totalRow?.total || 0;

        const result = {
            comments: replies,
            pagination: {
                page,
                limit,
                total,
                totalPage: Math.ceil(total / limit)
            }
        };
        
        await cacheComments(cacheKey, result);

        res.status(200).json(result);
        return;
    } catch (error) {
        next(error);
        return;
    }
};

export const updateComment = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        const commentId = parseInt(req.params.id);
        const userId = req.user?.user_id;
        const { content } = req.body;

        if (!userId) return next(new AppError('Người dùng chưa xác thực', 401, ErrorCode.USER_NOT_AUTHENTICATED));
        if (isNaN(commentId)) return next(new AppError('ID bình luận không hợp lệ', 400, ErrorCode.VALIDATION_ERROR, "comment_id"));
        if (!content || content.trim() === '') return next(new AppError('Nội dung bình luận không được để trống', 400, ErrorCode.VALIDATION_ERROR, "content"));

        const [[comment]] = await pool.query<RowDataPacket[]>(
            'SELECT comment_id, user_id FROM comments WHERE comment_id = ?',
            [commentId]
        );

        if (!comment) return next(new AppError('Bình luận không tồn tại', 404, ErrorCode.NOT_FOUND, "comment_id"));
        if (comment.user_id !== userId) return next(new AppError('Bạn không có quyền cập nhật bình luận này', 403, ErrorCode.INVALID_PERMISSIONS));

        const [result] = await pool.query<ResultSetHeader>(
            'UPDATE comments SET content = ? WHERE comment_id = ?',
            [content, commentId]
        );

        if (result.affectedRows === 0) return next(new AppError('Lỗi khi cập nhật bình luận', 500, ErrorCode.SERVER_ERROR));

        const [[updatedComment]] = await pool.query<RowDataPacket[]>(`
            SELECT
                c.comment_id,
                c.post_id,
                c.user_id,
                c.parent_id,
                c.content,
                c.created_at,
                u.username,
                u.profile_picture
            FROM comments c
            JOIN users u ON c.user_id = u.user_id
            WHERE c.comment_id = ?
        `, [commentId]);

        await invalidateCommentCache(commentId);
        await invalidateCommentsCache(comment.post_id);

        res.status(200).json({
            message: 'Cập nhật bình luận thành công',
            comment: updatedComment
        });
        return;
    } catch (error) {
        next(error);
        return;
    }
};

export const deleteComment = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    const connection = await pool.getConnection();
    try {
        const commentId = parseInt(req.params.id);
        const userId = req.user?.user_id;

        if (!userId) return next(new AppError('Người dùng chưa xác thực', 401, ErrorCode.USER_NOT_AUTHENTICATED));
        if (isNaN(commentId)) return next(new AppError('ID bình luận không hợp lệ', 400, ErrorCode.VALIDATION_ERROR, "comment_id"));

        await connection.beginTransaction();

        const [[comment]] = await connection.query<RowDataPacket[]>(
            'SELECT comment_id, user_id, post_id FROM comments WHERE comment_id = ?',
            [commentId]
        );

        if (!comment) {
            await connection.rollback();
            return next(new AppError('Bình luận không tồn tại', 404, ErrorCode.NOT_FOUND, "comment_id"));
        }
        
        if (comment.user_id !== userId) {
            await connection.rollback();
            return next(new AppError('Bạn không có quyền xóa bình luận này', 403, ErrorCode.INVALID_PERMISSIONS));
        }

        const totalDeleteCount = 1 + await countChildComments(connection, commentId);
        
        await deleteCommentHierarchy(connection, commentId);
        
        await connection.query(
            'UPDATE posts SET comment_count = GREATEST(0, comment_count - ?) WHERE post_id = ?',
            [totalDeleteCount, comment.post_id]
        );

        await connection.commit();

        await invalidateCommentCache(commentId);
        await invalidateCommentsCache(comment.post_id);
        await invalidateCommentLikesCache(commentId);

        res.status(200).json({
            message: 'Xóa bình luận thành công',
            deletedCount: totalDeleteCount
        });
        return;
    } catch (error) {
        await connection.rollback();
        next(error);
        return;
    } finally {
        connection.release();
    }
};

export const likeComment = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        const commentId = parseInt(req.params.id);
        const userId = req.user?.user_id;

        if (!userId) throw new AppError('Người dùng chưa xác thực', 401, ErrorCode.USER_NOT_AUTHENTICATED);
        if (isNaN(commentId)) throw new AppError('ID bình luận không hợp lệ', 400, ErrorCode.VALIDATION_ERROR);

        const [[comment]] = await connection.query<RowDataPacket[]>(`
            SELECT 
                comment_id,
                like_count,
                (SELECT COUNT(*) FROM likes WHERE comment_id = ? AND user_id = ?) AS is_liked
            FROM comments 
            WHERE comment_id = ? FOR UPDATE`,
            [commentId, userId, commentId]
        );

        if (!comment) throw new AppError('Bình luận không tồn tại', 404, ErrorCode.NOT_FOUND);
        if (comment.is_liked) throw new AppError('Đã thích bình luận này', 400, ErrorCode.VALIDATION_ERROR);

        const [insertResult] = await connection.query<ResultSetHeader>(
            "INSERT INTO likes (comment_id, user_id) VALUES (?, ?)",
            [commentId, userId]
        );

        if (insertResult.affectedRows === 0) throw new AppError('Lỗi thêm like', 500, ErrorCode.SERVER_ERROR);

        await connection.query(
            "UPDATE comments SET like_count = like_count + 1 WHERE comment_id = ?",
            [commentId]
        );

        await connection.commit();
        await invalidateCommentLikesCache(commentId);
        await invalidateCommentCache(commentId);
        await invalidateCommentsCache(comment.post_id);

        res.status(200).json({
            liked: true,
            like_count: comment.like_count + 1
        });
        return;
    } catch (error) {
        await connection.rollback();
        next(error);
        return;
    } finally {
        connection.release();
    }
};

export const unlikeComment = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        const commentId = parseInt(req.params.id);
        const userId = req.user?.user_id;

        if (!userId) throw new AppError('Người dùng chưa xác thực', 401, ErrorCode.USER_NOT_AUTHENTICATED);
        if (isNaN(commentId)) throw new AppError('ID bình luận không hợp lệ', 400, ErrorCode.VALIDATION_ERROR);

        const [[comment]] = await connection.query<RowDataPacket[]>(`
            SELECT 
                comment_id,
                like_count,
                (SELECT COUNT(*) FROM likes WHERE comment_id = ? AND user_id = ?) AS is_liked
            FROM comments 
            WHERE comment_id = ? FOR UPDATE`,
            [commentId, userId, commentId]
        );

        if (!comment) throw new AppError('Bình luận không tồn tại', 404, ErrorCode.NOT_FOUND);
        if (!comment.is_liked) throw new AppError('Chưa thích bình luận này', 400, ErrorCode.VALIDATION_ERROR);

        const [deleteResult] = await connection.query<ResultSetHeader>(
            "DELETE FROM likes WHERE comment_id = ? AND user_id = ?",
            [commentId, userId]
        );

        if (deleteResult.affectedRows === 0) throw new AppError('Lỗi xóa like', 500, ErrorCode.SERVER_ERROR);

        await connection.query(
            "UPDATE comments SET like_count = GREATEST(0, like_count - 1) WHERE comment_id = ?",
            [commentId]
        );

        await connection.commit();
        await invalidateCommentLikesCache(commentId);
        await invalidateCommentCache(commentId);
        await invalidateCommentsCache(comment.post_id);

        res.status(200).json({
            liked: false,
            like_count: comment.like_count - 1
        });
        return;
    } catch (error) {
        await connection.rollback();
        next(error);
        return;
    } finally {
        connection.release();
    }
};


export const getCommentLikes = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        const commentId = parseInt(req.params.id);
        const page = Math.max(parseInt(req.query.page as string || '1', 10), 1);
        const limit = Math.min(Math.max(parseInt(req.query.limit as string || '20', 10), 5), 50);
        const userId = req.user?.user_id;

        if (!userId) return next(new AppError('Người dùng chưa xác thực', 401, ErrorCode.USER_NOT_AUTHENTICATED));
        if (isNaN(commentId)) return next(new AppError('ID bình luận không hợp lệ', 400, ErrorCode.VALIDATION_ERROR, "comment_id"));

        const cachedData = await getCachedCommentLikes(commentId, page, limit);
        if (cachedData) {
            res.status(200).json(cachedData);
            return;
        }
        const [[comment]] = await pool.query<RowDataPacket[]>(
            'SELECT comment_id FROM comments WHERE comment_id = ?',
            [commentId]
        );
        if (!comment) return next(new AppError('Bình luận không tồn tại', 404, ErrorCode.NOT_FOUND, "comment_id"));

        const offset = (page - 1) * limit;

        const [likes] = await pool.query<RowDataPacket[]>(`
            SELECT 
                l.like_id,
                l.user_id,
                l.created_at,
                u.username,
                u.full_name,
                u.profile_picture,
                (SELECT COUNT(*) FROM followers WHERE follower_id = ? AND following_id = u.user_id) > 0 AS is_following
            FROM likes l
            LEFT JOIN users u ON l.user_id = u.user_id
            WHERE l.comment_id = ?
            ORDER BY l.created_at DESC
            LIMIT ? OFFSET ?
        `, [userId, commentId, limit, offset]);

        const [[totalRow]] = await pool.query<RowDataPacket[]>(
            'SELECT COUNT(*) AS total FROM likes WHERE comment_id = ?',
            [commentId]
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

        await cacheCommentLikes(commentId, result, page, limit);

        res.status(200).json(result);
        return;
    } catch (error) {
        next(error);
        return;
    }
};