import express, { Router, RequestHandler } from "express";
import { register } from "../controllers/auth/registerController";
import { login } from "../controllers/auth/loginController";
import { verifyAccount } from "../controllers/auth/verificationController";

const router: Router = express.Router();

router.post("/register", register as RequestHandler);
router.post("/login", login as RequestHandler);
router.post("/verify-account", verifyAccount as RequestHandler);

export default router;
