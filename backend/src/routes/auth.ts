import express, { Router, RequestHandler } from "express";
import { register } from "../controllers/registerController";
import { login } from "../controllers/loginController";
import { verifyEmail } from "../controllers/registerController";
import { verifyPhone } from "../controllers/registerController";

const router: Router = express.Router();

router.post("/register", register as RequestHandler);
router.post("/login", login as RequestHandler);
router.get("/verify-email", verifyEmail as RequestHandler);
router.post("/verify-phone", verifyPhone as RequestHandler);

export default router; 