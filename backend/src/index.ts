import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import authRouter from "./routes/auth";
import post from "./routes/post";
import user from "./routes/user";
import { errorHandler, notFoundHandler } from "./middlewares/errorHandler";
import comment from "./routes/comment";

dotenv.config();
const app = express();
const PORT = parseInt(process.env.PORT || '5000', 10);

app.use(cors({
  origin: [
    'http://localhost:8081',       
    /\.exp\.host$/,                
    'http://192.168.1.31:19000',     
    'exp://192.168.1.31:19000'      
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
  console.log('Headers:', req.headers);
  console.log('Body:', req.body);
  next();
});

app.use("/auth", authRouter);  
app.use("/posts", post);
app.use("/users", user);
app.use("/comments", comment);

app.use(notFoundHandler);
app.use(errorHandler);

app.listen(PORT, '0.0.0.0', () => {
  console.log(` Server is running on:`);
  console.log(`- Local: http://localhost:${PORT}`);
  console.log(`- Network: http://${getIPAddress()}:${PORT}\n`);
});

function getIPAddress() {
  const interfaces = require('os').networkInterfaces();
  for (const name in interfaces) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost';
}