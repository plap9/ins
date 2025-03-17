import { NextFunction, Request, Response } from "express";
import pool from "../../config/db";
import { RowDataPacket, ResultSetHeader } from "mysql2";
import { AppError } from "../../middlewares/errorHandler";
import { AuthRequest } from "../../middlewares/authMiddleware";

export const getStories = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const user_id = req.query.user_id ? parseInt(req.query.user_id as string, 10) : undefined;
        const current_user_id = (req as AuthRequest).user?.user_id;

        if (!user_id) {
            return next(new AppError("Thiếu thông số user_id", 400));
        }

        let sql = `
            SELECT
                s.story_id,
                s.media_url,
                s.created_at,
                s.expires_at,
                s.has_text,
                s.sticker_data,
                s.filter_data,
                s.view_count,
                s.close_friends_only,
                u.user_id,
                u.username,
                u.profile_picture
            FROM stories s
            INNER JOIN users u ON s.user_id = u.user_id
            WHERE s.expires_at > NOW()`;
        const queryParams: any[] = [];

        if (user_id) {
            sql += " AND s.user_id = ?";
            queryParams.push(user_id);

            if (user_id !== current_user_id) {
                sql += " AND (s.close_firends_only = FALSE OR (s.close_friends_only = TRUE AND EXISTS (SELECT 1 FROM close_friends WHERE user_id = ? AND friend_id = ?)))";
                queryParams.push(current_user_id, user_id);
            }
        } else {
            if (current_user_id) {
                sql += `AND (
                    s.user_id IN (SELECT following_id FROM followers WHERE follower_id = ?)
                    AND (s.close_friends_only = FALSE OR (s.close_friends_only = TRUE AND EXISTS (SELECT 1 FROM close_friends WHERE user_id = s.user_id AND friend_id = ?)))`;
                queryParams.push(current_user_id, current_user_id);
            } else {
                return next(new AppError("Người dùng chưa được xác thực", 401));
            }
        }
        sql += " ORDER BY s.created_at DESC";

        const [stories] = await pool.query<RowDataPacket[]>(sql, queryParams);
        res.status(200).json( {success: true, stories });
    } catch (error) {
        next(error);
    }
};

export const deleteStory = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    const connection = await pool.getConnection();
    try {
        const story_id = parseInt(req.params.id, 10);
        if (isNaN(story_id)) return next(new AppError("Tham số 'id' không hợp lệ (phải là số).", 400));

        const user_id = req.user?.user_id;
        if (!user_id) return next(new AppError("Người dùng chưa được xác thực.", 401));

        const [checkRows] = await connection.query<RowDataPacket[]>(
            "SELECT story_id FROM stories WHERE story_id = ? AND user_id = ?",
            [story_id, user_id]
        );

        if (checkRows.length === 0) {
            return next(new AppError("Bạn không có quyền xóa story này hoặc story không tồn tại.", 403));
        }

        await connection.beginTransaction();

        const deleteQueries = [
            "DELETE FROM highlight_stories WHERE story_id = ?",
            "DELETE FROM mentions WHERE story_id = ?",
            "DELETE FROM notifications WHERE story_id = ?",
            "DELETE FROM stories WHERE story_id = ?"
        ];

        for (const query of deleteQueries) {
            await connection.query(query, [story_id]);
        }

        await connection.commit();
        res.status(200).json({ success: true, message: "Xóa story thành công" });
    } catch (error) {
        await connection.rollback(); 
        next(error);
    } finally {
        connection.release();
    }
};

