import mongoose from "mongoose";

const deliveryAssignmentSchema = new mongoose.Schema(
  {
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // REFERENCES
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: true
    },

    shop: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Shop",
      required: true
    },

    // FIX: renamed shopOrderId → shopOrder AND added ref:"ShopOrder"
    // Original had no ref, so .populate() didn't work on this field
    shopOrder: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ShopOrder", // ← was missing
      required: true
    },

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // BROADCAST DATA (Track each delivery partner's response)
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    broadcastedTo: [
      {
        deliveryPartnerId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User"
        },
        status: {
          type: String,
          enum: ["sent", "accepted", "rejected", "expired"],
          default: "sent"
        },
        sentAt:      { type: Date, default: Date.now },
        expiresAt:   Date,
        respondedAt: Date, // FIX: renamed from acceptedAt — covers both accept and reject
        _id: false   // no _id for subdocuments — was already correct
      }
    ],

    // Overall broadcast state
    // FIX: changed "expired" → "failed" to distinguish between:
    //   "active"   = broadcast is running
    //   "accepted" = a delivery partner accepted
    //   "failed"   = all 3 rounds expired with no acceptance (admin alert sent)
    broadcastStatus: {
      type: String,
      enum: ["active", "accepted", "failed"],
      default: "active"
    },

    // Added: which round we're on (1, 2, or 3 max)
    // Worker uses this to know whether to re-broadcast or give up
    broadcastRound: {
      type: Number,
      default: 1,
      min: 1,
      max: 3
    },

    // When the current broadcast round expires (45s from broadcast start)
    broadcastExpiresAt: Date,

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // ASSIGNMENT DATA (After delivery partner accepts)
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    assignedDeliveryPartner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null
    },

    // Delivery progress status
    assignmentStatus: {
      type: String,
      enum: [
        "unassigned", // waiting for delivery partner
        "assigned",   // delivery partner accepted
        "picked",     // delivery partner at shop, picked up food
        "delivering", // delivery partner en route to customer
        "delivered",  // food handed to customer
        "cancelled"
      ],
      default: "unassigned"
    },

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // LOCATION DATA (Pickup & Dropoff)
    // FIX: changed from plain nested objects to GeoJSON Points
    //
    // Original was:
    //   pickupLocation: { shop: { latitude, longitude, ... } }
    //
    // Problem: MongoDB cannot run $near queries on plain Number fields.
    // GeoJSON Point with 2dsphere index is required for all geo queries.
    //
    // New format: coordinates: [longitude, latitude]  ← GeoJSON order
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    pickupLocation: {
      type:        { type: String, enum: ["Point"], default: "Point" },
      coordinates: { type: [Number] }, // [longitude, latitude]
      address:     { type: String },
      shopName:    { type: String }
    },

    dropoffLocation: {
      type:         { type: String, enum: ["Point"], default: "Point" },
      coordinates:  { type: [Number] }, // [longitude, latitude]
      address:      { type: String },
      customerName: { type: String }
    },

    // METRICS
    deliveryDistance:      { type: Number, default: 0  }, // km
    estimatedDeliveryTime: { type: Number, default: 30 }, // minutes

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // TIMESTAMPS
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    assignedAt:       { type: Date, default: null },
    pickedAt:         { type: Date, default: null },
    outForDeliveryAt: { type: Date, default: null },
    deliveredAt:      { type: Date, default: null },
    cancelledAt:      { type: Date, default: null },

    cancellationReason: { type: String, default: null }
  },
  {
    timestamps: true // createdAt, updatedAt
  }
);

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// INDEXES
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// Original indexes — kept
deliveryAssignmentSchema.index({ assignedDeliveryPartner: 1 });
deliveryAssignmentSchema.index({ broadcastStatus: 1, assignmentStatus: 1 });
deliveryAssignmentSchema.index({ broadcastExpiresAt: 1 });
deliveryAssignmentSchema.index({ "broadcastedTo.deliveryPartnerId": 1 });

// Added: the two most obvious missing indexes
deliveryAssignmentSchema.index({ shopOrder: 1 }); // replaces shopOrderId
deliveryAssignmentSchema.index({ order: 1 });

// Added: geo indexes — required for location-based queries on pickup/dropoff
deliveryAssignmentSchema.index({ pickupLocation:  "2dsphere" }, { sparse: true });
deliveryAssignmentSchema.index({ dropoffLocation: "2dsphere" }, { sparse: true });

const DeliveryAssignment = mongoose.model(
  "DeliveryAssignment",
  deliveryAssignmentSchema
);

export default DeliveryAssignment;




