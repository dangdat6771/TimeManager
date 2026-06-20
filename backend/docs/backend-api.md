# Bao cao backend API va ket noi CSDL

## Tong quan

Da tao backend REST API bang Node.js + Express, ket noi PostgreSQL qua package `pg`, xac thuc bang JWT access token va refresh token. Cau truc backend nam trong thu muc `src/`, migration CSDL nam trong `migrations/001_init.sql`.

## Cau hinh ket noi CSDL

- File mau moi truong: `.env.example`.
- Bien ket noi chinh: `DATABASE_URL=postgres://postgres:postgres@localhost:5432/time_manager`.
- Module ket noi: `src/config/db.js`.
- Script migrate: `scripts/migrate.js`.
- Lenh tao bang: `npm run db:migrate`.

Migration da tao cac bang theo file database:

- `users`, `oauth_providers`, `refresh_tokens`, `email_tokens`.
- `categories`, `tags`, `tasks`, `task_tags`, `task_attachments`.
- `events`.
- `habits`, `habit_logs`, `habit_streaks`.
- `pomodoro_settings`, `focus_sessions`.
- `notifications`, `notification_settings`.
- `achievements`, `user_achievements`.
- `system_logs`.

Migration cung tao index, trigger tu cap nhat `updated_at`, default categories va achievements.

## Cac nhom API da tao

Base URL: `http://localhost:3000/api`.

- Auth: `POST /auth/register`, `POST /auth/login`, `POST /auth/refresh`, `POST /auth/logout`, `POST /auth/forgot-password`, `POST /auth/reset-password`.
- Account: `GET /account/me`, `PATCH /account/me`, `PATCH /account/password`.
- Categories: `GET/POST /categories`, `PATCH/DELETE /categories/:id`.
- Tags: `GET/POST /tags`, `PATCH/DELETE /tags/:id`.
- Tasks: `GET/POST /tasks`, `GET/PATCH/DELETE /tasks/:id`.
- Events: `GET/POST /events`, `PATCH/DELETE /events/:id`.
- Habits: `GET/POST /habits`, `PATCH/DELETE /habits/:id`, `POST /habits/:id/check-ins`, `GET /habits/:id/logs`.
- Focus/Pomodoro: `GET/PATCH /focus/settings`, `GET/POST /focus/sessions`, `PATCH /focus/sessions/:id/finish`, `DELETE /focus/sessions/:id`.
- Notifications: `GET /notifications`, `PATCH /notifications/:id/read`, `PATCH /notifications/read-all`, `GET/PATCH /notifications/settings`.
- Dashboard: `GET /dashboard/overview`, `GET /dashboard/weekly`.
- Admin: `GET /admin/users`, `PATCH /admin/users/:id/status`, `GET /admin/stats`, `POST /admin/broadcasts`, `GET /admin/logs`.

## Bao mat va phan quyen

- Mat khau duoc hash bang `bcryptjs`.
- Doi mat khau yeu cau mat khau hien tai, hash mat khau moi va revoke refresh token cu.
- Access token dung `JWT_ACCESS_SECRET`.
- Refresh token dung `JWT_REFRESH_SECRET`, luu hash SHA-256 trong bang `refresh_tokens`.
- Middleware `authenticate` bao ve cac route can dang nhap.
- Middleware `requireRole("admin")` bao ve route admin.
- Input duoc validate bang `zod`.

## Ghi chu hien tai

- API email verification, password reset dang tra token trong response de tien test local. Khi lam production can gui token qua email va khong tra token ve client.
- OAuth Google/GitHub moi co bang database, chua cai flow OAuth.
- Chua them Swagger/OpenAPI va automated test; nen lam o vong tiep theo sau khi chot frontend.

## Endpoint moi bo sung trong tuan

### Doi mat khau

`PATCH /api/account/password`

Request:

```json
{
  "currentPassword": "old-password",
  "newPassword": "new-password"
}
```

Response thanh cong:

```json
{
  "message": "Password changed successfully"
}
```

### Notifications

- `GET /api/notifications`: lay toi da 100 thong bao moi nhat cua user.
- `PATCH /api/notifications/:id/read`: danh dau mot thong bao da doc.
- `PATCH /api/notifications/read-all`: danh dau tat ca thong bao da doc.
- `GET /api/notifications/settings`: lay cau hinh thong bao.
- `PATCH /api/notifications/settings`: cap nhat cau hinh thong bao.

### Admin

- `GET /api/admin/users`: lay danh sach nguoi dung.
- `PATCH /api/admin/users/:id/status`: khoa/mo khoa tai khoan.
- `GET /api/admin/stats`: thong ke tong quan he thong.
- `POST /api/admin/broadcasts`: gui broadcast notification den user active.
- `GET /api/admin/logs`: xem system logs.
