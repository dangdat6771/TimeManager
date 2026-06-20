# TimeManager

TimeManager la ung dung web full-stack ho tro quan ly thoi gian, cong viec va thoi quen ca nhan. Du an gom backend Express/PostgreSQL va frontend Vite, co the chay thu cong tren may local hoac chay nhanh bang Docker Compose.

## Tinh nang chinh

- Dang ky, dang nhap, lam moi token va quan ly tai khoan nguoi dung.
- Dashboard tong quan nang suat va du lieu trong ngay.
- Quan ly cong viec, danh muc, the gan, muc uu tien, han hoan thanh va trang thai.
- Quan ly lich/su kien ca nhan.
- Theo doi thoi quen, log hang ngay va streak.
- Pomodoro/focus session.
- Thong bao va cau hinh thong bao.
- Trang quan tri cho tai khoan co quyen admin.

## Cong nghe su dung

**Backend**

- Node.js >= 20
- Express.js
- PostgreSQL
- JWT authentication
- Zod validation
- Helmet, CORS, Morgan

**Frontend**

- Vite
- JavaScript ES modules
- Chart.js
- CSS thuan

**DevOps**

- Docker
- Docker Compose
- Nginx cho frontend production image

## Cau truc thu muc

```text
TimeManager/
+-- backend/
|   +-- migrations/          # SQL khoi tao database
|   +-- scripts/             # Script migrate
|   +-- src/
|   |   +-- config/          # Cau hinh env va database
|   |   +-- middleware/      # Auth, validate, error handler
|   |   +-- routes/          # API routes
|   |   +-- utils/           # Helper dung chung
|   |   +-- app.js
|   |   +-- server.js
|   +-- Dockerfile
|   +-- package.json
+-- frontend/
|   +-- public/
|   +-- src/
|   |   +-- api/             # API client
|   |   +-- components/      # Layout, modal, sidebar, toast
|   |   +-- pages/           # Cac man hinh chinh
|   |   +-- router/          # Hash router
|   |   +-- store/           # Auth store
|   |   +-- styles/
|   +-- Dockerfile
|   +-- nginx.conf
|   +-- package.json
+-- docker-compose.yml
+-- README.md
```

## Yeu cau cai dat

- Node.js 20 tro len
- npm
- PostgreSQL 16 hoac Docker Desktop

## Chay bang Docker Compose

Day la cach nhanh nhat de chay toan bo he thong:

```bash
docker compose up --build
```

Sau khi container khoi dong thanh cong:

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:3000`
- Health check: `http://localhost:3000/health`
- PostgreSQL: `localhost:5432`

Docker Compose se tu khoi tao database `time_manager`, chay migration va start ca backend/frontend.

Dung ung dung:

```bash
docker compose down
```

Neu muon xoa ca du lieu database local trong volume:

```bash
docker compose down -v
```

## Chay thu cong tren local

### 1. Tao database PostgreSQL

Tao database ten `time_manager` trong PostgreSQL. Vi du connection string:

```env
postgres://postgres:postgres@localhost:5432/time_manager
```

### 2. Cai dat va chay backend

```bash
cd backend
npm install
```

Tao file `backend/.env`:

```env
NODE_ENV=development
PORT=3000
DATABASE_URL=postgres://postgres:postgres@localhost:5432/time_manager
JWT_ACCESS_SECRET=change_me_access_secret
JWT_REFRESH_SECRET=change_me_refresh_secret
ACCESS_TOKEN_EXPIRES_IN=15m
REFRESH_TOKEN_EXPIRES_IN_DAYS=30
CORS_ORIGIN=http://localhost:5173
```

Chay migration:

```bash
npm run db:migrate
```

Start backend:

```bash
npm run dev
```

Backend mac dinh chay tai `http://localhost:3000`.

### 3. Cai dat va chay frontend

Mo terminal khac:

```bash
cd frontend
npm install
npm run dev
```

Frontend mac dinh chay tai `http://localhost:5173`.

Vite da cau hinh proxy `/api` sang `http://localhost:3000`, vi vay can chay backend truoc khi su dung cac chuc nang dang nhap, dang ky va quan ly du lieu.

## Lenh huu ich

Backend:

```bash
cd backend
npm run dev          # Chay API o che do development
npm start            # Chay API o che do production
npm run db:migrate   # Khoi tao/cap nhat database schema
npm run health       # Kiem tra /health cua API
```

Frontend:

```bash
cd frontend
npm run dev          # Chay Vite dev server
npm run build        # Build production
npm run preview      # Xem ban build production
```

## API chinh

Base URL khi chay local:

```text
http://localhost:3000/api
```

Cac nhom endpoint:

- `/auth`: dang ky, dang nhap, refresh token, dang xuat.
- `/account`: thong tin va cau hinh tai khoan.
- `/categories`: danh muc cong viec.
- `/tags`: the gan cong viec.
- `/tasks`: cong viec.
- `/events`: lich va su kien.
- `/habits`: thoi quen.
- `/focus`: phien tap trung/Pomodoro.
- `/notifications`: thong bao.
- `/dashboard`: du lieu tong quan.
- `/admin`: chuc nang quan tri.

Chi tiet API co trong `backend/docs/backend-api.md`.

## Database

Migration dau tien nam tai `backend/migrations/001_init.sql`, gom cac bang chinh:

- `users`, `refresh_tokens`, `email_tokens`, `oauth_providers`
- `categories`, `tags`, `tasks`, `task_tags`, `task_attachments`
- `events`
- `habits`, `habit_logs`, `habit_streaks`
- `pomodoro_settings`, `focus_sessions`
- `notifications`, `notification_settings`
- `achievements`, `user_achievements`
- `system_logs`

## Kiem tra nhanh

Sau khi chay backend:

```bash
curl http://localhost:3000/health
```

Ket qua mong doi:

```json
{
  "status": "ok",
  "database": "connected"
}
```

Build frontend:

```bash
cd frontend
npm run build
```

## Ghi chu bao mat

- Khong commit file `.env` len repository.
- Doi `JWT_ACCESS_SECRET` va `JWT_REFRESH_SECRET` khi deploy.
- Cap nhat `CORS_ORIGIN` dung domain frontend production.
- Nen dung mat khau PostgreSQL manh hon gia tri mau trong moi truong production.

## Tai lieu lien quan

- `BAO_CAO_TIEN_DO.md`: bao cao tien do va noi dung da thuc hien.
- `backend/docs/backend-api.md`: tai lieu API backend.
- `backend/docs/frontend-plan.md`: ghi chu/ke hoach frontend.
