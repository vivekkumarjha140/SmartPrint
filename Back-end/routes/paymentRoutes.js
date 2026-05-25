const express = require("express");
const {
  createRazorpayOrder,
  verifyRazorpayPayment,
  razorpayWebhook
} = require("../controllers/paymentController");

const router = express.Router();

router.post("/create", createRazorpayOrder);
router.post("/verify", verifyRazorpayPayment);
router.post("/webhook", razorpayWebhook);

module.exports = router;