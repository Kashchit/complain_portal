const express = require("express");
const { body, param, validationResult } = require("express-validator");
const { insertComplaint, getComplaintByRef } = require("../db");
const { complaintSubmissionLimiter } = require("../middleware/security");
const { requireCustomerToken } = require("../middleware/customerToken");
const { broadcast } = require("../lib/adminSSE");
const { sendComplaintReceived } = require("../lib/mailer");
const { parseOptionalAttachment, complaintWithoutBlob } = require("../lib/attachment");

const router = express.Router();

// SECURITY: All string fields use express-validator escape + parameterized SQL in db layer — OWASP A03 SQLi & A07 XSS mitigation.

const createComplaintValidators = [
  body("name").trim().isLength({ min: 3, max: 100 }).escape(),
  body("email").trim().isEmail().normalizeEmail(),
  body("phone").trim().matches(/^[6-9]\d{9}$/).escape(),
  body("category").trim().notEmpty().isLength({ max: 50 }).escape(),
  body("subject").trim().isLength({ min: 10, max: 150 }).escape(),
  body("description").trim().isLength({ min: 50, max: 3000 }).escape(),
  body("priority").trim().isIn(["Low", "Medium", "High"]).escape(),
  body("attachmentMime").optional({ values: "null" }).isIn(["application/pdf", "image/jpeg", "image/png"]),
  body("attachmentBase64").optional({ values: "null" }).isString().isLength({ max: 3_500_000 })
];

router.post(
  "/",
  complaintSubmissionLimiter,
  requireCustomerToken,
  createComplaintValidators,
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ error: "Validation failed", details: errors.array() });
      }

      const submittedEmail = String(req.body.email || "")
        .trim()
        .toLowerCase();
      if (submittedEmail !== req.verifiedCustomerEmail) {
        return res.status(403).json({ error: "Email must match the address you verified with OTP" });
      }

      let attachment;
      try {
        attachment = parseOptionalAttachment(req.body);
      } catch (e) {
        const status = e.status || 400;
        return res.status(status).json({ error: e.message || "Invalid attachment" });
      }

      const complaint = await insertComplaint({ ...req.body, ...attachment });
      try {
        await sendComplaintReceived(complaint);
      } catch (mailErr) {
        console.error("Complaint confirmation email failed", mailErr);
      }
      try {
        broadcast("complaint_created", { complaint: complaintWithoutBlob(complaint) });
      } catch (broadcastErr) {
        console.error("Admin broadcast failed", broadcastErr);
      }
      return res.status(201).json({
        success: true,
        ref_number: complaint.ref_number,
        complaint: complaintWithoutBlob(complaint)
      });
    } catch (error) {
      return next(error);
    }
  }
);

router.get(
  "/:ref",
  [param("ref").trim().matches(/^CMP-\d{8}-[A-Z0-9]{6}$/).escape()],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ error: "Invalid reference number" });
      }

      const complaint = await getComplaintByRef(req.params.ref);
      if (!complaint) {
        return res.status(404).json({ error: "Not found" });
      }
      return res.status(200).json({ complaint });
    } catch (error) {
      return next(error);
    }
  }
);

module.exports = router;
