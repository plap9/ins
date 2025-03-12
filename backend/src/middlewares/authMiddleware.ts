import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

export interface AuthRequest extends Request {
    user?: { id: number }; 
}

export const authMiddleware = (req: AuthRequest, res: Response, next: NextFunction) => {
    const token = req.header("Authorization")?.split(" ")[1];

    if (!token) {
       res.status(401).json({ error: "Không có token, quyền truy cập bị từ chối" });
       return; 
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as { id: number };
        req.user = { id: decoded.id }; 

        next(); 
    } catch (error) {
        res.status(403).json({ error: "Token không hợp lệ" });
        return;
    }
};
