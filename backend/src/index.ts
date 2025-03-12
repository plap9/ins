import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import authRouter from "./routes/auth";

dotenv.config();
const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.use("/auth", authRouter);

app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error("Global error:", err.stack);
    res.status(500).json({ message: "Something went wrong", error: err.message });
  });

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});