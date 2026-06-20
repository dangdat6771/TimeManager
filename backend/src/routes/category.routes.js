const express = require("express");
const { z } = require("zod");
const { query } = require("../config/db");
const asyncHandler = require("../middleware/asyncHandler");
const validate = require("../middleware/validate");
const HttpError = require("../utils/httpError");

const router = express.Router();

const categorySchema = z.object({
  body: z.object({
    name: z.string().min(1).max(100),
    color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).default("#6366F1"),
    icon: z.string().max(50).nullable().optional()
  })
});

router.get("/", asyncHandler(async (req, res) => {
  const result = await query(
    "SELECT * FROM categories WHERE user_id = $1 OR user_id IS NULL ORDER BY is_default DESC, name ASC",
    [req.user.id]
  );
  res.json({ categories: result.rows });
}));

router.post("/", validate(categorySchema), asyncHandler(async (req, res) => {
  const result = await query(
    "INSERT INTO categories (user_id, name, color, icon) VALUES ($1, $2, $3, $4) RETURNING *",
    [req.user.id, req.body.name, req.body.color, req.body.icon || null]
  );
  res.status(201).json({ category: result.rows[0] });
}));

router.patch("/:id", validate(categorySchema.partial({ body: true }).extend({
  params: z.object({ id: z.string().uuid() }),
  body: categorySchema.shape.body.partial()
})), asyncHandler(async (req, res) => {
  const updates = Object.entries({ name: req.body.name, color: req.body.color, icon: req.body.icon })
    .filter(([, value]) => value !== undefined);
  if (!updates.length) throw new HttpError(400, "No fields to update");

  const setSql = updates.map(([key], index) => `${key} = $${index + 3}`).join(", ");
  const result = await query(
    `UPDATE categories SET ${setSql} WHERE id = $1 AND user_id = $2 RETURNING *`,
    [req.params.id, req.user.id, ...updates.map(([, value]) => value)]
  );
  if (!result.rowCount) throw new HttpError(404, "Category not found");
  res.json({ category: result.rows[0] });
}));

router.delete("/:id", validate(z.object({ params: z.object({ id: z.string().uuid() }) })), asyncHandler(async (req, res) => {
  const result = await query("DELETE FROM categories WHERE id = $1 AND user_id = $2 RETURNING id", [req.params.id, req.user.id]);
  if (!result.rowCount) throw new HttpError(404, "Category not found");
  res.status(204).send();
}));

module.exports = router;
