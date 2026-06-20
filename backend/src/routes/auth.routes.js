const bcrypt = require("bcryptjs");
const express = require("express");
const jwt = require("jsonwebtoken");
const { z } = require("zod");
const { query, transaction } = require("../config/db");
const env = require("../config/env");
const asyncHandler = require("../middleware/asyncHandler");
const validate = require("../middleware/validate");
const HttpError = require("../utils/httpError");
const { hashToken, randomToken, signAccessToken, signRefreshToken } = require("../utils/tokens");

const router = express.Router();

const registerSchema = z.object({
  body: z.object({
    email: z.string().email().transform((value) => value.toLowerCase()),
    password: z.string().min(8),
    fullName: z.string().min(2).max(100)
  })
});

const loginSchema = z.object({
  body: z.object({
    email: z.string().email().transform((value) => value.toLowerCase()),
    password: z.string().min(1)
  })
});

const refreshSchema = z.object({
  body: z.object({
    refreshToken: z.string().min(20)
  })
});

const forgotPasswordSchema = z.object({
  body: z.object({
    email: z.string().email().transform((value) => value.toLowerCase())
  })
});

const resetPasswordSchema = z.object({
  body: z.object({
    token: z.string().min(20),
    password: z.string().min(8)
  })
});

function sanitizeUser(user) {
  const { password_hash: passwordHash, ...safeUser } = user;
  return safeUser;
}

async function createRefreshToken(client, user, refreshToken) {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + env.refreshTokenExpiresInDays);
  await client.query(
    "INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)",
    [user.id, hashToken(refreshToken), expiresAt]
  );
}

router.post("/register", validate(registerSchema), asyncHandler(async (req, res) => {
  const { email, password, fullName } = req.body;
  const existing = await query("SELECT id FROM users WHERE email = $1", [email]);
  if (existing.rowCount) {
    throw new HttpError(409, "Email already exists");
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const result = await transaction(async (client) => {
    const created = await client.query(
      `INSERT INTO users (email, password_hash, full_name)
       VALUES ($1, $2, $3)
       RETURNING id, email, full_name, avatar_url, role, is_active, is_email_verified, timezone, language, theme, week_start_day, time_format, created_at`,
      [email, passwordHash, fullName]
    );

    const user = created.rows[0];
    await client.query("INSERT INTO pomodoro_settings (user_id) VALUES ($1)", [user.id]);
    await client.query("INSERT INTO notification_settings (user_id) VALUES ($1)", [user.id]);

    const verificationToken = randomToken();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await client.query(
      "INSERT INTO email_tokens (user_id, token_hash, type, expires_at) VALUES ($1, $2, 'email_verification', $3)",
      [user.id, hashToken(verificationToken), expiresAt]
    );

    return { user, verificationToken };
  });

  res.status(201).json({
    user: result.user,
    emailVerificationToken: result.verificationToken
  });
}));

router.post("/login", validate(loginSchema), asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const result = await query("SELECT * FROM users WHERE email = $1", [email]);
  const user = result.rows[0];
  if (!user || !user.password_hash) {
    throw new HttpError(401, "Invalid email or password");
  }

  const matches = await bcrypt.compare(password, user.password_hash);
  if (!matches || !user.is_active) {
    throw new HttpError(401, "Invalid email or password");
  }

  const accessToken = signAccessToken(user);
  const refreshToken = signRefreshToken(user);

  await transaction(async (client) => {
    await client.query("UPDATE users SET last_login_at = NOW() WHERE id = $1", [user.id]);
    await createRefreshToken(client, user, refreshToken);
  });

  res.json({
    user: sanitizeUser(user),
    accessToken,
    refreshToken
  });
}));

router.post("/refresh", validate(refreshSchema), asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;
  let payload;
  try {
    payload = jwt.verify(refreshToken, env.jwtRefreshSecret);
  } catch (error) {
    throw new HttpError(401, "Invalid refresh token");
  }

  const tokenHash = hashToken(refreshToken);
  const stored = await query(
    `SELECT rt.id, rt.user_id, u.email, u.role, u.is_active
     FROM refresh_tokens rt
     JOIN users u ON u.id = rt.user_id
     WHERE rt.token_hash = $1 AND rt.user_id = $2 AND rt.is_revoked = FALSE AND rt.expires_at > NOW()`,
    [tokenHash, payload.sub]
  );

  const record = stored.rows[0];
  if (!record || !record.is_active) {
    throw new HttpError(401, "Refresh token is revoked or expired");
  }

  const user = { id: record.user_id, email: record.email, role: record.role };
  const accessToken = signAccessToken(user);
  res.json({ accessToken });
}));

router.post("/logout", validate(refreshSchema), asyncHandler(async (req, res) => {
  await query("UPDATE refresh_tokens SET is_revoked = TRUE WHERE token_hash = $1", [hashToken(req.body.refreshToken)]);
  res.status(204).send();
}));

router.post("/forgot-password", validate(forgotPasswordSchema), asyncHandler(async (req, res) => {
  const result = await query("SELECT id FROM users WHERE email = $1", [req.body.email]);
  if (!result.rowCount) {
    return res.json({ message: "If the email exists, a reset token was created" });
  }

  const token = randomToken();
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
  await query(
    "INSERT INTO email_tokens (user_id, token_hash, type, expires_at) VALUES ($1, $2, 'password_reset', $3)",
    [result.rows[0].id, hashToken(token), expiresAt]
  );

  res.json({ resetToken: token });
}));

router.post("/reset-password", validate(resetPasswordSchema), asyncHandler(async (req, res) => {
  const tokenHash = hashToken(req.body.token);
  const token = await query(
    "SELECT id, user_id FROM email_tokens WHERE token_hash = $1 AND type = 'password_reset' AND used_at IS NULL AND expires_at > NOW()",
    [tokenHash]
  );

  if (!token.rowCount) {
    throw new HttpError(400, "Invalid or expired reset token");
  }

  const passwordHash = await bcrypt.hash(req.body.password, 12);
  await transaction(async (client) => {
    await client.query("UPDATE users SET password_hash = $1 WHERE id = $2", [passwordHash, token.rows[0].user_id]);
    await client.query("UPDATE email_tokens SET used_at = NOW() WHERE id = $1", [token.rows[0].id]);
    await client.query("UPDATE refresh_tokens SET is_revoked = TRUE WHERE user_id = $1", [token.rows[0].user_id]);
  });

  res.json({ message: "Password reset successfully" });
}));

module.exports = router;
