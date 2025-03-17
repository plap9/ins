import { Request, Response, NextFunction } from "express";
import PostService from "../../services/PostService";
import { AuthRequest } from "../../middlewares/authMiddleware";
import { AppError } from "../../middlewares/errorHandler";

export const getPosts = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const page = parseInt(req.query.page as string || "1", 10);
        const limit = parseInt(req.query.limit as string || "10", 10);
        const user_id = req.query.user_id ? parseInt(req.query.user_id as string, 10) : undefined;

        if (isNaN(page) || page < 1 || isNaN(limit) || limit < 1 || limit > 100) {
            throw new AppError("Tham số không hợp lệ.", 400);
        }

        const posts = await PostService.getPosts(page, limit, user_id);
        res.status(200).json({ success: true, posts });
    } catch (error) {
        next(error);
    }
};

export const createPost = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        const files = req.files ? (req.files as { [fieldname: string]: Express.MulterS3.File[] })['media'] : undefined;
        const post = await PostService.createPost(req.user!, req.body.content, req.body.location, files);
        res.status(201).json({ message: "Bài viết đã được tạo", ...post });
    } catch (error) {
        next(error);
    }
};

export const deletePost = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        const post_id = parseInt(req.params.id, 10);
        if (isNaN(post_id)) throw new AppError("Tham số 'id' không hợp lệ.", 400);

        const result = await PostService.deletePost(req.user!, post_id);
        res.status(200).json(result);
    } catch (error) {
        next(error);
    }
};
