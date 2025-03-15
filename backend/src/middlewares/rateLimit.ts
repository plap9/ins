import rateLimit from "express-rate-limit";
import { AppError } from "../middlewares/errorHandler";

export const loginRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, 
    max: 5, 
    handler: (req, res, next) => {
        next(new AppError("Bạn đã thử đăng nhập quá nhiều lần. Vui lòng thử lại sau 15 phút.", 429));
    },
    standardHeaders: true,
    legacyHeaders: false,
});
