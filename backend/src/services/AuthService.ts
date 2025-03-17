import bcrypt from "bcryptjs";
import pool from "../config/db";
import { AppError } from "../middlewares/errorHandler";

class AuthService {
  public async getUserByLogin(login: string) {
    const connection = await pool.getConnection();
    try {
      const [users]: any = await connection.query(
        "SELECT * FROM users WHERE email = ? OR phone_number = ?",
        [login, login]
      );
      return users[0] || null;
    } finally {
      connection.release();
    }
  }

  public async verifyPassword(inputPassword: string, storedHash: string): Promise<boolean> {
    return bcrypt.compare(inputPassword, storedHash);
  }

  public async updateLastLogin(userId: number) {
    const connection = await pool.getConnection();
    try {
      await connection.query("UPDATE users SET last_login = NOW() WHERE user_id = ?", [userId]);
    } finally {
      connection.release();
    }
  }
}

export default new AuthService();
