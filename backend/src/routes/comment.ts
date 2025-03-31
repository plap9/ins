import express, { Router } from "express";
import { authMiddleware, AuthRequest } from "../middlewares/authMiddleware";
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

const router: Router = express.Router({ mergeParams: true });

router.get("/", authMiddleware, (req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (typeof getComments === 'function') {
        getComments(req as AuthRequest, res, next)
             .catch(err => { 
                 next(err); 
             });
    } else {
        next(new Error('Lỗi cấu hình server nội bộ - Comment handler không tìm thấy'));
    }
    getComments(req as AuthRequest, res, next);
});

router.post("/", authMiddleware, validate(createCommentSchema), createComment);
router.get("/", authMiddleware, getComments);
router.get("/replies/:id", authMiddleware, getReplies);
router.put("/:id", authMiddleware, validate(updateCommentSchema), updateComment);
router.delete("/:id", authMiddleware, deleteComment);
router.post("/:id/like", authMiddleware, likeComment);
router.delete("/:id/like", authMiddleware, unlikeComment);
router.get("/:id/likes", authMiddleware, getCommentLikes);

export default router;