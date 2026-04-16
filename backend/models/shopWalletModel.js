import mongoose from "mongoose";

const walletTransactionSchema = new mongoose.Schema(
  {
    uniqueTransactionId: { type: String, required: true, trim: true },
    amount: { type: Number, required: true, min: 0 },
    type: { type: String, enum: ["credit", "debit"], required: true },
    orderId: { type: mongoose.Schema.Types.ObjectId, ref: "Order", default: null },
    shopOrderId: { type: mongoose.Schema.Types.ObjectId, ref: "ShopOrder", default: null },
    date: { type: Date, default: Date.now },
  },
  { _id: false }
);

const shopWalletSchema = new mongoose.Schema(
  {
    shopId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Shop",
      required: true,
      unique: true
    },
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    balance: { type: Number, default: 0, min: 0 },
    transactions: { type: [walletTransactionSchema], default: [] }
  },
  { timestamps: true }
);

shopWalletSchema.index({ ownerId: 1 });
shopWalletSchema.index({ "transactions.uniqueTransactionId": 1 });
shopWalletSchema.index({ "transactions.date": -1 });

export default mongoose.model("ShopWallet", shopWalletSchema);
