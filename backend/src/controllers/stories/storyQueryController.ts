import { NextFunction, Request, Response } from "express";
import pool from "../../config/db";
import { RowDataPacket, ResultSetHeader } from "mysql2";
import { AppError } from "../../middlewares/errorHandler";
import { ErrorCode } from "../../types/errorCode";
import { AuthRequest } from "../../middlewares/authMiddleware";

export const getStories = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const user_id = req.query.user_id ? parseInt(req.query.user_id as string, 10) : undefined;
        const current_user_id = (req as AuthRequest).user?.user_id;

        console.log("getStories - Request params:", { user_id, current_user_id });

        if (user_id === undefined) {
            return next(new AppError("Thiếu thông số user_id", 400, ErrorCode.VALIDATION_ERROR));
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
                u.profile_picture,
                EXISTS (SELECT 1 FROM story_views sv WHERE sv.story_id = s.story_id AND sv.viewer_id = ?) as is_viewed
            FROM stories s
            INNER JOIN users u ON s.user_id = u.user_id
            WHERE s.expires_at > NOW()`;
        
        const queryParams: any[] = [current_user_id];

        if (user_id > 0) {
            sql += " AND s.user_id = ?";
            queryParams.push(user_id);

            if (user_id !== current_user_id) {
                sql += " AND (s.close_friends_only = FALSE OR (s.close_friends_only = TRUE AND EXISTS (SELECT 1 FROM close_friends WHERE user_id = ? AND friend_id = ?)))";
                queryParams.push(user_id, current_user_id);
            }
        } else if (user_id === 0 && current_user_id) {
            sql += ` AND (
                s.user_id = ? OR
                (s.user_id IN (SELECT following_id FROM followers WHERE follower_id = ?) 
                AND (s.close_friends_only = FALSE OR (s.close_friends_only = TRUE AND EXISTS (SELECT 1 FROM close_friends WHERE user_id = s.user_id AND friend_id = ?))))
            )`;
            queryParams.push(current_user_id, current_user_id, current_user_id);
        } else {
            return next(new AppError("Người dùng chưa được xác thực", 401, ErrorCode.USER_NOT_AUTHENTICATED));
        }
        
        sql += " ORDER BY s.created_at DESC";

        console.log("SQL Query:", sql);
        console.log("Query params:", queryParams);

        const [stories] = await pool.query<RowDataPacket[]>(sql, queryParams);
        console.log(`Tìm thấy ${stories.length} stories`);

        const storyGroups: any[] = [];
        const userStories: Record<number, any> = {};

        stories.forEach((story: any) => {
            const userId = story.user_id;
            
            if (!userStories[userId]) {
                userStories[userId] = {
                    user: {
                        user_id: userId,
                        username: story.username,
                        profile_picture: story.profile_picture
                    },
                    stories: [],
                    has_unviewed: false
                };
                storyGroups.push(userStories[userId]);
            }
            
            userStories[userId].stories.push({
                story_id: story.story_id,
                media_url: story.media_url,
                created_at: story.created_at,
                expires_at: story.expires_at,
                has_text: story.has_text,
                sticker_data: story.sticker_data,
                filter_data: story.filter_data,
                view_count: story.view_count,
                close_friends_only: story.close_friends_only,
                is_viewed: story.is_viewed === 1
            });
            
            if (story.is_viewed === 0) {
                userStories[userId].has_unviewed = true;
            }
        });

        console.log(`Đã nhóm thành ${storyGroups.length} story groups`);
        res.status(200).json({ success: true, storyGroups });
    } catch (error) {
        console.error("Error in getStories:", error);
        next(error);
    }
};

export const deleteStory = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    const connection = await pool.getConnection();
    try {
        const story_id = parseInt(req.params.id, 10);
        if (isNaN(story_id)) return next(new AppError("Tham số 'id' không hợp lệ (phải là số).", 400, ErrorCode.VALIDATION_ERROR));

        const user_id = req.user?.user_id;
        if (!user_id) return next(new AppError("Người dùng chưa được xác thực.", 401, ErrorCode.USER_NOT_AUTHENTICATED));

        const [checkRows] = await connection.query<RowDataPacket[]>(
            "SELECT story_id FROM stories WHERE story_id = ? AND user_id = ?",
            [story_id, user_id]
        );

        if (checkRows.length === 0) {
            return next(new AppError("Bạn không có quyền xóa story này hoặc story không tồn tại.", 403, ErrorCode.STORY_ACCESS_DENIED));
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
        if (isNaN(story_id)) return next(new AppError("Tham số 'id' không hợp lệ (phải là số).", 400, ErrorCode.VALIDATION_ERROR));

        const viewer_id = req.user?.user_id;
        if (!viewer_id) return next(new AppError("Người dùng chưa được xác thực.", 401, ErrorCode.USER_NOT_AUTHENTICATED));

        console.log(`Đánh dấu đã xem story ID ${story_id} bởi user ${viewer_id}`);

        const [storyRows] = await connection.query<RowDataPacket[]>(
            "SELECT s.story_id, s.user_id, s.view_count, s.close_friends_only FROM stories s WHERE s.story_id = ? AND s.expires_at > NOW()",
            [story_id]
        );

        if (storyRows.length === 0) {
            console.log(`Story ID ${story_id} không tồn tại hoặc đã hết hạn`);
            res.status(200).json({ 
                success: true, 
                message: "Story không tồn tại hoặc đã hết hạn", 
                view_count: 0
            });
            return;
        }

        const story = storyRows[0];
        let view_count = story.view_count;
        
        if (story.close_friends_only && story.user_id !== viewer_id) {
            const [checkCloseFriend] = await connection.query<RowDataPacket[]>(
                "SELECT id FROM close_friends WHERE user_id = ? AND friend_id = ?",
                [story.user_id, viewer_id]
            );
            
            if (checkCloseFriend.length === 0) {
                return next(new AppError("Bạn không có quyền xem story này.", 403, ErrorCode.STORY_ACCESS_DENIED));
            }
        }

        await connection.beginTransaction();

        const [viewCheck] = await connection.query<RowDataPacket[]>(
            "SELECT * FROM story_views WHERE story_id = ? AND viewer_id = ?",
            [story_id, viewer_id]
        );

        if (viewCheck.length === 0) {
            try {
                await connection.query(
                    "INSERT INTO story_views (story_id, viewer_id) VALUES (?, ?)",
                    [story_id, viewer_id]
                );

                const [countResult] = await connection.query<RowDataPacket[]>(
                    "SELECT COUNT(*) as total FROM story_views WHERE story_id = ?",
                    [story_id]
                );
                
                view_count = countResult[0].total;

                await connection.query(
                    "UPDATE stories SET view_count = ? WHERE story_id = ?",
                    [view_count, story_id]
                );

                if (story.user_id !== viewer_id) {
                    await connection.query(
                        "INSERT INTO notifications (user_id, type, message, story_id, related_id) VALUES (?, 'story_view', ?, ?, ?)",
                        [story.user_id, `Người dùng đã xem story của bạn`, story_id, viewer_id]
                    );
                }
            } catch (insertError) {
                console.error("Lỗi khi cập nhật lượt xem:", insertError);
            }
        }

        await connection.commit();
        
        res.status(200).json({ 
            success: true, 
            message: "Đã xem story", 
            view_count 
        });
        return;
    } catch (error) {
        console.error("Lỗi xử lý viewStory:", error);
        await connection.rollback(); 
        res.status(200).json({ 
            success: true, 
            message: "Đã xảy ra lỗi khi cập nhật lượt xem, nhưng vẫn đánh dấu là đã xem", 
            view_count: 0 
        });
        return;
    } finally {
        connection.release();
    }
};

export const replyToStory = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    const connection = await pool.getConnection();
    try {
        const story_id = parseInt(req.params.id, 10);
        const { content } = req.body;
        
        if (isNaN(story_id)) return next(new AppError("Tham số 'id' không hợp lệ (phải là số).", 400, ErrorCode.VALIDATION_ERROR));
        if (!content || content.trim() === "") return next(new AppError("Nội dung trả lời không được để trống.", 400, ErrorCode.VALIDATION_ERROR));

        const replier_id = req.user?.user_id;
        if (!replier_id) return next(new AppError("Người dùng chưa được xác thực.", 401, ErrorCode.USER_NOT_AUTHENTICATED));

        const [storyRows] = await connection.query<RowDataPacket[]>(
            "SELECT s.story_id, s.user_id, s.close_friends_only FROM stories s WHERE s.story_id = ? AND s.expires_at > NOW()",
            [story_id]
        );

        if (storyRows.length === 0) {
            return next(new AppError("Story không tồn tại hoặc đã hết hạn.", 404, ErrorCode.STORY_NOT_FOUND));
        }

        const story = storyRows[0];
        
        if (story.close_friends_only && story.user_id !== replier_id) {
            const [checkCloseFriend] = await connection.query<RowDataPacket[]>(
                "SELECT id FROM close_friends WHERE user_id = ? AND friend_id = ?",
                [story.user_id, replier_id]
            );
            
            if (checkCloseFriend.length === 0) {
                return next(new AppError("Bạn không có quyền trả lời story này.", 403, ErrorCode.STORY_ACCESS_DENIED));
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
        
        if (isNaN(story_id)) return next(new AppError("Tham số 'id' không hợp lệ (phải là số).", 400, ErrorCode.VALIDATION_ERROR));
        
        const user_id = req.user?.user_id;
        if (!user_id) return next(new AppError("Người dùng chưa được xác thực.", 401, ErrorCode.USER_NOT_AUTHENTICATED));

        const [storyRows] = await connection.query<RowDataPacket[]>(
            "SELECT story_id, media_url FROM stories WHERE story_id = ? AND user_id = ?",
            [story_id, user_id]
        );

        if (storyRows.length === 0) {
            return next(new AppError("Story không tồn tại hoặc không thuộc về bạn.", 404, ErrorCode.STORY_NOT_FOUND));
        }

        await connection.beginTransaction();

        let highlightId: number;
        
        if (highlight_id) {
            const [highlightRows] = await connection.query<RowDataPacket[]>(
                "SELECT highlight_id FROM highlights WHERE highlight_id = ? AND user_id = ?",
                [highlight_id, user_id]
            );
            
            if (highlightRows.length === 0) {
                await connection.rollback();
                return next(new AppError("Highlight không tồn tại hoặc không thuộc về bạn.", 404, ErrorCode.STORY_ACCESS_DENIED));
            }
            
            highlightId = highlight_id;
        } else {
            const [result] = await connection.query<ResultSetHeader>(
                "INSERT INTO highlights (user_id, title, cover_image_url) VALUES (?, ?, ?)",
                [user_id, highlight_title, storyRows[0].media_url]
            );
            
            highlightId = result.insertId;
        }
        
        const [existingRows] = await connection.query<RowDataPacket[]>(
            "SELECT id FROM highlight_stories WHERE highlight_id = ? AND story_id = ?",
            [highlightId, story_id]
        );
        
        if (existingRows.length > 0) {
            await connection.rollback();
            return next(new AppError("Story đã được thêm vào highlight này.", 400, ErrorCode.STORY_ALREADY_ADDED));
        }
        
        await connection.query(
            "INSERT INTO highlight_stories (highlight_id, story_id) VALUES (?, ?)",
            [highlightId, story_id]
        );
        
        await connection.commit();
        res.status(201).json({
            success: true,
            message: "Đã thêm story vào highlight",
            data: {
                highlight_id: highlightId,
                story_id: story_id
            }
        });
    } catch (error) {
        await connection.rollback(); 
        next(error);
    } finally {
        connection.release();
    }
};