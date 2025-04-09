import express, { Router } from "express";
import { authMiddleware } from "../middlewares/authMiddleware";
import { validate } from "../middlewares/validate";
import { uploadStoryMedia } from "../middlewares/upload";
import { createStory } from "../controllers/stories/storyController";
import { 
    getStories, 
    deleteStory, 
    viewStory, 
    replyToStory, 
    addStoryToHighlight,
    getPresignedUrl,
    getUserHighlights
} from "../controllers/stories/storyQueryController";
import { storySchema, replyStorySchema, addToHighlightSchema } from "../validations/storyValidation";

const router: Router = express.Router();

router.post("/", authMiddleware, validate(storySchema), uploadStoryMedia, createStory);
router.get("/", authMiddleware, getStories);
router.delete("/:id", authMiddleware, deleteStory);
router.post("/:id/view", authMiddleware, viewStory);
router.post("/:id/reply", authMiddleware, validate(replyStorySchema), replyToStory);
router.post("/:id/highlight", authMiddleware, validate(addToHighlightSchema), addStoryToHighlight);
router.get("/presigned-url", authMiddleware, getPresignedUrl);
router.get("/highlights", authMiddleware, getUserHighlights);

export default router;