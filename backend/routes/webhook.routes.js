import express from "express";
import crypto from "crypto";
import Order from "../models/orderModel.js";

const router = express.Router();

// IMPORTANT: Must use raw body for webhook signature verification
router.post("/razorpay", express.raw({ type: "application/json" }), async (req, res) => {
  try {
    const signature = req.headers["x-razorpay-signature"];
    const body = req.body; // raw Buffer

    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_WEBHOOK_SECRET)
      .update(body)
      .digest("hex");

    if (expectedSignature !== signature) {
      return res.status(400).json({ success: false, message: "Invalid webhook signature" });
    }

    const event = JSON.parse(body.toString());

    if (event.event === "payment.failed") {
      const notes = event.payload?.payment?.entity?.notes || {};
      console.warn("Payment failed for idempotencyKey:", notes.idempotencyKey);
      // You can mark a pending order as failed here if needed
    }

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error("WEBHOOK_ERR:", err);
    return res.status(500).json({ success: false });
  }
});

export default router;