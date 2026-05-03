import dotenv from "dotenv";
dotenv.config();

import http from "http";
import app from "./app.js";
import connectDB from "./config/db.js";
import { initSocket } from "./socket.js";
import { startDeliveryWorker } from "./workers/deliveryWorker.js";

import cron from "node-cron";
import DeliveryAssignment from "./models/deliveryAssignmentModel.js";
import User from "./models/userModel.js";
import logger from "./utility/logger.js";

const PORT = process.env.PORT || 5000;

// STATE CONSISTENCY CLEANUP JOB
cron.schedule("0 * * * *", async () => {
  logger.info("cron_state_consistency_cleanup_started");
  try {
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);

    const stuckAssignments = await DeliveryAssignment.find({
      assignmentStatus: { $in: ["assigned", "picked", "delivering"] },
      updatedAt: { $lt: twoHoursAgo }
    });

    for (const ass of stuckAssignments) {
      if (ass.assignedDeliveryPartner) {
        await User.findByIdAndUpdate(ass.assignedDeliveryPartner, { isBusy: false });
        logger.info("cron_freed_stuck_rider", {
          deliveryPartnerId: String(ass.assignedDeliveryPartner),
          assignmentId: String(ass._id),
        });
      }
    }

    const failedBroadcasts = await DeliveryAssignment.updateMany(
      { broadcastStatus: "active", broadcastExpiresAt: { $lt: new Date() } },
      { $set: { broadcastStatus: "failed" } }
    );
    if (failedBroadcasts.modifiedCount > 0) {
      logger.info("cron_expired_broadcasts", { modifiedCount: failedBroadcasts.modifiedCount });
    }
  } catch (err) {
    logger.error("cron_state_consistency_cleanup_error", { error: err?.message || String(err) });
  }
});

//  Correct startup order: DB first, then server, then workers
const start = async () => {
  try {
    // 1. Connect to MongoDB first
    await connectDB();

    // 2. Create HTTP server
    const server = http.createServer(app);

    // 3. Initialize Socket.io (Redis pub/sub connects here)
    initSocket(server);

    // 4. Start listening
    server.listen(PORT, () => {
      console.log(`[SERVER] Running on port ${PORT}`);
    });

    // 5. Start BullMQ workers after everything is ready
    await startDeliveryWorker();

  } catch (err) {
    console.error("[SERVER] Fatal startup error:", err.message);
    process.exit(1);
  }
};

start();