import { Request, Response } from "express";
import pool from "../config/db";
import { ResultSetHeader } from "mysql2";
import { AuthRequest } from "../middlewares/authMiddleware";

export const createPost = async (req: AuthRequest, res: Response): Promise<void> => {
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
        console.error("Lỗi khi tạo bài viết:", error);
        res.status(500).json({ error: "Lỗi server" });
    }
};

export const getPosts = async (req: Request, res: Response): Promise<void> => {
    try {
        const [posts] = await pool.query("SELECT * FROM posts ORDER BY created_at DESC");

        const formattedPosts = (posts as any[]).map((post) => ({
            ...post,
            image_url: post.image_url ? JSON.parse(post.image_url) : [],
            video_url: post.video_url ? JSON.parse(post.video_url) : [],
        }));

        res.json(formattedPosts);
    } catch (error) {
        console.error("Lỗi khi lấy bài viết:", error);
        res.status(500).json({ error: "Lỗi server" });
    }
};

export const deletePost = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const user_id = req.user?.id;

        if (!user_id) {
            res.status(401).json({ error: "Người dùng chưa được xác thực" });
            return;
        }

        const [rows] = await pool.query("SELECT * FROM posts WHERE id = ? AND user_id = ?", [id, user_id]);
        if ((rows as any[]).length === 0) {
            res.status(403).json({ error: "Bạn không có quyền xóa bài viết này" });
            return;
        }

        await pool.query("DELETE FROM posts WHERE id = ?", [id]);

        res.json({ message: "Xóa bài viết thành công" });
    } catch (error) {
        console.error("Lỗi khi xóa bài viết:", error);
        res.status(500).json({ error: "Lỗi server" });
    }
};
