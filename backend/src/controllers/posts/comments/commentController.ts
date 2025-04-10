import { NextFunction, Response } from 'express';
import pool from '../../../config/db';
import { AuthRequest } from '../../../middlewares/authMiddleware';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import { AppException } from "../../../middlewares/errorHandler";
import { ErrorCode } from '../../../types/errorCode';
import { Pool, PoolConnection} from 'mysql2/promise';
import { getCachedCommentLikes, getCachedComments, invalidateCommentCache, invalidateCommentsCache, cacheComments, invalidateCommentLikesCache, cacheCommentLikes, invalidatePostCache} from '../../../utils/cacheUtils';

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
    const [children] = await connection.query<RowDataPacket[]>('SELECT comment_id FROM comments WHERE parent_id = ?', [commentId]);
    for (const child of children) {
        await deleteCommentHierarchy(connection, child.comment_id); // Đệ quy
    }
    // Xóa likes liên quan trước khi xóa comment
    await connection.query('DELETE FROM likes WHERE comment_id = ?', [commentId]);
    // Cuối cùng xóa chính comment đó
    await connection.query('DELETE FROM comments WHERE comment_id = ?', [commentId]);
}

async function incrementAncestorCounts(connection: PoolConnection, parentId: number | null): Promise<void> {
    let currentParentId = parentId;
    while (currentParentId !== null) {
        await connection.query(
            'UPDATE comments SET total_reply_count = total_reply_count + 1 WHERE comment_id = ?',
            [currentParentId]
        );
        const [[nextParent]] = await connection.query<RowDataPacket[]>(
            'SELECT parent_id FROM comments WHERE comment_id = ?',
            [currentParentId]
        );
        currentParentId = nextParent?.parent_id || null; 
    }
}

async function decrementAncestorCounts(connection: PoolConnection, parentId: number | null, decrementAmount: number): Promise<void> {
    if (decrementAmount <= 0) return;
    let currentParentId = parentId;
    while (currentParentId !== null) {
        await connection.query(
            'UPDATE comments SET total_reply_count = GREATEST(0, total_reply_count - ?) WHERE comment_id = ?',
            [decrementAmount, currentParentId]
        );
        const [[nextParent]] = await connection.query<RowDataPacket[]>('SELECT parent_id FROM comments WHERE comment_id = ?', [currentParentId]);
        currentParentId = nextParent?.parent_id || null;
    }
}

async function countAllDescendants(connection: PoolConnection, commentId: number): Promise<number> {
    let count = 0;
    const [children] = await connection.query<RowDataPacket[]>('SELECT comment_id FROM comments WHERE parent_id = ?', [commentId]);
    count += children.length;
    for (const child of children) {
        count += await countAllDescendants(connection, child.comment_id);
    }
    return count;
}

export const createComment = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction(); 

        const postId = parseInt(req.params.id);
        const userId = req.user?.user_id;
        const { content, parent_id } = req.body;

        if (!userId) return next(new AppException('Người dùng chưa xác thực', ErrorCode.USER_NOT_AUTHENTICATED, 401));
        if (isNaN(postId)) return next(new AppException('ID bài viết không hợp lệ', ErrorCode.VALIDATION_ERROR, 400));
        if (!content || content.trim() === '') return next(new AppException('Nội dung bình luận không được để trống', ErrorCode.VALIDATION_ERROR, 400, { field: "content" }));

        const [[post]] = await connection.query<RowDataPacket[]>('SELECT post_id FROM posts WHERE post_id = ?', [postId]);
        if (!post) {
            await connection.rollback();
            return next(new AppException('Bài viết không tồn tại', ErrorCode.NOT_FOUND, 404));
        }

        let parentCommentInfo: RowDataPacket | null = null;
        if (parent_id) {
            [[parentCommentInfo]] = await connection.query<RowDataPacket[]>(
                'SELECT comment_id, parent_id AS parent_parent_id FROM comments WHERE comment_id = ? AND post_id = ?',
                [parent_id, postId]
            );
            if (!parentCommentInfo) {
                await connection.rollback();
                return next(new AppException('Bình luận cha không tồn tại', ErrorCode.VALIDATION_ERROR, 404, { field: "parent_id" }));
            }
        }

        const [result] = await connection.query<ResultSetHeader>(
            'INSERT INTO comments (post_id, user_id, parent_id, content) VALUES (?, ?, ?, ?)',
            [postId, userId, parent_id || null, content]
        );
        const newCommentId = result.insertId;

        if (result.affectedRows === 0) {
            await connection.rollback();
            return next(new AppException('Lỗi khi thêm bình luận', ErrorCode.SERVER_ERROR, 500));
        }

        await connection.query('UPDATE posts SET comment_count = comment_count + 1 WHERE post_id = ?', [postId]);

        if (parent_id && parentCommentInfo) {
            await connection.query(
                'UPDATE comments SET reply_count = reply_count + 1, total_reply_count = total_reply_count + 1 WHERE comment_id = ?',
                [parent_id]
            );
            await incrementAncestorCounts(connection, parentCommentInfo.parent_parent_id);
        }

        const [[newComment]] = await connection.query<RowDataPacket[]>(`
            SELECT
                c.comment_id, c.post_id, c.user_id, c.parent_id, c.content, c.created_at,
                c.reply_count, c.total_reply_count, c.like_count,
                u.username, u.profile_picture,
                0 AS is_liked
            FROM comments c
            JOIN users u ON c.user_id = u.user_id
            WHERE c.comment_id = ?
        `, [newCommentId]);

        await connection.commit(); 

        await invalidateCommentsCache(postId);
        if (parent_id) {
            await invalidateCommentCache(parent_id);
        }

        res.status(201).json({
            message: 'Thêm bình luận thành công',
            comment: newComment
        });
        return;

    } catch (error) {
        await connection.rollback();
        next(error);
    } finally {
        connection.release();
    }
};

