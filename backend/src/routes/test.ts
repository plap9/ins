import express from "express";
import pool from "../config/db";

const router = express.Router();

router.get("/test-db", async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT * FROM users LIMIT 5");
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: "Database connection failed" });
  }
});

export default router;
