import { Request, Response, NextFunction } from "express";
import { AppError } from "../middlewares/errorHandler";
import TokenService from "../services/TokenService";

export interface AuthRequest extends Request {
    user?: { user_id: number };
}

export class AuthMiddleware {
    public static authenticate(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const token = TokenService.extractToken(req.header("Authorization"));
            const decoded = TokenService.verifyAccessToken(token);
            req.user = { user_id: decoded.userId };
            next();
        } catch (error) {
            next(error);
        }
    }
}
