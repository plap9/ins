import express, { Router } from "express";
import { authMiddleware } from "../middlewares/authMiddleware";
import { 
    getFeed, 
    getSuggestedUsers, 
    getFollowingStatus 
} from "../controllers/posts/feedController";

const router: Router = express.Router();

// Feed routes
router.get("/", authMiddleware, getFeed);
router.get("/suggested-users", authMiddleware, getSuggestedUsers);
router.get("/following-status", authMiddleware, getFollowingStatus);

export default router; 