import mongoose from "mongoose";
import DeliveryWallet from "../models/deliveryWalletModel.js";
import ShopWallet from "../models/shopWalletModel.js";

const roundCurrency = (value) => Number(Number(value || 0).toFixed(2));

const ensureWalletExists = async ({ Model, filter, setOnInsert, session = null }) => {
  await Model.updateOne(
    filter,
    { $setOnInsert: setOnInsert },
    { upsert: true, session }
  );
};

const appendWalletTransactionIfMissing = async ({
  Model,
  filter,
  amount,
  type,
  uniqueTransactionId,
  orderId = null,
  shopOrderId = null,
  session = null
}) => {
  const safeAmount = roundCurrency(amount);
  if (!Number.isFinite(safeAmount) || safeAmount <= 0) {
    return { applied: false, reason: "invalid_amount" };
  }

  if (!uniqueTransactionId) {
    throw new Error("uniqueTransactionId is required");
  }

  const signedAmount = type === "debit" ? -safeAmount : safeAmount;

  const updateResult = await Model.updateOne(
    {
      ...filter,
      transactions: {
        $not: { $elemMatch: { uniqueTransactionId } }
      }
    },
    {
      $inc: { balance: signedAmount },
      $push: {
        transactions: {
          uniqueTransactionId,
          amount: safeAmount,
          type,
          orderId,
          shopOrderId,
          date: new Date()
        }
      }
    },
    { session }
  );

  const applied =
    Number(updateResult?.modifiedCount || 0) > 0 ||
    Number(updateResult?.upsertedCount || 0) > 0;

  return {
    applied,
    reason: applied ? null : "duplicate_transaction",
    amount: safeAmount
  };
};

export const creditDeliveryWallet = async ({
  userId,
  amount,
  orderId = null,
  shopOrderId = null,
  uniqueTransactionId,
  session = null
}) => {
  if (!userId) throw new Error("userId is required for delivery wallet credit");

  await ensureWalletExists({
    Model: DeliveryWallet,
    filter: { userId: new mongoose.Types.ObjectId(userId) },
    setOnInsert: {
      userId: new mongoose.Types.ObjectId(userId),
      balance: 0,
      transactions: []
    },
    session
  });

  return appendWalletTransactionIfMissing({
    Model: DeliveryWallet,
    filter: { userId: new mongoose.Types.ObjectId(userId) },
    amount,
    type: "credit",
    uniqueTransactionId,
    orderId,
    shopOrderId,
    session
  });
};

export const creditShopWallet = async ({
  shopId,
  ownerId,
  amount,
  orderId = null,
  shopOrderId = null,
  uniqueTransactionId,
  session = null
}) => {
  if (!shopId) throw new Error("shopId is required for shop wallet credit");
  if (!ownerId) throw new Error("ownerId is required for shop wallet credit");

  await ensureWalletExists({
    Model: ShopWallet,
    filter: { shopId: new mongoose.Types.ObjectId(shopId) },
    setOnInsert: {
      shopId: new mongoose.Types.ObjectId(shopId),
      ownerId: new mongoose.Types.ObjectId(ownerId),
      balance: 0,
      transactions: []
    },
    session
  });

  return appendWalletTransactionIfMissing({
    Model: ShopWallet,
    filter: { shopId: new mongoose.Types.ObjectId(shopId) },
    amount,
    type: "credit",
    uniqueTransactionId,
    orderId,
    shopOrderId,
    session
  });
};

const getDateRange = (period = "today") => {
  const now = new Date();
  const start = new Date(now);
  const end = new Date(now);

  if (period === "today") {
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);
    return { start, end };
  }

  // month
  start.setDate(1);
  start.setHours(0, 0, 0, 0);
  end.setHours(23, 59, 59, 999);
  return { start, end };
};

const amountSignedExpr = {
  $cond: [
    { $eq: ["$transactions.type", "credit"] },
    "$transactions.amount",
    { $multiply: ["$transactions.amount", -1] }
  ]
};

export const getDeliveryEarningsForPeriod = async ({ userId, period = "today" }) => {
  const { start, end } = getDateRange(period);

  const rows = await DeliveryWallet.aggregate([
    { $match: { userId: new mongoose.Types.ObjectId(userId) } },
    { $unwind: "$transactions" },
    {
      $match: {
        "transactions.date": { $gte: start, $lte: end }
      }
    },
    {
      $project: {
        _id: 0,
        orderId: "$transactions.orderId",
        shopOrderId: "$transactions.shopOrderId",
        uniqueTransactionId: "$transactions.uniqueTransactionId",
        date: "$transactions.date",
        type: "$transactions.type",
        amount: "$transactions.amount",
        signedAmount: amountSignedExpr
      }
    },
    { $sort: { date: -1 } }
  ]);

  const total = roundCurrency(rows.reduce((sum, row) => sum + Number(row.signedAmount || 0), 0));

  return {
    period,
    start,
    end,
    total,
    transactions: rows
  };
};

export const getShopEarningsForPeriod = async ({ ownerId, period = "today" }) => {
  const { start, end } = getDateRange(period);

  const rows = await ShopWallet.aggregate([
    { $match: { ownerId: new mongoose.Types.ObjectId(ownerId) } },
    { $unwind: "$transactions" },
    {
      $match: {
        "transactions.date": { $gte: start, $lte: end }
      }
    },
    {
      $project: {
        _id: 0,
        shopId: "$shopId",
        orderId: "$transactions.orderId",
        shopOrderId: "$transactions.shopOrderId",
        uniqueTransactionId: "$transactions.uniqueTransactionId",
        date: "$transactions.date",
        type: "$transactions.type",
        amount: "$transactions.amount",
        signedAmount: amountSignedExpr
      }
    },
    { $sort: { date: -1 } }
  ]);

  const total = roundCurrency(rows.reduce((sum, row) => sum + Number(row.signedAmount || 0), 0));

  const byShopMap = new Map();
  for (const row of rows) {
    const key = String(row.shopId || "");
    byShopMap.set(key, roundCurrency((byShopMap.get(key) || 0) + Number(row.signedAmount || 0)));
  }

  const shopBreakdown = [...byShopMap.entries()].map(([shopId, amount]) => ({
    shopId,
    amount
  }));

  return {
    period,
    start,
    end,
    total,
    shopBreakdown,
    transactions: rows
  };
};
