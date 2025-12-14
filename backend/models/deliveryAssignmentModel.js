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

    shopOrderId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true
    },

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    //  BROADCAST DATA (Track each rider's response)
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
        sentAt: {
          type: Date,
          default: Date.now
        },
        expiresAt: Date,
        acceptedAt: Date,
        _id: false // Don't create _id for subdocuments
      }
    ],

    // BROADCAST STATUS (Overall broadcast state)
    broadcastStatus: {
      type: String,
      enum: ["active", "accepted", "expired"],
      default: "active"
    },

    // BROADCAST EXPIRY (5 mins timer)
    broadcastExpiresAt: Date,

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    //  ASSIGNMENT DATA (After rider accepts)
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    assignedDeliveryPartner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null
    },

    //  ASSIGNMENT STATUS (Delivery progress)
    assignmentStatus: {
      type: String,
      enum: [
        "unassigned",
        "assigned",
        "picked",
        "delivering",
        "delivered",
        "cancelled"
      ],
      default: "unassigned"
    },

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    //  LOCATION DATA (Pickup & Dropoff)
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    pickupLocation: {
      shop: {
        _id: mongoose.Schema.Types.ObjectId,
        name: String,
        latitude: Number,
        longitude: Number,
        address: String
      }
    },

    dropoffLocation: {
      customer: {
        _id: mongoose.Schema.Types.ObjectId,
        name: String,
        latitude: Number,
        longitude: Number,
        address: String
      }
    },

    // METRICS
    deliveryDistance: {
      type: Number, // in km
      default: 0
    },

    estimatedDeliveryTime: {
      type: Number, // in minutes
      default: 30
    },

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // TIMESTAMPS
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    assignedAt: { type: Date },
    pickedAt: { type: Date },
    outForDeliveryAt: { type: Date },
    deliveredAt: { type: Date },
    cancelledAt: { type: Date },

    cancellationReason: { type: String }
  },
  { 
    timestamps: true // createdAt, updatedAt
  }
);

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// INDEXES (For faster queries)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
deliveryAssignmentSchema.index({ assignedDeliveryPartner: 1 });
deliveryAssignmentSchema.index({ broadcastStatus: 1, assignmentStatus: 1 });
deliveryAssignmentSchema.index({ broadcastExpiresAt: 1 });
deliveryAssignmentSchema.index({ 'broadcastedTo.deliveryPartnerId': 1 });

const DeliveryAssignment = mongoose.model(
  "DeliveryAssignment",
  deliveryAssignmentSchema
);

export default DeliveryAssignment;




















// import mongoose from "mongoose";

// const deliveryAssignmentSchema = new mongoose.Schema(
//   {
//     order: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: "Order",
//       required: true
//     },

//     shop: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: "Shop",
//       required: true
//     },

//     shopOrderId: {
//       type: mongoose.Schema.Types.ObjectId,
//       required: true
//     },

//     broadcastedTo: [
//       {
//         type: mongoose.Schema.Types.ObjectId,
//         ref: "User"
//       }
//     ],

//     assignedTo: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: "User",
//       default: null
//     },

//     status: {
//       type: String,
//       enum: [
//         "broadcasted",
//         "assigned",
//         "accepted",
//         "picked",
//         "delivered",
//         "cancelled",
//       ],
//       default: "broadcasted"
//     },

//     assignedAt: { type: Date },
//     acceptedAt: { type: Date },
//     pickedAt: { type: Date },
//     deliveredAt: { type: Date },
//     cancelledAt: { type: Date },

//     cancellationReason: { type: String }
//   },
//   { timestamps: true }
// );

// const DeliveryAssignment = mongoose.model(
//   "DeliveryAssignment",
//   deliveryAssignmentSchema
// );

// export default DeliveryAssignment;



