const express = require("express");
const rateLimit = require("express-rate-limit");
const bcrypt = require("bcryptjs");
const { body, validationResult } = require("express-validator");
const { setOtp, verifyOtp } = require("../lib/otpStore");
const { createToken } = require("../lib/customerSessions");
const { sendMailSafe, isMailConfigured } = require("../lib/mailer");
const { findCustomerByEmail, createCustomer, normalizeEmail } = require("../db");

const router = express.Router();

// SECURITY: Rate limit OTP requests to reduce email abuse.
const otpSendLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many OTP requests", message: "Try again later." }
});

// SECURITY: Rate limit registration attempts after OTP is issued.
const registerLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many attempts", message: "Try again later." }
});

// SECURITY: Rate limit login to slow brute-force attacks on customer passwords.
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many login attempts", message: "Try again later." }
});

const randomSixDigit = () => String(Math.floor(100000 + Math.random() * 900000));

router.post(
  "/customer/send-registration-otp",
  otpSendLimiter,
  [body("email").trim().isEmail().normalizeEmail()],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ error: "Invalid email" });
      }

      const email = normalizeEmail(req.body.email);
      const existing = await findCustomerByEmail(email);
      if (existing) {
        return res.status(409).json({
          error: "Account already exists",
          message: "Sign in with your email and password."
        });
      }

      const code = randomSixDigit();
      setOtp(email, code);

      if (isMailConfigured()) {
        await sendMailSafe({
          to: email,
          subject: "Your registration code — ComplainHub",
          text: `Your one-time registration code is: ${code}\n\nThis code expires in 5 minutes.\n\nUse it only on our official site to create your ticket portal account.\n\nIf you did not request this, ignore this email.`,
          html: `<p>Your one-time registration code is:</p><p style="font-size:24px;font-weight:bold;">${code}</p><p>This code expires in <strong>5 minutes</strong>.</p><p>Use it only on our official site.</p>`
        });
      } else if (process.env.NODE_ENV !== "production") {
        console.warn(`[OTP dev] registration ${email} => ${code} (configure SMTP_* in .env)`);
      }

      return res.status(200).json({
        success: true,
        message: isMailConfigured()
          ? "OTP sent to your email (valid 5 minutes)"
          : "OTP generated — configure SMTP for email delivery; in development check server logs (valid 5 minutes)"
      });
    } catch (error) {
      return next(error);
    }
  }
);

router.post(
  "/customer/register",
  registerLimiter,
  [
    body("email").trim().isEmail().normalizeEmail(),
    body("code").trim().matches(/^\d{6}$/),
    body("name").trim().isLength({ min: 3, max: 100 }).escape(),
    body("password")
      .isLength({ min: 12, max: 128 })
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).+$/)
      .withMessage(
        "Password must be 12–128 characters with uppercase, lowercase, a number, and a special character (OWASP password strength)"
      ),
    body("confirmPassword").custom((value, { req }) => value === req.body.password)
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ error: "Validation failed", details: errors.array() });
      }

      const email = normalizeEmail(req.body.email);
      const existing = await findCustomerByEmail(email);
      if (existing) {
        return res.status(409).json({ error: "Account already exists", message: "Sign in instead." });
      }

      const otpResult = verifyOtp(email, req.body.code);
      if (!otpResult.ok) {
        return res.status(400).json({ error: "Invalid or expired OTP" });
      }

      const passwordHash = await bcrypt.hash(req.body.password, 12);
      const customer = await createCustomer({
        email,
        passwordHash,
        displayName: req.body.name
      });

      const customerToken = createToken(email);
      return res.status(201).json({
        success: true,
        customerToken,
        profile: { email: customer.email, displayName: customer.display_name }
      });
    } catch (error) {
      return next(error);
    }
  }
);

router.post(
  "/customer/login",
  loginLimiter,
  [
    body("email").trim().isEmail().normalizeEmail(),
    body("password").isLength({ min: 1, max: 128 })
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ error: "Validation failed", details: errors.array() });
      }

      const email = normalizeEmail(req.body.email);
      const user = await findCustomerByEmail(email);
      const valid = user && (await bcrypt.compare(req.body.password, user.password_hash));
      if (!valid) {
        return res.status(401).json({ error: "Invalid credentials", message: "Incorrect email or password." });
      }

      const customerToken = createToken(email);
      return res.status(200).json({
        success: true,
        customerToken,
        profile: { email: user.email, displayName: user.display_name }
      });
    } catch (error) {
      return next(error);
    }
  }
);

module.exports = router;
