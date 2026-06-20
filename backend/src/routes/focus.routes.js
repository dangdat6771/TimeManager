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
    workDuration: z.coerce.number().int().min(1).max(180).optional(),
    shortBreak: z.coerce.number().int().min(1).max(60).optional(),
    longBreak: z.coerce.number().int().min(1).max(120).optional(),
    sessionsUntilLong: z.coerce.number().int().min(1).max(12).optional(),
    autoStartBreak: z.boolean().optional(),
    autoStartWork: z.boolean().optional()
  })
});

const sessionSchema = z.object({
  body: z.object({
    taskId: z.string().uuid().nullable().optional(),
    type: z.enum(["work", "short_break", "long_break"]).default("work"),
    plannedDuration: z.coerce.number().int().min(1).max(180)
  })
});

const finishSchema = z.object({
  params: z.object({ id: z.string().uuid() }),
  body: z.object({
    status: z.enum(["completed", "paused", "cancelled"]),
    actualDuration: z.coerce.number().int().min(0).optional()
  })
});

router.get("/settings", asyncHandler(async (req, res) => {
  const result = await query("SELECT * FROM pomodoro_settings WHERE user_id = $1", [req.user.id]);
  res.json({ settings: result.rows[0] });
}));

router.patch("/settings", validate(settingsSchema), asyncHandler(async (req, res) => {
  const fields = {
    work_duration: req.body.workDuration,
    short_break: req.body.shortBreak,
    long_break: req.body.longBreak,
    sessions_until_long: req.body.sessionsUntilLong,
    auto_start_break: req.body.autoStartBreak,
    auto_start_work: req.body.autoStartWork
  };
  const updates = Object.entries(fields).filter(([, value]) => value !== undefined);
  if (!updates.length) throw new HttpError(400, "No fields to update");
  const setSql = updates.map(([key], index) => `${key} = $${index + 2}`).join(", ");
  const result = await query(`UPDATE pomodoro_settings SET ${setSql}, updated_at = NOW() WHERE user_id = $1 RETURNING *`, [req.user.id, ...updates.map(([, value]) => value)]);
  res.json({ settings: result.rows[0] });
}));

router.get("/sessions", asyncHandler(async (req, res) => {
  const result = await query(
    "SELECT * FROM focus_sessions WHERE user_id = $1 ORDER BY started_at DESC LIMIT 100",
    [req.user.id]
  );
  res.json({ sessions: result.rows });
}));

router.post("/sessions", validate(sessionSchema), asyncHandler(async (req, res) => {
  const result = await query(
    `INSERT INTO focus_sessions (user_id, task_id, type, planned_duration)
     VALUES ($1, $2, $3, $4) RETURNING *`,
    [req.user.id, req.body.taskId || null, req.body.type, req.body.plannedDuration]
  );
  res.status(201).json({ session: result.rows[0] });
}));

router.patch("/sessions/:id/finish", validate(finishSchema), asyncHandler(async (req, res) => {
  const result = await query(
    `UPDATE focus_sessions
     SET status = $3, actual_duration = $4, ended_at = NOW()
     WHERE id = $1 AND user_id = $2
     RETURNING *`,
    [req.params.id, req.user.id, req.body.status, req.body.actualDuration || null]
  );
  if (!result.rowCount) throw new HttpError(404, "Focus session not found");
  res.json({ session: result.rows[0] });
}));

router.delete("/sessions/:id", validate(idParams), asyncHandler(async (req, res) => {
  const result = await query("DELETE FROM focus_sessions WHERE id = $1 AND user_id = $2 RETURNING id", [req.params.id, req.user.id]);
  if (!result.rowCount) throw new HttpError(404, "Focus session not found");
  res.status(204).send();
}));

module.exports = router;
