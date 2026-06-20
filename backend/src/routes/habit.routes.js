const express = require("express");
const { z } = require("zod");
const { query, transaction } = require("../config/db");
const asyncHandler = require("../middleware/asyncHandler");
const validate = require("../middleware/validate");
const HttpError = require("../utils/httpError");

const router = express.Router();
const idParams = z.object({ params: z.object({ id: z.string().uuid() }) });
const habitBody = z.object({
  body: z.object({
    name: z.string().min(1).max(100),
    description: z.string().nullable().optional(),
    icon: z.string().max(50).nullable().optional(),
    color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).default("#10B981"),
    frequencyType: z.enum(["daily", "weekly", "custom"]).default("daily"),
    frequencyDays: z.array(z.coerce.number().int().min(0).max(6)).optional(),
    reminderTime: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/).nullable().optional(),
    targetStreak: z.coerce.number().int().min(0).default(0),
    isActive: z.boolean().default(true)
  })
});

const checkInSchema = z.object({
  params: z.object({ id: z.string().uuid() }),
  body: z.object({
    logDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    isCompleted: z.boolean().default(true),
    note: z.string().nullable().optional()
  })
});

async function ensureHabitOwner(client, habitId, userId) {
  const result = await client.query("SELECT id FROM habits WHERE id = $1 AND user_id = $2", [habitId, userId]);
  if (!result.rowCount) throw new HttpError(404, "Habit not found");
}

async function refreshStreak(client, habitId) {
  const logs = await client.query(
    "SELECT log_date FROM habit_logs WHERE habit_id = $1 AND is_completed = TRUE ORDER BY log_date DESC",
    [habitId]
  );

  let current = 0;
  let longest = 0;
  let run = 0;
  let expected = null;
  for (const row of logs.rows) {
    const currentDate = new Date(row.log_date);
    if (!expected) {
      current = 1;
      run = 1;
      expected = new Date(currentDate);
      expected.setDate(expected.getDate() - 1);
    } else {
      const sameDay = currentDate.toISOString().slice(0, 10) === expected.toISOString().slice(0, 10);
      run = sameDay ? run + 1 : 1;
      if (sameDay && current === run - 1) current = run;
      expected = new Date(currentDate);
      expected.setDate(expected.getDate() - 1);
    }
    longest = Math.max(longest, run);
  }

  await client.query(
    `INSERT INTO habit_streaks (habit_id, current_streak, longest_streak, last_check_date)
     VALUES ($1, $2, $3, (SELECT MAX(log_date) FROM habit_logs WHERE habit_id = $1 AND is_completed = TRUE))
     ON CONFLICT (habit_id) DO UPDATE
     SET current_streak = EXCLUDED.current_streak,
         longest_streak = GREATEST(habit_streaks.longest_streak, EXCLUDED.longest_streak),
         last_check_date = EXCLUDED.last_check_date,
         updated_at = NOW()`,
    [habitId, current, longest]
  );
}

router.get("/", asyncHandler(async (req, res) => {
  const result = await query(
    `SELECT h.*, COALESCE(hs.current_streak, 0) AS current_streak, COALESCE(hs.longest_streak, 0) AS longest_streak
     FROM habits h
     LEFT JOIN habit_streaks hs ON hs.habit_id = h.id
     WHERE h.user_id = $1
     ORDER BY h.is_active DESC, h.created_at DESC`,
    [req.user.id]
  );
  res.json({ habits: result.rows });
}));

router.post("/", validate(habitBody), asyncHandler(async (req, res) => {
  const result = await transaction(async (client) => {
    const inserted = await client.query(
      `INSERT INTO habits (user_id, name, description, icon, color, frequency_type, frequency_days, reminder_time, target_streak, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
      [req.user.id, req.body.name, req.body.description || null, req.body.icon || null, req.body.color, req.body.frequencyType, req.body.frequencyDays || [0, 1, 2, 3, 4, 5, 6], req.body.reminderTime || null, req.body.targetStreak, req.body.isActive]
    );
    await client.query("INSERT INTO habit_streaks (habit_id) VALUES ($1)", [inserted.rows[0].id]);
    return inserted.rows[0];
  });
  res.status(201).json({ habit: result });
}));

router.patch("/:id", validate(idParams.merge(z.object({ body: habitBody.shape.body.partial() }))), asyncHandler(async (req, res) => {
  const fields = {
    name: req.body.name,
    description: req.body.description,
    icon: req.body.icon,
    color: req.body.color,
    frequency_type: req.body.frequencyType,
    frequency_days: req.body.frequencyDays,
    reminder_time: req.body.reminderTime,
    target_streak: req.body.targetStreak,
    is_active: req.body.isActive
  };
  const updates = Object.entries(fields).filter(([, value]) => value !== undefined);
  if (!updates.length) throw new HttpError(400, "No fields to update");
  const setSql = updates.map(([key], index) => `${key} = $${index + 3}`).join(", ");
  const result = await query(`UPDATE habits SET ${setSql} WHERE id = $1 AND user_id = $2 RETURNING *`, [req.params.id, req.user.id, ...updates.map(([, value]) => value)]);
  if (!result.rowCount) throw new HttpError(404, "Habit not found");
  res.json({ habit: result.rows[0] });
}));

router.post("/:id/check-ins", validate(checkInSchema), asyncHandler(async (req, res) => {
  const result = await transaction(async (client) => {
    await ensureHabitOwner(client, req.params.id, req.user.id);
    const log = await client.query(
      `INSERT INTO habit_logs (habit_id, user_id, log_date, is_completed, note)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (habit_id, log_date) DO UPDATE
       SET is_completed = EXCLUDED.is_completed, note = EXCLUDED.note
       RETURNING *`,
      [req.params.id, req.user.id, req.body.logDate, req.body.isCompleted, req.body.note || null]
    );
    await refreshStreak(client, req.params.id);
    return log.rows[0];
  });
  res.status(201).json({ habitLog: result });
}));

router.get("/:id/logs", validate(idParams), asyncHandler(async (req, res) => {
  const result = await query(
    `SELECT hl.* FROM habit_logs hl
     JOIN habits h ON h.id = hl.habit_id
     WHERE hl.habit_id = $1 AND h.user_id = $2
     ORDER BY hl.log_date DESC`,
    [req.params.id, req.user.id]
  );
  res.json({ logs: result.rows });
}));

router.delete("/:id", validate(idParams), asyncHandler(async (req, res) => {
  const result = await query("DELETE FROM habits WHERE id = $1 AND user_id = $2 RETURNING id", [req.params.id, req.user.id]);
  if (!result.rowCount) throw new HttpError(404, "Habit not found");
  res.status(204).send();
}));

module.exports = router;
