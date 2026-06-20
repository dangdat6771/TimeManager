const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const env = require("../config/env");

function signAccessToken(user) {
  return jwt.sign(
    { sub: user.id, role: user.role, email: user.email },
    env.jwtAccessSecret,
    { expiresIn: env.accessTokenExpiresIn }
  );
}

function signRefreshToken(user) {
  return jwt.sign(
    { sub: user.id, type: "refresh" },
    env.jwtRefreshSecret,
    { expiresIn: `${env.refreshTokenExpiresInDays}d` }
  );
}

function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function randomToken() {
  return crypto.randomBytes(32).toString("hex");
}

module.exports = {
  signAccessToken,
  signRefreshToken,
  hashToken,
  randomToken
};
