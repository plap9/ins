import { NextFunction, Request, Response } from 'express';
import pool from '../../config/db';
import { AppError } from '../../middlewares/errorHandler';
import { ErrorCode } from '../../types/errorCode';
import { 
  cacheUserProfile, 
  getCachedUserProfile, 
  invalidateUserProfileCache, 
  cacheData, 
  getCachedData, 
  invalidateCacheKey 
} from '../../utils/cacheUtils';
import { RowDataPacket } from 'mysql2';

interface UserUpdateFields {
    full_name?: string;
    bio?: string;
    profile_picture?: string;
    phone_number?: string;
    website?: string;
    gender?: string;
    date_of_birth?: string;
    is_private?: boolean;
    [key: string]: any; 
  }
  
  interface UserSettingsFields {
    notification_preferences?: object;
    privacy_settings?: object;
    language?: string;
    theme?: string;
    two_factor_auth_enabled?: boolean;
    [key: string]: any; 
  }

export const updateUserProfile = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const userId = parseInt(req.params.id, 10);
        if (isNaN(userId)) {
            return next(new AppError("Tham số 'user_id' không hợp lệ.", 400, ErrorCode.VALIDATION_ERROR));
        }

        const { full_name, bio, profile_picture, phone_number, website, gender, date_of_birth, is_private } = req.body;
        
        const updateFields: UserUpdateFields = { 
            full_name, 
            bio, 
            profile_picture, 
            phone_number, 
            website, 
            gender, 
            date_of_birth, 
            is_private 
        };
        
        const fieldsToUpdate = Object.keys(updateFields).filter(key => updateFields[key] !== undefined);
        
        if (fieldsToUpdate.length === 0) {
            return next(new AppError("Không có dữ liệu nào để cập nhật.", 400, ErrorCode.USER_NO_UPDATE_DATA));
        }

        let updateQuery = "UPDATE users SET ";
        const queryParams = [];
        
        fieldsToUpdate.forEach((field, index) => {
            updateQuery += `${field} = ?`;
            queryParams.push(updateFields[field]);
            
            if (index < fieldsToUpdate.length - 1) {
                updateQuery += ", ";
            }
        });
        
        updateQuery += " WHERE user_id = ?";
        queryParams.push(userId);

        const [result] = await pool.query(updateQuery, queryParams);

        if ((result as any).affectedRows === 0) {
            return next(new AppError("Người dùng không tồn tại hoặc không có thay đổi nào được thực hiện.", 404, ErrorCode.USER_NOT_FOUND));
        }

        await invalidateUserProfileCache(userId);

        const [updatedUser] = await pool.query<RowDataPacket[]>(
            `SELECT
                user_id,
                username,
                email,
                full_name,
                bio,
                profile_picture,
                phone_number,
                is_private,
                is_verified,
                website,
                gender,
                date_of_birth,
                created_at,
                updated_at,
                last_login,
                status
            FROM users
            WHERE user_id = ?`,
            [userId]
        );

        if (updatedUser.length > 0) {
            await cacheUserProfile(userId, updatedUser[0]);
        }

        res.status(200).json({ 
            success: true, 
            message: "Cập nhật thông tin thành công.",
            user: updatedUser[0]
        });
    } catch (error) {
        next(error);
    }
};

export const getUsersBySearch = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { query } = req.query;
        const page = parseInt(req.query.page as string || '1', 10);
        const limit = parseInt(req.query.limit as string || '20', 10);
        const offset = (page - 1) * limit;

        if (!query || typeof query !== 'string') {
            return next(new AppError("Tham số tìm kiếm không hợp lệ.", 400, ErrorCode.USER_SEARCH_INVALID));
        }

        const cacheKey = `search:${query.toLowerCase()}:page:${page}:limit:${limit}`;
        const cachedResults = await getCachedData(cacheKey);
        
        if (cachedResults) {
            res.status(200).json({ 
                success: true, 
                users: cachedResults,
                page,
                limit,
                source: 'cache'
            });
            return;
        }

        const searchTerm = `%${query}%`;
        const [users] = await pool.query<RowDataPacket[]>(
            `SELECT
                user_id,
                username,
                full_name,
                profile_picture,
                is_verified,
                bio
            FROM users
            WHERE 
                username LIKE ? OR
                full_name LIKE ?
            LIMIT ? OFFSET ?`,
            [searchTerm, searchTerm, limit, offset]
        );

        const [countResult] = await pool.query<RowDataPacket[]>(
            `SELECT COUNT(*) as total
            FROM users
            WHERE 
                username LIKE ? OR
                full_name LIKE ?`,
            [searchTerm, searchTerm]
        );
        
        const total = countResult[0].total;

        await cacheData(cacheKey, users);

        res.status(200).json({
            success: true,
            users,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
            source: 'database'
        });
    } catch (error) {
        next(error);
    }
};

