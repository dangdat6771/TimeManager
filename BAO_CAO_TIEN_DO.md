# Báo cáo tiến độ dự án TimeManager

Ngày cập nhật báo cáo: 12/06/2026

## 1. Tổng quan dự án

TimeManager là hệ thống web full-stack hỗ trợ quản lý thời gian và nâng cao hiệu suất cá nhân. Dự án được triển khai theo mô hình tách riêng backend và frontend:

- `backend/`: xây dựng REST API bằng Node.js, Express và PostgreSQL.
- `frontend/`: xây dựng giao diện người dùng bằng Vite và JavaScript.
- Cơ sở dữ liệu được thiết kế để hỗ trợ các nghiệp vụ chính: tài khoản người dùng, công việc, danh mục, thẻ, lịch sự kiện, thói quen, Pomodoro, thông báo, thành tựu và quản trị hệ thống.

## 2. Những việc đã làm trong giai đoạn thiết kế cơ sở dữ liệu

### 2.1. Phân tích nghiệp vụ

Đã xác định các nhóm chức năng chính của hệ thống:

- Quản lý tài khoản người dùng, đăng ký, đăng nhập, phân quyền user/admin.
- Quản lý công việc cá nhân theo trạng thái, độ ưu tiên, deadline, danh mục và tag.
- Quản lý lịch/sự kiện theo thời gian bắt đầu, kết thúc, địa điểm và màu hiển thị.
- Theo dõi thói quen, check-in theo ngày, lưu lịch sử và streak.
- Quản lý phiên tập trung Pomodoro và cấu hình thời lượng làm việc/nghỉ.
- Quản lý thông báo, cài đặt thông báo và broadcast từ admin.
- Thống kê dashboard theo công việc, lịch, thói quen và phiên tập trung.
- Lưu log hệ thống và thành tựu người dùng.

### 2.2. Thiết kế bảng dữ liệu

Đã tạo migration khởi tạo tại `backend/migrations/001_init.sql` với các nhóm bảng chính:

- Nhóm người dùng và xác thực: `users`, `oauth_providers`, `refresh_tokens`, `email_tokens`.
- Nhóm công việc: `tasks`, `categories`, `tags`, `task_tags`, `task_attachments`.
- Nhóm lịch: `events`.
- Nhóm thói quen: `habits`, `habit_logs`, `habit_streaks`.
- Nhóm Pomodoro: `pomodoro_settings`, `focus_sessions`.
- Nhóm thông báo: `notifications`, `notification_settings`.
- Nhóm thành tựu: `achievements`, `user_achievements`.
- Nhóm quản trị/log: `system_logs`.

### 2.3. Ràng buộc và tối ưu CSDL

Đã bổ sung các ràng buộc cần thiết để đảm bảo dữ liệu hợp lệ:

- Khóa chính UUID cho hầu hết các bảng.
- Khóa ngoại liên kết dữ liệu theo `user_id`, `task_id`, `habit_id`, `category_id`.
- Ràng buộc `CHECK` cho các trường như role, theme, status, priority, loại thông báo, loại Pomodoro.
- Ràng buộc unique cho email người dùng, tag theo từng user, token và mã achievement.
- Ràng buộc thời gian sự kiện `end_at >= start_at`.

Đã tạo index để tăng tốc truy vấn:

- Index theo email, role người dùng.
- Index theo user, trạng thái, deadline, danh mục của task.
- Index theo khoảng thời gian sự kiện.
- Index theo lịch sử habit, phiên focus và thông báo chưa đọc.
- Index cho system logs theo actor và thời gian tạo.

Đã tạo trigger `update_updated_at()` để tự động cập nhật trường `updated_at` khi sửa dữ liệu ở các bảng chính.

### 2.4. Dữ liệu mặc định

Đã seed dữ liệu ban đầu:

- Danh mục mặc định: học tập, công việc, sức khỏe, cá nhân.
- Thành tựu mặc định: streak 7 ngày, streak 30 ngày, hoàn thành 10/100 công việc, hoàn thành 10/100 phiên Pomodoro.

