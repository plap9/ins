import express, { Router } from "express";
import {
  getUserProfile,
//   searchUsers,
//   followUser,
//   unfollowUser,
//   getSuggestedUsers,
//   getUserFollowers,
//   getUserFollowing,
} from "../controllers/users/userProfileController";
import { getUsersBySearch, getUserSettings, updateUserProfile, updateUserSettings } from "../controllers/users/userUpdateController";
import { authMiddleware } from "../middlewares/authMiddleware";
import { validate } from "../middlewares/validate";
import { updateUserSchema } from "../validations/userValidation";
import { uploadAvatar } from "../middlewares/upload";

const router: Router = express.Router();

router.get("/:id", authMiddleware, getUserProfile);

router.put("/:id", authMiddleware, uploadAvatar, validate(updateUserSchema), updateUserProfile);

router.get("/search", authMiddleware, getUsersBySearch);

router.get("/:id/settings", authMiddleware, getUserSettings);
router.put("/:id/settings", authMiddleware, updateUserSettings);

// router.post("/follow/:id", authMiddleware, followUser);

// router.delete("/follow/:id", authMiddleware, unfollowUser);

// router.get("/suggested", authMiddleware, getSuggestedUsers);

// router.get("/:id/followers", authMiddleware, getUserFollowers);

// router.get("/:id/following", authMiddleware, getUserFollowing);

export default router;