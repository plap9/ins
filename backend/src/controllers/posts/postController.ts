import { NextFunction, Response } from "express";
import pool from "../../config/db";
import { ResultSetHeader } from "mysql2";
import { AuthRequest } from "../../middlewares/authMiddleware";
import { AppError, ErrorCode } from "../../middlewares/errorHandler";

export const createPost = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    const connection = await pool.getConnection();
    try {
        const { content, location } = req.body;
        const user_id = req.user?.user_id;

        console.log(" req.user:", req.user);
        if (!user_id) return next(new AppError("Người dùng chưa được xác thực", 401, ErrorCode.USER_NOT_AUTHENTICATED));

        const hasContent = content && content.trim() !== "";
        const hasFiles = req.files && Array.isArray(req.files) && req.files.length > 0;

        if (!hasContent && !hasFiles) {
            return next(new AppError("Bài viết phải có nội dung hoặc ít nhất một ảnh/video", 400, ErrorCode.VALIDATION_ERROR));
        }

        await connection.beginTransaction();

        const [result] = await connection.query<ResultSetHeader>(
            "INSERT INTO posts (user_id, content, location) VALUES (?, ?, ?)",
            [user_id, content || null, location || null]
        );
        const post_id = result.insertId;

        if (hasFiles) {
            const files = req.files as Express.MulterS3.File[];

            for (const file of files) {
                if (!file.mimetype.startsWith("image") && !file.mimetype.startsWith("video")) {
                    await connection.rollback();
                    return next(new AppError("Chỉ hỗ trợ ảnh và video", 400, ErrorCode.VALIDATION_ERROR));
                }

                const media_type = file.mimetype.startsWith("image") ? "image" : "video";
                await connection.query(
                    "INSERT INTO media (post_id, media_url, media_type) VALUES (?, ?, ?)",
                    [post_id, file.location, media_type]
                );
            }
        }

        await connection.commit();
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
