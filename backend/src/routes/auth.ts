import express, { Router, RequestHandler } from "express";
import { register } from "../controllers/registerController";
import { login, refreshToken } from "../controllers/loginController";
import { verifyEmail } from "../controllers/registerController";
import { verifyPhone } from "../controllers/registerController";
import { logout } from "../controllers/logoutController";
import { loginRateLimiter } from "../middlewares/rateLimit";
import { validate } from "../middlewares/validate";
import { loginSchema } from "../validations/authValidation";

const router: Router = express.Router();
const handleRegister: RequestHandler = (req, res, next) => register(req, res, next);
const handleLogin: RequestHandler = (req, res, next) => login(req, res, next);
const handleVerifyEmail: RequestHandler = (req, res, next) => verifyEmail(req, res, next);
const handleVerifyPhone: RequestHandler = (req, res, next) => verifyPhone(req, res, next);
const handleLogout: RequestHandler = (req, res, next) => logout(req, res, next);
const handleRefreshToken: RequestHandler = (req, res, next) => refreshToken(req, res, next);


router.post("/register", register as RequestHandler);
router.post("/login", loginRateLimiter, validate(loginSchema), login as RequestHandler);
router.get("/verify-email", verifyEmail as RequestHandler);
router.post("/verify-phone", verifyPhone as RequestHandler);
router.post("/logout", logout as RequestHandler);
router.post("/refresh-token", refreshToken as RequestHandler);

export default router; 