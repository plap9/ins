import { NextFunction, Response } from "express";
import pool from "../../config/db";
import { ResultSetHeader } from "mysql2";
import { AuthRequest } from "../../middlewares/authMiddleware";
import { AppError } from "../../middlewares/errorHandler";
import { ErrorCode } from "../../types/errorCode";
import { uploadToS3 } from "../../utils/s3Utils";
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { RowDataPacket, OkPacket } from "mysql2";
import fs from 'fs/promises';

// Hàm trợ giúp để xóa file
const unlinkFile = async (filePath: string): Promise<void> => {
    try {
        await fs.unlink(filePath);
    } catch (error) {
        console.error(`Lỗi khi xóa file ${filePath}:`, error);
    }
};

export const createStory = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    let filePath = null;
    try {
        console.log("Nhận request tạo story");
        
        if (!req.file) {
            return next(new AppError('Không tìm thấy file', 400, ErrorCode.VALIDATION_ERROR));
        }
        
        if (!req.user?.user_id) {
            return next(new AppError('Không xác định được người dùng', 401, ErrorCode.USER_NOT_AUTHENTICATED));
        }

        const user_id = req.user.user_id;
        const media_url = req.file.path; // Đường dẫn tạm thời của file
        filePath = media_url;
        
        // Xử lý các thông số khác
        const has_text = req.body.has_text === 'true' || req.body.has_text === true;
        const sticker_data = req.body.sticker_data || null;
        const filter_data = req.body.filter_data || null;
        const close_friends_only = req.body.close_friends_only === 'true' || req.body.close_friends_only === true;
        
        // Kiểm tra nếu đây là story chỉ cho close friends thì người dùng phải có close friends
        if (close_friends_only) {
            const [friends] = await pool.query<RowDataPacket[]>(
                "SELECT COUNT(*) AS count FROM close_friends WHERE user_id = ?",
                [user_id]
            );
            
            if (friends[0].count === 0) {
                return next(new AppError('Bạn chưa có danh sách bạn thân', 400, ErrorCode.VALIDATION_ERROR));
            }
        }
        
        // Upload file lên S3
        const s3Result = await uploadToS3(req.file.path, 'stories');
        
        if (!s3Result.Location) {
            return next(new AppError('Upload lên S3 thất bại', 500, ErrorCode.SERVER_ERROR));
        }
        
        // Lưu story vào database
        const [result] = await pool.query<OkPacket>(
            "INSERT INTO stories (user_id, media_url, has_text, sticker_data, filter_data, close_friends_only) VALUES (?, ?, ?, ?, ?, ?)",
            [user_id, s3Result.Location, has_text, sticker_data, filter_data, close_friends_only]
        );
        
        // Xóa file tạm
        await unlinkFile(req.file.path);
        filePath = null;
        
        res.status(201).json({
            success: true,
            message: 'Story đã được tạo',
            story_id: result.insertId,
            media_url: s3Result.Location,
            expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours from now
        });
    } catch (error) {
        // Xóa file tạm nếu có lỗi xảy ra
        if (filePath) {
            try {
                await unlinkFile(filePath);
            } catch (unlinkError) {
                console.error('Lỗi khi xóa file tạm:', unlinkError);
            }
        }
        
        next(error);
    }
};