## 3. Những việc đã làm ở backend API

### 3.1. Cấu trúc backend

Đã xây dựng backend trong thư mục `backend/` với cấu trúc:

- `src/app.js`: cấu hình Express app, middleware, route gốc và health check.
- `src/server.js`: khởi động server.
- `src/config/db.js`: cấu hình kết nối PostgreSQL.
- `src/config/env.js`: đọc biến môi trường.
- `src/routes/`: chứa các nhóm API theo nghiệp vụ.
- `src/middleware/`: middleware xác thực, validate, xử lý lỗi, async handler.
- `src/utils/`: tiện ích tạo token và lỗi HTTP.
- `scripts/migrate.js`: script chạy migration CSDL.

### 3.2. Công nghệ và middleware

Đã cấu hình các thư viện chính:

- Express để xây dựng REST API.
- `pg` để kết nối PostgreSQL.
- `dotenv` để đọc file `.env`.
- `helmet` để tăng bảo mật HTTP headers.
- `cors` để cho phép frontend gọi API.
- `morgan` để log request.
- `bcryptjs` để hash mật khẩu.
- `jsonwebtoken` để tạo access token và refresh token.
- `zod` để validate request.

### 3.3. Xác thực và phân quyền

Đã triển khai:

- Đăng ký tài khoản.
- Đăng nhập bằng email và mật khẩu.
- Hash mật khẩu trước khi lưu CSDL.
- Tạo access token và refresh token.
- Lưu refresh token dạng hash SHA-256 trong bảng `refresh_tokens`.
- Refresh access token khi hết hạn.
- Logout bằng cách revoke refresh token.
- Đổi mật khẩu tài khoản bằng cách kiểm tra mật khẩu hiện tại, hash mật khẩu mới và revoke refresh token cũ.
- Middleware `authenticate` để bảo vệ route cần đăng nhập.
- Middleware `requireRole("admin")` để bảo vệ route admin.

### 3.4. Các nhóm API đã hoàn thành

Base URL backend: `http://localhost:3000/api`.

Các nhóm API đã có:

- Auth: đăng ký, đăng nhập, refresh token, logout, quên mật khẩu, đặt lại mật khẩu.
- Account: xem/cập nhật thông tin cá nhân và đổi mật khẩu.
- Categories: xem, tạo, sửa, xóa danh mục.
- Tags: xem, tạo, sửa, xóa tag.
- Tasks: xem danh sách, tạo, xem chi tiết, cập nhật, xóa công việc.
- Events: xem, tạo, cập nhật, xóa sự kiện.
- Habits: xem, tạo, cập nhật, xóa thói quen, check-in, xem lịch sử.
- Focus/Pomodoro: xem/cập nhật cài đặt, tạo/xem/kết thúc/xóa phiên tập trung.
- Notifications: xem thông báo, đánh dấu đã đọc, đọc tất cả, xem/cập nhật cài đặt thông báo.
- Dashboard: tổng quan và thống kê theo tuần.
- Admin: quản lý người dùng, thống kê hệ thống, gửi broadcast, xem system logs.

### 3.5. Kiểm tra và tài liệu backend

Đã bổ sung:

- Route `/health` để kiểm tra server và kết nối CSDL.
- Script `npm run db:migrate` để tạo bảng.
- Script `npm run health` để kiểm tra API nhanh.
- Tài liệu backend tại `backend/docs/backend-api.md`.
- File cấu hình mẫu môi trường tại `backend/.env.example`.

## 4. Những việc đã làm ở frontend

### 4.1. Cấu trúc frontend

Đã xây dựng frontend trong thư mục `frontend/` bằng Vite, gồm:

- `src/main.js`: khởi tạo auth state và router.
- `src/router/index.js`: định nghĩa route và điều hướng bằng hash router.
- `src/store/auth.js`: lưu trạng thái đăng nhập và thông tin user bằng `localStorage`.
- `src/api/`: các module gọi API backend.
- `src/components/`: layout, sidebar, modal, toast.
- `src/pages/`: các màn hình chính của ứng dụng.
- `src/styles/`: style tổng thể và animation.

