import RateLimiterService from "../services/RateLimiterService";

export const loginRateLimiter = RateLimiterService.createLimiter(
    15 * 60 * 1000, 
    5, 
    "Bạn đã thử đăng nhập quá nhiều lần. Vui lòng thử lại sau 15 phút."
);
