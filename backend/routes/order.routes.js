import express from "express";
import { isAuth } from "../middleware/isAuth.js";
import {
  createOrder,
  getMyOrders,
  getOwnerOrders,
  updateShopOrderStatus
} from "../controllers/order.controller.js";

const router = express.Router();

router.post("/create", isAuth, createOrder);
router.get("/my-orders", isAuth, getMyOrders);
router.get("/owner-orders", isAuth, getOwnerOrders);
router.patch("/update-status", isAuth, updateShopOrderStatus);

export default router;
