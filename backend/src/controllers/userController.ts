import { Request, Response } from 'express';
import pool from '../config/db';

export const getUserProfile = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = req.params.id;
        const [users]: any = await pool.query(
            `SELECT id, username, email, full_name, bio, profile_picture, 
                    phone_number, is_private, is_verified, website, gender, 
                    date_of_birth, created_at, updated_at, last_login, status
             FROM users WHERE id = ?`,
            [userId]
        );

        if (users.length === 0) {
            res.status(404).json({ error: "Người dùng không tồn tại" });
            return;
        }

        res.json(users[0]); 
    } catch (error) {
        console.error("Lỗi lấy thông tin người dùng:", error);
        res.status(500).json({ error: "Lỗi server" });
    }
};


export const updateUserProfile = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = req.params.id;
        const { full_name, bio, profile_picture } = req.body;
        await pool.query(
            "UPDATE users SET full_name = ?, bio = ?, profile_picture = ? WHERE id = ?",
            [full_name, bio, profile_picture, userId]
        );
        res.json({ message: "Cập nhật thông tin thành công" });
    } catch (error) {
        console.error("Lỗi cập nhật thông tin người dùng:", error);
        res.status(500).json({ error: "Lỗi server" });
    }
};
