const express = require("express");
const { z } = require("zod");
const { query } = require("../config/db");
const { requireRole } = require("../middleware/auth");
const asyncHandler = require("../middleware/asyncHandler");
const validate = require("../middleware/validate");
const HttpError = require("../utils/httpError");

const router = express.Router();
router.use(requireRole("admin"));

const userParams = z.object({ params: z.object({ id: z.string().uuid() }) });

router.get("/users", asyncHandler(async (req, res) => {
  const result = await query(
    `SELECT id, email, full_name, role, is_active, is_email_verified, created_at, last_login_at
     FROM users ORDER BY created_at DESC LIMIT 200`
  );
  res.json({ users: result.rows });
}));

router.patch("/users/:id/status", validate(userParams.merge(z.object({ body: z.object({ isActive: z.boolean() }) }))), asyncHandler(async (req, res) => {
  if (req.params.id === req.user.id && req.body.isActive === false) {
    throw new HttpError(400, "Admin cannot deactivate own account");
  }
  const result = await query(
    "UPDATE users SET is_active = $1 WHERE id = $2 RETURNING id, email, full_name, role, is_active",
    [req.body.isActive, req.params.id]
  );
  if (!result.rowCount) throw new HttpError(404, "User not found");
  res.json({ user: result.rows[0] });
}));

router.get("/stats", asyncHandler(async (req, res) => {
  const [users, tasks, sessions] = await Promise.all([
    query("SELECT COUNT(*) AS total_users, COUNT(*) FILTER (WHERE is_active = TRUE) AS active_users FROM users"),
    query("SELECT COUNT(*) AS total_tasks, COUNT(*) FILTER (WHERE created_at::date = CURRENT_DATE) AS tasks_today FROM tasks"),
    query("SELECT COUNT(*) AS total_focus_sessions FROM focus_sessions")
  ]);
  res.json({
    stats: {
      ...users.rows[0],
      ...tasks.rows[0],
      ...sessions.rows[0]
    }
  });
}));

router.post("/broadcasts", validate(z.object({
  body: z.object({
    title: z.string().min(1).max(255),
    body: z.string().optional()
  })
})), asyncHandler(async (req, res) => {
  const result = await query(
    `INSERT INTO notifications (user_id, title, body, type)
     SELECT id, $1, $2, 'broadcast' FROM users WHERE is_active = TRUE
     RETURNING id`,
    [req.body.title, req.body.body || null]
  );
  res.status(201).json({ sent: result.rowCount });
}));

router.get("/logs", asyncHandler(async (req, res) => {
  const result = await query("SELECT * FROM system_logs ORDER BY created_at DESC LIMIT 200");
  res.json({ logs: result.rows });
}));

module.exports = router;
