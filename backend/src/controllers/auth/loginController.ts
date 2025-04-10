import { Request, Response, NextFunction } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import connection from "../../config/db";
import { RowDataPacket } from "mysql2";
import { ErrorCode } from "../../types/errorCode";
import { catchAsync } from "../../middlewares/errorHandler";
import { AppException } from "../../middlewares/errorHandler";
import { logError } from "../../utils/errorUtils";

interface User extends RowDataPacket {
  user_id: number;
  username: string;
  email?: string;
  phone_number?: string;
  password_hash: string;
  full_name?: string;
  bio?: string;
  profile_picture?: string;
  is_private: number;
  is_verified: number;
  website?: string;
  gender?: 'male' | 'female' | 'other';
  date_of_birth?: Date;
  created_at: Date;
  updated_at: Date;
  last_login?: Date;
  status: 'active' | 'deactivated' | 'banned';
  email_verification_code?: string;
  email_verification_expires?: Date;
  phone_verification_code?: string;
  phone_verification_expires?: Date;
  email_verified: number;
  phone_verified: number;
  contact_type?: 'email' | 'phone';
  privacy_user: 'public' | 'private';
  reset_password_code: string;
  reset_password_expires?: Date;
}

export const login = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { login, password } = req.body;
      const userAgent = req.headers['user-agent'] || 'Unknown Device';
      const ipAddress = req.ip || req.socket.remoteAddress || 'Unknown IP';

      if (!login || !password) {
        throw new AppException(
          "Vui lòng nhập đầy đủ thông tin",
          ErrorCode.MISSING_CREDENTIALS,
          400
        );
      }

      const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(login);
      const isPhone = /^\+?\d{10,15}$/.test(login);
      
      let query = '';
      if (isEmail) {
        query = "SELECT * FROM users WHERE email = ?";
      } else if (isPhone) {
        query = "SELECT * FROM users WHERE phone_number = ?";
      } else {
        query = "SELECT * FROM users WHERE username = ?";
      }
      
      const [rows] = await connection.query<User[]>(query, [login]);

      if (rows.length === 0) {
        throw new AppException(
          "Tài khoản không tồn tại",
          ErrorCode.ACCOUNT_NOT_FOUND,
          404,
          { field: "login" }
        );
      }

      const user = rows[0];

      if (user.is_verified === 0) {
        throw new AppException(
          "Tài khoản chưa được xác thực",
          ErrorCode.UNVERIFIED_ACCOUNT,
          403,
          { field: "login" }
        );
      }

      if (user.status !== 'active') {
        throw new AppException(
          user.status === 'banned' ? "Tài khoản đã bị khóa" : "Tài khoản đã bị vô hiệu hóa",
          ErrorCode.ACCOUNT_DEACTIVATED,
          403,
          { field: "login" }
        );
      }

      if (!user.password_hash || !(await bcrypt.compare(password, user.password_hash))) {
        await connection.execute(
          "INSERT INTO login_history (user_id, ip_address, device_info, status) VALUES (?, ?, ?, 'failed')",
          [user.user_id, ipAddress, userAgent]
        );
        
        throw new AppException(
          "Sai mật khẩu",
          ErrorCode.INVALID_PASSWORD,
          401,
          { field: "password" }
        );
      }

      const token = jwt.sign(
        { userId: user.user_id },
        process.env.JWT_SECRET || "your-secret-key",
        { expiresIn: "7d" }
      );

      const refreshToken = jwt.sign(
        { userId: user.user_id },
        process.env.JWT_REFRESH_SECRET || "your-refresh-secret-key",
        { expiresIn: "30d" }
      );

      await connection.execute(
        "UPDATE users SET last_login = NOW() WHERE user_id = ?",
        [user.user_id]
      );

      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30);

      await connection.execute(
        "INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES (?, ?, ?)",
        [user.user_id, refreshToken, expiresAt]
      );

      await connection.execute(
        "INSERT INTO login_history (user_id, ip_address, device_info, status, session_token) VALUES (?, ?, ?, 'success', ?)",
        [user.user_id, ipAddress, userAgent, token]
      );

      res.json({
        status: "success",
        data: {
          token,
          refreshToken,
          user: {
            user_id: user.user_id,
            email: user.email,
            username: user.username,
            full_name: user.full_name,
            profile_picture: user.profile_picture,
          },
        },
      });
    } catch (error) {
      if (!(error instanceof AppException)) {
        logError('Auth', error, `Lỗi không xác định khi đăng nhập: ${req.body.login}`);
      }
      next(error);
    }
  }
);