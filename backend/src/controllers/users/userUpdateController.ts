import { NextFunction, Request, Response } from 'express';
import pool from '../../config/db';
import { AppError } from '../../middlewares/errorHandler';

export const updateUserProfile = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const userId = parseInt(req.params.id, 10);
        if (isNaN(userId)) {
            return next(new AppError("Tham số 'user_id' không hợp lệ.", 400));
        }

        const { full_name, bio, profile_picture } = req.body;
        if (!full_name && !bio && !profile_picture) {
            return next(new AppError("Không có dữ liệu nào để cập nhật.", 400));
        }

        const [result] = await pool.query(
            "UPDATE users SET full_name = COALESCE(?, full_name), bio = COALESCE(?, bio), profile_picture = COALESCE(?, profile_picture) WHERE user_id = ?",
            [full_name, bio, profile_picture, userId]
        );

        if ((result as any).affectedRows === 0) {
            return next(new AppError("Người dùng không tồn tại hoặc không có thay đổi nào được thực hiện.", 404));
        }

        res.status(200).json({ success: true, message: "Cập nhật thông tin thành công." });
    } catch (error) {
        next(error);
    }
};