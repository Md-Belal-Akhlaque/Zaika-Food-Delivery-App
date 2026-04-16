import crypto from "crypto";
import mongoose from "mongoose";
import Razorpay from "razorpay";
import Order from "../models/orderModel.js";
import ShopOrder from "../models/shopOrderModel.js";
import Shop from "../models/shopModel.js";
import Item from "../models/itemModel.js";
import DeliveryAssignment from "../models/deliveryAssignmentModel.js";
import User from "../models/userModel.js";
import {
  calculateDeliveryFee,
  createOrderService,
  createAssignmentForShopOrder,
  groupItemsByShop,
} from "../services/order.service.js";
import { enqueueBroadcast } from "../queue.js";
import { emitToUser, emitToShop } from "../socket.js";
import logger from "../utility/logger.js";

const SHOP_ORDER_ALLOWED_STATUSES = [
  "Pending",
  "Accepted",
  "Preparing",
  "Ready",
  "OutForDelivery",
  "Delivered",
  "Cancelled",
];

const OWNER_ALLOWED_STATUS_TRANSITIONS = {
  Pending: new Set(["Accepted", "Cancelled"]),
  Accepted: new Set(["Preparing", "Cancelled"]),
  Preparing: new Set(["Ready", "Cancelled"]),
  Ready: new Set(["OutForDelivery"]),
  OutForDelivery: new Set([]),
  Delivered: new Set([]),
  Cancelled: new Set([]),
};

const buildRefundId = (orderId, shopOrderId) =>
  `rfnd_${String(orderId).slice(-8)}_${String(shopOrderId).slice(-8)}_${Date.now()}`;

const applyShopOrderRefund = async ({ parentOrder, shopOrder, session = null }) => {
  if (!parentOrder || !shopOrder) return false;
  if (parentOrder.paymentMethod !== "online" || parentOrder.paymentStatus !== "Paid") return false;
  if (shopOrder.refundStatus === "Success") return false;

  const refundAmount = Number(shopOrder.totalAmount || 0);
  if (!(refundAmount > 0)) {
    shopOrder.refundStatus = "Failed";
    shopOrder.refundAmount = 0;
    shopOrder.refundId = null;
    await shopOrder.save({ session });
    return false;
  }

  shopOrder.refundStatus = "Pending";
  shopOrder.refundAmount = refundAmount;

  // Refund gateway integration placeholder: persist deterministic refund metadata.
  shopOrder.refundStatus = "Success";
  shopOrder.refundId = buildRefundId(parentOrder._id, shopOrder._id);
  await shopOrder.save({ session });

  parentOrder.totalRefundedAmount = Number(parentOrder.totalRefundedAmount || 0) + refundAmount;
  if (parentOrder.totalRefundedAmount >= Number(parentOrder.totalAmount || 0)) {
    parentOrder.paymentStatus = "Refunded";
  }
  await parentOrder.save({ session });
  return true;
};

const restoreShopOrderInventory = async ({ shopOrder, session = null }) => {
  if (!shopOrder || !Array.isArray(shopOrder.items)) return;

  for (const line of shopOrder.items) {
    const quantity = Number(line?.quantity || 0);
    if (!(quantity > 0) || !line?.item) continue;

    await Item.updateOne(
      {
        _id: line.item,
        stock: { $type: "number" }
      },
      {
        $inc: { stock: quantity },
        $set: { isAvailable: true }
      },
      { session }
    );
  }
};

const normalizeShopOrderLineTotals = (shopOrder) => {
  if (!shopOrder) return shopOrder;
  const normalized = typeof shopOrder.toObject === "function" ? shopOrder.toObject() : { ...shopOrder };
  normalized.items = (normalized.items || []).map((line) => {
    const unitPrice = Number(line?.price || 0);
    const qty = Number(line?.quantity || 0);
    const fallbackLineTotal = Number((unitPrice * qty).toFixed(2));
    return {
      ...line,
      totalPrice: Number(line?.totalPrice ?? line?.lineTotal ?? fallbackLineTotal),
    };
  });
  return normalized;
};

