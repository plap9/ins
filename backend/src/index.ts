import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import authRouter from "./routes/auth";
import post from "./routes/post";
import user from "./routes/user";
import { errorHandler, notFoundHandler } from "./middlewares/errorHandler";

dotenv.config();
const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.use((req, res, next) => {
  console.log(` Request: ${req.method} ${req.originalUrl}`);
  next();
});

app.use("/auth", authRouter);
app.use("/posts", post);
app.use("/users", user);

app.use(notFoundHandler);

app.use(errorHandler);

app.listen(PORT, () => {
  console.log(` Server is running on port ${PORT}`);
});