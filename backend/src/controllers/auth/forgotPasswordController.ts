import { NextFunction, Request, Response } from "express";
import pool from "../../config/db";
import { AppError } from "../../middlewares/errorHandler";
import { ErrorCode } from "../../types/errorCode"
import { emailQueue, redisClient, smsQueue } from "../../config/redis";
import validator from "validator"
export const forgotPassword = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const connection = await pool.getConnection();
    try {
        const { contact } = req.body;
        const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact);
        const isPhone = /^\+84[3|5|7|8|9]\d{8}$/.test(contact);

        if (!contact) {
            throw new AppError("Vui lòng nhập email hoặc số điện thoại", 400, ErrorCode.MISSING_CREDENTIALS, "contact");
        }


        if (!isEmail && !isPhone) {
            throw new AppError("Định dạng email hoặc số điện thoại không hợp lệ", 400, ErrorCode.INVALID_FORMAT, "contact");
        }

        const ipAddress = req.ip;
        const resetCount = await redisClient.get(`reset_password_count:${ipAddress}`);
        if (resetCount && parseInt(resetCount) >= 5) {
            throw new AppError("Quá nhiều lần yêu cầu, vui lòng thử lại sau", 429, ErrorCode.TOO_MANY_ATTEMPTS);
        }

        const [users]: any = await connection.query(
            "SELECT * FROM users WHERE email = ? OR phone_number = ?",
            [contact, contact]
        );

        if (users.length === 0) {
            throw new AppError("Tài khoản không tồn tại", 400, ErrorCode.ACCOUNT_NOT_FOUND, "contact");
        }

        const user = users[0];
        const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
        const resetExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 phút

        await connection.beginTransaction();

        if (isEmail) {
            await connection.query(
                `UPDATE users SET 
                 reset_password_code = ?, 
                 reset_password_expires = ? 
                 WHERE user_id = ?`,
                [resetCode, resetExpires, user.user_id]
            );

            await connection.commit();

            await emailQueue.add('send-reset-password-email', {
                email: contact,
                code: resetCode
            }, {
                attempts: 3,
                backoff: {
                    type: 'exponential',
                    delay: 2000
                }
            });

            await redisClient.incr(`reset_password_count:${ipAddress}`);
            await redisClient.expire(`reset_password_count:${ipAddress}`, 60 * 60);

            res.json({ 
                message: "Vui lòng kiểm tra email để lấy mã đặt lại mật khẩu",
                resetType: "email",
                contact: contact
            });
        } else {
            await connection.query(
                `UPDATE users SET 
                 reset_password_code = ?, 
                 reset_password_expires = ? 
                 WHERE user_id = ?`,
                [resetCode, resetExpires, user.user_id]
            );

            await connection.commit();
            
            await smsQueue.add('send-reset-password-sms', {
                phone: contact,
                code: resetCode
            }, {
                attempts: 3,
                backoff: {
                    type: 'exponential',
                    delay: 2000
                }
            });

            await redisClient.incr(`reset_password_count:${ipAddress}`);
            await redisClient.expire(`reset_password_count:${ipAddress}`, 60 * 60);

            res.json({ 
                message: "Vui lòng kiểm tra tin nhắn SMS để lấy mã đặt lại mật khẩu",
                resetType: "phone",
                contact: contact
            });
        }
    } catch (error) {
        await connection.rollback();
        next(error);
    } finally {
        connection.release();
    }
};

export const resetPassword = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const connection = await pool.getConnection();
    try {
        const { contact, code, newPassword } = req.body;

        if (!contact || !code || !newPassword) {
            throw new AppError("Vui lòng nhập đầy đủ thông tin", 400, ErrorCode.MISSING_CREDENTIALS);
        }

        await connection.beginTransaction();

        const [users]: any = await connection.query(
            "SELECT * FROM users WHERE (email = ? OR phone_number = ?) AND reset_password_code = ? AND reset_password_expires > NOW() FOR UPDATE",
            [contact, contact, code]
        );
        console.log('Database response:', users[0]);

        if (users.length === 0) {
            throw new AppError("Mã xác thực không hợp lệ hoặc đã hết hạn", 400, ErrorCode.INVALID_VERIFICATION);
        }

        const user = users[0];
        const bcrypt = require('bcryptjs');
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        await connection.query(
            `UPDATE users SET 
             password_hash = ?,
             reset_password_code = NULL,
             reset_password_expires = NULL
             WHERE user_id = ?`,
            [hashedPassword, user.user_id]
        );

        await connection.query(
            "DELETE FROM refresh_tokens WHERE user_id = ?",
            [user.user_id]
        );

        await connection.commit();

        res.json({ message: "Đặt lại mật khẩu thành công" });
    } catch (error) {
        await connection.rollback();
        next(error);
    } finally {
        connection.release();
    }
};