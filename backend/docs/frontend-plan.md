# Ke hoach lam frontend

## Stack de xuat

- React + Vite.
- React Router cho dieu huong.
- TanStack Query cho goi API va cache.
- Zustand hoac Context cho auth/session nhe.
- React Hook Form + Zod cho form.
- FullCalendar cho lich.
- Recharts cho dashboard.
- Lucide React cho icon.

## Thu tu trien khai

1. Khoi tao frontend, cau hinh route, layout app, API client va auth store.
2. Lam man hinh dang ky, dang nhap, logout, refresh token va profile settings.
3. Lam Dashboard: overview hom nay, task sap toi/qua han, bieu do 7 ngay.
4. Lam Task Management: list, filter, form tao/sua, doi status, category/tag.
5. Lam Calendar: xem event theo khoang ngay, tao/sua/xoa event.
6. Lam Habit Tracker: danh sach habit, check-in, streak, lich su ngay.
7. Lam Pomodoro: timer, settings, tao/ket thuc focus session, lich su phien.
8. Lam Notification Center va notification settings.
9. Lam Admin Panel: users, stats, broadcast, system logs.
10. Hoan thien responsive UI, error/loading states, kiem thu workflow chinh.

## Route frontend du kien

- `/login`, `/register`.
- `/app/dashboard`.
- `/app/tasks`.
- `/app/calendar`.
- `/app/habits`.
- `/app/focus`.
- `/app/notifications`.
- `/app/settings`.
- `/app/admin`.

## Viec can chot truoc khi lam frontend

- Ten database va thong tin `DATABASE_URL` chinh xac tren may cua ban.
- Co can giao dien tieng Viet 100% hay song ngu Viet/Anh.
- Co can OAuth va gui email that ngay trong do an hay de mo rong sau.