const countNearbyDeliveryPartners = async (coordinates, radius = 5000) => {
  if (!Array.isArray(coordinates) || coordinates.length !== 2) return 0;
  const [lng, lat] = coordinates;
  const result = await User.aggregate([
    {
      $geoNear: {
        near: { type: "Point", coordinates: [lng, lat] },
        distanceField: "distance",
        maxDistance: radius,
        query: {
          role: "deliveryPartner",
          isBusy: { $ne: true },
          $or: [{ isAvailable: true }, { isActive: true }]
        },
        spherical: true
      }
    },
    { $count: "count" }
  ]);
  return Number(result?.[0]?.count || 0);
};

const getRazorpayClient = () => {
  if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
    return null;
  }

  return new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  });
};

const markOrderAsPaid = async (order, { razorpayOrderId, razorpayPaymentId, razorpaySignature = null }) => {
  order.paymentStatus = "Paid";
  order.paymentCapturedAt = new Date();
  order.paymentFailedAt = null;
  order.paymentFailureReason = null;
  order.razorpayOrderId = razorpayOrderId || order.razorpayOrderId;
  order.razorpayPaymentId = razorpayPaymentId || order.razorpayPaymentId;
  order.razorpaySignature = razorpaySignature || order.razorpaySignature;
  await order.save();
  return order;
};

const markOrderAsFailed = async (order, reason = "Payment failed") => {
  if (order.paymentStatus === "Paid") {
    return order;
  }
  order.paymentStatus = "Failed";
  order.paymentFailedAt = new Date();
  order.paymentFailureReason = reason;
  await order.save();
  return order;
};

const isValidWebhookSignature = ({ payload, signature, secret }) => {
  const expectedSignature = crypto.createHmac("sha256", secret).update(payload).digest("hex");
  return expectedSignature === signature;
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// RECALCULATE ORDER STATUS (Internal Helper)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export const recalculateOrderStatus = async (orderId) => {
  try {
    const order = await Order.findById(orderId).populate("shopOrders");
    if (!order) return;

    const statuses = order.shopOrders.map((so) => so.status);
    const activeStatuses = statuses.filter(s => s !== "Cancelled");

    let newStatus = order.orderStatus;

    if (statuses.every((s) => s === "Cancelled")) {
      newStatus = "Cancelled";
    } else if (activeStatuses.length > 0 && activeStatuses.every((s) => s === "Delivered")) {
      newStatus = "Delivered";
    } else if (activeStatuses.some((s) => s === "OutForDelivery")) {
      newStatus = "OutForDelivery";
    } else if (activeStatuses.length > 0 && activeStatuses.every((s) => s === "Ready" || s === "OutForDelivery" || s === "Delivered")) {
      newStatus = "AllReady";
    } else if (activeStatuses.some((s) => s !== "Pending")) {
      newStatus = "Processing";
    }

    if (newStatus !== order.orderStatus) {
      order.orderStatus = newStatus;
      await order.save();
      
      // Emit to user
      emitToUser(order.user.toString(), "order:statusUpdate", {
        orderId: order._id,
        status: newStatus,
        message: `Your order status is now: ${newStatus}`
      });
    }
  } catch (err) {
    console.error("RECALCULATE_STATUS_ERR:", err);
  }
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// CREATE ORDER
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export const createOrder = async (req, res) => {
  try {
    const { cartItems, deliveryAddress, paymentMethod, idempotencyKey } = req.body;
    const userId = req.userId;

    const order = await createOrderService({
      userId,
      cartItems,
      deliveryAddress,
      paymentMethod,
      idempotencyKey
    });

    return res.status(201).json({
      success: true,
      message: "Order placed successfully",
      order
    });
  } catch (error) {
    console.error("CREATE_ORDER_ERR:", error);
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Failed to create order"
    });
  }
};

