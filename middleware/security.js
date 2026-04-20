/**
 * Global HTTP hardening aligned with OWASP Top 10 mitigations:
 * A05 misconfiguration (Helmet), A03 injection (mongo-sanitize, strict JSON size),
 * A04 insecure design (rate limits), A07 XSS (CSP), A02 auth failures (CORS allowlist).
 */
const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const hpp = require("hpp");
const mongoSanitize = require("express-mongo-sanitize");
const rateLimit = require("express-rate-limit");

const configureSecurity = (app) => {
  // SECURITY: Hides Express/Node version from response headers to reduce fingerprinting.
  app.disable("x-powered-by");

  // SECURITY: Sets 11 security-related HTTP response headers.
  app.use(helmet());

  // SECURITY: Custom Content Security Policy to reduce XSS and script injection risks.
  app.use(
    helmet.contentSecurityPolicy({
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:"],
        connectSrc:
          process.env.NODE_ENV === "production"
            ? ["'self'", process.env.CLIENT_URL || "*"]
            : ["'self'", "http://localhost:3000", "http://127.0.0.1:3000", "ws://localhost:*"],
        objectSrc: ["'none'"],
        frameSrc: ["'self'", "data:"],
        frameAncestors: ["'self'"],
        baseUri: ["'self'"],
        formAction: ["'self'"]
      }
    })
  );

  // SECURITY: Prevents clickjacking by restricting iframe embedding to same origin.
  app.use(helmet.frameguard({ action: "sameorigin" }));

  // SECURITY: CORS allows only trusted client origin to prevent unauthorized cross-origin requests.
  // SECURITY: credentials: true allows the browser to send/receive session cookies on cross-origin requests.
  app.use(cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    credentials: true
  }));

  // SECURITY: Prevents HTTP Parameter Pollution attacks.
  app.use(hpp());

  // SECURITY: Sanitizes request data against operator injection payloads.
  app.use(mongoSanitize());

  // JSON body limits: large attachments use /api/complaints mount in server.js (3mb).
};

// SECURITY: Global rate limiter blocks abuse by capping requests per IP.
const globalRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: "Too many requests",
    message: "Rate limit exceeded. Please try again later."
  }
});

// SECURITY: Strict complaint submission limiter slows spam and automated form abuse.
const complaintSubmissionLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: "Too many complaint submissions",
    message: "You can submit up to 5 complaints per hour."
  }
});

module.exports = {
  configureSecurity,
  globalRateLimiter,
  complaintSubmissionLimiter
};