export const getUserSettings = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const userId = parseInt(req.params.id, 10);
        if (isNaN(userId)) {
            return next(new AppError("Tham số 'id' không hợp lệ.", 400));
        }

        const cacheKey = `settings:${userId}`;
        const cachedSettings = await getCachedData(cacheKey);

        if (cachedSettings) {
            res.status(200).json({ 
                success: true, 
                settings: cachedSettings,
                source: 'cache'
            });
            return;
        }

        const [settings] = await pool.query<RowDataPacket[]>(
            `SELECT
                notification_preferences,
                privacy_settings,
                language,
                theme,
                two_factor_auth_enabled
            FROM user_settings
            WHERE user_id = ?`,
            [userId]
        );

        if (settings.length === 0) {
            return next(new AppError("Cài đặt người dùng không tồn tại.", 404, ErrorCode.USER_SETTINGS_NOT_FOUND));
        }

        await cacheData(cacheKey, settings[0]);

        res.status(200).json({ 
            success: true, 
            settings: settings[0],
            source: 'database'
        });
    } catch (error) {
        next(error);
    }
};

export const updateUserSettings = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const userId = parseInt(req.params.id, 10);
        if (isNaN(userId)) {
            return next(new AppError("Tham số 'id' không hợp lệ.", 400));
        }

        const { notification_preferences, privacy_settings, language, theme, two_factor_auth_enabled } = req.body;
        
        const updateFields: UserSettingsFields = { 
            notification_preferences, 
            privacy_settings, 
            language, 
            theme, 
            two_factor_auth_enabled 
        };
        
        const fieldsToUpdate = Object.keys(updateFields).filter(key => updateFields[key] !== undefined);
        
        if (fieldsToUpdate.length === 0) {
            return next(new AppError("Không có dữ liệu nào để cập nhật.", 400, ErrorCode.USER_NO_UPDATE_DATA));
        }

        let updateQuery = "UPDATE user_settings SET ";
        const queryParams = [];
        
        fieldsToUpdate.forEach((field, index) => {
            updateQuery += `${field} = ?`;
            queryParams.push(updateFields[field]);
            
            if (index < fieldsToUpdate.length - 1) {
                updateQuery += ", ";
            }
        });
        
        updateQuery += " WHERE user_id = ?";
        queryParams.push(userId);

        const [result] = await pool.query(updateQuery, queryParams);

        if ((result as any).affectedRows === 0) {
            const [checkUser] = await pool.query<RowDataPacket[]>(
                "SELECT user_id FROM users WHERE user_id = ?",
                [userId]
            );

            if (checkUser.length === 0) {
                return next(new AppError("Người dùng không tồn tại.", 404, ErrorCode.USER_NOT_FOUND));
            }

            const insertFields = fieldsToUpdate.join(', ');
            const insertPlaceholders = fieldsToUpdate.map(() => '?').join(', ');
            
            await pool.query(
                `INSERT INTO user_settings (user_id, ${insertFields}) 
                VALUES (?, ${insertPlaceholders})`,
                [userId, ...fieldsToUpdate.map(field => updateFields[field])]
            );
        }

        await invalidateCacheKey(`settings:${userId}`);

        const [updatedSettings] = await pool.query<RowDataPacket[]>(
            `SELECT
                notification_preferences,
                privacy_settings,
                language,
                theme,
                two_factor_auth_enabled
            FROM user_settings
            WHERE user_id = ?`,
            [userId]
        );

        if (updatedSettings.length > 0) {
            await cacheData(`settings:${userId}`, updatedSettings[0]);
        }

        res.status(200).json({ 
            success: true, 
            message: "Cập nhật cài đặt thành công.",
            settings: updatedSettings[0] 
        });
    } catch (error) {
        next(error);
    }
};