const express = require("express");
const { z } = require("zod");
const { query } = require("../config/db");
const asyncHandler = require("../middleware/asyncHandler");
const validate = require("../middleware/validate");
const HttpError = require("../utils/httpError");

const router = express.Router();
const idParams = z.object({ params: z.object({ id: z.string().uuid() }) });
const eventBody = z.object({
  body: z.object({
    title: z.string().min(1).max(255),
    description: z.string().nullable().optional(),
    location: z.string().max(255).nullable().optional(),
    startAt: z.string().datetime(),
    endAt: z.string().datetime(),
    isAllDay: z.boolean().default(false),
    color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).nullable().optional(),
    recurrenceRule: z.string().max(255).nullable().optional()
  })
});

router.get("/", asyncHandler(async (req, res) => {
  const { from, to } = req.query;
  const filters = ["user_id = $1"];
  const params = [req.user.id];
  if (from) {
    params.push(from);
    filters.push(`end_at >= $${params.length}`);
  }
  if (to) {
    params.push(to);
    filters.push(`start_at <= $${params.length}`);
  }
  const result = await query(`SELECT * FROM events WHERE ${filters.join(" AND ")} ORDER BY start_at ASC`, params);
  res.json({ events: result.rows });
}));

router.post("/", validate(eventBody), asyncHandler(async (req, res) => {
  const result = await query(
    `INSERT INTO events (user_id, title, description, location, start_at, end_at, is_all_day, color, recurrence_rule)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
    [req.user.id, req.body.title, req.body.description || null, req.body.location || null, req.body.startAt, req.body.endAt, req.body.isAllDay, req.body.color || "#6366F1", req.body.recurrenceRule || null]
  );
  res.status(201).json({ event: result.rows[0] });
}));

router.patch("/:id", validate(idParams.merge(z.object({ body: eventBody.shape.body.partial() }))), asyncHandler(async (req, res) => {
  const fields = {
    title: req.body.title,
    description: req.body.description,
    location: req.body.location,
    start_at: req.body.startAt,
    end_at: req.body.endAt,
    is_all_day: req.body.isAllDay,
    color: req.body.color,
    recurrence_rule: req.body.recurrenceRule
  };
  const updates = Object.entries(fields).filter(([, value]) => value !== undefined);
  if (!updates.length) throw new HttpError(400, "No fields to update");
  const setSql = updates.map(([key], index) => `${key} = $${index + 3}`).join(", ");
  const result = await query(`UPDATE events SET ${setSql} WHERE id = $1 AND user_id = $2 RETURNING *`, [req.params.id, req.user.id, ...updates.map(([, value]) => value)]);
  if (!result.rowCount) throw new HttpError(404, "Event not found");
  res.json({ event: result.rows[0] });
}));

router.delete("/:id", validate(idParams), asyncHandler(async (req, res) => {
  const result = await query("DELETE FROM events WHERE id = $1 AND user_id = $2 RETURNING id", [req.params.id, req.user.id]);
  if (!result.rowCount) throw new HttpError(404, "Event not found");
  res.status(204).send();
}));

module.exports = router;
