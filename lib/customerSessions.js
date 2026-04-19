const crypto = require("crypto");

const sessions = new Map();
const TOKEN_TTL_MS = 24 * 60 * 60 * 1000;

const createToken = (email) => {
  const token = crypto.randomBytes(32).toString("hex");
  sessions.set(token, {
    email: email.toLowerCase(),
    expiresAt: Date.now() + TOKEN_TTL_MS
  });
  return token;
};

const validateToken = (token) => {
  if (!token) return null;
  const entry = sessions.get(token);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    sessions.delete(token);
    return null;
  }
  return entry.email;
};

const revokeToken = (token) => {
  sessions.delete(token);
};

module.exports = {
  createToken,
  validateToken,
  revokeToken
};