### 4.2. Kết nối frontend với backend

Đã tạo API client tại `frontend/src/api/client.js`:

- Gọi API qua prefix `/api`.
- Tự động gắn access token vào header `Authorization`.
- Tự động refresh access token khi gặp lỗi 401.
- Xóa session và điều hướng về login khi refresh token hết hạn.
- Cấu hình Vite proxy `/api` sang backend `http://localhost:3000`.

### 4.3. Các màn hình đã triển khai

Đã triển khai các route frontend:

- `/login`: màn hình đăng nhập.
- `/register`: màn hình đăng ký.
- `/dashboard`: dashboard tổng quan.
- `/tasks`: quản lý công việc.
- `/categories`: quản lý danh mục.
- `/habits`: quản lý thói quen.
- `/focus`: Pomodoro/focus timer.
- `/calendar`: lịch sự kiện.
- `/notifications`: trung tâm thông báo.
- `/admin`: màn hình quản trị dành cho tài khoản admin.
- `/settings`: cài đặt tài khoản và cấu hình Pomodoro.

### 4.4. Chức năng frontend theo từng màn hình

Màn hình Auth:

- Form đăng nhập và đăng ký.
- Lưu access token, refresh token và user vào localStorage.
- Chuyển hướng sau khi đăng nhập thành công.
- Bảo vệ route: chưa đăng nhập sẽ tự chuyển về `/login`.

Màn hình Dashboard:

- Gọi API dashboard overview và weekly.
- Hiển thị thống kê tổng quan về công việc, thói quen, sự kiện và phiên tập trung.
- Hiển thị danh sách công việc sắp tới/quá hạn và dữ liệu tuần.

Màn hình Tasks:

- Hiển thị danh sách công việc.
- Tìm kiếm, lọc theo trạng thái và độ ưu tiên.
- Hỗ trợ chế độ xem list và kanban.
- Tạo, sửa, xóa task.
- Cập nhật trạng thái, deadline, độ ưu tiên và danh mục.

Màn hình Categories:

- Hiển thị danh mục mặc định và danh mục cá nhân.
- Tìm kiếm/lọc danh mục.
- Tạo, sửa, xóa danh mục.
- Chọn màu sắc và icon cho danh mục.

Màn hình Habits:

- Hiển thị danh sách thói quen.
- Tạo, sửa, xóa habit.
- Check-in habit theo ngày.
- Hiển thị trạng thái 7 ngày gần nhất và streak.

Màn hình Focus:

- Timer Pomodoro với các chế độ focus, nghỉ ngắn, nghỉ dài.
- Chọn task đang làm.
- Bắt đầu, reset và hoàn thành phiên focus.
- Cập nhật cài đặt thời lượng Pomodoro.
- Lưu lịch sử phiên tập trung qua API.

Màn hình Calendar:

- Hiển thị lịch theo tháng.
- Tạo sự kiện theo ngày.
- Cập nhật/xóa sự kiện.
- Hiển thị màu sự kiện và thông tin thời gian.

Màn hình Settings:

- Cập nhật thông tin cá nhân.
- Đổi mật khẩu thông qua API backend.
- Cập nhật cài đặt Pomodoro.

Màn hình Notifications:

- Xem danh sách thông báo của người dùng.
- Đánh dấu từng thông báo đã đọc.
- Đánh dấu tất cả thông báo đã đọc.
- Xem và cập nhật cài đặt thông báo: nhắc deadline, nhắc thói quen, email notification và thời gian nhắc trước deadline.

Màn hình Admin:

- Xem danh sách người dùng trong hệ thống.
- Khóa/mở khóa tài khoản người dùng.
- Xem thống kê tổng quan hệ thống: tổng users, users active, tổng tasks, tổng focus sessions.
- Gửi broadcast notification tới các tài khoản đang hoạt động.
- Xem system logs phục vụ quản trị.

### 4.5. Giao diện và trải nghiệm người dùng

Đã xây dựng:

