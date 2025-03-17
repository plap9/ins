import mysql, { Pool } from "mysql2/promise";
import dotenv from "dotenv";
import { AppError } from "../middlewares/errorHandler";

dotenv.config();

interface IDatabase {
  getPool(): Pool;
}

class MySQLDatabase implements IDatabase {
  private pool: Pool;

  constructor() {
    this.pool = mysql.createPool({
      host: process.env.DB_HOST || "localhost",
      user: process.env.DB_USER || "root",
      password: process.env.DB_PASSWORD || "",
      database: process.env.DB_NAME || "instagram_clone",
      port: Number(process.env.DB_PORT) || 3306,
      connectionLimit: 10,
    });

    this.testConnection();
  }

  private async testConnection(): Promise<void> {
    try {
      const connection = await this.pool.getConnection();
      console.log("Kết nối MySQL thành công!");
      connection.release();
    } catch (error) {
      console.error("Lỗi kết nối MySQL:", error);
      throw new AppError("Không thể kết nối đến cơ sở dữ liệu", 503);
    }
  }

  public getPool(): Pool {
    return this.pool;
  }
}

const databaseInstance = new MySQLDatabase();
export default databaseInstance.getPool();
