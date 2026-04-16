import mongoose from "mongoose";

// ─────────────────────────────────────────────────────────────
// WHY THIS IS A SEPARATE FILE:
//
// In the original code, ShopOrder was an embedded subdocument
// inside Order (shopOrders: [shopOrderSchema]).
//
// That meant:
// - No ShopOrder.findById() — you can't query it directly
// - Shop owner had to scan ALL orders to find their pending orders
// - Status updates rewrote the entire Order document
// - No atomic delivery assignment on subdocuments
//
// Now ShopOrder is its own Mongoose model + MongoDB collection.
// Order.shopOrders = [ObjectId refs] instead of embedded docs.
// ─────────────────────────────────────────────────────────────

// Item snapshot — price locked at order time
// IMPORTANT: never use live Item.price after order is placed
// If shop owner changes price later, old orders must show the original price
const shopOrderItemSchema = new mongoose.Schema({
  item:     { type: mongoose.Schema.Types.ObjectId, ref: "Item", required: true },
  name:     { type: String,  required: true },         // snapshot
  price:    { type: Number,  required: true, min: 0 }, // snapshot — not live price
  prepTime: { type: Number,  default: 10 },            // snapshot of prepTime at order time
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

    // Which shop fulfills this part of the order
    shop: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Shop",
      required: true
    },

    // Shop owner — stored separately for fast owner-level queries
    // Avoids needing to populate shop just to check ownership
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },

    // Snapshotted items (from original: shopOrderItems — renamed to items)
    items: [shopOrderItemSchema],

    // This shop's portion of the order total
    subtotal: { type: Number, required: true, min: 0 },

    // New canonical split fields (additive; legacy fields kept below)
    shopTotal:         { type: Number, default: 0, min: 0 },
    commissionPercent: { type: Number, default: 0, min: 0, max: 100 },
    commissionAmount:  { type: Number, default: 0, min: 0 },
    deliveryAmount:    { type: Number, default: 0, min: 0 },
    shopAmount:        { type: Number, default: 0, min: 0 },

    // Financials for Earning & Commission System (no GST/platform fee)
    totalAmount:  { type: Number, default: 0, min: 0 },
    baseAmount:   { type: Number, default: 0, min: 0 }, // equals shop total in no-tax mode
    commission:   { type: Number, default: 0, min: 0 }, // baseAmount * rate
    riderEarning: { type: Number, default: 0, min: 0 }, // max(commission, minFee)
    shopEarning:  { type: Number, default: 0, min: 0 }, // baseAmount - commission

    // Earning update tracking (idempotency)
    isEarningsProcessed: { type: Boolean, default: false },

    // Refund tracking (added for partial refunds)
    refundStatus: { 
      type: String, 
      enum: ["None", "Pending", "Success", "Failed"], 
      default: "None" 
    },
    refundAmount: { type: Number, default: 0 },
    refundId:     { type: String, default: null },

    // Status lifecycle — each shop's order moves independently
    // This means Shop1 can be Delivered while Shop2 is still Preparing
    status: {
      type: String,
      enum: [
        "Pending",        // waiting for shop to accept
        "Accepted",       // shop accepted
        "Preparing",      // kitchen working on it
        "Ready",          // food ready — triggers delivery broadcast
        "OutForDelivery", // delivery partner picked up
        "Delivered",      // delivered to customer
        "Cancelled"
      ],
      default: "Pending"
    },

    // Linked DeliveryAssignment — created when shop marks Ready
    // Renamed from original: deliveryAssignmentId -> deliveryAssignment (cleaner)
    deliveryAssignment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "DeliveryAssignment",
      default: null
    },

    // Snapshot of assigned delivery partner for this shop order
    deliveryPartnerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null
    },

    // Removed: deliveryPartner field — this info lives in DeliveryAssignment
    // Use: shopOrder.populate("deliveryAssignment") to get delivery partner info

    // Per-status timestamps (from original — kept all of them)
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

// ─── Indexes ─────────────────────────────────────────────────

// "All pending orders for this shop" — shop dashboard's most common query
shopOrderSchema.index({ shop: 1, status: 1 });

// "All ShopOrders belonging to parent order" — order detail page
shopOrderSchema.index({ order: 1 });

// "All orders for this owner" — owner order history
shopOrderSchema.index({ owner: 1, status: 1, createdAt: -1 });

// "Which ShopOrder is linked to this delivery assignment?"
shopOrderSchema.index({ deliveryAssignment: 1 });
shopOrderSchema.index({ deliveryPartnerId: 1 });

export default mongoose.model("ShopOrder", shopOrderSchema);


