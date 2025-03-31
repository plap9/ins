import express, { Router } from "express";
import { login } from "../controllers/auth/loginController";
import { register } from "../controllers/auth/registerController";
import { verifyAccount } from "../controllers/auth/verificationController";
import { logout, refreshToken } from "../controllers/auth/tokenController";
import { loginRateLimiter } from "../middlewares/rateLimit";
import { validate } from "../middlewares/validate";
import { loginSchema, registerSchema, verifyPhoneSchema, verifySchema , resendVerificationSchema, forgotPasswordSchema, resetPasswordSchema} from "../validations/authValidation";
import { forgotPassword, resetPassword } from "../controllers/auth/forgotPasswordController";
import { resendVerification } from "../controllers/auth/resendVerificationController";

const router: Router = express.Router();

router.post("/register", validate(registerSchema), register);
router.post("/login", loginRateLimiter, validate(loginSchema), login);
// router.post("/verify-email", verifyAccount);
// router.post("/verify-phone", validate(verifyPhoneSchema), verifyAccount);
router.post("/verify", validate(verifySchema), verifyAccount)
router.post("/logout", logout);
router.post("/refresh-token", refreshToken);
router.post("/forgot-password", validate(forgotPasswordSchema), forgotPassword);
router.post("/reset-password", validate(resetPasswordSchema), resetPassword);

router.post("/resend-verification", resendVerification);

export default router;
