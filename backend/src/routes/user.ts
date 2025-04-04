import express, { Router } from "express";
import {
  getUserProfile,
  // searchUsers,
  // getUserPosts,
  // followUser,
  // unfollowUser,
  // getSuggestedUsers,
  // getUserFollowers,
  // getUserFollowing,
} from "../controllers/users/userProfileController";
import { getUsersBySearch, getUserSettings, updateUserProfile, updateUserSettings } from "../controllers/users/userUpdateController";
import { authMiddleware } from "../middlewares/authMiddleware";
import { validate } from "../middlewares/validate";
import { updateUserSchema } from "../validations/userValidation";
import { uploadAvatar } from "../middlewares/upload";
// import { invalidateUserCache } from "../controllers/user";

const router: Router = express.Router();

router.get("/:id", authMiddleware, getUserProfile);

router.put("/:id", authMiddleware, validate(updateUserSchema), uploadAvatar, updateUserProfile);

router.get("/search", authMiddleware, getUsersBySearch);

router.get("/:id/settings", authMiddleware, getUserSettings);
router.put("/:id/settings", authMiddleware, updateUserSettings);

// Tạm thời comment route này lại vì chưa có controller invalidateUserCache
// router.get('/:id/invalidate-cache', authMiddleware, invalidateUserCache);

export default router;