export const deleteComment = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        const commentId = parseInt(req.params.id);
        const userId = req.user?.user_id;

        if (!userId) return next(new AppException('Người dùng chưa xác thực', ErrorCode.USER_NOT_AUTHENTICATED, 401));
        if (isNaN(commentId)) return next(new AppException('ID bình luận không hợp lệ', ErrorCode.VALIDATION_ERROR, 400, { field: "comment_id" }));

        const [[comment]] = await connection.query<RowDataPacket[]>(
           `SELECT c.comment_id, c.user_id, c.post_id, c.parent_id, p.parent_id as parent_parent_id
            FROM comments c
            LEFT JOIN comments p ON c.parent_id = p.comment_id
            WHERE c.comment_id = ?`,
           [commentId]
        );

        if (!comment) {
            await connection.rollback();
            return next(new AppException('Bình luận không tồn tại', ErrorCode.NOT_FOUND, 404, { field: "comment_id" }));
        }

        if (comment.user_id !== userId) {
            await connection.rollback();
            return next(new AppException('Bạn không có quyền xóa bình luận này', ErrorCode.INVALID_PERMISSIONS, 403));
        }

        const totalDescendants = await countAllDescendants(connection, commentId);
        const totalDeleteCount = 1 + totalDescendants;

        const parentId = comment.parent_id;
        const parentParentId = comment.parent_parent_id;

        await deleteCommentHierarchy(connection, commentId);

        await connection.query(
            'UPDATE posts SET comment_count = GREATEST(0, comment_count - ?) WHERE post_id = ?',
            [totalDeleteCount, comment.post_id]
        );

        if (parentId) {
            await connection.query(
                'UPDATE comments SET reply_count = GREATEST(0, reply_count - 1), total_reply_count = GREATEST(0, total_reply_count - ?) WHERE comment_id = ?',
                [totalDeleteCount, parentId]
            );
            await decrementAncestorCounts(connection, parentParentId, totalDeleteCount);
        }

        await connection.commit();

        await invalidateCommentCache(commentId);
        await invalidateCommentsCache(comment.post_id);
        if (parentId) {
             await invalidateCommentCache(parentId);
        }
        await invalidateCommentLikesCache(commentId);

        res.status(200).json({
            message: 'Xóa bình luận thành công',
            deletedCount: totalDeleteCount
        });
        return;

    } catch (error) {
        await connection.rollback();
        next(error);
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

        if (!userId) throw new AppException('Người dùng chưa xác thực', ErrorCode.USER_NOT_AUTHENTICATED, 401);
        if (isNaN(commentId)) throw new AppException('ID bình luận không hợp lệ', ErrorCode.VALIDATION_ERROR, 400);

        const [[comment]] = await connection.query<RowDataPacket[]>(
            'SELECT comment_id, like_count, post_id FROM comments WHERE comment_id = ? FOR UPDATE', [commentId]
        );
        if (!comment) throw new AppException('Bình luận không tồn tại', ErrorCode.NOT_FOUND, 404);

        const [[existingLike]] = await connection.query<RowDataPacket[]>(
            'SELECT like_id FROM likes WHERE comment_id = ? AND user_id = ?', [commentId, userId]
        );
        if (existingLike) throw new AppException('Đã thích bình luận này', ErrorCode.VALIDATION_ERROR, 400);

        await connection.query("INSERT INTO likes (comment_id, user_id) VALUES (?, ?)", [commentId, userId]);
        await connection.query("UPDATE comments SET like_count = like_count + 1 WHERE comment_id = ?", [commentId]);

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

        if (!userId) throw new AppException('Người dùng chưa xác thực', ErrorCode.USER_NOT_AUTHENTICATED, 401);
        if (isNaN(commentId)) throw new AppException('ID bình luận không hợp lệ', ErrorCode.VALIDATION_ERROR, 400);

        const [[comment]] = await connection.query<RowDataPacket[]>(
             'SELECT comment_id, like_count, post_id FROM comments WHERE comment_id = ? FOR UPDATE', [commentId]
        );
        if (!comment) throw new AppException('Bình luận không tồn tại', ErrorCode.NOT_FOUND, 404);

        const [deleteResult] = await connection.query<ResultSetHeader>(
             "DELETE FROM likes WHERE comment_id = ? AND user_id = ?", [commentId, userId]
        );

        let updatedLikeCount = comment.like_count;
        if (deleteResult.affectedRows > 0) {
            await connection.query("UPDATE comments SET like_count = GREATEST(0, like_count - 1) WHERE comment_id = ?", [commentId]);
            updatedLikeCount = Math.max(0, comment.like_count - 1);
        } else {
        }

        await connection.commit();

         if (deleteResult.affectedRows > 0) {
            await invalidateCommentLikesCache(commentId);
            await invalidateCommentCache(commentId);
            await invalidateCommentsCache(comment.post_id);
         }

        res.status(200).json({
            liked: false,
            like_count: updatedLikeCount
        });
        return;

    } catch (error) {
        await connection.rollback();
        next(error);
    } finally {
        connection.release();
    }
};

