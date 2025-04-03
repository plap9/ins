import express, { Router } from "express";
import { authMiddleware, AuthRequest } from "../middlewares/authMiddleware";
import { invalidateCacheKey } from "../utils/cacheUtils";

const router: Router = express.Router();

// Xóa toàn bộ cache
router.get("/clear/all", authMiddleware, async (req: AuthRequest, res) => {
  try {
    await invalidateCacheKey("*");
    res.status(200).json({ success: true, message: "Đã xóa toàn bộ cache" });
  } catch (error) {
    console.error("Lỗi khi xóa cache:", error);
    res.status(500).json({ success: false, message: "Không thể xóa cache" });
  }
});

// Xóa cache liên quan đến posts
router.get("/clear/posts", authMiddleware, async (req: AuthRequest, res) => {
  try {
    // Xóa cache với pattern key bắt đầu bằng "posts:"
    await invalidateCacheKey("posts:*");
    
    // Trường hợp cache lưu theo user
    if (req.user?.user_id) {
      await invalidateCacheKey(`user:${req.user.user_id}:posts:*`);
    }
    
    res.status(200).json({ success: true, message: "Đã xóa cache posts" });
  } catch (error) {
    console.error("Lỗi khi xóa cache posts:", error);
    res.status(500).json({ success: false, message: "Không thể xóa cache posts" });
  }
});

export default router; 