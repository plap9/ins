import mysql from "mysql2";
import dotenv from "dotenv";
import { AppException } from "../middlewares/errorHandler";
import { ErrorCode } from "../types/errorCode";

dotenv.config();

const pool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "ins",
  port: Number(process.env.DB_PORT) || 3306,
  connectionLimit: 10,
  idleTimeout: 10000,
  enableKeepAlive: true,
  keepAliveInitialDelay: 10000
});

if (process.env.NODE_ENV !== 'test') {
  pool.getConnection((err, connection) => {
    if (err) {
      console.error(" Kết nối MySQL thất bại:", err.message);
      throw new AppException(
        "Không thể kết nối đến cơ sở dữ liệu", 
        ErrorCode.DB_CONNECTION_ERROR,
        503
      );
    } else {
      console.log(" Kết nối MySQL thành công!");
      connection.release();
    }
  });
}

export default pool.promise();