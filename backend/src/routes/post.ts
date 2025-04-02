import express, { Router } from "express";
import upload, { uploadPostMedia } from "../middlewares/upload";
import { createPost } from "../controllers/posts/postController";
import { getPosts, deletePost } from "../controllers/posts/postQueryController";
import { authMiddleware } from "../middlewares/authMiddleware";
import { validate } from "../middlewares/validate";
import { postSchema } from "../validations/postValidation";
import { likePost, unlikePost, getPostLikes } from "../controllers/posts/like/likeController";
import comment from "./comment";

const router: Router = express.Router();

router.use("/:id/comments", comment);
router.post("/", authMiddleware, validate(postSchema), uploadPostMedia, createPost);
router.get("/", authMiddleware, getPosts);
router.delete("/:id", authMiddleware, deletePost);

router.post("/:id/like", authMiddleware, likePost);
router.delete("/:id/like", authMiddleware, unlikePost);
router.get("/:id/likes", authMiddleware, getPostLikes);
export default router;