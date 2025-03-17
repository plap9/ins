import { NextFunction, Request, Response } from "express";
import UserService from "../../services/UserService";
import { AppError } from "../../middlewares/errorHandler";

export const verifyEmail = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { token } = req.query;
        if (!token || typeof token !== "string") {
            throw new AppError("Thiếu token xác thực", 400);
        }

        await UserService.verifyEmailToken(token);
        res.json({ message: "Xác thực email thành công!" });
    } catch (error) {
        next(error);
    }
};

export const verifyPhone = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { phone, otp } = req.body;
        if (!phone || !otp) {
            throw new AppError("Thiếu số điện thoại hoặc mã OTP", 400);
        }

        await UserService.verifyPhoneOtp(phone, otp);
        res.json({ message: "Xác thực số điện thoại thành công!" });
    } catch (error) {
        next(error);
    }
};
