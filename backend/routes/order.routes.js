import express from "express";
import { isAuth } from "../middleware/isAuth.js";
import { validate } from "../middleware/validate.js";
import { createOrderSchema, orderQuoteSchema, verifyPaymentSchema, markPaymentFailedSchema } from "../validations/order.validation.js";
import {
  createOrder,
  getOrderQuote,
  createRazorpayOrder,
  handleRazorpayWebhook,
  markRazorpayPaymentFailed,
  retryRazorpayPayment,
  verifyRazorpayPayment,
  getMyOrders,
  getOrderById,
  getOwnerOrders,
  updateShopOrderStatus,
  rebroadcastShopOrder,
  cancelOrder
} from "../controllers/order.controller.js";

const router = express.Router();

router.post("/razorpay-webhook", handleRazorpayWebhook);
router.post("/quote", isAuth, validate(orderQuoteSchema), getOrderQuote);
router.post("/create", isAuth, validate(createOrderSchema), createOrder);
router.post("/create-razorpay-order", isAuth, validate(createOrderSchema), createRazorpayOrder);
router.post("/verify-payment", isAuth, validate(verifyPaymentSchema), verifyRazorpayPayment);
router.post("/payment-failed", isAuth, validate(markPaymentFailedSchema), markRazorpayPaymentFailed);
router.post("/:orderId/retry-payment", isAuth, retryRazorpayPayment);
router.post("/cancel/:orderId", isAuth, cancelOrder);
router.get("/my-orders", isAuth, getMyOrders);
router.get("/owner-orders", isAuth, getOwnerOrders);
router.patch("/update-status", isAuth, updateShopOrderStatus);
router.patch("/rebroadcast", isAuth, rebroadcastShopOrder);
router.patch("/rebroadcast/:shopOrderId", isAuth, rebroadcastShopOrder);
router.get("/:orderId", isAuth, getOrderById);

export default router;