- Layout chính có sidebar điều hướng.
- Component modal dùng cho form tạo/sửa.
- Component toast để hiển thị thông báo thao tác.
- Style responsive cơ bản.
- Animation chuyển trang và hiệu ứng hover.
- Favicon và icon SVG trong thư mục public.

## 5. Kết quả hiện tại

Đến hiện tại, dự án đã có nền tảng full-stack hoạt động:

- CSDL PostgreSQL đã được thiết kế và có migration khởi tạo.
- Backend API đã bao phủ hầu hết nghiệp vụ chính.
- Frontend đã có giao diện thực tế cho các chức năng quan trọng, bao gồm cả Notifications và Admin.
- Frontend đã kết nối backend thông qua API client và Vite proxy.
- Dự án có README hướng dẫn chạy backend, frontend, migration và kiểm tra nhanh.
- Frontend đã build thành công bằng lệnh `npm run build`.
- Backend đã được kiểm tra tải app thành công, chưa phát hiện lỗi cú pháp ở các route đã bổ sung.

## 6. Những việc đã hoàn thành trong tuần này

Trong tuần này, dự án đã tiếp tục hoàn thiện các chức năng còn thiếu để tiến gần hơn tới trạng thái có thể demo ổn định.

### 6.1. Hoàn thiện backend

- Bổ sung API đổi mật khẩu `PATCH /api/account/password` cho form đổi mật khẩu ở frontend.
- API đổi mật khẩu có kiểm tra mật khẩu hiện tại, hash mật khẩu mới bằng `bcryptjs` và revoke refresh token cũ để tăng an toàn phiên đăng nhập.
- Rà soát lại nhóm API Notifications và Admin đã có ở backend:
  - Notifications: xem danh sách, đánh dấu đã đọc, đánh dấu tất cả đã đọc, xem/cập nhật cài đặt thông báo.
  - Admin: xem users, khóa/mở khóa user, xem thống kê, gửi broadcast, xem system logs.
- Cập nhật tài liệu backend tại `backend/docs/backend-api.md`, bổ sung endpoint đổi mật khẩu và mô tả rõ hơn nhóm Notifications/Admin.
- Sửa dữ liệu seed thành tựu trong migration sang tiếng Việt có dấu để hiển thị đúng hơn.

### 6.2. Hoàn thiện frontend

- Bổ sung module API `frontend/src/api/notifications.js` để gọi các endpoint thông báo.
- Bổ sung module API `frontend/src/api/admin.js` để gọi các endpoint quản trị.
- Tạo màn hình Notifications tại `frontend/src/pages/Notifications/Notifications.js` với các chức năng:
  - Xem danh sách thông báo.
  - Đánh dấu một thông báo đã đọc.
  - Đánh dấu tất cả thông báo đã đọc.
  - Cập nhật cài đặt thông báo.
- Tạo màn hình Admin tại `frontend/src/pages/Admin/Admin.js` với các chức năng:
  - Xem danh sách người dùng.
  - Khóa/mở khóa tài khoản.
  - Xem thống kê hệ thống.
  - Gửi broadcast.
  - Xem system logs.
- Cập nhật router để hỗ trợ thêm route `/notifications` và `/admin`.
- Cập nhật sidebar để hiển thị Notifications cho người dùng và Admin cho tài khoản có role `admin`.
- Bổ sung responsive grid cho các màn hình dạng hai cột để giao diện dùng tốt hơn trên màn hình nhỏ.

### 6.3. Kiểm tra và xác nhận

- Đã chạy kiểm tra backend bằng cách load Express app, kết quả thành công.
- Đã chạy `npm run build` cho frontend, kết quả build thành công.
- Đã khởi động thử Vite dev server và truy cập được frontend tại `http://127.0.0.1:5173`.
- Ghi nhận: chưa kiểm thử đầy đủ end-to-end với PostgreSQL thật do còn phụ thuộc môi trường database local.

## 7. Các hạn chế/chưa hoàn thiện

Một số phần cần tiếp tục hoàn thiện:

