import { NextFunction, Request, Response } from "express";
import pool from "../../config/db";
import { AuthRequest } from "../../middlewares/authMiddleware";
import { RowDataPacket } from "mysql2";

export const getPosts = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const page = parseInt(req.query.page as string || '1', 10); 
        const limit = parseInt(req.query.limit as string || '10', 10); 
        const user_id = req.query.user_id ? parseInt(req.query.user_id as string) : undefined; 
        const offset = (page - 1) * limit;

         if (isNaN(page) || page < 1) {
            res.status(400).json({ message: "Tham số 'page' không hợp lệ." });
            return;
        }
        if (isNaN(limit) || limit < 1 || limit > 100) {
            res.status(400).json({ message: "Tham số 'limit' không hợp lệ (phải từ 1 đến 100)." });
            return;
        }

        if (user_id !== undefined && isNaN(user_id)) {
          res.status(400).json({ message: "Tham số 'user_id' không hợp lệ." });
            return;
        }

        let sqlQuery = `
            SELECT
                p.post_id,
                p.content,
                p.location,
                p.privacy,
                p.created_at,
                p.like_count,
                p.comment_count,
                u.user_id,
                u.username,
                u.profile_pic,
                GROUP_CONCAT(DISTINCT m.media_url ORDER BY m.media_id) AS media_urls,
                GROUP_CONCAT(DISTINCT m.media_type ORDER BY m.media_id) AS media_types
            FROM posts p
            INNER JOIN users u ON p.user_id = u.user_id
            LEFT JOIN media m ON p.post_id = m.post_id
        `;

        const queryParams: (string | number)[] = [];
          if (user_id) {
               sqlQuery += " WHERE p.user_id = ?"
               queryParams.push(user_id)
           }

        sqlQuery += " GROUP BY p.post_id, u.user_id ORDER BY p.created_at DESC LIMIT ?, ?";
        queryParams.push(offset, limit);
        const [posts] = await pool.query<RowDataPacket[]>(sqlQuery, queryParams);

        const formattedPosts = posts.map(post => ({
            ...post,
            media_urls: post.media_urls ? post.media_urls.split(',') : [],
            media_types: post.media_types ? post.media_types.split(',') : [],
        }));

        res.status(200).json(formattedPosts);

    } catch (error) {
        next(error);
    }
};

export const deletePost = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        const id = parseInt(req.params.id);
          if (isNaN(id)) {
            res.status(400).json({ message: "Tham số 'id' không hợp lệ (phải là số)." });
            return;
          }

        const user_id = req.user?.id;

        if (!user_id) {
            res.status(401).json({ error: "Người dùng chưa được xác thực" });
            return;
        }

        const [checkRows] = await pool.query<RowDataPacket[]>(
            "SELECT post_id FROM posts WHERE post_id = ? AND user_id = ?",
            [id, user_id]
        );

        if (checkRows.length === 0) {
            res.status(403).json({ error: "Bạn không có quyền xóa bài viết này hoặc bài viết không tồn tại" });
            return;
        }

        await pool.query("DELETE FROM media WHERE post_id = ?", [id]);
        await pool.query("DELETE FROM likes WHERE post_id = ?", [id]);
        await pool.query("DELETE FROM comments WHERE post_id = ?", [id]);
        await pool.query("DELETE FROM saved_posts WHERE post_id = ?", [id]);
        await pool.query("DELETE FROM tags WHERE post_id = ?", [id]);
        await pool.query("DELETE FROM mentions WHERE post_id = ?", [id]);
        await pool.query("DELETE FROM notifications WHERE post_id = ?", [id]);
        await pool.query("DELETE FROM posts WHERE post_id = ?", [id]);
        res.status(200).json({ message: "Xóa bài viết thành công" });

    } catch (error) {
       next(error);
    }
};