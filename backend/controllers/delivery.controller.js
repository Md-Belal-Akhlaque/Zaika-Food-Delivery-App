import mongoose from "mongoose";
import DeliveryAssignment from "../models/deliveryAssignmentModel.js";
import Order from "../models/orderModel.js";
import ShopOrder from "../models/shopOrderModel.js";
import User from "../models/userModel.js";
import {
  creditDeliveryWallet,
  creditShopWallet,
  getDeliveryEarningsForPeriod
} from "../services/wallet.service.js";
import { recalculateOrderStatus } from "./order.controller.js";
import { emitToDeliveryPartner, emitToShop, emitToUser } from "../socket.js";

const ACTIVE_DELIVERY_PARTNER_ASSIGNMENT_STATUSES = ["assigned", "picked", "delivering"];

const ensureDeliveryPartner = async (deliveryPartnerId) => {
  const deliveryPartner = await User.findById(deliveryPartnerId).select(
    "fullName role isAvailable isActive isBusy"
  );
  if (!deliveryPartner || deliveryPartner.role !== "deliveryPartner") {
    return null;
  }
  return deliveryPartner;
};

// ========================= TOGGLE AVAILABILITY =========================
export const toggleAvailability = async (req, res) => {
  try {
    const deliveryPartnerId = req.userId;
    const { isAvailable, latitude, longitude } = req.body;

    const deliveryPartner = await ensureDeliveryPartner(deliveryPartnerId);
    if (!deliveryPartner) {
      return res.status(403).json({ success: false, message: "Not a delivery partner" });
    }
    if (!deliveryPartner.isActive) {
      return res.status(403).json({
        success: false,
        message: "Delivery partner account is inactive"
      });
    }
    if (deliveryPartner.isBusy && isAvailable) {
      return res.status(400).json({
        success: false,
        message: "Cannot go available while an active delivery is in progress"
      });
    }

    deliveryPartner.isAvailable = Boolean(isAvailable);

    if (latitude != null && longitude != null) {
      deliveryPartner.location = {
        type: "Point",
        coordinates: [Number(longitude), Number(latitude)]
      };
    }

    await deliveryPartner.save();

    return res.json({
      success: true,
      message: deliveryPartner.isAvailable ? "You are online" : "You are offline",
      deliveryPartner: {
        _id: deliveryPartner._id,
        fullName: deliveryPartner.fullName,
        isAvailable: deliveryPartner.isAvailable,
        isActive: deliveryPartner.isActive,
        isBusy: deliveryPartner.isBusy,
        location: deliveryPartner.location
      }
    });
  } catch (error) {
    console.error("TOGGLE_AVAILABILITY_ERR:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ========================= UPDATE LOCATION =========================
export const updateLocation = async (req, res) => {
  try {
    const deliveryPartnerId = req.userId;
    const { latitude, longitude } = req.body;

    if (latitude == null || longitude == null) {
      return res.status(400).json({
        success: false,
        message: "latitude and longitude are required"
      });
    }

    const deliveryPartner = await ensureDeliveryPartner(deliveryPartnerId);
    if (!deliveryPartner) {
      return res.status(403).json({ success: false, message: "Not a delivery partner" });
    }

    deliveryPartner.location = {
      type: "Point",
      coordinates: [Number(longitude), Number(latitude)]
    };
    await deliveryPartner.save();

    return res.json({ success: true, message: "Location updated" });
  } catch (error) {
    console.error("UPDATE_LOCATION_ERR:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ========================= GET AVAILABLE ASSIGNMENTS =========================
export const getAvailableAssignments = async (req, res) => {
  try {
    const deliveryPartnerId = req.userId;

    // FIX: removed expiresAt: { $gt: now } filter
    // The 15s broadcast window expires before the 15s polling interval,
    // which caused valid assignments to never show up in the dashboard.
    // Expiry is already enforced at accept-time in acceptDeliveryAssignment(),
    // so it is safe to remove it here.
    const assignments = await DeliveryAssignment.find({
      assignmentStatus: "unassigned",
      broadcastStatus: "active",
      broadcastedTo: {
        $elemMatch: {
          deliveryPartnerId: deliveryPartnerId,
          status: "sent"
        }
      }
    })
      .populate("shop", "name address image")
      .populate("shopOrder", "items subtotal riderEarning")
      .populate("order", "paymentMethod totalAmount deliveryAddress")
      .sort({ createdAt: -1 });

    return res.status(200).json({ success: true, assignments });
  } catch (error) {
    console.error("GET_AVAILABLE_ASSIGNMENTS_ERR:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ========================= GET MY ASSIGNMENTS =========================
export const getMyAssignments = async (req, res) => {
  try {
    const deliveryPartnerId = req.userId;

    const assignments = await DeliveryAssignment.find({
      assignedDeliveryPartner: deliveryPartnerId
    })
      .populate("shop", "name address image")
      .populate("shopOrder", "items subtotal status riderEarning")
      .populate("order", "deliveryAddress paymentMethod totalAmount")
      .sort({ createdAt: -1 });

    return res.status(200).json({ success: true, assignments });
  } catch (error) {
    console.error("GET_MY_ASSIGNMENTS_ERR:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ========================= ACCEPT DELIVERY (ATOMIC) =========================
export const acceptDeliveryAssignment = async (req, res) => {
  try {
    const deliveryPartnerId = req.userId;
    const { assignmentId } = req.body;

    if (!assignmentId) {
      return res.status(400).json({ success: false, message: "assignmentId is required" });
    }

    const deliveryPartner = await ensureDeliveryPartner(deliveryPartnerId);
    if (!deliveryPartner) {
      return res.status(403).json({ success: false, message: "Not a delivery partner" });
    }
    if (!deliveryPartner.isActive) {
      return res.status(403).json({
        success: false,
        message: "Delivery partner account is inactive"
      });
    }
    if (!deliveryPartner.isAvailable || deliveryPartner.isBusy) {
      return res.status(400).json({
        success: false,
        message: "Delivery partner must be available and not busy"
      });
    }

    const activeAssignment = await DeliveryAssignment.findOne({
      assignedDeliveryPartner: deliveryPartnerId,
      assignmentStatus: { $in: ACTIVE_DELIVERY_PARTNER_ASSIGNMENT_STATUSES }
    }).select("_id");
    if (activeAssignment) {
      return res.status(409).json({
        success: false,
        message: "You already have an active delivery"
      });
    }

    // NOTE: expiresAt check is kept here at accept-time — this is correct
    const now = new Date();
    const acceptedAssignment = await DeliveryAssignment.findOneAndUpdate(
      {
        _id: assignmentId,
        assignmentStatus: "unassigned",
        broadcastStatus: "active",
        broadcastedTo: {
          $elemMatch: {
            deliveryPartnerId: deliveryPartnerId,
            status: "sent",
            expiresAt: { $gt: now }
          }
        }
      },
      {
        $set: {
          assignmentStatus: "assigned",
          assignedDeliveryPartner: deliveryPartnerId,
          broadcastStatus: "accepted",
          assignedAt: now,
          "broadcastedTo.$[self].status": "accepted",
          "broadcastedTo.$[self].respondedAt": now
        }
      },
      {
        new: true,
        arrayFilters: [{ "self.deliveryPartnerId": deliveryPartnerId }]
      }
    );

    if (!acceptedAssignment) {
      const existing = await DeliveryAssignment.findById(assignmentId).select(
        "assignmentStatus broadcastedTo"
      );
      if (!existing) {
        return res.status(404).json({ success: false, message: "Assignment not found" });
      }
      if (existing.assignmentStatus !== "unassigned") {
        return res.status(409).json({ success: false, message: "Already taken" });
      }
      // Check if it's specifically an expiry issue and give a clear message
      const myEntry = (existing.broadcastedTo || []).find(
        (e) => e.deliveryPartnerId?.toString() === deliveryPartnerId.toString()
      );
      if (myEntry && myEntry.expiresAt && new Date(myEntry.expiresAt) <= now) {
        return res.status(409).json({
          success: false,
          message: "Delivery request has expired. Please wait for the next broadcast."
        });
      }
      return res.status(409).json({
        success: false,
        message: "Delivery request expired or not assigned to you"
      });
    }

    await DeliveryAssignment.updateOne(
      { _id: assignmentId },
      {
        $set: {
          "broadcastedTo.$[other].status": "expired",
          "broadcastedTo.$[other].respondedAt": now
        }
      },
      {
        arrayFilters: [
          {
            "other.deliveryPartnerId": { $ne: deliveryPartnerId },
            "other.status": "sent"
          }
        ]
      }
    );

    // 5. Assign the delivery partner and mark as busy
    await User.findByIdAndUpdate(deliveryPartnerId, {
      isAvailable: false,
      isBusy: true
    });

    await ShopOrder.findByIdAndUpdate(acceptedAssignment.shopOrder, {
      deliveryAssignment: acceptedAssignment._id,
      deliveryPartnerId: deliveryPartnerId
    });

    const refreshed = await DeliveryAssignment.findById(assignmentId)
      .populate("shop", "name")
      .populate("shopOrder", "_id");

    const otherDeliveryPartners = (refreshed?.broadcastedTo || []).filter(
      (entry) =>
        entry.deliveryPartnerId?.toString() !== deliveryPartnerId.toString() &&
        entry.status === "expired"
    );
    otherDeliveryPartners.forEach((entry) => {
      emitToDeliveryPartner(entry.deliveryPartnerId.toString(), "delivery:taken", {
        assignmentId,
        message: "This delivery was accepted by another delivery partner"
      });
    });

    const partnerAssignedPayload = {
      assignmentId,
      shopOrderId: acceptedAssignment.shopOrder,
      deliveryPartnerName: deliveryPartner.fullName || "Delivery Partner"
    };
    emitToShop(
      acceptedAssignment.shop.toString(),
      "delivery:deliveryPartnerAssigned",
      partnerAssignedPayload
    );

    const order = await Order.findById(acceptedAssignment.order).select("user");
    if (order?.user) {
      emitToUser(order.user.toString(), "delivery:assigned", {
        assignmentId,
        shopOrderId: acceptedAssignment.shopOrder,
        deliveryPartnerName: deliveryPartner.fullName,
        message: "A delivery partner has been assigned to your order"
      });
    }

    return res.json({
      success: true,
      message: "Delivery assigned successfully",
      assignment: acceptedAssignment
    });
  } catch (error) {
    console.error("ACCEPT_DELIVERY_ASSIGNMENT_ERR:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const acceptDelivery = acceptDeliveryAssignment;

// ========================= MARK PICKED =========================
export const markPicked = async (req, res) => {
  try {
    const deliveryPartnerId = req.userId;
    const { assignmentId } = req.body;

    const assignment = await DeliveryAssignment.findById(assignmentId);
    if (!assignment) {
      return res.status(404).json({ success: false, message: "Assignment not found" });
    }
    if (!assignment.assignedDeliveryPartner) {
      return res.status(400).json({
        success: false,
        message: "No delivery partner assigned"
      });
    }
    if (assignment.assignedDeliveryPartner.toString() !== deliveryPartnerId.toString()) {
      return res.status(403).json({ success: false, message: "Not authorized" });
    }
    if (assignment.assignmentStatus !== "assigned") {
      return res.status(400).json({
        success: false,
        message: "Cannot mark picked from current status"
      });
    }

    assignment.assignmentStatus = "picked";
    assignment.pickedAt = new Date();
    await assignment.save();

    await ShopOrder.findByIdAndUpdate(assignment.shopOrder, {
      status: "OutForDelivery",
      outForDeliveryAt: new Date(),
      deliveryPartnerId: deliveryPartnerId
    });

    const order = await Order.findById(assignment.order).select("user");
    if (order?.user) {
      emitToUser(order.user.toString(), "delivery:outForDelivery", {
        assignmentId: assignment._id,
        shopOrderId: assignment.shopOrder,
        message: "Your order is out for delivery!"
      });
    }

    const shopOrder = await ShopOrder.findById(assignment.shopOrder).select("order");
    if (shopOrder) {
      await recalculateOrderStatus(shopOrder.order);
    }

    return res.json({ success: true, message: "Order picked up", assignment });
  } catch (error) {
    console.error("MARK_PICKED_ERR:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ========================= MARK DELIVERED =========================
export const markDelivered = async (req, res) => {
  try {
    const deliveryPartnerId = req.userId;
    const { assignmentId } = req.body;

    const assignment = await DeliveryAssignment.findById(assignmentId);
    if (!assignment) {
      return res.status(404).json({ success: false, message: "Assignment not found" });
    }
    if (!assignment.assignedDeliveryPartner) {
      return res.status(400).json({
        success: false,
        message: "No delivery partner assigned"
      });
    }
    if (assignment.assignedDeliveryPartner.toString() !== deliveryPartnerId.toString()) {
      return res.status(403).json({ success: false, message: "Not authorized" });
    }
    if (assignment.assignmentStatus !== "picked") {
      return res.status(400).json({
        success: false,
        message: "Order must be picked before marking delivered"
      });
    }

    const createHttpError = (statusCode, message) => {
      const error = new Error(message);
      error.statusCode = statusCode;
      return error;
    };

    const session = await mongoose.startSession();
    let deliveredAssignment = null;
    let parentOrderId = null;

    try {
      await session.withTransaction(async () => {
        const assignmentInTxn = await DeliveryAssignment.findById(assignmentId).session(session);
        if (!assignmentInTxn) {
          throw createHttpError(404, "Assignment not found");
        }
        if (!assignmentInTxn.assignedDeliveryPartner) {
          throw createHttpError(400, "No delivery partner assigned");
        }
        if (assignmentInTxn.assignedDeliveryPartner.toString() !== deliveryPartnerId.toString()) {
          throw createHttpError(403, "Not authorized");
        }
        if (assignmentInTxn.assignmentStatus !== "picked") {
          throw createHttpError(400, "Order must be picked before marking delivered");
        }

        assignmentInTxn.assignmentStatus = "delivered";
        assignmentInTxn.deliveredAt = new Date();
        await assignmentInTxn.save({ session });

        const shopOrder = await ShopOrder.findById(assignmentInTxn.shopOrder)
          .populate("order")
          .session(session);
        if (!shopOrder) {
          throw createHttpError(404, "Shop order not found");
        }

        parentOrderId = shopOrder.order?._id || assignmentInTxn.order;

        // Prevent double earnings update (idempotency)
        if (!shopOrder.isEarningsProcessed) {
          const shopAmount = Number(shopOrder.shopAmount ?? shopOrder.shopEarning ?? 0);
          const deliveryAmount = Number(shopOrder.deliveryAmount ?? shopOrder.riderEarning ?? 0);
          const shopTxnId = `shop-credit:${shopOrder._id.toString()}`;
          const deliveryTxnId = `delivery-credit:${shopOrder._id.toString()}`;

          const [shopWalletCredit, deliveryWalletCredit] = await Promise.all([
            creditShopWallet({
              shopId: shopOrder.shop,
              ownerId: shopOrder.owner,
              amount: shopAmount,
              orderId: assignmentInTxn.order,
              shopOrderId: shopOrder._id,
              uniqueTransactionId: shopTxnId,
              session
            }),
            creditDeliveryWallet({
              userId: deliveryPartnerId,
              amount: deliveryAmount,
              orderId: assignmentInTxn.order,
              shopOrderId: shopOrder._id,
              uniqueTransactionId: deliveryTxnId,
              session
            })
          ]);

          shopOrder.status = "Delivered";
          shopOrder.deliveredAt = new Date();
          shopOrder.isEarningsProcessed = true;
          shopOrder.deliveryPartnerId = deliveryPartnerId;
          await shopOrder.save({ session });

          // 1. Update Shop Owner Earnings (basePrice - commission)
          if (shopWalletCredit.applied) {
            await User.findByIdAndUpdate(shopOrder.owner, {
              $inc: { earnings: shopAmount }
            }, { session });
          }

          // 2. Update Delivery Partner Metrics (Earning = commission)
          if (deliveryWalletCredit.applied) {
            await User.findByIdAndUpdate(deliveryPartnerId, {
              isAvailable: true,
              isBusy: false,
              $inc: {
                earnings: deliveryAmount,
                totalDeliveries: 1
              }
            }, { session });
          } else {
            await User.findByIdAndUpdate(deliveryPartnerId, {
              isAvailable: true,
              isBusy: false
            }, { session });
          }
        } else {
          // If already processed, just ensure partner is not busy
          await User.findByIdAndUpdate(deliveryPartnerId, {
            isAvailable: true,
            isBusy: false
          }, { session });
        }

        deliveredAssignment = assignmentInTxn;
      });
    } finally {
      await session.endSession();
    }

    if (parentOrderId) {
      await recalculateOrderStatus(parentOrderId);
    }

    const order = await Order.findById(parentOrderId || assignment.order).select("user");
    if (order?.user) {
      emitToUser(order.user.toString(), "delivery:delivered", {
        assignmentId: deliveredAssignment?._id || assignment._id,
        shopOrderId: deliveredAssignment?.shopOrder || assignment.shopOrder,
        message: "Your order has been delivered!"
      });
    }

    return res.json({ success: true, message: "Order delivered", assignment: deliveredAssignment || assignment });
  } catch (error) {
    console.error("MARK_DELIVERED_ERR:", error);
    return res.status(error.statusCode || 500).json({ success: false, message: error.message });
  }
};

// ========================= CANCEL DELIVERY =========================
export const cancelDelivery = async (req, res) => {
  try {
    const deliveryPartnerId = req.userId;
    const { assignmentId, reason } = req.body;

    const assignment = await DeliveryAssignment.findById(assignmentId);
    if (!assignment) {
      return res.status(404).json({ success: false, message: "Assignment not found" });
    }
    if (!assignment.assignedDeliveryPartner) {
      return res.status(400).json({
        success: false,
        message: "No delivery partner assigned"
      });
    }
    if (assignment.assignedDeliveryPartner.toString() !== deliveryPartnerId.toString()) {
      return res.status(403).json({ success: false, message: "Not authorized" });
    }
    if (!["assigned", "picked", "delivering"].includes(assignment.assignmentStatus)) {
      return res.status(400).json({
        success: false,
        message: "Cannot cancel in current state"
      });
    }

    assignment.assignmentStatus = "cancelled";
    assignment.cancelledAt = new Date();
    assignment.cancellationReason = reason || "Cancelled by delivery partner";
    await assignment.save();

    await ShopOrder.findByIdAndUpdate(assignment.shopOrder, {
      status: "Cancelled",
      cancelledAt: new Date(),
      cancellationReason: reason || "Delivery partner cancelled"
    });

    await User.findByIdAndUpdate(deliveryPartnerId, {
      isAvailable: true,
      isBusy: false
    });

    const shopOrder = await ShopOrder.findById(assignment.shopOrder).select("order");
    if (shopOrder) {
      await recalculateOrderStatus(shopOrder.order);
    }

    return res.json({ success: true, message: "Delivery cancelled", assignment });
  } catch (error) {
    console.error("CANCEL_DELIVERY_ERR:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ========================= GET DELIVERY STATUS =========================
export const getDeliveryStatus = async (req, res) => {
  try {
    const { orderId } = req.params;

    const assignments = await DeliveryAssignment.find({ order: orderId })
      .populate("assignedDeliveryPartner", "fullName mobile location")
      .populate("shop", "name address")
      .populate("shopOrder", "status")
      .sort({ createdAt: -1 });

    // Multi-shop orders can have multiple assignments; pick the most relevant one.
    const statusPriority = ["picked", "assigned", "delivering", "unassigned", "delivered", "cancelled"];
    const assignment = assignments
      .slice()
      .sort((a, b) => {
        const ai = statusPriority.indexOf(String(a.assignmentStatus || "").toLowerCase());
        const bi = statusPriority.indexOf(String(b.assignmentStatus || "").toLowerCase());
        const safeAi = ai === -1 ? Number.MAX_SAFE_INTEGER : ai;
        const safeBi = bi === -1 ? Number.MAX_SAFE_INTEGER : bi;
        return safeAi - safeBi;
      })[0];

    if (!assignment) {
      return res.status(404).json({
        success: false,
        message: "Delivery not assigned yet"
      });
    }

    return res.status(200).json({ success: true, assignment });
  } catch (error) {
    console.error("GET_DELIVERY_STATUS_ERR:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ========================= GET RIDER EARNINGS =========================
export const getRiderEarnings = async (req, res) => {
  try {
    const riderId = req.userId;

    const rider = await User.findById(riderId).select("earnings totalDeliveries");
    if (!rider) return res.status(404).json({ success: false, message: "Rider not found" });

    // Fetch per-order earnings from delivered assignments
    const assignments = await DeliveryAssignment.find({
      assignedDeliveryPartner: riderId,
      assignmentStatus: "delivered"
    })
    .populate({
      path: "shopOrder",
      select: "riderEarning totalAmount items"
    })
    .sort({ deliveredAt: -1 });

    const orderEarnings = assignments.map(a => ({
      assignmentId: a._id,
      shopOrderId: a.shopOrder?._id,
      amount: a.shopOrder?.riderEarning || 0,
      totalOrderAmount: a.shopOrder?.totalAmount || 0,
      deliveredAt: a.deliveredAt,
      itemsCount: a.shopOrder?.items?.length || 0
    }));

    return res.status(200).json({
      success: true,
      totalEarnings: rider.earnings,
      totalDeliveries: rider.totalDeliveries,
      orderEarnings
    });
  } catch (error) {
    console.error("GET_RIDER_EARNINGS_ERR:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const getRiderEarningsToday = async (req, res) => {
  try {
    const riderId = req.userId;
    const summary = await getDeliveryEarningsForPeriod({ userId: riderId, period: "today" });
    return res.status(200).json({ success: true, ...summary });
  } catch (error) {
    console.error("GET_RIDER_EARNINGS_TODAY_ERR:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const getRiderEarningsMonth = async (req, res) => {
  try {
    const riderId = req.userId;
    const summary = await getDeliveryEarningsForPeriod({ userId: riderId, period: "month" });
    return res.status(200).json({ success: true, ...summary });
  } catch (error) {
    console.error("GET_RIDER_EARNINGS_MONTH_ERR:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};
