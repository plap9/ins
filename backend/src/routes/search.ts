import express, { Router } from "express";
import { 
  searchUsers,
  getSearchHistory,
  deleteSearchHistoryItem,
  clearSearchHistory
} from "../controllers/search/searchController";
import { authMiddleware } from "../middlewares/authMiddleware";

const router: Router = express.Router();

router.get("/users", authMiddleware, searchUsers);

router.get("/history", authMiddleware, getSearchHistory);
router.delete("/history/:id", authMiddleware, deleteSearchHistoryItem);
router.delete("/history", authMiddleware, clearSearchHistory);

export default router; 