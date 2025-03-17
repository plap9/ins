import rateLimit from "express-rate-limit";
import { AppError } from "../middlewares/errorHandler";

class RateLimiterService {
    public static createLimiter(windowMs: number, max: number, errorMessage: string) {
        return rateLimit({
            windowMs,
            max,
            handler: (req, res, next) => {
                next(new AppError(errorMessage, 429));
            },
            standardHeaders: true,
            legacyHeaders: false,
        });
    }
}

export default RateLimiterService;