export const viewStory = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    const connection = await pool.getConnection();
    try {
        const story_id = parseInt(req.params.id, 10);
        if (isNaN(story_id)) return next(new AppError("Tham số 'id' không hợp lệ (phải là số).", 400));

        const viewer_id = req.user?.user_id;
        if (!viewer_id) return next(new AppError("Người dùng chưa được xác thực.", 401));

        const [storyRows] = await connection.query<RowDataPacket[]>(
            "SELECT s.story_id, s.user_id, s.close_friends_only FROM stories s WHERE s.story_id = ? AND s.expires_at > NOW()",
            [story_id]
        );

        if (storyRows.length === 0) {
            return next(new AppError("Story không tồn tại hoặc đã hết hạn.", 404));
        }

        const story = storyRows[0];
        
        if (story.close_friends_only && story.user_id !== viewer_id) {
            const [checkCloseFriend] = await connection.query<RowDataPacket[]>(
                "SELECT id FROM close_friends WHERE user_id = ? AND friend_id = ?",
                [story.user_id, viewer_id]
            );
            
            if (checkCloseFriend.length === 0) {
                return next(new AppError("Bạn không có quyền xem story này.", 403));
            }
        }

        await connection.beginTransaction();

        await connection.query(
            "UPDATE stories SET view_count = view_count + 1 WHERE story_id = ?",
            [story_id]
        );

        if (story.user_id !== viewer_id) {
            await connection.query(
                "INSERT INTO notifications (user_id, type, message, story_id, related_id) VALUES (?, 'story_view', ?, ?, ?)",
                [story.user_id, `Người dùng đã xem story của bạn`, story_id, viewer_id]
            );
        }

        await connection.commit();
        res.status(200).json({ success: true, message: "Đã xem story" });
    } catch (error) {
        await connection.rollback(); 
        next(error);
    } finally {
        connection.release();
    }
};

export const replyToStory = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    const connection = await pool.getConnection();
    try {
        const story_id = parseInt(req.params.id, 10);
        const { content } = req.body;
        
        if (isNaN(story_id)) return next(new AppError("Tham số 'id' không hợp lệ (phải là số).", 400));
        if (!content || content.trim() === "") return next(new AppError("Nội dung trả lời không được để trống.", 400));

        const replier_id = req.user?.user_id;
        if (!replier_id) return next(new AppError("Người dùng chưa được xác thực.", 401));

        const [storyRows] = await connection.query<RowDataPacket[]>(
            "SELECT s.story_id, s.user_id, s.close_friends_only FROM stories s WHERE s.story_id = ? AND s.expires_at > NOW()",
            [story_id]
        );

        if (storyRows.length === 0) {
            return next(new AppError("Story không tồn tại hoặc đã hết hạn.", 404));
        }

        const story = storyRows[0];
        
        if (story.close_friends_only && story.user_id !== replier_id) {
            const [checkCloseFriend] = await connection.query<RowDataPacket[]>(
                "SELECT id FROM close_friends WHERE user_id = ? AND friend_id = ?",
                [story.user_id, replier_id]
            );
            
            if (checkCloseFriend.length === 0) {
                return next(new AppError("Bạn không có quyền trả lời story này.", 403));
            }
        }

        await connection.beginTransaction();

        const [messageResult] = await connection.query<ResultSetHeader>(
            "INSERT INTO messages (sender_id, receiver_id, content, message_type) VALUES (?, ?, ?, 'text')",
            [replier_id, story.user_id, content]
        );
        
        await connection.query(
            "INSERT INTO notifications (user_id, type, message, story_id, related_id, message_id) VALUES (?, 'story_reply', ?, ?, ?, ?)",
            [story.user_id, `Người dùng đã trả lời story của bạn`, story_id, replier_id, messageResult.insertId]
        );

        await connection.commit();
        res.status(201).json({ 
            success: true, 
            message: "Đã trả lời story",
            reply: {
                story_id,
                content,
                message_id: messageResult.insertId
            }
        });
    } catch (error) {
        await connection.rollback(); 
        next(error);
    } finally {
        connection.release();
    }
};

export const addStoryToHighlight = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    const connection = await pool.getConnection();
    try {
        const story_id = parseInt(req.params.id, 10);
        const { highlight_id, highlight_title } = req.body;
        
        if (isNaN(story_id)) return next(new AppError("Tham số 'id' không hợp lệ (phải là số).", 400));
        
        const user_id = req.user?.user_id;
        if (!user_id) return next(new AppError("Người dùng chưa được xác thực.", 401));

        const [storyRows] = await connection.query<RowDataPacket[]>(
            "SELECT story_id FROM stories WHERE story_id = ? AND user_id = ?",
            [story_id, user_id]
        );

        if (storyRows.length === 0) {
            return next(new AppError("Story không tồn tại hoặc không thuộc về bạn.", 404));
        }

        await connection.beginTransaction();

    } catch (error) {
        await connection.rollback(); 
        next(error);
    } finally {
        connection.release();
    }
};