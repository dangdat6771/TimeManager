const express = require("express");
const { z } = require("zod");
const { query } = require("../config/db");
const asyncHandler = require("../middleware/asyncHandler");
const validate = require("../middleware/validate");
const HttpError = require("../utils/httpError");

const router = express.Router();
const idParams = z.object({ params: z.object({ id: z.string().uuid() }) });

const settingsSchema = z.object({
  body: z.object({
    taskDeadlineNotif: z.boolean().optional(),
    habitReminderNotif: z.boolean().optional(),
    emailNotifications: z.boolean().optional(),
    deadlineRemindMinutes: z.coerce.number().int().min(0).max(10080).optional()
  })
});

router.get("/", asyncHandler(async (req, res) => {
  const result = await query(
    "SELECT * FROM notifications WHERE user_id = $1 ORDER BY sent_at DESC LIMIT 100",
    [req.user.id]
  );
  res.json({ notifications: result.rows });
}));

router.patch("/:id/read", validate(idParams), asyncHandler(async (req, res) => {
  const result = await query(
    "UPDATE notifications SET is_read = TRUE, read_at = NOW() WHERE id = $1 AND user_id = $2 RETURNING *",
    [req.params.id, req.user.id]
  );
  if (!result.rowCount) throw new HttpError(404, "Notification not found");
  res.json({ notification: result.rows[0] });
}));

router.patch("/read-all", asyncHandler(async (req, res) => {
  await query("UPDATE notifications SET is_read = TRUE, read_at = NOW() WHERE user_id = $1 AND is_read = FALSE", [req.user.id]);
  res.json({ message: "All notifications marked as read" });
}));

router.get("/settings", asyncHandler(async (req, res) => {
  const result = await query("SELECT * FROM notification_settings WHERE user_id = $1", [req.user.id]);
  res.json({ settings: result.rows[0] });
}));

router.patch("/settings", validate(settingsSchema), asyncHandler(async (req, res) => {
  const fields = {
    task_deadline_notif: req.body.taskDeadlineNotif,
    habit_reminder_notif: req.body.habitReminderNotif,
    email_notifications: req.body.emailNotifications,
    deadline_remind_minutes: req.body.deadlineRemindMinutes
  };
  const updates = Object.entries(fields).filter(([, value]) => value !== undefined);
  if (!updates.length) throw new HttpError(400, "No fields to update");
  const setSql = updates.map(([key], index) => `${key} = $${index + 2}`).join(", ");
  const result = await query(`UPDATE notification_settings SET ${setSql}, updated_at = NOW() WHERE user_id = $1 RETURNING *`, [req.user.id, ...updates.map(([, value]) => value)]);
  res.json({ settings: result.rows[0] });
}));

module.exports = router;
