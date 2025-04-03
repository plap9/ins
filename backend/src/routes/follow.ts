import express from "express";
import { 
  getFollowing, 
  getFollowers, 
  followUser, 
  unfollowUser, 
  getFollowStatus,
  getSuggestedUsers,
  getFollowCounts
} from "../controllers/follows/followController";
import { authMiddleware } from "../middlewares/authMiddleware";

const router = express.Router();

router.get("/following/:userId?", authMiddleware, getFollowing);
router.get("/followers/:userId?", authMiddleware, getFollowers);
router.post("/follow/:userId", authMiddleware, followUser);
router.delete("/unfollow/:userId", authMiddleware, unfollowUser);
router.get("/status/:userId", authMiddleware, getFollowStatus);
router.get("/suggested", authMiddleware, getSuggestedUsers);
router.get("/counts/:userId?", authMiddleware, getFollowCounts);

export default router;