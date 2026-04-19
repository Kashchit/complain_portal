const express = require("express");
const { requireCustomerToken } = require("../middleware/customerToken");
const { findCustomerByEmail, getComplaintsByCustomerEmail } = require("../db");

const router = express.Router();

router.use(requireCustomerToken);

router.get("/me", async (req, res, next) => {
  try {
    const user = await findCustomerByEmail(req.verifiedCustomerEmail);
    if (!user) {
      return res.status(404).json({ error: "Profile not found" });
    }
    return res.status(200).json({
      profile: {
        email: user.email,
        displayName: user.display_name,
        memberSince: user.created_at
      }
    });
  } catch (error) {
    return next(error);
  }
});

router.get("/complaints", async (req, res, next) => {
  try {
    const complaints = await getComplaintsByCustomerEmail(req.verifiedCustomerEmail);
    return res.status(200).json({ complaints });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
