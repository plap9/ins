import { NextFunction, Request, Response } from 'express';
import pool from '../../config/db';
import { AppException } from "../../middlewares/errorHandler";
import { ErrorCode } from '../../types/errorCode';
import { 
  cacheUserProfile, 
  getCachedUserProfile, 
  invalidateUserProfileCache, 
  cacheData, 
  getCachedData, 
  invalidateCacheKey 
} from '../../utils/cacheUtils';
import { uploadResizedImage } from '../../utils/s3Utils';
import { ImageResizeConfig } from '../../middlewares/upload';
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
    username?: string;
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
    const connection = await pool.getConnection();
    
    try {
        const userId = parseInt(req.params.id, 10);
        if (isNaN(userId)) {
            return next(new AppException("Tham số 'user_id' không hợp lệ.", ErrorCode.VALIDATION_ERROR, 400));
        }

        await connection.beginTransaction();

        let avatarUrl: string | undefined;

        if (req.file) {
            try {
                const fileKey = `profile/${Date.now()}_${userId}`;
                const result = await uploadResizedImage(
                    req.file.buffer, 
                    {
                        ...ImageResizeConfig.AVATAR,
                        key: fileKey
                    }
                );
                avatarUrl = result.Location;
            } catch (error) {
                console.error(`[userUpdateController] Lỗi khi upload ảnh:`, error);
                await connection.rollback();
                return next(new AppException('Không thể upload ảnh', ErrorCode.FILE_PROCESSING_ERROR, 500));
            }
        } 
        else if (req.body.avatar_base64) {
            try {
                
                const imageBuffer = Buffer.from(req.body.avatar_base64, 'base64');
                
                const fileKey = `profile/${Date.now()}_${userId}`;
                const result = await uploadResizedImage(
                    imageBuffer, 
                    {
                        ...ImageResizeConfig.AVATAR,
                        key: fileKey
                    }
                );
                avatarUrl = result.Location;
                
                delete req.body.avatar_base64;
            } catch (error) {
                console.error(`[userUpdateController] Lỗi khi xử lý ảnh base64:`, error);
                await connection.rollback();
                return next(new AppException('Không thể xử lý ảnh', ErrorCode.FILE_PROCESSING_ERROR, 500));
            }
        }

        const { full_name, bio, phone_number, website, gender, date_of_birth, is_private, username } = req.body;
        
        const updateFields: UserUpdateFields = { 
            full_name, 
            bio,
            phone_number, 
            website, 
            gender, 
            date_of_birth, 
            is_private,
            username
        };

        if (avatarUrl) {
            updateFields.profile_picture = avatarUrl;
        }
        
        const fieldsToUpdate = Object.keys(updateFields).filter(key => updateFields[key] !== undefined);
        
        if (fieldsToUpdate.length === 0 && !avatarUrl) {
            await connection.rollback();
            return next(new AppException("Không có dữ liệu nào để cập nhật.", ErrorCode.USER_NO_UPDATE_DATA, 400));
        }
        
        if (avatarUrl && fieldsToUpdate.length === 0) {
            updateFields.profile_picture = avatarUrl;
            fieldsToUpdate.push('profile_picture');
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

        const [result] = await connection.query(updateQuery, queryParams);

        if ((result as any).affectedRows === 0) {
            await connection.rollback();
            return next(new AppException("Người dùng không tồn tại hoặc không có thay đổi nào được thực hiện.", ErrorCode.USER_NOT_FOUND, 404));
        }

        await connection.commit();

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
        console.error(`[userUpdateController] Lỗi:`, error);
        await connection.rollback();
        next(error);
    } finally {
        connection.release();
    }
};

export const getUsersBySearch = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { query } = req.query;
        const page = parseInt(req.query.page as string || '1', 10);
        const limit = parseInt(req.query.limit as string || '20', 10);
        const offset = (page - 1) * limit;

        if (!query || typeof query !== 'string') {
            return next(new AppException("Tham số tìm kiếm không hợp lệ.", ErrorCode.USER_SEARCH_INVALID, 400));
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
            return next(new AppException("Tham số 'id' không hợp lệ.", ErrorCode.VALIDATION_ERROR, 400));
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
            return next(new AppException("Cài đặt người dùng không tồn tại.", ErrorCode.USER_SETTINGS_NOT_FOUND, 404));
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
            return next(new AppException("Tham số 'id' không hợp lệ.", ErrorCode.VALIDATION_ERROR, 400));
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
            return next(new AppException("Không có dữ liệu nào để cập nhật.", ErrorCode.USER_NO_UPDATE_DATA, 400));
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
                return next(new AppException("Người dùng không tồn tại.", ErrorCode.USER_NOT_FOUND, 404));
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