export const getOrderQuote = async (req, res) => {
  try {
    const { cartItems } = req.body;
    const { shopGroups, itemsTotal } = await groupItemsByShop(cartItems);
    const { fee: deliveryFee } = calculateDeliveryFee(itemsTotal);
    const totalAmount = Number((itemsTotal + deliveryFee).toFixed(2));
    const quoteItems = shopGroups.flatMap((group) =>
      (group.items || []).map((line) => ({
        itemId: line.item,
        name: line.name,
        shopId: group.shop,
        shopName: group.shopDoc?.name || "",
        quantity: line.quantity,
        unitPrice: Number(line.price || 0),
        lineTotal: Number((Number(line.price || 0) * Number(line.quantity || 0)).toFixed(2)),
        variants: line.variants || [],
        addons: line.addons || [],
      }))
    );

    return res.status(200).json({
      success: true,
      quote: {
        itemsTotal,
        deliveryFee,
        totalAmount,
        currency: "INR",
        items: quoteItems,
      },
    });
  } catch (error) {
    console.error("GET_ORDER_QUOTE_ERR:", error);
    return res.status(400).json({
      success: false,
      message: error.message || "Failed to calculate order quote",
    });
  }
};

export const createRazorpayOrder = async (req, res) => {
  try {
    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
      return res.status(500).json({ success: false, message: "Razorpay keys are not configured" });
    }

    const razorpay = getRazorpayClient();
    if (!razorpay) {
      return res.status(500).json({ success: false, message: "Razorpay keys are not configured" });
    }

    const { cartItems, deliveryAddress, idempotencyKey } = req.body;
    const userId = req.userId;

    const order = await createOrderService({
      userId,
      cartItems,
      deliveryAddress,
      paymentMethod: "online",
      idempotencyKey,
    });

    if (!order.razorpayOrderId) {
      const razorpayOrder = await razorpay.orders.create({
        amount: Math.round(Number(order.totalAmount) * 100),
        currency: "INR",
        receipt: `zaika_${order._id.toString().slice(-24)}`,
        notes: { appOrderId: order._id.toString(), userId: userId.toString() },
      });

      order.razorpayOrderId = razorpayOrder.id;
      await order.save();
    }

    return res.status(201).json({
      success: true,
      appOrderId: order._id,
      razorpayOrderId: order.razorpayOrderId,
      amount: Math.round(Number(order.totalAmount) * 100),
      currency: "INR",
      key: process.env.RAZORPAY_KEY_ID,
    });
  } catch (error) {
    console.error("CREATE_RAZORPAY_ORDER_ERR:", error);
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Failed to create Razorpay order",
    });
  }
};

export const retryRazorpayPayment = async (req, res) => {
  try {
    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
      return res.status(500).json({ success: false, message: "Razorpay keys are not configured" });
    }

    const { orderId } = req.params;
    const userId = req.userId;

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    if (order.user.toString() !== userId.toString()) {
      return res.status(403).json({ success: false, message: "Not authorized" });
    }

    if (order.paymentMethod !== "online") {
      return res.status(400).json({ success: false, message: "Retry is only available for online payments" });
    }

    if (order.paymentStatus === "Paid") {
      return res.status(400).json({ success: false, message: "Order is already paid" });
    }

    const razorpay = getRazorpayClient();
    if (!razorpay) {
      return res.status(500).json({ success: false, message: "Razorpay keys are not configured" });
    }

    const razorpayOrder = await razorpay.orders.create({
      amount: Math.round(Number(order.totalAmount) * 100),
      currency: "INR",
      receipt: `zaika_retry_${order._id.toString().slice(-20)}`,
      notes: { appOrderId: order._id.toString(), userId: userId.toString(), retry: "true" },
    });

    order.razorpayOrderId = razorpayOrder.id;
    order.paymentStatus = "Pending";
    order.paymentFailedAt = null;
    order.paymentFailureReason = null;
    await order.save();

    return res.status(200).json({
      success: true,
      appOrderId: order._id,
      razorpayOrderId: order.razorpayOrderId,
      amount: Math.round(Number(order.totalAmount) * 100),
      currency: "INR",
      key: process.env.RAZORPAY_KEY_ID,
    });
  } catch (error) {
    logger.error("retry_razorpay_payment_error", {
      orderId: req.params?.orderId,
      userId: req.userId,
      error: error?.message || String(error),
    });
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to retry payment",
    });
  }
};

