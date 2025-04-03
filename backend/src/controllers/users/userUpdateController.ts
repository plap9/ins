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
            return next(new AppError("Tham số 'user_id' không hợp lệ.", 400, ErrorCode.VALIDATION_ERROR));
        }

        console.log(`[userUpdateController] Request body:`, req.body);
        console.log(`[userUpdateController] File upload:`, req.file ? 'Có' : 'Không');
        
        await connection.beginTransaction();

        let avatarUrl: string | undefined;

        // Kiểm tra nếu có ảnh được gửi thông qua multipart/form-data
        if (req.file) {
            console.log(`[userUpdateController] Nhận được file upload: ${req.file.originalname}, size: ${req.file.size} bytes, mimetype: ${req.file.mimetype}`);
            try {
                console.log(`[userUpdateController] Bắt đầu xử lý và upload ảnh...`);
                // Tạo key với prefix profile/ để lưu vào folder riêng trên S3
                const fileKey = `profile/${Date.now()}_${userId}`;
                const result = await uploadResizedImage(
                    req.file.buffer, 
                    {
                        ...ImageResizeConfig.AVATAR,
                        key: fileKey
                    }
                );
                avatarUrl = result.Location;
                console.log(`[userUpdateController] Upload ảnh thành công, URL: ${avatarUrl}`);
            } catch (error) {
                console.error(`[userUpdateController] Lỗi khi upload ảnh:`, error);
                await connection.rollback();
                return next(new AppError('Không thể upload ảnh', 500, ErrorCode.FILE_PROCESSING_ERROR));
            }
        } 
        // Kiểm tra nếu có ảnh được gửi dưới dạng base64 trong JSON body
        else if (req.body.avatar_base64) {
            try {
                console.log(`[userUpdateController] Nhận được ảnh dạng base64, độ dài: ${req.body.avatar_base64.length}`);
                
                // Chuyển đổi base64 thành buffer
                const imageBuffer = Buffer.from(req.body.avatar_base64, 'base64');
                console.log(`[userUpdateController] Đã chuyển đổi base64 thành buffer, kích thước: ${imageBuffer.length} bytes`);
                
                // Upload ảnh lên S3 với prefix profile/
                const fileKey = `profile/${Date.now()}_${userId}`;
                const result = await uploadResizedImage(
                    imageBuffer, 
                    {
                        ...ImageResizeConfig.AVATAR,
                        key: fileKey
                    }
                );
                avatarUrl = result.Location;
                
                console.log(`[userUpdateController] Upload ảnh base64 thành công, URL: ${avatarUrl}`);
                
                // Xóa trường avatar_base64 khỏi body để không lưu vào DB
                delete req.body.avatar_base64;
            } catch (error) {
                console.error(`[userUpdateController] Lỗi khi xử lý ảnh base64:`, error);
                await connection.rollback();
                return next(new AppError('Không thể xử lý ảnh', 500, ErrorCode.FILE_PROCESSING_ERROR));
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
        
        // Nếu chỉ upload avatar mà không có thay đổi trong body
        if (fieldsToUpdate.length === 0 && !avatarUrl) {
            console.log(`[userUpdateController] Không có dữ liệu nào để cập nhật.`);
            await connection.rollback();
            return next(new AppError("Không có dữ liệu nào để cập nhật.", 400, ErrorCode.USER_NO_UPDATE_DATA));
        }
        
        // Nếu chỉ upload avatar mà không có thay đổi dữ liệu khác, vẫn tiếp tục
        if (avatarUrl && fieldsToUpdate.length === 0) {
            console.log(`[userUpdateController] Chỉ cập nhật avatar.`);
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

        console.log(`[userUpdateController] SQL Query: ${updateQuery}`);
        console.log(`[userUpdateController] Query params:`, queryParams);

        const [result] = await connection.query(updateQuery, queryParams);

        if ((result as any).affectedRows === 0) {
            console.log(`[userUpdateController] Không có dòng nào được cập nhật.`);
            await connection.rollback();
            return next(new AppError("Người dùng không tồn tại hoặc không có thay đổi nào được thực hiện.", 404, ErrorCode.USER_NOT_FOUND));
        }

        await connection.commit();
        console.log(`[userUpdateController] Commit transaction thành công.`);

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

        console.log(`[userUpdateController] Cập nhật thành công cho user ${userId}`);
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