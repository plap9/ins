import { Request, Response, NextFunction } from "express";
import { ErrorCode } from "../types/errorCode";
import { AppException } from "./errorHandler";

const requestCounts = new Map<string, { count: number; resetTime: number }>();

export const rateLimit = (windowMs: number = 60 * 1000, maxRequests: number = 100) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const key = `${ip}:${req.path}`;
    const now = Date.now();
    
    const requestData = requestCounts.get(key) || { count: 0, resetTime: now + windowMs };
    
    if (now > requestData.resetTime) {
      requestData.count = 1;
      requestData.resetTime = now + windowMs;
    } else {
      requestData.count += 1;
    }
    
    requestCounts.set(key, requestData);
    
    res.setHeader('X-RateLimit-Limit', maxRequests);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, maxRequests - requestData.count));
    res.setHeader('X-RateLimit-Reset', requestData.resetTime);
    
    if (requestData.count > maxRequests) {
      throw new AppException(
        'Đã vượt quá giới hạn yêu cầu. Vui lòng thử lại sau.',
        ErrorCode.RATE_LIMIT_EXCEEDED,
        429,
        { retryAfter: Math.ceil((requestData.resetTime - now) / 1000) }
      );
    }
    
    next();
  };
};

export const loginRateLimiter = rateLimit(15 * 60 * 1000, 5);
export const forgotPasswordRateLimiter = rateLimit(60 * 60 * 1000, 3); // 3 requests per hour
