import { NextFunction, Request, Response } from 'express';
import pool from '../../config/db';

export const updateUserProfile = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const userId = req.params.id;
        const { full_name, bio, profile_picture } = req.body;
        await pool.query(
            "UPDATE users SET full_name = ?, bio = ?, profile_picture = ? WHERE user_id = ?",
            [full_name, bio, profile_picture, userId]
        );
        res.json({ message: "Cập nhật thông tin thành công" });
    } catch (error) {
        next(error);
    }
};