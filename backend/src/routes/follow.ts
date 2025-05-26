import express, { Router } from "express";
import { authMiddleware } from "../middlewares/authMiddleware";
import { 
    followUser, 
    unfollowUser, 
    getFollowers, 
    getFollowing, 
    checkFollowStatus,
    getSuggestedUsers,
    getFollowCounts
} from "../controllers/follows/followController";

const router: Router = express.Router();

// Follow/Unfollow routes
router.post("/:userId/follow", authMiddleware, followUser);
router.delete("/:userId/follow", authMiddleware, unfollowUser);

// Get followers/following lists
router.get("/:userId/followers", authMiddleware, getFollowers);
router.get("/:userId/following", authMiddleware, getFollowing);

// Check follow status
router.get("/:userId/status", authMiddleware, checkFollowStatus);

router.get("/suggested", authMiddleware, getSuggestedUsers);
router.get("/counts/:userId?", authMiddleware, getFollowCounts);

export default router;