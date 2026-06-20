const express = require("express");
const bcrypt = require("bcryptjs");
const { z } = require("zod");
const { query } = require("../config/db");
const asyncHandler = require("../middleware/asyncHandler");
const validate = require("../middleware/validate");
const HttpError = require("../utils/httpError");

const router = express.Router();

const updateProfileSchema = z.object({
  body: z.object({
    fullName: z.string().min(2).max(100).optional(),
    avatarUrl: z.string().url().nullable().optional(),
    timezone: z.string().min(2).max(50).optional(),
    language: z.string().min(2).max(10).optional(),
    theme: z.enum(["light", "dark"]).optional(),
    weekStartDay: z.coerce.number().int().min(0).max(6).optional(),
    timeFormat: z.enum(["12h", "24h"]).optional()
  })
});

const changePasswordSchema = z.object({
  body: z.object({
    currentPassword: z.string().min(1),
    newPassword: z.string().min(8).max(128)
  })
});

router.get("/me", (req, res) => {
  res.json({ user: req.user });
});

router.patch("/me", validate(updateProfileSchema), asyncHandler(async (req, res) => {
  const values = {
    full_name: req.body.fullName,
    avatar_url: req.body.avatarUrl,
    timezone: req.body.timezone,
    language: req.body.language,
    theme: req.body.theme,
    week_start_day: req.body.weekStartDay,
    time_format: req.body.timeFormat
  };

  const entries = Object.entries(values).filter(([, value]) => value !== undefined);
  if (!entries.length) {
    return res.json({ user: req.user });
  }

  const setSql = entries.map(([key], index) => `${key} = $${index + 2}`).join(", ");
  const result = await query(
    `UPDATE users SET ${setSql} WHERE id = $1
     RETURNING id, email, full_name, avatar_url, role, is_active, timezone, language, theme, week_start_day, time_format`,
    [req.user.id, ...entries.map(([, value]) => value)]
  );

  res.json({ user: result.rows[0] });
}));

router.patch("/password", validate(changePasswordSchema), asyncHandler(async (req, res) => {
  const result = await query("SELECT password_hash FROM users WHERE id = $1", [req.user.id]);
  const user = result.rows[0];
  if (!user || !user.password_hash) {
    throw new HttpError(400, "Password login is not available for this account");
  }

  const matches = await bcrypt.compare(req.body.currentPassword, user.password_hash);
  if (!matches) {
    throw new HttpError(400, "Current password is incorrect");
  }

  const passwordHash = await bcrypt.hash(req.body.newPassword, 12);
  await query("UPDATE users SET password_hash = $1 WHERE id = $2", [passwordHash, req.user.id]);
  await query("UPDATE refresh_tokens SET is_revoked = TRUE WHERE user_id = $1", [req.user.id]);

  res.json({ message: "Password changed successfully" });
}));

module.exports = router;
