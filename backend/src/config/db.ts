import mysql from "mysql2";
import dotenv from "dotenv";

dotenv.config();

const pool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "instagram_clone",
  port: Number(process.env.DB_PORT) || 3306,
  connectionLimit: 10,
});

pool.getConnection((err, connection) => {
  if (err) {
    console.error(" Lỗi kết nối MySQL:", err);
  } else {
    console.log(" Kết nối MySQL thành công!");
    connection.release();
  }
});

export default pool.promise();
