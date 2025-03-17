import pool from '../config/db';
import { AppError } from '../middlewares/errorHandler';
import { RowDataPacket, ResultSetHeader } from 'mysql2/promise';

class LikePostService {
    static async likePost(userId: number, postId: number) {
        const connection = await pool.getConnection();
        try {
            await connection.beginTransaction();

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
            if (insertResult.affectedRows === 0) throw new AppError('Lỗi cơ sở dữ liệu', 500);

            await connection.query("UPDATE posts SET like_count = like_count + 1 WHERE post_id = ?", [postId]);

            await connection.commit();
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

    static async unlikePost(userId: number, postId: number) {
        const connection = await pool.getConnection();
        try {
            await connection.beginTransaction();

            const [[post]] = await connection.query<RowDataPacket[]>(`
                SELECT p.post_id, 
                    (SELECT like_id FROM likes WHERE post_id = ? AND user_id = ?) AS like_id
                FROM posts p 
                WHERE p.post_id = ?`, 
                [postId, userId, postId]
            );

            if (!post) throw new AppError('Bài viết không tồn tại', 404);
            if (!post.like_id) throw new AppError('Bài viết chưa được thích', 400);

            const [deleteResult] = await connection.query<ResultSetHeader>(
                "DELETE FROM likes WHERE post_id = ? AND user_id = ?", 
                [postId, userId]
            );
            if (deleteResult.affectedRows === 0) throw new AppError('Lỗi cơ sở dữ liệu', 500);

            await connection.query("UPDATE posts SET like_count = like_count - 1 WHERE post_id = ?", [postId]);

            await connection.commit();
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

    static async getPostLikes(userId: number, postId: number, page: number, limit: number) {
        const [[post]] = await pool.query<RowDataPacket[]>(`
            SELECT post_id FROM posts WHERE post_id = ?`, 
            [postId]
        );
        if (!post) throw new AppError('Bài viết không tồn tại', 404);

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
            [userId, postId, limit, offset]
        );

        const [[totalRow]] = await pool.query<RowDataPacket[]>(`
            SELECT COUNT(*) AS total FROM likes WHERE post_id = ?`,
            [postId]
        );

        return {
            likes,
            pagination: {
                page,
                limit,
                total: totalRow?.total || 0,
                totalPage: Math.ceil((totalRow?.total || 0) / limit)
            }
        };
    }
}

export default LikePostService;
