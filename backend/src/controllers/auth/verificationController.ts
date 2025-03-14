import { NextFunction, Request, Response } from "express";
import pool from "../../config/db";

export const verifyEmail = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { token } = req.query;

        if (!token) {
            res.status(400).json({ error: "Thiếu token xác thực" });
            return;
        }

        const [users]: any = await pool.query(
            "SELECT id FROM users WHERE verification_token = ? AND verification_expires > NOW()",
            [token]
        );

        if (users.length === 0) {
            res.status(400).json({ error: "Token không hợp lệ hoặc đã hết hạn" });
            return;
        }

        const userId = users[0].id;

        await pool.query(
            "UPDATE users SET email_verified = 1, verification_token = NULL, verification_expires = NULL WHERE id = ?",
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
            res.status(400).json({ error: "Thiếu số điện thoại hoặc mã OTP" });
            return;
        }

        const [users]: any = await pool.query(
            "SELECT id FROM users WHERE phone_number = ? AND phone_verification_code = ? AND phone_verification_expires > NOW()",
            [phone, otp]
        );

        if (users.length === 0) {   
            res.status(400).json({ error: "Mã OTP không hợp lệ hoặc đã hết hạn" });
            return;
        }

        const userId = users[0].id;

        await pool.query(
            "UPDATE users SET phone_verified = 1, phone_verification_code = NULL, phone_verification_expires = NULL WHERE id = ?",
            [userId]
        );

        res.json({ message: "Xác thực số điện thoại thành công!" });
    } catch (error) {
        next(error);
    }
};