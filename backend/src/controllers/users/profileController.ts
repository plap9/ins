import { Request, Response } from "express";
import { AppException } from "../../middlewares/errorHandler";
import { ErrorCode } from "../../types/errorCode";
import { createController } from "../../utils/errorUtils";
import connection from "../../config/db";

interface AuthRequest extends Request {
  user?: {
    id: number;
  };
}

const getProfileHandler = async (req: AuthRequest, res: Response): Promise<void> => {
  const { userId } = req.params;
  const currentUserId = req.user?.id;

  if (!userId) {
    throw new AppException(
      "Thiếu mã người dùng", 
      ErrorCode.VALIDATION_ERROR, 
      400
    );
  }

  const [users] = await connection.query(
    `SELECT id, username, name, email, phone_number, avatar, bio, website, 
            gender, is_private, is_verified, created_at 
     FROM users 
     WHERE id = ?`,
    [userId]
  );

  if ((users as any[]).length === 0) {
    throw new AppException(
      "Người dùng không tồn tại", 
      ErrorCode.USER_NOT_FOUND, 
      404
    );
  }

  const user = (users as any[])[0];

  if (user.is_private && parseInt(userId) !== currentUserId) {
    const [follows] = await connection.query(
      "SELECT * FROM follows WHERE follower_id = ? AND followed_id = ? AND status = 'accepted'",
      [currentUserId, userId]
    );

    if ((follows as any[]).length === 0) {
      throw new AppException(
        "Không có quyền truy cập vào tài khoản riêng tư này", 
        ErrorCode.USER_PROFILE_ACCESS_DENIED, 
        403
      );
    }
  }

  const [followersCount] = await connection.query(
    "SELECT COUNT(*) as count FROM follows WHERE followed_id = ? AND status = 'accepted'",
    [userId]
  );

  const [followingCount] = await connection.query(
    "SELECT COUNT(*) as count FROM follows WHERE follower_id = ? AND status = 'accepted'",
    [userId]
  );

  const [postsCount] = await connection.query(
    "SELECT COUNT(*) as count FROM posts WHERE user_id = ?",
    [userId]
  );

  const [followStatus] = await connection.query(
    "SELECT status FROM follows WHERE follower_id = ? AND followed_id = ?",
    [currentUserId, userId]
  );

  res.json({
    status: "success",
    data: {
      user: {
        ...user,
        followers: (followersCount as any[])[0].count,
        following: (followingCount as any[])[0].count,
        posts: (postsCount as any[])[0].count,
        follow_status: (followStatus as any[]).length > 0 
          ? (followStatus as any[])[0].status 
          : null
      }
    }
  });
};

const updateProfileHandler = async (req: AuthRequest, res: Response): Promise<void> => {
  const currentUserId = req.user?.id;
  
  if (!currentUserId) {
    throw new AppException(
      "Chưa xác thực người dùng",
      ErrorCode.USER_NOT_AUTHENTICATED,
      401
    );
  }

  const { 
    name, 
    bio, 
    website, 
    gender, 
    is_private 
  } = req.body;

  if (!name && !bio && !website && gender === undefined && is_private === undefined) {
    throw new AppException(
      "Không có dữ liệu nào để cập nhật", 
      ErrorCode.USER_NO_UPDATE_DATA, 
      400
    );
  }

  const updateFields = [];
  const params = [];

  if (name !== undefined) {
    updateFields.push("name = ?");
    params.push(name);
  }

  if (bio !== undefined) {
    updateFields.push("bio = ?");
    params.push(bio);
  }

  if (website !== undefined) {
    updateFields.push("website = ?");
    params.push(website);
  }

  if (gender !== undefined) {
    updateFields.push("gender = ?");
    params.push(gender);
  }

  if (is_private !== undefined) {
    updateFields.push("is_private = ?");
    params.push(is_private);
  }

  params.push(currentUserId);

  await connection.beginTransaction();

  try {
    const [result] = await connection.execute(
      `UPDATE users 
       SET ${updateFields.join(", ")}, 
           updated_at = NOW() 
       WHERE id = ?`,
      params
    );

    if ((result as any).affectedRows === 0) {
      throw new AppException(
        "Người dùng không tồn tại hoặc không có thay đổi nào được thực hiện", 
        ErrorCode.USER_NOT_FOUND, 
        404
      );
    }

    const [users] = await connection.query(
      `SELECT id, username, name, email, phone_number, avatar, bio, website, 
              gender, is_private, is_verified, created_at, updated_at
       FROM users 
       WHERE id = ?`,
      [currentUserId]
    );

    await connection.commit();

    res.json({
      status: "success",
      message: "Cập nhật thông tin người dùng thành công",
      data: {
        user: (users as any[])[0]
      }
    });
  } catch (error) {
    await connection.rollback();
    throw error;
  }
};

export const getProfile = createController(getProfileHandler, 'Users:GetProfile');
export const updateProfile = createController(updateProfileHandler, 'Users:UpdateProfile'); 