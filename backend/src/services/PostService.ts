import pool from "../config/db";
import { RowDataPacket, ResultSetHeader } from "mysql2";
import { AppError } from "../middlewares/errorHandler";
import { AuthRequest } from "../middlewares/authMiddleware";

class PostService {
    static async getPosts(page: number, limit: number, user_id?: number) {
        const offset = (page - 1) * limit;
        const queryParams: (string | number)[] = [];

        let sqlQuery = `
            SELECT
                p.post_id, p.content, p.location, p.post_privacy, p.created_at, p.updated_at,
                p.like_count, p.comment_count, u.user_id, u.username, u.profile_picture,
                COALESCE(GROUP_CONCAT(DISTINCT m.media_url ORDER BY m.media_id SEPARATOR '||'), '') AS media_urls,
                COALESCE(GROUP_CONCAT(DISTINCT m.media_type ORDER BY m.media_id SEPARATOR '||'), '') AS media_types
            FROM posts p
            INNER JOIN users u ON p.user_id = u.user_id
            LEFT JOIN media m ON p.post_id = m.post_id
        `;

        if (user_id) {
            sqlQuery += " WHERE p.user_id = ?";
            queryParams.push(user_id);
        }

        sqlQuery += " GROUP BY p.post_id ORDER BY p.created_at DESC LIMIT ?, ?";
        queryParams.push(offset, limit);

        const [posts] = await pool.query<RowDataPacket[]>(sqlQuery, queryParams);
        return posts.map(post => ({
            ...post,
            media_urls: post.media_urls ? post.media_urls.split("||") : [],
            media_types: post.media_types ? post.media_types.split("||") : [],
        }));
    }

    static async createPost(user: AuthRequest['user'], content?: string, location?: string, files?: Express.MulterS3.File[]) {
        const connection = await pool.getConnection();
        try {
            if (!user?.user_id) throw new AppError("Người dùng chưa được xác thực", 401);
            if ((!content || content.trim() === "") && (!files || files.length === 0)) {
                throw new AppError("Bài viết phải có nội dung hoặc ít nhất một ảnh/video", 400);
            }

            await connection.beginTransaction();
            const [result] = await connection.query<ResultSetHeader>(
                "INSERT INTO posts (user_id, content, location) VALUES (?, ?, ?)",
                [user.user_id, content || null, location || null]
            );
            const post_id = result.insertId;

            if (files) {
                for (const file of files) {
                    if (!file.mimetype.startsWith("image") && !file.mimetype.startsWith("video")) {
                        await connection.rollback();
                        throw new AppError("Chỉ hỗ trợ ảnh và video", 400);
                    }
                    const media_type = file.mimetype.startsWith("image") ? "image" : "video";
                    await connection.query(
                        "INSERT INTO media (post_id, media_url, media_type) VALUES (?, ?, ?)",
                        [post_id, file.location, media_type]
                    );
                }
            }

            await connection.commit();
            return { post_id, user_id: user.user_id, content, location, post_privacy: "public" };
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

    static async deletePost(user: AuthRequest['user'], post_id: number) {
        const connection = await pool.getConnection();
        try {
            if (!user?.user_id) throw new AppError("Người dùng chưa được xác thực.", 401);
            if (isNaN(post_id)) throw new AppError("Tham số 'id' không hợp lệ.", 400);

            const [checkRows] = await connection.query<RowDataPacket[]>(
                "SELECT post_id FROM posts WHERE post_id = ? AND user_id = ?",
                [post_id, user.user_id]
            );

            if (checkRows.length === 0) {
                throw new AppError("Bạn không có quyền xóa bài viết này hoặc bài viết không tồn tại.", 403);
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
            return { success: true, message: "Xóa bài viết thành công" };
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }
}

export default PostService;
