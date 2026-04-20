require("dotenv").config();
const path = require("path");
const express = require("express");
const cookieParser = require("cookie-parser");
const { ensureTable } = require("./db");
const authRoutes = require("./routes/auth");
const complaintsRoutes = require("./routes/complaints");
const adminRoutes = require("./routes/admin");
const customerRoutes = require("./routes/customer");
const { revokeToken } = require("./lib/customerSessions");
const { configureSecurity, globalRateLimiter } = require("./middleware/security");

const app = express();
const PORT = process.env.PORT || 3000;

configureSecurity(app);
app.use(cookieParser(process.env.SESSION_SECRET || "dev-cookie-secret-change-in-production"));
app.use(globalRateLimiter);

app.use("/api/complaints", express.json({ limit: "3mb" }));
app.use("/api/complaints", complaintsRoutes);

app.use(express.json({ limit: "48kb" }));
app.use(express.urlencoded({ extended: false, limit: "48kb" }));

app.use((req, res, next) => {
  const started = process.hrtime.bigint();
  res.on("finish", () => {
    const elapsedMs = Number(process.hrtime.bigint() - started) / 1_000_000;
    const safePath = String(req.originalUrl).replace(/([?&]key=)[^&]*/gi, "$1***");
    console.log(`${req.method} ${safePath} ${res.statusCode} ${elapsedMs.toFixed(2)}ms`);
  });
  next();
});

app.get("/api/health", async (req, res) => {
  res.status(200).json({
    status: "ok",
    version: "1.0.0",
    timestamp: new Date().toISOString(),
    db: "neon"
  });
});

app.use("/api/auth", authRoutes);

// SECURITY: Logout endpoint — clears session cookie and revokes server-side token.
app.post("/api/auth/logout", (req, res) => {
  const token = req.signedCookies.session_token;
  if (token) {
    revokeToken(token);
  }
  res.clearCookie("session_token", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/"
  });
  return res.status(200).json({ success: true, message: "Logged out" });
});

app.use("/api/customer", customerRoutes);
app.use("/api/admin", adminRoutes);

if (process.env.NODE_ENV === "production") {
  app.use(express.static(path.join(__dirname, "client/dist")));
  app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "client/dist/index.html"));
  });
}

app.use((err, req, res, next) => {
  const status = err.status || 500;
  const message = process.env.NODE_ENV === "production" ? "Internal server error" : err.message;
  const payload = {
    error: err.name || "Error",
    message,
    status
  };

  if (process.env.NODE_ENV !== "production" && err.stack) {
    payload.stack = err.stack;
  }

  res.status(status).json(payload);
});

ensureTable()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server listening on port ${PORT}`);
    });
  })
  .catch((error) => {
    console.error("Failed to initialize database", error);
    process.exit(1);
  });
