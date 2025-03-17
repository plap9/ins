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
} from "../controllers/posts/commentController";

const router: Router = express.Router({ mergeParams: true });

router.post("/", authMiddleware, validate(createCommentSchema), createComment);
router.get("/comments", authMiddleware, getComments);
router.get("/replies/:id", authMiddleware, getReplies);
router.put("/:id", authMiddleware, validate(updateCommentSchema), updateComment);
router.delete("/:id", authMiddleware, deleteComment);
router.post("/:id/like", authMiddleware, likeComment);
router.delete("/:id/like", authMiddleware, unlikeComment);
router.get("/:id/likes", authMiddleware, getCommentLikes);

export default router;