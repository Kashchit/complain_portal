const { validateToken } = require("../lib/customerSessions");

// SECURITY: Ticket creation is restricted to verified customers only (no admin API bypass) — OWASP A01 broken access control.
const requireCustomerToken = (req, res, next) => {
  const token = req.header("X-Customer-Token");
  const email = validateToken(token);
  if (!email) {
    return res.status(401).json({ error: "Unauthorized", message: "Valid customer session required" });
  }
  req.verifiedCustomerEmail = email;
  return next();
};

module.exports = { requireCustomerToken };
