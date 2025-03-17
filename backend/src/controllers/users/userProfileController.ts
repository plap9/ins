import { Request, Response, NextFunction } from 'express';
import UserService from '../../services/UserService';
import { AppError } from '../../middlewares/errorHandler';

export const getUserProfile = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const userId = parseInt(req.params.id, 10);
        if (isNaN(userId)) return next(new AppError("Tham số 'id' không hợp lệ.", 400));

        const user = await UserService.getUserById(userId);
        if (!user) return next(new AppError("Người dùng không tồn tại.", 404));

        res.status(200).json({ success: true, user });
    } catch (error) {
        next(error);
    }
};

export const updateUserProfile = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const userId = parseInt(req.params.id, 10);
        if (isNaN(userId)) return next(new AppError("Tham số 'id' không hợp lệ.", 400));

        const { full_name, bio, profile_picture } = req.body;
        if (!full_name && !bio && !profile_picture) 
            return next(new AppError("Không có dữ liệu nào để cập nhật.", 400));

        const isUpdated = await UserService.updateUserProfile(userId, full_name, bio, profile_picture);
        if (!isUpdated) return next(new AppError("Người dùng không tồn tại hoặc không có thay đổi nào.", 404));

        res.status(200).json({ success: true, message: "Cập nhật thông tin thành công." });
    } catch (error) {
        next(error);
    }
};
