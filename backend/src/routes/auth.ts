import express, { Router } from "express";
import { login } from "../controllers/auth/loginController";
import { register } from "../controllers/auth/registerController";
import { verifyEmail, verifyPhone } from "../controllers/auth/verificationController";
import { logout, refreshToken } from "../controllers/auth/tokenController";
import { loginRateLimiter } from "../middlewares/rateLimit";
import { validate } from "../middlewares/validate";
import { loginSchema, registerSchema, verifyPhoneSchema } from "../validations/authValidation";

const router: Router = express.Router();

router.post("/register", validate(registerSchema), register);
router.post("/login", loginRateLimiter, validate(loginSchema), login);
router.post("/verify-email", verifyEmail);
router.post("/verify-phone", validate(verifyPhoneSchema), verifyPhone);
router.post("/logout", logout);
router.post("/refresh-token", refreshToken);

export default router;