import mongoose from "mongoose";

const auditLogSchema = new mongoose.Schema(
  {
    action: {
      type: String,
      required: true,
      enum: ["CREATE", "UPDATE", "DELETE", "LOGIN", "ERROR", "SYSTEM"],
    },

    entity: {
      type: String,
      required: false,
      default: null,
    },

    entityId: {
      type: String,
      required: false,
      default: null,  // IMPORTANT FIX
    },

    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false,
    },

    status: {
      type: String,
      enum: ["SUCCESS", "FAILURE"],
      required: true,
    },

    details: {
      type: Object,
      default: {},
    },

    errorMessage: {
      type: String,
      default: null,
    },
  },
  { timestamps: true }
);

export default mongoose.model("AuditLog", auditLogSchema);
