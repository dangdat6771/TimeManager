const express = require("express");
const { z } = require("zod");
const { query } = require("../config/db");
const asyncHandler = require("../middleware/asyncHandler");
const validate = require("../middleware/validate");
const HttpError = require("../utils/httpError");

const router = express.Router();

const paramsSchema = z.object({ params: z.object({ id: z.string().uuid() }) });
const bodySchema = z.object({
  body: z.object({
    name: z.string().min(1).max(50),
    color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).default("#94A3B8")
  })
});

router.get("/", asyncHandler(async (req, res) => {
  const result = await query("SELECT * FROM tags WHERE user_id = $1 ORDER BY name ASC", [req.user.id]);
  res.json({ tags: result.rows });
}));

router.post("/", validate(bodySchema), asyncHandler(async (req, res) => {
  const result = await query(
    "INSERT INTO tags (user_id, name, color) VALUES ($1, $2, $3) RETURNING *",
    [req.user.id, req.body.name, req.body.color]
  );
  res.status(201).json({ tag: result.rows[0] });
}));

router.patch("/:id", validate(paramsSchema.merge(z.object({ body: bodySchema.shape.body.partial() }))), asyncHandler(async (req, res) => {
  const updates = Object.entries({ name: req.body.name, color: req.body.color }).filter(([, value]) => value !== undefined);
  if (!updates.length) throw new HttpError(400, "No fields to update");
  const setSql = updates.map(([key], index) => `${key} = $${index + 3}`).join(", ");
  const result = await query(`UPDATE tags SET ${setSql} WHERE id = $1 AND user_id = $2 RETURNING *`, [req.params.id, req.user.id, ...updates.map(([, value]) => value)]);
  if (!result.rowCount) throw new HttpError(404, "Tag not found");
  res.json({ tag: result.rows[0] });
}));

router.delete("/:id", validate(paramsSchema), asyncHandler(async (req, res) => {
  const result = await query("DELETE FROM tags WHERE id = $1 AND user_id = $2 RETURNING id", [req.params.id, req.user.id]);
  if (!result.rowCount) throw new HttpError(404, "Tag not found");
  res.status(204).send();
}));

module.exports = router;
