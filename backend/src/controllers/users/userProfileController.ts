import { NextFunction, Request, Response } from 'express';
import pool from '../../config/db';

export const getUserProfile = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const userId = req.params.id;
        const [users]: any = await pool.query(
            `SELECT user_id, username, email, full_name, bio, profile_picture, 
                    phone_number, is_private, is_verified, website, gender, 
                    date_of_birth, created_at, updated_at, last_login, status
             FROM users WHERE user_id = ?`,
            [userId]
        );

        if (users.length === 0) {
            res.status(404).json({ error: "Người dùng không tồn tại" });
            return;
        }

        res.json(users[0]); 
    } catch (error) {
        next(error);
    }
};