const commonCommentSelectFields = `
    c.comment_id, c.post_id, c.user_id, c.parent_id, c.content, c.created_at,
    c.reply_count, c.total_reply_count, c.like_count, /* LẤY COUNT TỪ CỘT ĐÃ LƯU */
    u.username, u.full_name, u.profile_picture,
    (SELECT COUNT(*) > 0 FROM likes WHERE comment_id = c.comment_id AND user_id = ?) AS is_liked /* Kiểm tra user hiện tại đã like chưa */
`;

export const getComments = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        const postId = parseInt(req.params.id);
        const page = Math.max(parseInt(req.query.page as string || '1', 10), 1);
        const limit = Math.min(Math.max(parseInt(req.query.limit as string || '20', 10), 5), 50);
        const userId = req.user?.user_id;

        if (!userId) return next(new AppException('Người dùng chưa xác thực', ErrorCode.USER_NOT_AUTHENTICATED, 401));
        if (isNaN(postId)) return next(new AppException('ID bài viết không hợp lệ', ErrorCode.VALIDATION_ERROR, 400));

        const cacheKey = `post:${postId}:page:${page}:limit:${limit}:parent:null:user:${userId}`;
        const cachedData = await getCachedComments(cacheKey);
        if (cachedData) {
            res.status(200).json(cachedData);
            return;
        }

        const [[post]] = await pool.query<RowDataPacket[]>('SELECT post_id FROM posts WHERE post_id = ?', [postId]);
        if (!post) return next(new AppException('Bài viết không tồn tại', ErrorCode.NOT_FOUND, 404));

        const offset = (page - 1) * limit;

        const commentsQuery = `
            SELECT ${commonCommentSelectFields}
            FROM comments c
            JOIN users u ON c.user_id = u.user_id
            WHERE c.post_id = ? AND c.parent_id IS NULL
            ORDER BY c.created_at DESC LIMIT ? OFFSET ?
        `;
        const queryParams: any[] = [userId, postId, limit, offset];

        const [comments] = await pool.query<RowDataPacket[]>(commentsQuery, queryParams);

        const countQuery = 'SELECT COUNT(*) AS total FROM comments WHERE post_id = ? AND parent_id IS NULL';
        const [[totalRow]] = await pool.query<RowDataPacket[]>(countQuery, [postId]);
        const total = totalRow?.total || 0;

        const result = { comments, pagination: { page, limit, total, totalPage: Math.ceil(total / limit) }};

        await cacheComments(cacheKey, result);
        res.status(200).json(result); 
        return;
    } catch (error) {
        next(error);
    }
};

