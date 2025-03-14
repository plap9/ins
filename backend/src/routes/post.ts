import express, { Router } from "express";
import upload from "../middlewares/upload";
import { createPost } from "../controllers/posts/postController";
import { getPosts, deletePost } from "../controllers/posts/postQueryController";
import { authMiddleware } from "../middlewares/authMiddleware";
import { validate } from "../middlewares/validate";
import { postSchema } from "../validations/postValidation";

const router: Router = express.Router();

router.post("/", authMiddleware, validate(postSchema), upload.array("media", 10), createPost);
router.get("/", authMiddleware, getPosts);
router.delete("/:id", authMiddleware, deletePost);

export default router;