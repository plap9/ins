import { NextFunction, Request, Response } from "express";
import pool from "../../config/db";
import { RowDataPacket } from "mysql2";
import { AppError, ErrorCode } from "../../middlewares/errorHandler";

export const verifyAccount = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        const { contact, code, verificationType } = req.body;
        
        if (!contact || !code || !verificationType) {
            throw new AppError("Thiếu thông tin xác thực", 400, ErrorCode.MISSING_CREDENTIALS);
        }

        if (!['email', 'phone'].includes(verificationType)) {
            throw new AppError("Loại xác thực không hợp lệ", 400, ErrorCode.INVALID_OTP);
        }

        const verificationConfig = {
            email: {
                codeField: 'email_verification_code',
                expiresField: 'email_verification_expires',
                verifiedField: 'email_verified',
                contactField: 'email'
            },
            phone: {
                codeField: 'phone_verification_code',
                expiresField: 'phone_verification_expires',
                verifiedField: 'phone_verified',
                contactField: 'phone_number'
            }
        }[verificationType as 'email' | 'phone'];

        const [users]: any = await connection.query<RowDataPacket[]>(
            `SELECT user_id FROM users 
            WHERE ${verificationConfig.contactField} = ? 
            AND ${verificationConfig.codeField} = ? 
            AND ${verificationConfig.expiresField} > NOW() 
            FOR UPDATE`,
            [contact, code]
        );

        if (users.length === 0) {
            throw new AppError("Mã xác thực không hợp lệ hoặc đã hết hạn", 400, ErrorCode.INVALID_VERIFICATION);
        }

        const userId = users[0].user_id;

        await connection.query(
            `UPDATE users 
            SET ${verificationConfig.verifiedField} = 1,
                ${verificationConfig.codeField} = NULL,
                ${verificationConfig.expiresField} = NULL,
                is_verified = 1 
            WHERE user_id = ?`,
            [userId]
        );

        await connection.commit();
        res.json({ message: `Xác thực ${verificationType} thành công!` });
    } catch (error) {
        await connection.rollback();
        next(error);
    } finally {
        connection.release();
    }
};