export const getReplies = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        const commentId = parseInt(req.params.id);
        const page = Math.max(parseInt(req.query.page as string || '1', 10), 1);
        const limit = Math.min(Math.max(parseInt(req.query.limit as string || '10', 10), 5), 50);
        const offset = (page - 1) * limit;
        const userId = req.user?.user_id;

        if (!userId) return next(new AppException("Người dùng chưa xác thực", ErrorCode.USER_NOT_AUTHENTICATED, 401));
        if (isNaN(commentId)) return next(new AppException("ID bình luận không hợp lệ", ErrorCode.VALIDATION_ERROR, 400, { field: "comment_id" }));

        const cacheKey = `comment:${commentId}:replies:page:${page}:limit:${limit}:user:${userId}`;
        const cachedData = await getCachedComments(cacheKey);
        if (cachedData) {
            res.status(200).json(cachedData);
            return;
        }

        const [[commentInfo]] = await pool.query<RowDataPacket[]>(
            "SELECT comment_id, reply_count FROM comments WHERE comment_id = ?", [commentId]
        );
        if (!commentInfo) return next(new AppException("Bình luận không tồn tại", ErrorCode.NOT_FOUND, 404, { field: "comment_id" }));

        const repliesQuery = `
            SELECT ${commonCommentSelectFields}
            FROM comments c
            JOIN users u ON c.user_id = u.user_id
            WHERE c.parent_id = ?
            ORDER BY c.created_at ASC LIMIT ? OFFSET ?
        `;
        const queryParams: any[] = [userId, commentId, limit, offset];

        const [replies] = await pool.query<RowDataPacket[]>(repliesQuery, queryParams);

        const total = commentInfo.reply_count || 0;

        const result = { comments: replies, pagination: { page, limit, total, totalPage: Math.ceil(total / limit) }};

        await cacheComments(cacheKey, result);
        res.status(200).json(result);
        return;

    } catch (error) {
        next(error);
    }
};

export const updateComment = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        const commentId = parseInt(req.params.id);
        const userId = req.user?.user_id;
        const { content } = req.body;

        if (!userId) return next(new AppException('Người dùng chưa xác thực', ErrorCode.USER_NOT_AUTHENTICATED, 401));
        if (isNaN(commentId)) return next(new AppException('ID bình luận không hợp lệ', ErrorCode.VALIDATION_ERROR, 400, { field: "comment_id" }));
        if (!content || content.trim() === '') return next(new AppException('Nội dung bình luận không được để trống', ErrorCode.VALIDATION_ERROR, 400, { field: "content" }));

        const [[comment]] = await pool.query<RowDataPacket[]>(
            'SELECT comment_id, user_id, post_id FROM comments WHERE comment_id = ?', [commentId]
        );
        if (!comment) return next(new AppException('Bình luận không tồn tại', ErrorCode.NOT_FOUND, 404, { field: "comment_id" }));
        if (comment.user_id !== userId) return next(new AppException('Bạn không có quyền cập nhật bình luận này', ErrorCode.INVALID_PERMISSIONS, 403));

        const [result] = await pool.query<ResultSetHeader>(
            'UPDATE comments SET content = ? WHERE comment_id = ?', [content, commentId]
        );
        if (result.affectedRows === 0) return next(new AppException('Lỗi khi cập nhật bình luận', ErrorCode.SERVER_ERROR, 500));

        const [[updatedComment]] = await pool.query<RowDataPacket[]>(`
            SELECT ${commonCommentSelectFields.replace('?', userId?.toString() || 'NULL')} /* Thay ? cho is_liked */
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
    }
};

export const getCommentLikes = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        const commentId = parseInt(req.params.id);
        const page = Math.max(parseInt(req.query.page as string || '1', 10), 1);
        const limit = Math.min(Math.max(parseInt(req.query.limit as string || '20', 10), 5), 50);
        const userId = req.user?.user_id;

        if (!userId) return next(new AppException('Người dùng chưa xác thực', ErrorCode.USER_NOT_AUTHENTICATED, 401));
        if (isNaN(commentId)) return next(new AppException('ID bình luận không hợp lệ', ErrorCode.VALIDATION_ERROR, 400));

        const cachedData = await getCachedCommentLikes(commentId, page, limit);
        if (cachedData) {
            res.status(200).json(cachedData);
            return;
        }

        const [[comment]] = await pool.query<RowDataPacket[]>('SELECT comment_id FROM comments WHERE comment_id = ?', [commentId]);
        if (!comment) return next(new AppException('Bình luận không tồn tại', ErrorCode.NOT_FOUND, 404));

        const offset = (page - 1) * limit;

        const [likes] = await pool.query<RowDataPacket[]>(`
            SELECT
                l.like_id, l.user_id, l.created_at,
                u.username, u.full_name, u.profile_picture,
                (SELECT COUNT(*) FROM followers WHERE follower_id = ? AND following_id = u.user_id) > 0 AS is_following
            FROM likes l
            LEFT JOIN users u ON l.user_id = u.user_id
            WHERE l.comment_id = ?
            ORDER BY l.created_at DESC LIMIT ? OFFSET ?
        `, [userId, commentId, limit, offset]);

        const [[totalRow]] = await pool.query<RowDataPacket[]>('SELECT COUNT(*) AS total FROM likes WHERE comment_id = ?', [commentId]);
        const total = totalRow?.total || 0;

        const result = { likes, pagination: { page, limit, total, totalPage: Math.ceil(total / limit) }};

        await cacheCommentLikes(commentId, result, page, limit);
        res.status(200).json(result);
        return;
    } catch (error) {
        next(error);
    }
};