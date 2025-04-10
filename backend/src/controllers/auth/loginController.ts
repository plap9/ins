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
  id: number;
  email?: string;
  password?: string;
  username?: string;
  is_verified: number;
}

export const login = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email, username, password } = req.body;

      if ((!email && !username) || !password) {
        throw new AppException(
          "Vui lòng nhập đầy đủ thông tin",
          ErrorCode.MISSING_CREDENTIALS,
          400
        );
      }

      // Tìm kiếm người dùng theo email hoặc username
      const [rows] = await connection.query<User[]>(
        `SELECT id, IFNULL(email, '') AS email, password, username, is_verified, login_attempts, last_failed_login 
         FROM users 
         WHERE ${email ? "email = ?" : "username = ?"}`,
        [email || username]
      );

      if (rows.length === 0) {
        // Không tìm thấy người dùng
        throw new AppException(
          "Tài khoản không tồn tại",
          ErrorCode.ACCOUNT_NOT_FOUND,
          404,
          { field: "login" }
        );
      }

      const user = rows[0];

      // Kiểm tra số lần đăng nhập thất bại
      if (user.login_attempts >= 5) {
        const lastFailedLogin = new Date(user.last_failed_login).getTime();
        const now = Date.now();
        // 15 phút = 15 * 60 * 1000 milliseconds
        if (now - lastFailedLogin < 15 * 60 * 1000) {
          throw new AppException(
            "Quá nhiều lần đăng nhập thất bại, vui lòng thử lại sau",
            ErrorCode.TOO_MANY_ATTEMPTS,
            429,
            { field: "login", remainingTime: 15 * 60 * 1000 - (now - lastFailedLogin) }
          );
        }
      }

      // Kiểm tra xác thực
      if (user.is_verified === 0) {
        throw new AppException(
          "Tài khoản chưa được xác thực",
          ErrorCode.UNVERIFIED_ACCOUNT,
          403,
          { field: "login" }
        );
      }

      // Kiểm tra mật khẩu
      if (!user.password || !(await bcrypt.compare(password, user.password))) {
        // Cập nhật số lần đăng nhập thất bại
        await connection.execute(
          "UPDATE users SET login_attempts = login_attempts + 1, last_failed_login = NOW() WHERE id = ?",
          [user.id]
        );

        throw new AppException(
          "Sai mật khẩu",
          ErrorCode.INVALID_PASSWORD,
          401,
          { field: "password" }
        );
      }

      // Đặt lại số lần đăng nhập thất bại
      await connection.execute(
        "UPDATE users SET login_attempts = 0 WHERE id = ?",
        [user.id]
      );

      // Tạo JWT token
      const token = jwt.sign(
        { userId: user.id },
        process.env.JWT_SECRET || "your-secret-key",
        { expiresIn: "7d" }
      );

      const refreshToken = jwt.sign(
        { userId: user.id },
        process.env.JWT_REFRESH_SECRET || "your-refresh-secret-key",
        { expiresIn: "30d" }
      );

      res.json({
        status: "success",
        data: {
          token,
          refreshToken,
          user: {
            id: user.id,
            email: user.email,
            username: user.username,
          },
        },
      });
    } catch (error) {
      // Kiểm tra xem lỗi đã được xử lý chưa, nếu chưa thì ghi log và chuyển cho middleware xử lý lỗi
      if (!(error instanceof AppException)) {
        logError('Auth', error, `Lỗi không xác định khi đăng nhập: ${req.body.email || req.body.username}`);
      }
      next(error);
    }
  }
);