import { NextFunction, Response } from "express";
import pool from "../../config/db";
import { ResultSetHeader } from "mysql2";
import { AuthRequest } from "../../middlewares/authMiddleware";
import { AppError, ErrorCode } from "../../middlewares/errorHandler";

export const createStory = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    const connection = await pool.getConnection();
    try {
        const { has_text, sticker_data, filter_data, close_friends_only } = req.body;
        const user_id = req.user?.user_id;

        if (!user_id) return next(new AppError("Người dùng chưa được xác thực", 401, ErrorCode.USER_NOT_AUTHENTICATED));

        const hasFiles = req.files && Array.isArray(req.files) && req.files.length > 0;
        if (!hasFiles) {
            return next(new AppError("Story phải có ít nhất một ảnh/video", 400, ErrorCode.STORY_NO_MEDIA));
        }

        await connection.beginTransaction();

        const file = (req.files as Express.MulterS3.File[])[0];
        if (!file.mimetype.startsWith("image") && !file.mimetype.startsWith("video")) {
            await connection.rollback();
            return next(new AppError("Chỉ hỗ trợ ảnh và video", 400, ErrorCode.STORY_MEDIA_UNSUPPORTED));
        }

        const [result] = await connection.query<ResultSetHeader>(
            "INSERT INTO stories (user_id, media_url, has_text, sticker_data, filter_data, close_friends_only) VALUES (?, ?, ?, ?, ?, ?)",
            [
                user_id, 
                file.location, 
                has_text || false, 
                sticker_data || null, 
                filter_data || null, 
                close_friends_only || false
            ]
        );
        const story_id = result.insertId;

        await connection.commit();
        res.status(201).json({
            message: "Story đã được tạo",
            story_id,
            user_id,
            media_url: file.location,
            has_text: has_text || false,
            sticker_data: sticker_data || null,
            filter_data: filter_data || null,
            close_friends_only: close_friends_only || false,
            expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000) 
        });
    } catch (error) {
        await connection.rollback(); 
        next(error);
    } finally {
        connection.release();
    }
};
