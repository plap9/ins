import { NextFunction, Request, Response } from "express";
import pool from "../../config/db";
import { AuthRequest } from "../../middlewares/authMiddleware";

export const getPosts = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const [posts] = await pool.query("SELECT * FROM posts ORDER BY created_at DESC");

        const formattedPosts = (posts as any[]).map((post) => ({
            ...post,
            image_url: post.image_url ? JSON.parse(post.image_url) : [],
            video_url: post.video_url ? JSON.parse(post.video_url) : [],
        }));

        res.json(formattedPosts);
    } catch (error) {
        next(error);
    }
};

export const deletePost = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
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
        next(error);
    }
};