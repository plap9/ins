import { NextFunction, Response } from "express";
import pool from "../../config/db";
import { ResultSetHeader } from "mysql2";
import { AuthRequest } from "../../middlewares/authMiddleware";
import { AppException } from "../../middlewares/errorHandler";
import { ErrorCode } from "../../types/errorCode";
import { uploadToS3 } from "../../utils/s3Utils";
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

export const createPost = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    const connection = await pool.getConnection();
    try {
        const { content, location } = req.body;
        const user_id = req.user?.user_id;

        if (!user_id) return next(new AppException("Người dùng chưa được xác thực", ErrorCode.USER_NOT_AUTHENTICATED, 401));

        const hasContent = content && content.trim() !== "";
        const hasFile = req.file !== undefined;
        const hasFiles = req.files !== undefined && Array.isArray(req.files) && req.files.length > 0;

        if (!hasContent && !hasFile && !hasFiles) {
            return next(new AppException("Bài viết phải có nội dung hoặc ít nhất một ảnh/video", ErrorCode.VALIDATION_ERROR, 400));
        }

        await connection.beginTransaction();

        const [result] = await connection.query<ResultSetHeader>(
            "INSERT INTO posts (user_id, content, location) VALUES (?, ?, ?)",
            [user_id, content || null, location || null]
        );
        const post_id = result.insertId;

        if (hasFile) {
            const file = req.file as Express.Multer.File;
            
            if (!file.mimetype.startsWith("image") && !file.mimetype.startsWith("video")) {
                await connection.rollback();
                return next(new AppException("Chỉ hỗ trợ ảnh và video", ErrorCode.VALIDATION_ERROR, 400));
            }

            const fileExt = path.extname(file.originalname).toLowerCase();
            const fileName = `posts/${Date.now()}_${uuidv4()}${fileExt}`;
            
            const uploadResult = await uploadToS3(
                file.buffer,
                fileName,
                file.mimetype
            );
            
            const media_type = file.mimetype.startsWith("image") ? "image" : "video";

            await connection.query(
                "INSERT INTO media (post_id, media_url, media_type, content_type) VALUES (?, ?, ?, 'post')",
                [post_id, uploadResult.Location, media_type]
            );
        }
        
        if (hasFiles) {
            const files = req.files as Express.Multer.File[];

            for (const file of files) {
                if (!file.mimetype.startsWith("image") && !file.mimetype.startsWith("video")) {
                    await connection.rollback();
                    return next(new AppException("Chỉ hỗ trợ ảnh và video", ErrorCode.VALIDATION_ERROR, 400));
                }

                const fileExt = path.extname(file.originalname).toLowerCase();
                const fileName = `posts/${Date.now()}_${uuidv4()}${fileExt}`;
                
                const uploadResult = await uploadToS3(
                    file.buffer,
                    fileName,
                    file.mimetype
                );
                
                const media_type = file.mimetype.startsWith("image") ? "image" : "video";

                await connection.query(
                    "INSERT INTO media (post_id, media_url, media_type, content_type) VALUES (?, ?, ?, 'post')",
                    [post_id, uploadResult.Location, media_type]
                );
            }
        }

        await connection.commit();

        try {
            const { invalidateUserProfileCache, invalidatePostsListCache } = require('../../utils/cacheUtils');
            await invalidateUserProfileCache(user_id);
            await invalidatePostsListCache();
        } catch (cacheError) {
            console.error('Lỗi khi xóa cache:', cacheError);
        }

        res.status(201).json({
            message: "Bài viết đã được tạo",
            post_id,
            user_id,
            content: content || null,
            location: location || null,
            post_privacy: "public",
        });
    } catch (error) {
        await connection.rollback(); 
        next(error);
    } finally {
        connection.release();
    }
};
