import express, { Router } from "express";
import { getUserProfile } from "../controllers/users/userProfileController";
import { updateUserProfile } from "../controllers/users/userUpdateController";
import { authMiddleware } from "../middlewares/authMiddleware";
import { validate } from "../middlewares/validate";
import { updateUserSchema } from "../validations/userValidation";

const router: Router = express.Router();

router.get("/:id", authMiddleware, getUserProfile);
router.put("/:id", authMiddleware, validate(updateUserSchema), updateUserProfile);

export default router;