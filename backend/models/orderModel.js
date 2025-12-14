

import mongoose from "mongoose";

/* ---------------- SHOP ORDER ITEMS ---------------- */
const shopOrderItemSchema = new mongoose.Schema({
  name: String,
  item: { type: mongoose.Schema.Types.ObjectId, ref: "Item", required: true },
  price: Number,
  quantity: Number,
  variants: [], // Array of selected variants
  addons: []    // Array of selected addons
});

/* ---------------- SHOP ORDER (per shop) ---------------- */
const shopOrderSchema = new mongoose.Schema({
  shop: { type: mongoose.Schema.Types.ObjectId, ref: "Shop" },
  owner: { type: mongoose.Schema.Types.ObjectId, ref: "User" },

  subtotal: Number,
  platformFee: Number,
  earningsForShop: Number,

  status: {
    type: String,
    enum: ["Pending", "Accepted", "Preparing", "Ready", "Out for delivery", "Delivered", "Cancelled"],
    default: "Pending"
  },

  //  UPDATED: Renamed from "assignment" to "deliveryAssignmentId"
  deliveryAssignmentId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "DeliveryAssignment",
    default: null 
  },

  //  NEW: Track which delivery partner is assigned
  deliveryPartner: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "User",
    default: null 
  },

  //  NEW: Timestamp tracking for each status
  acceptedAt: Date,
  preparingAt: Date,
  readyAt: Date,
  outForDeliveryAt: Date,
  deliveredAt: Date,
  cancelledAt: Date,

  shopOrderItems: [shopOrderItemSchema]
});

/* ---------------- MAIN ORDER ---------------- */
const orderSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },

    deliveryAddress: {
      text: String,
      landmark: String,
      latitude: Number,
      longitude: Number
    },

    itemsTotal: Number,
    gst: Number,
    deliveryFee: Number,
    platformFee: Number,
    totalAmount: Number,

    // Payment
    paymentMethod: {
      type: String,
      enum: ["cod", "online"],
      required: true
    },
    paymentStatus: {
      type: String,
      enum: ["Pending", "Paid", "Failed"],
      default: "Pending"
    },

    // Razorpay Fields
    razorpayOrderId: String,
    razorpayPaymentId: String,
    razorpaySignature: String,

    orderStatus: {
      type: String,
      enum: ["Pending", "Processing", "Ready", "Pickup", "Delivered", "Cancelled"],
      default: "Pending"
    },

    shopOrders: [shopOrderSchema]
  },
  { timestamps: true }
);

export default mongoose.model("Order", orderSchema);
