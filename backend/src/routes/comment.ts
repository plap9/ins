import express, { Router } from "express";
import { authMiddleware } from "../middlewares/authMiddleware";
import { validate } from "../middlewares/validate";
import { createCommentSchema, updateCommentSchema } from "../validations/commentValidation";
import {
    createComment,
    updateComment,
    deleteComment,
    getComments,
    getReplies,
    likeComment,
    unlikeComment,
    getCommentLikes
} from "../controllers/posts/comments/commentController";

const router: Router = express.Router();

router.post("/:id/comments", authMiddleware, validate(createCommentSchema), createComment);
router.get("/:id/comments", authMiddleware, getComments);
router.get("/comments/:id/replies", authMiddleware, getReplies);
router.put("/comments/:id", authMiddleware, validate(updateCommentSchema), updateComment);
router.delete("/comments/:id", authMiddleware, deleteComment);
router.post("/comments/:id/like", authMiddleware, likeComment);
router.delete("/comments/:id/like", authMiddleware, unlikeComment);
router.get("/comments/:id/likes", authMiddleware, getCommentLikes);

export default router;