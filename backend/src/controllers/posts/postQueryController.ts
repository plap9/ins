import { NextFunction, Request, Response } from "express";
import pool from "../../config/db";
import { RowDataPacket } from "mysql2";
import { AppError } from "../../middlewares/errorHandler";
import { AuthRequest } from "../../middlewares/authMiddleware";
import { cachePostList, getCachePostsList } from "../../utils/cacheUtils";

export const getPosts = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const page = parseInt(req.query.page as string || "1", 10);
        const limit = parseInt(req.query.limit as string || "10", 10);
        const user_id = req.query.user_id ? parseInt(req.query.user_id as string, 10) : undefined;
        const offset = (page - 1) * limit;
        const cacheKey = user_id ? `user:${user_id}:page:${page}:limit:${limit}` : `page:${page}:limit:${limit}`;
        const cachedPosts = await getCachePostsList(cacheKey);
        if (cachedPosts) {
            res.status(200).json({ sucess: true, posts: cachedPosts, fromCache: true});
            return;
        }

        if (isNaN(page) || page < 1) return next(new AppError("Tham số 'page' không hợp lệ.", 400));
        if (isNaN(limit) || limit < 1 || limit > 100) return next(new AppError("Tham số 'limit' không hợp lệ (phải từ 1 đến 100).", 400));
        if (user_id !== undefined && isNaN(user_id)) return next(new AppError("Tham số 'user_id' không hợp lệ.", 400));

        let sqlQuery = `
            SELECT
                p.post_id,
                p.content,
                p.location,
                p.post_privacy,
                p.created_at,
                p.updated_at,
                p.like_count,
                p.comment_count,
                u.user_id,
                u.username,
                u.profile_picture,
                COALESCE(GROUP_CONCAT(DISTINCT m.media_url ORDER BY m.media_id SEPARATOR '||'), '') AS media_urls,
                COALESCE(GROUP_CONCAT(DISTINCT m.media_type ORDER BY m.media_id SEPARATOR '||'), '') AS media_types
            FROM posts p
            INNER JOIN users u ON p.user_id = u.user_id
            LEFT JOIN media m ON p.post_id = m.post_id
        `;

        const queryParams: (string | number)[] = [];
        if (user_id) {
            sqlQuery += " WHERE p.user_id = ?";
            queryParams.push(user_id);
        }

        sqlQuery += " GROUP BY p.post_id ORDER BY p.created_at DESC LIMIT ?, ?";
        queryParams.push(offset, limit);

        const [posts] = await pool.query<RowDataPacket[]>(sqlQuery, queryParams);

        const formattedPosts = posts.map(post => ({
            ...post,
            media_urls: post.media_urls ? post.media_urls.split("||") : [],
            media_types: post.media_types ? post.media_types.split("||") : [],
        }));

        await cachePostList(cacheKey, formattedPosts);

        res.status(200).json({ success: true, posts: formattedPosts });
    } catch (error) {
        next(error);
    }
};

export const deletePost = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    const connection = await pool.getConnection();
    try {
        const post_id = parseInt(req.params.id, 10);
        if (isNaN(post_id)) return next(new AppError("Tham số 'id' không hợp lệ (phải là số).", 400));

        const user_id = req.user?.user_id;
        if (!user_id) return next(new AppError("Người dùng chưa được xác thực.", 401));

        const [checkRows] = await connection.query<RowDataPacket[]>(
            "SELECT post_id FROM posts WHERE post_id = ? AND user_id = ?",
            [post_id, user_id]
        );

        if (checkRows.length === 0) {
            return next(new AppError("Bạn không có quyền xóa bài viết này hoặc bài viết không tồn tại.", 403));
        }

        await connection.beginTransaction();

        const deleteQueries = [
            "DELETE FROM media WHERE post_id = ?",
            "DELETE FROM likes WHERE post_id = ?",
            "DELETE FROM comments WHERE post_id = ?",
            "DELETE FROM saved_posts WHERE post_id = ?",
            "DELETE FROM tags WHERE post_id = ?",
            "DELETE FROM mentions WHERE post_id = ?",
            "DELETE FROM notifications WHERE post_id = ?",
            "DELETE FROM posts WHERE post_id = ?"
        ];

        for (const query of deleteQueries) {
            await connection.query(query, [post_id]);
        }

        await connection.commit();
        res.status(200).json({ success: true, message: "Xóa bài viết thành công" });
    } catch (error) {
        await connection.rollback(); 
        next(error);
    } finally {
        connection.release();
    }
};