import { Request, Response, NextFunction } from "express";
import AuthService from "../../services/AuthService";
import TokenService from "../../services/TokenService";
import { AppError } from "../../middlewares/errorHandler";

export const login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { login, password } = req.body;
    if (!login || !password) {
      throw new AppError("Vui lòng nhập đầy đủ thông tin", 400);
    }

    const user = await AuthService.getUserByLogin(login);
    if (!user) {
      throw new AppError("Tài khoản không tồn tại", 400);
    }

    if (user.is_verified === 0) {
      throw new AppError("Tài khoản chưa được xác thực", 400);
    }

    const isMatch = await AuthService.verifyPassword(password, user.password_hash);
    if (!isMatch) {
      throw new AppError("Sai mật khẩu", 400);
    }

    const { accessToken, refreshToken } = TokenService.generateTokens(user.user_id);

    await TokenService.storeRefreshToken(user.user_id, refreshToken);
    await AuthService.updateLastLogin(user.user_id);

    const { password_hash, ...userWithoutPassword } = user;
    res.json({ token: accessToken, refreshToken, user: userWithoutPassword });
  } catch (error) {
    next(error);
  }
};
