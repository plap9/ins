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

const unlinkFile = async (filePath: string): Promise<void> => {
    try {
        await fs.unlink(filePath);
    } catch (error) {
        console.error(`Lỗi khi xóa file ${filePath}:`, error);
    }
};

export const createStory = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    let filePath = null;
    let fileBuffer = null;
    const connection = await pool.getConnection();
    
    try {
        
        if (!req.file) {
            return next(new AppError('Không tìm thấy file', 400, ErrorCode.VALIDATION_ERROR));
        }
        
        if (!req.user?.user_id) {
            return next(new AppError('Không xác định được người dùng', 401, ErrorCode.USER_NOT_AUTHENTICATED));
        }

        const user_id = req.user.user_id;
        
        if (req.file.buffer) {
            fileBuffer = req.file.buffer;
        } else if (req.file.path) {
            filePath = req.file.path;
        } else {
            return next(new AppError('Không tìm thấy dữ liệu file', 400, ErrorCode.VALIDATION_ERROR));
        }
        
        const has_text = req.body.has_text === 'true' || req.body.has_text === true;
        const sticker_data = req.body.sticker_data || null;
        const filter_data = req.body.filter_data || null;
        const close_friends_only = req.body.close_friends_only === 'true' || req.body.close_friends_only === true;
        
        
        if (close_friends_only) {
            const [friends] = await connection.query<RowDataPacket[]>(
                "SELECT COUNT(*) AS count FROM close_friends WHERE user_id = ?",
                [user_id]
            );
            
            if (friends[0].count === 0) {
                return next(new AppError('Bạn chưa có danh sách bạn thân', 400, ErrorCode.VALIDATION_ERROR));
            }
        }
        
        try {
            const s3Key = `stories/${Date.now()}_${uuidv4()}`;
            let s3Result;
            
            if (fileBuffer) {
                s3Result = await uploadToS3(fileBuffer, s3Key, req.file.mimetype);
            } else {
                s3Result = await uploadToS3(filePath as string, s3Key, req.file.mimetype);
            }
            
            if (!s3Result.Location) {
                return next(new AppError('Upload lên S3 thất bại', 500, ErrorCode.SERVER_ERROR));
            }
            
            await connection.beginTransaction();
            
            const [storyResult] = await connection.query<OkPacket>(
                "INSERT INTO stories (user_id, has_text, sticker_data, filter_data, close_friends_only) VALUES (?, ?, ?, ?, ?)",
                [user_id, has_text, sticker_data, filter_data, close_friends_only]
            );
            
            const story_id = storyResult.insertId;
            let media_type = 'image';
            
            if (req.file.mimetype) {
                media_type = req.file.mimetype.startsWith('video/') ? 'video' : 'image';
            } else {
                const fileExt = path.extname(req.file.originalname).toLowerCase();
                media_type = fileExt === '.mp4' || fileExt === '.mov' ? 'video' : 'image';
            }
            
            const [mediaResult] = await connection.query<OkPacket>(
                "INSERT INTO media (story_id, media_url, media_type, post_id) VALUES (?, ?, ?, NULL)",
                [story_id, s3Result.Location, media_type]
            );
            
            await connection.commit();
            if (filePath) {
                await unlinkFile(filePath);
                filePath = null;
            }
            
            res.status(201).json({
                success: true,
                message: 'Story đã được tạo',
                story_id: story_id,
                media: [{
                    media_id: mediaResult.insertId,
                    story_id: story_id,
                    media_url: s3Result.Location,
                    media_type: media_type,
                    created_at: new Date()
                }],
                expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000) 
            });
            
        } catch (uploadError) {
            console.error("Lỗi khi upload file:", uploadError);
            return next(new AppError(`Upload lên S3 thất bại: ${(uploadError as Error).message}`, 500, ErrorCode.SERVER_ERROR));
        }
        
    } catch (error) {
        console.error("Lỗi trong quá trình tạo story:", error);
        
        await connection.rollback();
        
        if (filePath) {
            try {
                await unlinkFile(filePath);
            } catch (unlinkError) {
                console.error('Lỗi khi xóa file tạm:', unlinkError);
            }
        }
        
        next(error);
    } finally {
        connection.release();
    }
};
