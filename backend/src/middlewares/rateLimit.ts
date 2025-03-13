import rateLimit from "express-rate-limit";

export const loginRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, 
    max: 5, 
    message: { error: "Bạn đã thử đăng nhập quá nhiều lần. Vui lòng thử lại sau 15 phút." },
    standardHeaders: true,
    legacyHeaders: false,
});

