import { NextFunction, Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import pool from "../../config/db";
import { AppError } from "../../middlewares/errorHandler";
import { ErrorCode } from "../../types/errorCode";
import { redisClient, cacheUtils } from "../../config/redis";

export const login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const connection = await pool.getConnection();
    try {
        const { login, password } = req.body;

        if (!login && !password) {
            throw new AppError("Vui lòng nhập đầy đủ thông tin", 400, ErrorCode.MISSING_CREDENTIALS);
        } else if (!login) {
            throw new AppError("Vui lòng nhập tài khoản", 400, ErrorCode.MISSING_CREDENTIALS, "login");
        } else if (!password) {
            throw new AppError("Vui lòng nhập mật khẩu", 400, ErrorCode.MISSING_CREDENTIALS, "password");
        }

        const loginAttempts = await redisClient.get(`login_attempts:${login}`);
        if (loginAttempts && parseInt(loginAttempts) >= 5) {
            throw new AppError("Quá nhiều lần đăng nhập thất bại, vui lòng thử lại sau", 429, ErrorCode.TOO_MANY_ATTEMPTS, "login");
        }

        const [users]: any = await connection.query(
            "SELECT * FROM users WHERE email = ? OR phone_number = ?",
            [login, login]
        );

        const user = users[0];

        if (!user) {
            await redisClient.incr(`login_attempts:${login}`);
            await redisClient.expire(`login_attempts:${login}`, 60 * 15);
            throw new AppError("Tài khoản không tồn tại", 400, ErrorCode.ACCOUNT_NOT_FOUND, "login");
        }

        if (user.is_verified === 0) {
            throw new AppError("Tài khoản chưa được xác thực", 400, ErrorCode.UNVERIFIED_ACCOUNT, "login");
        }

        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) {
            await redisClient.incr(`login_attempts:${login}`);
            await redisClient.expire(`login_attempts:${login}`, 60 * 15);
            throw new AppError("Sai mật khẩu", 400, ErrorCode.INVALID_PASSWORD, "password");
        }

        await redisClient.del(`login_attempts:${login}`);

        const userId = user.user_id;
        const token = jwt.sign({ userId }, process.env.JWT_SECRET as string, { expiresIn: "1h" });
        const refreshToken = jwt.sign({ userId }, process.env.REFRESH_SECRET as string, { expiresIn: "7d" });

        await connection.beginTransaction(); 

        await connection.query(
            "INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES (?, ?, DATE_ADD(NOW(), INTERVAL 7 DAY))",
            [userId, refreshToken]
        );

        await cacheUtils.storeRefreshToken(userId, refreshToken);

        await connection.query("UPDATE users SET last_login = NOW() WHERE user_id = ?", [userId]);

        await connection.commit(); 

        const { password_hash, ...userWithoutPassword } = user;

        await cacheUtils.storeRefreshToken(userId, refreshToken);

        res.json({ token, refreshToken, user: userWithoutPassword });
    } catch (error) {
        await connection.rollback(); 
        next(error);
    } finally {
        connection.release();
    }
};