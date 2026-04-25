import express from "express";
import { isAuth } from "../middleware/isAuth.js";
import { validate } from "../middleware/validate.js";
import { createOrderSchema, orderQuoteSchema } from "../validations/order.validation.js";
import {
  createOrder,
  getOrderQuote,
  getMyOrders,
  getOrderById,
  getOwnerOrders,
  updateShopOrderStatus,
  rebroadcastShopOrder,
  cancelOrder
} from "../controllers/order.controller.js";
import {
  initiatePayment,
  verifyPaymentAndCreateOrder
} from "../controllers/order.controller.js";

const router = express.Router();

router.post("/quote", isAuth, validate(orderQuoteSchema), getOrderQuote);
router.post("/create", isAuth, validate(createOrderSchema), createOrder);
router.post("/cancel/:orderId", isAuth, cancelOrder);
router.get("/my-orders", isAuth, getMyOrders);
router.get("/owner-orders", isAuth, getOwnerOrders);
router.patch("/update-status", isAuth, updateShopOrderStatus);
router.patch("/rebroadcast", isAuth, rebroadcastShopOrder);
router.patch("/rebroadcast/:shopOrderId", isAuth, rebroadcastShopOrder);
router.get("/:orderId", isAuth, getOrderById);

// Add these two new routes:
router.post("/initiate-payment", isAuth, validate(createOrderSchema), initiatePayment);
router.post("/verify-payment", isAuth, verifyPaymentAndCreateOrder);

export default router;
