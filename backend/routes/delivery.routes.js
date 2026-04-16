import express from "express";
import { isAuth } from "../middleware/isAuth.js";
import {
  toggleAvailability,
  updateLocation,         // FIX: was missing from routes
  getAvailableAssignments,
  acceptDeliveryAssignment,
  acceptDelivery,
  markPicked,
  markDelivered,
  getMyAssignments,
  getRiderEarnings,       // ADDED
  getRiderEarningsToday,
  getRiderEarningsMonth,
  cancelDelivery,
  getDeliveryStatus
} from "../controllers/delivery.controller.js";

const router = express.Router();

// Delivery partner goes online/offline
router.patch("/toggle-availability", isAuth, toggleAvailability);

// FIX: this route was missing — delivery partner sends GPS every ~10s during delivery
router.patch("/location", isAuth, updateLocation);

// Broadcasts sent to this delivery partner
router.get("/available-assignments", isAuth, getAvailableAssignments);

// Delivery partner actions
router.post("/accept-assignment", isAuth, acceptDeliveryAssignment);
router.post("/accept",         isAuth, acceptDelivery);
router.patch("/mark-picked",   isAuth, markPicked);
router.patch("/mark-delivered",isAuth, markDelivered);
router.patch("/cancel",        isAuth, cancelDelivery);

// History
router.get("/my-assignments",  isAuth, getMyAssignments);
router.get("/earnings",        isAuth, getRiderEarnings); // ADDED
router.get("/earnings/today",  isAuth, getRiderEarningsToday);
router.get("/earnings/month",  isAuth, getRiderEarningsMonth);

// Status check (customer/shop)
router.get("/status/:orderId", isAuth, getDeliveryStatus);

export default router;
