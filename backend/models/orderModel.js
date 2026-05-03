import mongoose from "mongoose";


// WHY shopOrderSchema was moved OUT of this file:
//
// The original code embedded shopOrders as subdocuments inside Order.
// This caused 3 real problems:
//
// 1. No separate collection = shop owner cannot do ShopOrder.findById(id)
//    To query "all pending orders for shop X" you had to scan every Order
//    document and filter its nested array. At 100k orders = very slow.
//
// 2. Status updates rewrote the ENTIRE parent Order document â€”
//    even when only one shop's status changed.
//
// 3. No atomic delivery assignment possible on subdocuments.
//
// FIX: ShopOrder is now its own collection in shopOrderModel.js
//      Order.shopOrders is now an array of ObjectId references, not subdocuments.

const orderSchema = new mongoose.Schema(
  {
    // Customer who placed the order
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true // added required
    },

    // Delivery address â€” snapshot at order time
    deliveryAddress: {
      text:      { type: String, required: true }, // added required
      landmark:  { type: String, default: "" },
      latitude:  { type: Number, required: true }, // added required
      longitude: { type: Number, required: true }  // added required
    },

    // FIX: shopOrders is now an array of ObjectId references to ShopOrder collection
    // Previously was: shopOrders: [shopOrderSchema]  â† embedded subdocuments (bad)
    // Now is:         shopOrders: [ObjectId]          â† references (correct)
    shopOrders: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "ShopOrder"
      }
    ],


    // Financials
    itemsTotal:  { type: Number, required: true, min: 0 }, // added required + min
    deliveryFee: { type: Number, default: 0,     min: 0 }, // added min
    totalAmount: { type: Number, required: true, min: 0 }, // added required + min

    // Aggregated Financials for Earning & Commission System
    totalBaseAmount:   { type: Number, default: 0, min: 0 },
    totalCommission:   { type: Number, default: 0, min: 0 },
    // New canonical name for rider-side aggregate earning (kept alongside legacy field)
    totalDeliveryEarning: { type: Number, default: 0, min: 0 },
    // Legacy field kept for backward compatibility with existing API/frontend usage
    totalRiderEarning: { type: Number, default: 0, min: 0 },
    totalShopEarning:  { type: Number, default: 0, min: 0 },

    // Refund tracking
    totalRefundedAmount: { type: Number, default: 0, min: 0 },

    // Payment
    paymentMethod: {
      type: String,
      enum: ["cod","online"],
      required: true
    },
    // Order model mein add karo
    deliveryFeeBreakdown: {
    type: String,
    enum: ["free", "10_percent"],
    default: null
    },
    paymentStatus: {
      type: String,
      // Added "Refunded"  needed for cancellation flows
      enum: ["Pending", "Paid", "Failed", "Refunded"],
      default: "Pending"
    },

    paymentCapturedAt: { type: Date, default: null },
    paymentFailedAt: { type: Date, default: null },
    paymentFailureReason: { type: String, default: null },

    // Stock reservation metadata (currently unused with COD-only flow)
    stockReservedAt: { type: Date, default: null },
    stockReleaseAt: { type: Date, default: null },
    isStockReleased: { type: Boolean, default: false },
    stockReleasedAt: { type: Date, default: null },
    stockReleaseReason: { type: String, default: null },

    // Overall order status  derived from all ShopOrder statuses
    // Updated enum to reflect multi-shop reality:
    // PartiallyReady = some shops ready, others still preparing
    // AllReady       = all shops ready, waiting for all delivery partners
    orderStatus: {
      type: String,
      enum: [
        "Pending",         // just placed, no shop accepted yet
        "Processing",      // at least one shop accepted
          // some shops ready, others not (added)
        "AllReady",        // all shops ready (added â€” replaces "Ready")
        "OutForDelivery",  // at least one delivery partner picked up
        "Delivered",       // all shop orders delivered
        "Cancelled"
      ],
      default: "Pending"
    },

    // Cancellation tracking (added)
    cancelledAt:        { type: Date,   default: null },
    cancellationReason: { type: String, default: null },

    // Idempotency (added)
    // Used to prevent duplicate orders if user clicks "Pay" twice
    idempotencyKey: { type: String, unique: true, sparse: true }
  },
  { timestamps: true }
);

// Indexes
// "Order history for this user, newest first" â€” most common query
orderSchema.index({ user: 1, createdAt: -1 });

// "Find pending orders whose stock reservation has expired"
orderSchema.index({
  paymentMethod: 1,
  paymentStatus: 1,
  isStockReleased: 1,
  stockReleaseAt: 1
});

// "Admin dashboard â€” all active orders"
orderSchema.index({ orderStatus: 1, createdAt: -1 });

export default mongoose.model("Order", orderSchema);
