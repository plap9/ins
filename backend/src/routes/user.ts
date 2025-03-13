import express, { Router } from "express";
import { getUserProfile, updateUserProfile } from "../controllers/userController";
import { authMiddleware} from "../middlewares/authMiddleware";

const router: Router = express.Router();

router.get("/:id", authMiddleware, getUserProfile);

router.put("/:id", authMiddleware, updateUserProfile);

export default router;
