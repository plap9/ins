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

        let imageUrls: string[] = [];
        let videoUrls: string[] = [];

      
        if (req.files && Array.isArray(req.files)) {
            const files = req.files as Express.MulterS3.File[];
            files.forEach((file) => {
                if (file.mimetype.startsWith("image")) {
                    imageUrls.push(file.location);
                } else if (file.mimetype.startsWith("video")) {
                    videoUrls.push(file.location);
                }
            });
        }

        
        const [result] = await pool.query<ResultSetHeader>(
            "INSERT INTO posts (user_id, content, location, privacy, image_url, video_url) VALUES (?, ?, ?, ?, ?, ?)",
            [user_id, content, location, privacy, JSON.stringify(imageUrls), JSON.stringify(videoUrls)]
        );

       
        const post_id = result.insertId;

        res.status(201).json({
            message: "Bài viết đã được tạo",
            post_id, 
            user_id,
            content,
            location,
            privacy,
            imageUrls,
            videoUrls,
        });
    } catch (error) {
        next(error);
    }
};