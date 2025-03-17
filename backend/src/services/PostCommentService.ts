import pool from '../config/db';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import { PoolConnection } from 'mysql2/promise';
import { AppError } from '../middlewares/errorHandler';

export class PostCommentService {
    static async countChildComments(connection: PoolConnection, commentId: number): Promise<number> {
        let count = 0;
        const [children] = await connection.query<RowDataPacket[]>(
            'SELECT comment_id FROM comments WHERE parent_id = ?',
            [commentId]
        );
        count += children.length;
        for (const child of children) {
            count += await this.countChildComments(connection, child.comment_id);
        }
        return count;
    }

    static async deleteCommentHierarchy(connection: PoolConnection, commentId: number): Promise<void> {
        const [children] = await connection.query<RowDataPacket[]>(
            'SELECT comment_id FROM comments WHERE parent_id = ?',
            [commentId]
        );
        for (const child of children) {
            await this.deleteCommentHierarchy(connection, child.comment_id);
        }
        await connection.query('DELETE FROM comments WHERE comment_id = ?', [commentId]);
    }

    static async addComment(postId: number, userId: number, content: string, parentId: number | null) {
        const connection = await pool.getConnection();
        try {
            await connection.beginTransaction();
            const [result] = await connection.query<ResultSetHeader>(
                'INSERT INTO comments (post_id, user_id, content, parent_id) VALUES (?, ?, ?, ?)',
                [postId, userId, content, parentId]
            );
            if (result.affectedRows === 0) throw new AppError('Không thể thêm bình luận', 500);
            await connection.commit();
            return { commentId: result.insertId };
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

    static async deleteComment(commentId: number) {
        const connection = await pool.getConnection();
        try {
            await connection.beginTransaction();
            await this.deleteCommentHierarchy(connection, commentId);
            await connection.commit();
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }
}