- Chưa có Swagger/OpenAPI để mô tả API tự động.
- Chưa có bộ automated test cho backend và frontend.
- Chức năng email verification/password reset hiện còn phục vụ test local, chưa gửi email thật.
- OAuth Google/GitHub mới có thiết kế bảng dữ liệu, chưa triển khai flow đăng nhập OAuth.
- Một số text trong giao diện frontend còn chưa đồng nhất tiếng Việt có dấu do trước đó có lỗi mã hóa ký tự.
- Màn hình Admin/Notifications đã có chức năng chính nhưng cần tiếp tục làm đẹp UI và kiểm thử nhiều trường hợp dữ liệu rỗng/lỗi mạng.
- Cần kiểm thử kỹ các workflow end-to-end: đăng ký, đăng nhập, CRUD task, habit, event, Pomodoro.
- Chưa có dữ liệu mẫu chính thức để phục vụ demo.

## 8. Kế hoạch làm trong tuần tiếp theo

### 8.1. Kiểm thử tích hợp và ổn định backend

- Rà soát toàn bộ API để thống nhất response format và message lỗi.
- Kiểm tra lại validation bằng Zod cho các route tạo/sửa dữ liệu.
- Chạy migration trên PostgreSQL local và kiểm tra lại dữ liệu seed.
- Kiểm thử các API chính bằng Postman/Thunder Client hoặc script đơn giản.
- Viết tài liệu API chi tiết hơn theo từng endpoint quan trọng, request body và response mẫu.
- Bổ sung test cơ bản cho auth, tasks, habits, events và focus sessions.
- Bổ sung test cho API đổi mật khẩu, Notifications và Admin nếu còn thời gian.

### 8.2. Hoàn thiện frontend và trải nghiệm người dùng

- Rà soát responsive UI trên desktop và mobile.
- Bổ sung loading state, empty state và error state nhất quán cho các màn hình.
- Kiểm tra và xử lý các trường hợp token hết hạn, lỗi mạng, dữ liệu rỗng.
- Sửa các đoạn text còn lỗi mã hóa hoặc chưa thống nhất tiếng Việt có dấu.
- Làm gọn giao diện Notifications và Admin để phù hợp hơn khi demo.
- Kiểm tra quyền truy cập: user thường không thao tác được chức năng admin.

### 8.3. Kiểm thử end-to-end

- Chạy migration trên PostgreSQL local.
- Chạy backend và frontend đồng thời.
- Test luồng đăng ký -> đăng nhập -> tạo danh mục -> tạo task -> hoàn thành task.
- Test luồng tạo habit -> check-in -> xem streak/lịch sử.
- Test luồng tạo event -> xem trên calendar -> sửa/xóa event.
- Test luồng Pomodoro -> chọn task -> hoàn thành phiên -> xem thống kê.
- Test luồng xem thông báo -> đánh dấu đã đọc -> cập nhật cài đặt thông báo.
- Test luồng admin xem users -> khóa/mở khóa user -> gửi broadcast -> kiểm tra notification phía user.
- Kiểm tra phân quyền admin/user.

### 8.4. Chuẩn bị báo cáo/demo

- Cập nhật README với ảnh/chỉ dẫn demo nếu cần.
- Chuẩn bị dữ liệu mẫu để trình bày.
- Ghi lại danh sách chức năng đã hoàn thành và chức năng đang phát triển.
- Chuẩn bị kịch bản demo ngắn:
  - Đăng ký/đăng nhập.
  - Dashboard.
  - Quản lý task.
  - Lịch sự kiện.
  - Habit tracker.
  - Pomodoro.
  - Notifications.
  - Admin.

## 9. Mục tiêu cuối tuần tiếp theo

Mục tiêu sau tuần tới là đưa dự án về trạng thái có thể demo ổn định:

- Các chức năng chính chạy được từ frontend đến backend và CSDL.
- Giao diện đủ hoàn chỉnh để người dùng thao tác các nghiệp vụ chính, bao gồm thông báo và quản trị.
- API có tài liệu rõ ràng hơn.
- Có kiểm thử cơ bản cho các chức năng quan trọng.
- Có dữ liệu mẫu và kịch bản demo phục vụ báo cáo thực tập/đồ án.
