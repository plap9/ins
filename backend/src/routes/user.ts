import express, { Router } from "express";
import {
  getUserProfile,
  getUserByUsername,
  getUserConnections
} from "../controllers/users/userProfileController";
import { getUsersBySearch, getUserSettings, updateUserProfile, updateUserSettings } from "../controllers/users/userUpdateController";
import { authMiddleware } from "../middlewares/authMiddleware";
import { validate } from "../middlewares/validate";
import { updateUserSchema } from "../validations/userValidation";
import { uploadAvatar } from "../middlewares/upload";

const router: Router = express.Router();

router.get("/connections", authMiddleware, getUserConnections);
router.get("/search", authMiddleware, getUsersBySearch);
router.get("/username/:username", authMiddleware, getUserByUsername);

router.get("/:id", authMiddleware, getUserProfile);
router.put("/:id", authMiddleware, validate(updateUserSchema), uploadAvatar, updateUserProfile);
router.get("/:id/settings", authMiddleware, getUserSettings);
router.put("/:id/settings", authMiddleware, updateUserSettings);

export default router;