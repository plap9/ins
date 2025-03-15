import { NextFunction, Request, Response } from "express";
import pool from "../../config/db";
import { ResultSetHeader } from "mysql2";
import { AuthRequest } from "../../middlewares/authMiddleware";

export const createPost = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { content, location, privacy } = req.body;
        const user_id = req.user?.id;

        if (!user_id) {
            res.status(401).json({ error: "Người dùng chưa được xác thực" });
            return;
        }

        const [result] = await pool.query<ResultSetHeader>(
            "INSERT INTO posts (user_id, content, location, privacy) VALUES (?, ?, ?, ?)",
            [user_id, content, location, privacy]
        );

        const post_id = result.insertId; 

        if (req.files && Array.isArray(req.files)) {
            const files = req.files as Express.MulterS3.File[];

            for (const file of files) {
                const media_type = file.mimetype.startsWith("image") ? 'image' : 'video';

                await pool.query(
                    "INSERT INTO media (post_id, media_url, media_type) VALUES (?, ?, ?)",
                    [post_id, file.location, media_type] 
                );
            }
        }

        res.status(201).json({
            message: "Bài viết đã được tạo",
            post_id,
            user_id,
            content,
            location,
            privacy,
        });
    } catch (error) {
        next(error);
    }
};