export const verifyRazorpayPayment = async (req, res) => {
  try {
    const { appOrderId, razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body;

    const order = await Order.findById(appOrderId);
    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    if (order.user.toString() !== req.userId.toString()) {
      return res.status(403).json({ success: false, message: "Not authorized" });
    }

    if (order.paymentStatus === "Paid") {
      return res.status(200).json({ success: true, message: "Payment already verified", order });
    }

    if (order.razorpayOrderId !== razorpayOrderId) {
      await markOrderAsFailed(order, "Invalid Razorpay order reference");
      return res.status(400).json({ success: false, message: "Invalid Razorpay order reference" });
    }

    const generatedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpayOrderId}|${razorpayPaymentId}`)
      .digest("hex");

    if (generatedSignature !== razorpaySignature) {
      await markOrderAsFailed(order, "Payment signature verification failed");
      return res.status(400).json({ success: false, message: "Payment signature verification failed" });
    }

    await markOrderAsPaid(order, {
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
    });

    return res.status(200).json({ success: true, message: "Payment verified successfully", order });
  } catch (error) {
    console.error("VERIFY_RAZORPAY_PAYMENT_ERR:", error);
    return res.status(500).json({ success: false, message: error.message || "Payment verification failed" });
  }
};

export const markRazorpayPaymentFailed = async (req, res) => {
  try {
    const { appOrderId, razorpayOrderId, reason } = req.body;

    const order = await Order.findById(appOrderId);
    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    if (order.user.toString() !== req.userId.toString()) {
      return res.status(403).json({ success: false, message: "Not authorized" });
    }

    if (order.paymentStatus === "Paid") {
      return res.status(200).json({ success: true, message: "Order is already paid", order });
    }

    if (razorpayOrderId && order.razorpayOrderId && razorpayOrderId !== order.razorpayOrderId) {
      return res.status(400).json({ success: false, message: "Invalid Razorpay order reference" });
    }

    await markOrderAsFailed(order, reason || "Payment cancelled by user");

    return res.status(200).json({
      success: true,
      message: "Payment marked as failed",
      order,
    });
  } catch (error) {
    console.error("MARK_RAZORPAY_PAYMENT_FAILED_ERR:", error);
    return res.status(500).json({ success: false, message: error.message || "Failed to update payment state" });
  }
};

export const handleRazorpayWebhook = async (req, res) => {
  try {
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
    if (!webhookSecret) {
      return res.status(500).json({ success: false, message: "Razorpay webhook secret is not configured" });
    }

    const signature = req.headers["x-razorpay-signature"];
    if (!signature) {
      return res.status(400).json({ success: false, message: "Missing webhook signature" });
    }

    const payload = req.rawBody || JSON.stringify(req.body || {});
    const signatureValid = isValidWebhookSignature({
      payload,
      signature,
      secret: webhookSecret,
    });

    if (!signatureValid) {
      return res.status(400).json({ success: false, message: "Invalid webhook signature" });
    }

    const event = req.body?.event;
    const paymentEntity = req.body?.payload?.payment?.entity;

    if (!paymentEntity?.order_id) {
      return res.status(200).json({ success: true, message: "Webhook received (no order mapping)" });
    }

    const order = await Order.findOne({ razorpayOrderId: paymentEntity.order_id });
    if (!order) {
      return res.status(200).json({ success: true, message: "Webhook received (order not found)" });
    }

    if (event === "payment.captured") {
      if (order.paymentStatus !== "Paid") {
        await markOrderAsPaid(order, {
          razorpayOrderId: paymentEntity.order_id,
          razorpayPaymentId: paymentEntity.id,
          razorpaySignature: order.razorpaySignature,
        });
      }
    } else if (event === "payment.failed") {
      await markOrderAsFailed(order, paymentEntity.error_description || "Payment failed");
    }

    return res.status(200).json({ success: true, message: "Webhook processed" });
  } catch (error) {
    console.error("RAZORPAY_WEBHOOK_ERR:", error);
    return res.status(500).json({ success: false, message: "Failed to process webhook" });
  }
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// GET MY ORDERS (User)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export const getMyOrders = async (req, res) => {
  try {
    const userId = req.userId;
    const orders = await Order.find({ user: userId })
      .populate({
        path: "shopOrders",
        populate: { path: "shop", select: "name image city" }
      })
      .sort({ createdAt: -1 });

    const normalizedOrders = orders.map((order) => {
      const nextOrder = order.toObject();
      nextOrder.shopOrders = (nextOrder.shopOrders || []).map(normalizeShopOrderLineTotals);
      return nextOrder;
    });

    return res.status(200).json({ success: true, orders: normalizedOrders });
  } catch (error) {
    console.error("GET_MY_ORDERS_ERR:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch orders" });
  }
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// GET ORDER BY ID (User Tracking)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export const getOrderById = async (req, res) => {
  try {
    const { orderId } = req.params;
    const userId = req.userId;

    const order = await Order.findById(orderId)
      .populate({
        path: "shopOrders",
        select: "status acceptedAt preparingAt readyAt outForDeliveryAt deliveredAt cancelledAt deliveryAssignment",
        populate: [
          { path: "shop", select: "name" },
          { path: "deliveryAssignment", select: "assignmentStatus assignedDeliveryPartner", populate: { path: "assignedDeliveryPartner", select: "fullName mobile" } }
        ]
      })
      .select("user orderStatus createdAt cancelledAt cancellationReason shopOrders");

    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    if (order.user.toString() !== userId.toString()) {
      return res.status(403).json({ success: false, message: "Not authorized" });
    }

    const normalizedOrder = order.toObject();
    normalizedOrder.shopOrders = (normalizedOrder.shopOrders || []).map(normalizeShopOrderLineTotals);

    return res.status(200).json({ success: true, order: normalizedOrder });
  } catch (error) {
    console.error("GET_ORDER_BY_ID_ERR:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch order" });
  }
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// GET OWNER ORDERS (Shop Owner)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export const getOwnerOrders = async (req, res) => {
  try {
    const userId = req.userId;
    
    // Only show orders that are either COD or have been PAID
    const shopOrders = await ShopOrder.find({ owner: userId })
      .populate({
        path: "order",
        match: { $or: [{ paymentMethod: "cod" }, { paymentStatus: "Paid" }] },
        select: "deliveryAddress paymentMethod paymentStatus user totalAmount createdAt",
        populate: {
          path: "user",
          select: "fullName name mobile"
        }
      })
      .populate("shop", "name")
      .populate({
        path: "deliveryAssignment",
        select: "assignmentStatus broadcastStatus broadcastExpiresAt assignedDeliveryPartner pickupLocation",
        populate: {
          path: "assignedDeliveryPartner",
          select: "fullName name mobile"
        }
      })
      .sort({ createdAt: -1 });

    // Filter out shopOrders where the parent order didn't match the payment criteria
    const filteredShopOrders = shopOrders
      .filter(so => so.order !== null)
      .map(normalizeShopOrderLineTotals);

    const shopOrdersWithNearbyStats = await Promise.all(
      filteredShopOrders.map(async (shopOrder) => {
        const coordinates = shopOrder?.deliveryAssignment?.pickupLocation?.coordinates;
        const nearbyDeliveryPartnersCount = await countNearbyDeliveryPartners(coordinates);
        const nearbyDeliveryPartnersMessage =
          nearbyDeliveryPartnersCount > 0
            ? `${nearbyDeliveryPartnersCount} delivery partner(s) nearby`
            : "No delivery partners available nearby";

        return {
          ...shopOrder,
          deliveryAssignment: shopOrder.deliveryAssignment
            ? {
                ...shopOrder.deliveryAssignment,
                nearbyDeliveryPartnersCount,
                nearbyDeliveryPartnersMessage
              }
            : shopOrder.deliveryAssignment
        };
      })
    );

    return res.status(200).json({ success: true, shopOrders: shopOrdersWithNearbyStats });
  } catch (error) {
    console.error("GET_OWNER_ORDERS_ERR:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch shop orders" });
  }
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// UPDATE SHOP ORDER STATUS (Shop Owner)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export const updateShopOrderStatus = async (req, res) => {
  try {
    const { shopOrderId, status, reason } = req.body;
    const ownerId = req.userId;
    const allowedStatuses = new Set(SHOP_ORDER_ALLOWED_STATUSES);

    const shopOrder = await ShopOrder.findById(shopOrderId).populate("order");
    if (!shopOrder) {
      return res.status(404).json({ success: false, message: "Shop order not found" });
    }

    if (shopOrder.owner.toString() !== ownerId.toString()) {
      return res.status(403).json({ success: false, message: "Not authorized" });
    }

    if (typeof status !== "string" || !allowedStatuses.has(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status value. Allowed values: ${SHOP_ORDER_ALLOWED_STATUSES.join(", ")}`
      });
    }

    const oldStatus = shopOrder.status;
    if (status !== oldStatus) {
      const allowedNextStatuses = OWNER_ALLOWED_STATUS_TRANSITIONS[oldStatus] || new Set();
      if (!allowedNextStatuses.has(status)) {
        return res.status(400).json({
          success: false,
          message: `Invalid status transition from ${oldStatus} to ${status}`,
        });
      }
    }
    
    // If shop owner rejects, mark as Cancelled and initiate partial refund
    if (status === "Cancelled" && oldStatus !== "Cancelled") {
      shopOrder.status = "Cancelled";
      shopOrder.cancelledAt = new Date();
      shopOrder.cancellationReason = reason || "Cancelled by shop owner";
      
      const parentOrder = await Order.findById(shopOrder.order);
      
      await applyShopOrderRefund({ parentOrder, shopOrder });
      await restoreShopOrderInventory({ shopOrder });
      await recalculateOrderStatus(parentOrder._id);
      
      emitToUser(parentOrder.user.toString(), "shopOrder:cancelled", {
        shopOrderId: shopOrder._id,
        shopName: (await Shop.findById(shopOrder.shop).select("name")).name,
        reason: shopOrder.cancellationReason
      });

      return res.json({ success: true, message: "Order rejected and refund initiated", shopOrder });
    }

    shopOrder.status = status;

    // Set timestamps
    const now = new Date();
    if (status === "Accepted") shopOrder.acceptedAt = now;
    if (status === "Preparing") shopOrder.preparingAt = now;
    if (status === "Ready") shopOrder.readyAt = now;

    await shopOrder.save();

    // If status becomes "Ready", trigger delivery assignment
    if (status === "Ready" && oldStatus !== "Ready") {
      const shop = await Shop.findById(shopOrder.shop);
      const order = await Order.findById(shopOrder.order).populate("user");
      
      // Create assignment and enqueue broadcast
      const assignment = await createAssignmentForShopOrder({
        shopOrder,
        order,
        shop
      });

      await enqueueBroadcast(assignment._id.toString(), 1);
      
      shopOrder.deliveryAssignment = assignment._id;
      await shopOrder.save();
    }

    // Recalculate parent order status
    await recalculateOrderStatus(shopOrder.order._id);

    // Notify user via socket
    emitToUser(shopOrder.order.user.toString(), "shopOrder:statusUpdate", {
      shopOrderId: shopOrder._id,
      status: status,
      shopName: (await Shop.findById(shopOrder.shop).select("name")).name
    });

    return res.json({ success: true, message: `Status updated to ${status}`, shopOrder });
  } catch (error) {
    console.error("UPDATE_SHOP_ORDER_STATUS_ERR:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// REBROADCAST SHOP ORDER (Shop Owner)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export const rebroadcastShopOrder = async (req, res) => {
  try {
    let shopOrderId = req.params.shopOrderId || req.body?.shopOrderId;
    if (!shopOrderId && Array.isArray(req.body?.candidateIds) && req.body.candidateIds.length > 0) {
      shopOrderId = req.body.candidateIds[0];
    }

    if (!shopOrderId) {
      return res.status(400).json({ success: false, message: "shopOrderId is required" });
    }

    const ownerId = req.userId;

    const shopOrder = await ShopOrder.findById(shopOrderId);
    if (!shopOrder) {
      return res.status(404).json({ success: false, message: "Shop order not found" });
    }

    if (shopOrder.owner.toString() !== ownerId.toString()) {
      return res.status(403).json({ success: false, message: "Not authorized" });
    }

    if (shopOrder.status !== "Ready") {
      return res.status(400).json({ success: false, message: "Order must be in Ready status to rebroadcast" });
    }

    // Find existing assignment or create new one
    let assignment = await DeliveryAssignment.findOne({
      shopOrder: shopOrderId,
      assignmentStatus: "unassigned"
    });

    if (assignment) {
      // Reset existing assignment for fresh broadcast
      assignment.broadcastStatus = "active";
      assignment.broadcastRound = 1;
      assignment.broadcastExpiresAt = new Date(Date.now() + 45000);
      assignment.broadcastedTo = [];
      await assignment.save();
    } else {
      const shop = await Shop.findById(shopOrder.shop);
      const order = await Order.findById(shopOrder.order).populate("user");
      assignment = await createAssignmentForShopOrder({ shopOrder, order, shop });
    }

    await enqueueBroadcast(assignment._id.toString(), 1);

    return res.json({
      success: true,
      message: "Broadcast restarted",
      assignmentId: assignment._id,
      assignment
    });
  } catch (error) {
    console.error("REBROADCAST_ERR:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// CANCEL ORDER (User)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export const cancelOrder = async (req, res) => {
  try {
    const { orderId } = req.params;
    const userId = req.userId;

    const order = await Order.findById(orderId).populate("shopOrders");
    if (!order) return res.status(404).json({ success: false, message: "Order not found" });

    if (order.user.toString() !== userId.toString()) {
      return res.status(403).json({ success: false, message: "Not authorized" });
    }

    // Only allow cancellation if order is still Pending or AllReady (not yet out for delivery)
    const nonCancellableStatuses = ["OutForDelivery", "Delivered", "Cancelled"];
    if (nonCancellableStatuses.includes(order.orderStatus)) {
      return res.status(400).json({ 
        success: false, 
        message: `Cannot cancel order in ${order.orderStatus} status` 
      });
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      order.orderStatus = "Cancelled";
      await order.save({ session });

      // Cancel all shop orders
      for (const shopOrder of order.shopOrders) {
        shopOrder.status = "Cancelled";
        shopOrder.cancelledAt = new Date();
        shopOrder.cancellationReason = "Cancelled by user";
        await shopOrder.save({ session });

        await applyShopOrderRefund({
          parentOrder: order,
          shopOrder,
          session
        });
        await restoreShopOrderInventory({
          shopOrder,
          session
        });
        
        // Notify shop owner
        emitToShop(shopOrder.shop.toString(), "shopOrder:cancelled", {
          shopOrderId: shopOrder._id,
          message: "Order was cancelled by the customer"
        });
      }

      await session.commitTransaction();

      return res.json({ success: true, message: "Order cancelled successfully" });
    } catch (err) {
      await session.abortTransaction();
      throw err;
    } finally {
      session.endSession();
    }
  } catch (error) {
    console.error("CANCEL_ORDER_ERR:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};


