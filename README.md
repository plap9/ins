# Instagram Clone (INS)

## 1. Mô tả bài toán

**Tên dự án:** Instagram Clone (INS)

**Mục tiêu:** Xây dựng một ứng dụng di động mô phỏng Instagram, cho phép người dùng chia sẻ ảnh và video, tương tác, khám phá nội dung và nhắn tin. Ứng dụng tập trung vào trải nghiệm người dùng mượt mà, bảo mật và khả năng mở rộng.

**Đối tượng người dùng:** Người dùng mạng xã hội muốn chia sẻ khoảnh khắc, kết nối bạn bè, khám phá nội dung sáng tạo và nhắn tin.

**Vấn đề cần giải quyết:**

*   Nền tảng chia sẻ hình ảnh/video dễ sử dụng, hỗ trợ chỉnh sửa cơ bản.
*   Xây dựng cộng đồng qua tương tác (thích, bình luận, theo dõi, lưu bài viết).
*   Cung cấp trải nghiệm khám phá nội dung cá nhân hóa.
*   Hỗ trợ nhắn tin trực tiếp.
*   Quản lý thông báo và cài đặt riêng tư.

## 2. Yêu cầu hệ thống

### 2.1 Yêu cầu chức năng

(Xem chi tiết tại phần **4. Đặc tả yêu cầu nghiệp vụ**)

### 2.2 Yêu cầu phi chức năng

*   **Hiệu suất:**
    *   Thời gian tải trang/dữ liệu: < 2 giây.
    *   Xử lý đồng thời: 5000+ người dùng.
    *   Hoạt động ổn định, ít lỗi.
*   **Bảo mật:**
    *   Mã hóa mật khẩu, xác thực an toàn (JWT, refresh tokens).
    *   Ngăn chặn spam, SQL injection, XSS.
    *   Xác minh email/số điện thoại.
*   **Khả năng sử dụng:**
    *   Giao diện trực quan, dễ sử dụng.
    *   Thao tác đơn giản.
    *   Trải nghiệm mượt mà.
*   **Khả năng mở rộng:**
    *   Mở rộng theo chiều ngang (horizontal scaling) để đáp ứng lượng người dùng và dữ liệu tăng.
*   **Khả năng bảo trì:**
    *   Mã nguồn rõ ràng, dễ bảo trì/nâng cấp.
*   **Tính khả dụng:**
    *   Hoạt động liên tục (99.9% uptime).
*   **Tính tương thích:**
    *   Hỗ trợ iOS và Android (các phiên bản phổ biến).

## 3. Biểu đồ phân rã chức năng
![image](https://clone-ins-s3.s3.ap-southeast-2.amazonaws.com/phan_ra.png)
## 4. Đặc tả yêu cầu nghiệp vụ (Use Cases)

*   **UC-001: Quản lý tài khoản:**
    *   Đăng ký: Tạo tài khoản (email/số điện thoại/username), xác minh.
    *   Đăng nhập: Đăng nhập, hỗ trợ refresh token.
    *   Quên mật khẩu: Lấy lại mật khẩu.
    *   Đăng xuất.
    *   Vô hiệu hóa/Xóa tài khoản.
    *   (Tùy chọn) Đăng nhập/Đăng ký qua mạng xã hội.

*   **UC-002: Quản lý trang cá nhân:**
    *   Xem/Chỉnh sửa thông tin cá nhân.
    *   Xem danh sách bài đăng.
    *   Xem số lượng người theo dõi/đang theo dõi.
    *   Thay đổi trạng thái riêng tư.
    *   Quản lý cài đặt.

*   **UC-003: Đăng bài:**
    *   Chọn/Chụp ảnh/video.
    *   Chỉnh sửa ảnh (cơ bản).
    *   Thêm caption, gắn thẻ, vị trí.
    *   Chọn quyền riêng tư.
    *   (Tùy chọn) Chia sẻ lên mạng xã hội khác.

*   **UC-004: Xem trang chủ (Feed):**
    *   Hiển thị bài đăng từ người đang theo dõi (sắp xếp theo thời gian).
    *   Tải thêm bài viết (infinite scrolling).

*   **UC-005: Tương tác:**
    *   Thích bài viết/bình luận.
    *   Bình luận (hỗ trợ trả lời).
    *   Xem danh sách người thích/bình luận.
    *   Lưu bài viết.
    *   Xóa bài viết/bình luận

*   **UC-006: Theo dõi:**
    *   Tìm kiếm người dùng.
    *   Theo dõi/Hủy theo dõi.
    *   Xem danh sách người theo dõi/đang theo dõi.
    *   Chấp nhận/Từ chối yêu cầu (private).

*   **UC-007: Khám phá:**
    *   Gợi ý bài đăng/người dùng (thuật toán gợi ý).
*   **UC-008: Thông báo:**
    *   Thông báo: Like, Comment, Follow, Mention, Message, Story (lượt xem, trả lời).
    *   Đánh dấu đã đọc/đã xem.
    *   Thông báo đẩy (Push Notifications).
    *   Cài đặt thông báo (Tùy chỉnh loại thông báo).

*   **UC-009: Nhắn tin trực tiếp:**
    *   Gửi tin nhắn: Văn bản, Ảnh, Video, Emoji, GIF.
    *   Trạng thái tin nhắn: Đã gửi, Đã nhận, Đã xem.
    *   Tạo nhóm chat.
    *   Xóa tin nhắn/Cuộc trò chuyện.
    *   Chặn người dùng.
    *   Tìm kiếm trong tin nhắn.
    *   (Tùy chọn) Gọi thoại/video.

*    **UC-010: Stories:**
        * Đăng Stories (Ảnh, Video, Chữ, Stickers, Filters).
        * Xem Stories.
        * Trả lời Stories.
        * Thống kê lượt xem Story.
        * Lưu trữ Stories.
        * Cài đặt Story (Quyền riêng tư).

*    **UC-011: Tìm kiếm:**
        * Tìm kiếm: Người dùng, Bài viết, Hashtags, Địa điểm.
        * Lưu lịch sử tìm kiếm.
        * Gợi ý tìm kiếm (Trending Searches).
        * Xóa lịch sử tìm kiếm.
## 5. Thiết kế cơ sở dữ liệu
![Sơ đồ ERD Instagram Clone](https://clone-ins-s3.s3.ap-southeast-2.amazonaws.com/erd.png)
[![Ask DeepWiki](https://deepwiki.com/badge.svg)](https://deepwiki.com/plap9/ins)
