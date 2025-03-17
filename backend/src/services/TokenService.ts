import jwt from "jsonwebtoken";
import pool from "../config/db";
import { AppError } from "../middlewares/errorHandler";

class TokenService {
    private static readonly ACCESS_SECRET = process.env.JWT_SECRET as string;
    private static readonly REFRESH_SECRET = process.env.REFRESH_SECRET as string;
    private static readonly ACCESS_EXPIRY = "1h";
    private static readonly REFRESH_EXPIRY = "7d";

    public generateTokens(userId: number): { accessToken: string; refreshToken: string } {
        const accessToken = jwt.sign({ userId }, TokenService.ACCESS_SECRET, { expiresIn: TokenService.ACCESS_EXPIRY });
        const refreshToken = jwt.sign({ userId }, TokenService.REFRESH_SECRET, { expiresIn: TokenService.REFRESH_EXPIRY });

        return { accessToken, refreshToken };
    }

    public async storeRefreshToken(userId: number, refreshToken: string): Promise<void> {
        const connection = await pool.getConnection();
        try {
            await connection.query(
                "INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES (?, ?, DATE_ADD(NOW(), INTERVAL 7 DAY))",
                [userId, refreshToken]
            );
        } finally {
            connection.release();
        }
    }

    public async verifyRefreshToken(token: string): Promise<number> {
        if (!token) throw new AppError("Thiếu refresh token", 400);

        const [tokens]: any = await pool.query(
            "SELECT user_id FROM refresh_tokens WHERE token = ? LIMIT 1",
            [token]
        );

        if (tokens.length === 0) throw new AppError("Token không hợp lệ", 400);

        try {
            const decoded: any = jwt.verify(token, TokenService.REFRESH_SECRET);
            if (decoded.userId !== tokens[0].user_id) throw new AppError("Token không hợp lệ", 400);

            return decoded.userId;
        } catch (error) {
            throw new AppError("Token không hợp lệ", 400);
        }
    }

    public generateAccessToken(userId: number): string {
        return jwt.sign({ userId }, TokenService.ACCESS_SECRET, { expiresIn: TokenService.ACCESS_EXPIRY });
    }

    public async deleteRefreshToken(token: string): Promise<void> {
        await pool.query("DELETE FROM refresh_tokens WHERE token = ?", [token]);
    }

    public extractToken(authHeader?: string): string {
        if (!authHeader) throw new AppError("Không có token, quyền truy cập bị từ chối", 401);

        const token = authHeader.split(" ")[1];
        if (!token) throw new AppError("Token không hợp lệ", 401);

        return token;
    }

    public verifyAccessToken(token: string): { userId: number } {
        try {
            return jwt.verify(token, TokenService.ACCESS_SECRET) as { userId: number };
        } catch {
            throw new AppError("Token không hợp lệ hoặc đã hết hạn", 401);
        }
    }
}

export default new TokenService();
