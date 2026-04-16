import dotenv from "dotenv";
import mongoose from "mongoose";
import Order from "../../models/orderModel.js";
import ShopOrder from "../../models/shopOrderModel.js";

dotenv.config();

const run = async () => {
  if (!process.env.MONGODB_URL) {
    throw new Error("MONGODB_URL is not set");
  }

  await mongoose.connect(process.env.MONGODB_URL);
  console.log("[MIGRATION] Connected to database");

  const orderResult = await Order.updateMany(
    {},
    {
      $unset: {
        totalGST: "",
        gst: "",
        platformFee: ""
      }
    }
  );

  const shopOrderResult = await ShopOrder.updateMany(
    {},
    {
      $unset: {
        gstAmount: "",
        gst: "",
        platformFee: ""
      }
    }
  );

  console.log("[MIGRATION] Orders modified:", orderResult.modifiedCount || 0);
  console.log("[MIGRATION] ShopOrders modified:", shopOrderResult.modifiedCount || 0);
  console.log("[MIGRATION] GST + platform fee cleanup completed");
};

run()
  .catch((error) => {
    console.error("[MIGRATION] Failed:", error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.connection.close();
    console.log("[MIGRATION] Connection closed");
  });
