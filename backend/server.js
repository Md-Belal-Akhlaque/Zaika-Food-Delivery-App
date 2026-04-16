import http from "http";
import app from "./app.js";
import connectDB from "./config/db.js";
import { initSocket } from "./socket.js";
import { startDeliveryWorker } from "./workers/deliveryWorker.js";

const PORT = process.env.PORT || 5000;

import cron from "node-cron";
import DeliveryAssignment from "./models/deliveryAssignmentModel.js";
import User from "./models/userModel.js";
import logger from "./utility/logger.js";

// STATE CONSISTENCY CLEANUP JOB (Production level)
// Runs every 1 hour to fix data inconsistencies
// UTILIZES: fallback cleanup, state consistency
cron.schedule("0 * * * *", async () => {
  logger.info("cron_state_consistency_cleanup_started");
  try {
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);

    // 1. Free "Stuck" Riders
    // If an assignment is still 'assigned' or 'picked' after 2 hours, something is wrong
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

    // 2. Cleanup Failed Broadcasts
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

// Create Server
const server = http.createServer(app);

// Initialize Socket.io
initSocket(server);

server.listen(PORT, async () => {
  await connectDB();
  await startDeliveryWorker();
});
