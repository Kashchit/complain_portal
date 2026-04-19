const express = require("express");
const { body, param, query, validationResult } = require("express-validator");
const {
  getAllComplaints,
  getComplaintById,
  updateComplaintStatus,
  deleteComplaint,
  getStats,
  getAdminInsights
} = require("../db");
const { complaintWithoutBlob } = require("../lib/attachment");
const { addClient, removeClient, broadcast } = require("../lib/adminSSE");
const { sendStatusUpdate } = require("../lib/mailer");

const router = express.Router();

const adminKeyOk = (req) => {
  const headerKey = req.header("X-Admin-Key");
  const queryKey = req.query && typeof req.query.key === "string" ? req.query.key : "";
  const candidate = headerKey || queryKey;
  return candidate && candidate === process.env.ADMIN_KEY;
};

router.get("/stream", (req, res) => {
  if (!adminKeyOk(req)) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  res.status(200);
  res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  if (typeof res.flushHeaders === "function") {
    res.flushHeaders();
  }

  res.write("event: connected\ndata: {}\n\n");
  addClient(res);

  const ping = setInterval(() => {
    try {
      res.write("event: ping\ndata: {}\n\n");
    } catch {
      clearInterval(ping);
      removeClient(res);
    }
  }, 25000);

  req.on("close", () => {
    clearInterval(ping);
    removeClient(res);
  });
});

const checkAdminKey = (req, res, next) => {
  if (!adminKeyOk(req)) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  return next();
};

router.use(checkAdminKey);

router.get(
  "/complaints",
  [
    query("category").optional().trim().isLength({ min: 1, max: 50 }).escape(),
    query("status").optional().trim().isIn(["Open", "Under Review", "Resolved"]).escape(),
    query("priority").optional().trim().isIn(["Low", "Medium", "High"]).escape()
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ error: "Invalid filters", details: errors.array() });
      }

      const complaints = await getAllComplaints(req.query);
      return res.status(200).json({ complaints });
    } catch (error) {
      return next(error);
    }
  }
);

router.get("/complaints/:id", [param("id").isInt({ min: 1 })], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: "Validation failed", details: errors.array() });
    }
    const complaint = await getComplaintById(Number(req.params.id));
    if (!complaint) {
      return res.status(404).json({ error: "Not found" });
    }
    return res.status(200).json({ complaint });
  } catch (error) {
    return next(error);
  }
});

router.get("/stats", async (req, res, next) => {
  try {
    const stats = await getStats();
    return res.status(200).json(stats);
  } catch (error) {
    return next(error);
  }
});

router.get("/insights", async (req, res, next) => {
  try {
    const insights = await getAdminInsights();
    return res.status(200).json(insights);
  } catch (error) {
    return next(error);
  }
});

router.patch(
  "/complaints/:id/status",
  [
    param("id").isInt({ min: 1 }),
    body("status").trim().isIn(["Open", "Under Review", "Resolved"]).escape()
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ error: "Validation failed", details: errors.array() });
      }

      const updated = await updateComplaintStatus(Number(req.params.id), req.body.status);
      if (!updated) {
        return res.status(404).json({ error: "Not found" });
      }

      try {
        await sendStatusUpdate(updated);
      } catch (mailErr) {
        console.error("Status update email failed", mailErr);
      }
      try {
        broadcast("complaint_updated", { complaint: complaintWithoutBlob(updated) });
      } catch (broadcastErr) {
        console.error("Admin broadcast failed", broadcastErr);
      }

      return res.status(200).json({ complaint: updated });
    } catch (error) {
      return next(error);
    }
  }
);

router.delete(
  "/complaints/:id",
  [param("id").isInt({ min: 1 })],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ error: "Validation failed", details: errors.array() });
      }

      const deleted = await deleteComplaint(Number(req.params.id));
      if (!deleted) {
        return res.status(404).json({ error: "Not found" });
      }
      try {
        broadcast("complaint_deleted", { id: deleted.id });
      } catch (broadcastErr) {
        console.error("Admin broadcast failed", broadcastErr);
      }
      return res.status(200).json({ success: true, message: "Complaint deleted successfully" });
    } catch (error) {
      return next(error);
    }
  }
);

module.exports = router;
