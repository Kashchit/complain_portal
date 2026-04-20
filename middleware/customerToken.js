const { validateToken } = require("../lib/customerSessions");

// SECURITY: Ticket creation is restricted to verified customers only (no admin API bypass) — OWASP A01 broken access control.
// Reads session from httpOnly signed cookie (primary) or X-Customer-Token header (fallback).
const requireCustomerToken = (req, res, next) => {
  const token = (req.signedCookies && req.signedCookies.session_token) || req.header("X-Customer-Token");
  const email = validateToken(token);
  if (!email) {
    return res.status(401).json({ error: "Unauthorized", message: "Valid customer session required" });
  }
  req.verifiedCustomerEmail = email;
  return next();
};

module.exports = { requireCustomerToken };
