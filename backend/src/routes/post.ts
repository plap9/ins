import express, { Router } from "express";
import upload from "../middlewares/upload";
import { createPost, getPosts, deletePost } from "../controllers/postController";
import { authMiddleware } from "../middlewares/authMiddleware";

const router: Router = express.Router();

router.post("/", authMiddleware, upload.array("media", 10), createPost);
router.get("/", authMiddleware, getPosts);
router.delete("/:id", authMiddleware, deletePost);

export default router;
