import { NextFunction, Request, Response } from "express";
import { AppError } from "../../middlewares/errorHandler";
import TokenService from "../../services/TokenService";

export const refreshToken = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { refreshToken } = req.body;
        if (!refreshToken) {
            throw new AppError("Thiếu refresh token", 400);
        }

        const userId = await TokenService.verifyRefreshToken(refreshToken);

        const accessToken = await TokenService.generateAccessToken(userId);
        const newRefreshToken = TokenService.generateTokens(userId).refreshToken;

        await TokenService.deleteRefreshToken(refreshToken);
        await TokenService.storeRefreshToken(userId, newRefreshToken);

        res.json({ accessToken, refreshToken: newRefreshToken });
    } catch (error) {
        next(error);
    }
};

export const logout = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { refreshToken } = req.body;
        if (!refreshToken) {
            throw new AppError("Không có refresh token", 400);
        }

        await TokenService.deleteRefreshToken(refreshToken);
        res.json({ message: "Đăng xuất thành công" });
    } catch (error) {
        next(error);
    }
};
