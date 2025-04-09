import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import http from 'http';
import authRouter from "./routes/auth";
import post from "./routes/post";
import user from "./routes/user";
import { errorHandler, notFoundHandler } from "./middlewares/errorHandler";
import comment from "./routes/comment";
import cacheRoutes from "./routes/cache";
import story from "./routes/story";
import search from "./routes/search";
import messageRoutes from "./routes/messageRoutes";
import SocketService from './utils/socketService';
import { initializeSocketService as initMessageSocketService } from './controllers/messages/messageController';
import { initializeSocketService as initSocketHandlers, setupMessageSocketHandlers } from './controllers/messages/messageSocketController';

dotenv.config();
const app = express();
const PORT = parseInt(process.env.PORT || '5000', 10);

// Tạo HTTP server từ Express app
const server = http.createServer(app);

app.use(cors({
  origin: [
    'http://localhost:8081',       
    /\.exp\.host$/,                
    'http://192.168.1.31:19000',     
    'exp://192.168.1.31:19000',
    'http://localhost:5173',
    'http://localhost:3000',
    'http://localhost:19006',
    'exp://192.168.1.31:8081',
    /^http:\/\/192\.168\.\d+\.\d+:\d+$/,
    'http://192.168.63.181:5000'
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
app.use("/posts", post);
app.use("/auth", authRouter);
app.use("/users", user);
app.use("/comments", comment);
app.use("/cache", cacheRoutes);
app.use("/stories", story);
app.use("/search", search);
app.use("/messages", messageRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

// Khởi tạo SocketService và cấu hình chỉ khi là module chính
let socketService: SocketService | null = null;

// Không khởi động server nếu được import từ module khác
if (require.main === module) {
  // Khởi tạo socket service 
  socketService = new SocketService(server);

  // Thiết lập socket service cho các controller
  initMessageSocketService(socketService);
  initSocketHandlers(socketService);

  // Setup message handlers cho socket
  socketService.registerSocketHandler((socket, userId) => {
    setupMessageSocketHandlers(socket, userId);
  });

  // Khởi động HTTP server với hỗ trợ socket.io
  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server đang chạy với socket.io trên:`);
    console.log(`- Local: http://localhost:${PORT}`);
    console.log(`- Network: http://${getIPAddress()}:${PORT}\n`);
  });
}

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

export { app, server, socketService };