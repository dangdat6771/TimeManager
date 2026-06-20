const jwt = require("jsonwebtoken");
const { query } = require("../config/db");
const env = require("../config/env");
const HttpError = require("../utils/httpError");
const asyncHandler = require("./asyncHandler");

const authenticate = asyncHandler(async (req, res, next) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    throw new HttpError(401, "Missing authorization token");
  }

  const token = header.slice("Bearer ".length);
  let payload;
  try {
    payload = jwt.verify(token, env.jwtAccessSecret);
  } catch (error) {
    throw new HttpError(401, "Invalid or expired token");
  }

  const result = await query(
    "SELECT id, email, full_name, avatar_url, role, is_active, timezone, language, theme, week_start_day, time_format FROM users WHERE id = $1",
    [payload.sub]
  );

  const user = result.rows[0];
  if (!user || !user.is_active) {
    throw new HttpError(401, "User is inactive or does not exist");
  }

  req.user = user;
  return next();
});

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return next(new HttpError(403, "Permission denied"));
    }
    return next();
  };
}

module.exports = {
  authenticate,
  requireRole
};
