import mongoose from "mongoose";

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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
      // Added "Refunded" â€” needed for cancellation flows
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

    // Overall order status â€” derived from all ShopOrder statuses
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











// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// shopOrderModel.js â€” MUST be a separate file in your models folder
//
// Create: backend/models/shopOrderModel.js
// And paste the content below into it.
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

// ============================================================
// COPY EVERYTHING BELOW INTO: models/shopOrderModel.js
// ============================================================

/*
import mongoose from "mongoose";

// Item snapshot â€” price locked at order time
const shopOrderItemSchema = new mongoose.Schema({
  item:     { type: mongoose.Schema.Types.ObjectId, ref: "Item", required: true },
  name:     { type: String,  required: true },         // snapshot of item name
  price:    { type: Number,  required: true, min: 0 }, // snapshot of price â€” NEVER live price
  quantity: { type: Number,  required: true, min: 1 },
  variants: { type: Array,   default: [] },
  addons:   { type: Array,   default: [] }
}, { _id: false });

const shopOrderSchema = new mongoose.Schema(
  {
    // Link back to parent order
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: true
    },

    // Which shop fulfills this part
    shop: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Shop",
      required: true
    },

    // Shop owner (for quick owner-level queries without populating shop)
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },

    // Snapshotted items
    items: [shopOrderItemSchema],

    // This shop's portion of the total
    subtotal: { type: Number, required: true, min: 0 },

    // Status lifecycle â€” each shop moves independently
    status: {
      type: String,
      enum: [
        "Pending",         // waiting for shop to accept
        "Accepted",        // shop accepted
        "Preparing",       // kitchen working on it
        "Ready",           // food ready, waiting for delivery partner
        "OutForDelivery",  // delivery partner picked up
        "Delivered",       // delivered to customer
        "Cancelled"
      ],
      default: "Pending"
    },

    // Linked delivery assignment (set when broadcast is triggered)
    deliveryAssignment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "DeliveryAssignment",
      default: null
    },

    // Per-status timestamps
    acceptedAt:       { type: Date, default: null },
    preparingAt:      { type: Date, default: null },
    readyAt:          { type: Date, default: null },
    outForDeliveryAt: { type: Date, default: null },
    deliveredAt:      { type: Date, default: null },
    cancelledAt:      { type: Date, default: null },

    cancellationReason: { type: String, default: null }
  },
  { timestamps: true }
);

// "All pending orders for this shop" â€” shop dashboard's most common query
shopOrderSchema.index({ shop: 1, status: 1 });

// "All ShopOrders for this parent order" â€” used when populating order detail
shopOrderSchema.index({ order: 1 });

// "All orders for this owner" â€” owner history page
shopOrderSchema.index({ owner: 1, status: 1, createdAt: -1 });

// "Which ShopOrder is linked to this delivery?"
shopOrderSchema.index({ deliveryAssignment: 1 });

export default mongoose.model("ShopOrder", shopOrderSchema);
*/





// import mongoose from "mongoose";

// /* ---------------- SHOP ORDER ITEMS ---------------- */
// const shopOrderItemSchema = new mongoose.Schema({
//   name: String,
//   item: { type: mongoose.Schema.Types.ObjectId, ref: "Item", required: true },
//   price: Number,
//   quantity: Number,
//   variants: [], // Array of selected variants
//   addons: []    // Array of selected addons
// });

// /* ---------------- SHOP ORDER (per shop) ---------------- */
// const shopOrderSchema = new mongoose.Schema({
//   shop: { type: mongoose.Schema.Types.ObjectId, ref: "Shop" },
//   owner: { type: mongoose.Schema.Types.ObjectId, ref: "User" },

//   subtotal: Number,
//   earningsForShop: Number,

//   status: {
//     type: String,
//     enum: ["Pending", "Accepted", "Preparing", "Ready", "Out for delivery", "Delivered", "Cancelled"],
//     default: "Pending"
//   },

//   //  UPDATED: Renamed from "assignment" to "deliveryAssignmentId"
//   deliveryAssignmentId: { 
//     type: mongoose.Schema.Types.ObjectId, 
//     ref: "DeliveryAssignment",
//     default: null 
//   },

//   //  NEW: Track which delivery partner is assigned
//   deliveryPartner: { 
//     type: mongoose.Schema.Types.ObjectId, 
//     ref: "User",
//     default: null 
//   },

//   //  NEW: Timestamp tracking for each status
//   acceptedAt: Date,
//   preparingAt: Date,
//   readyAt: Date,
//   outForDeliveryAt: Date,
//   deliveredAt: Date,
//   cancelledAt: Date,

//   shopOrderItems: [shopOrderItemSchema]
// });

// /* ---------------- MAIN ORDER ---------------- */
// const orderSchema = new mongoose.Schema(
//   {
//     user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },

//     deliveryAddress: {
//       text: String,
//       landmark: String,
//       latitude: Number,
//       longitude: Number
//     },

//     itemsTotal: Number,
//     deliveryFee: Number,
//     totalAmount: Number,

//     // Payment
//     paymentMethod: {
//       type: String,
//       enum: ["cod"],
//       required: true
//     },
//     paymentStatus: {
//       type: String,
//       enum: ["Pending", "Paid", "Failed"],
//       default: "Pending"
//     },

//     orderStatus: {
//       type: String,
//       enum: ["Pending", "Processing", "Ready", "Pickup", "Delivered", "Cancelled"],
//       default: "Pending"
//     },

//     shopOrders: [shopOrderSchema]
//   },
//   { timestamps: true }
// );

// export default mongoose.model("Order", orderSchema);



