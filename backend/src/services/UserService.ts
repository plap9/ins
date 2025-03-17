import pool from "../config/db";
import { RowDataPacket, ResultSetHeader } from "mysql2";

class UserService {
    private async executeQuery<T extends RowDataPacket[] | ResultSetHeader>(query: string, params: any[]): Promise<T> {
        const connection = await pool.getConnection();
        try {
            const [result] = await connection.query<T>(query, params);
            return result;
        } finally {
            connection.release();
        }
    }

    private async executeTransaction(queries: { query: string; params: any[] }[]): Promise<void> {
        const connection = await pool.getConnection();
        try {
            await connection.beginTransaction();
            for (const { query, params } of queries) {
                await connection.query(query, params);
            }
            await connection.commit();
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

    public async getUserByContact(contact: string) {
        const users = await this.executeQuery<RowDataPacket[]>(
            "SELECT * FROM users WHERE email = ? OR phone_number = ?",
            [contact, contact]
        );
        return users.length > 0 ? users[0] : null;
    }

    public async createUserWithEmail(username: string, email: string, hashedPassword: string, verificationToken: string) {
        await this.executeTransaction([
            {
                query: `INSERT INTO users (username, email, password_hash, verification_token, verification_expires, contact_type) 
                        VALUES (?, ?, ?, ?, DATE_ADD(NOW(), INTERVAL 3 MINUTE), 'email');`,
                params: [username, email, hashedPassword, verificationToken]
            }
        ]);
    }

    public async createUserWithPhone(username: string, phone: string, hashedPassword: string, otpCode: string) {
        await this.executeTransaction([
            {
                query: `INSERT INTO users (username, phone_number, password_hash, phone_verification_code, phone_verification_expires, contact_type) 
                        VALUES (?, ?, ?, ?, DATE_ADD(NOW(), INTERVAL 3 MINUTE), 'phone');`,
                params: [username, phone, hashedPassword, otpCode]
            }
        ]);
    }

    public async verifyEmailToken(token: string): Promise<void> {
        await this.executeTransaction([
            {
                query: `UPDATE users 
                        SET email_verified = 1, 
                            verification_token = NULL, 
                            verification_expires = NULL, 
                            is_verified = 1
                        WHERE verification_token = ? AND verification_expires > NOW();`,
                params: [token]
            }
        ]);
    }

    public async verifyPhoneOtp(phone: string, otp: string): Promise<void> {
        await this.executeTransaction([
            {
                query: `UPDATE users 
                        SET phone_verified = 1, 
                            phone_verification_code = NULL, 
                            phone_verification_expires = NULL, 
                            is_verified = 1
                        WHERE phone_number = ? AND phone_verification_code = ? AND phone_verification_expires > NOW();`,
                params: [phone, otp]
            }
        ]);
    }

    public async getUserById(userId: number) {
        const users = await this.executeQuery<RowDataPacket[]>(
            `SELECT user_id, username, email, full_name, bio, profile_picture, phone_number, 
                    is_private, is_verified, website, gender, date_of_birth, created_at, 
                    updated_at, last_login, status 
             FROM users WHERE user_id = ?`, 
            [userId]
        );
        return users.length > 0 ? users[0] : null;
    }

    public async updateUserProfile(userId: number, full_name?: string, bio?: string, profile_picture?: string): Promise<boolean> {
        const result = await this.executeQuery<ResultSetHeader>(
            `UPDATE users SET 
                full_name = COALESCE(?, full_name), 
                bio = COALESCE(?, bio), 
                profile_picture = COALESCE(?, profile_picture) 
             WHERE user_id = ?`,
            [full_name, bio, profile_picture, userId]
        );
        return result.affectedRows > 0;
    }
}

export default new UserService();
