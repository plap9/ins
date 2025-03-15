import { NextFunction, Request, Response } from "express";
import pool from "../../config/db";
import { RowDataPacket } from "mysql2";
import { AppError } from "../../middlewares/errorHandler";

export const verifyEmail = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { token } = req.query;

        if (!token) {
            throw new AppError("Thiếu token xác thực", 400);
        }

        const [users]: any = await pool.query<RowDataPacket[]>(
            "SELECT user_id FROM users WHERE verification_token = ? AND verification_expires > NOW()",
            [token]
        );

        if (users.length === 0) {
            throw new AppError("Token không hợp lệ hoặc đã hết hạn", 400);
        }

        const userId = users[0].user_id;

        await pool.query(
            `UPDATE users 
             SET email_verified = 1, 
                 verification_token = NULL, 
                 verification_expires = NULL, 
                 is_verified = 1
             WHERE user_id = ?`,
            [userId]
        );

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

        const [users]: any = await pool.query<RowDataPacket[]>(
            "SELECT user_id FROM users WHERE phone_number = ? AND phone_verification_code = ? AND phone_verification_expires > NOW()",
            [phone, otp]
        );

        if (users.length === 0) {
            throw new AppError("Mã OTP không hợp lệ hoặc đã hết hạn", 400);
        }

        const userId = users[0].user_id;

        await pool.query(
            `UPDATE users 
             SET phone_verified = 1, 
                 phone_verification_code = NULL, 
                 phone_verification_expires = NULL, 
                 is_verified = 1
             WHERE user_id = ?`,
            [userId]
        );

        res.json({ message: "Xác thực số điện thoại thành công!" });
    } catch (error) {
        next(error);
    }
};
