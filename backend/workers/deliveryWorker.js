import { Worker } from "bullmq";
import mongoose from "mongoose";
import DeliveryAssignment from "../models/deliveryAssignmentModel.js";
import DeliveryPartnerModel from "../models/userModel.js";
import { emitToDeliveryPartner, getConnectedDeliveryPartnerIds } from "../socket.js";
import {
  enqueueAdminAlert,
  enqueueBroadcastWithDelay,
  isRedisReachable,
  redisConnectionOptions, // use options, not shared connection
} from "../queue.js";
import Redis from "ioredis";

//  Workers need their OWN dedicated connections (BullMQ requirement)
// Sharing redisConnection between Queue + Worker causes ECONNRESET
const createWorkerRedisClient = () => {
  const client = new Redis({
    ...redisConnectionOptions,
    maxRetriesPerRequest: null, // Required by BullMQ
  });
  client.on("error", (err) => {
    console.error(`[WORKER-REDIS] Connection error: ${err.message}`);
  });
  return client;
};

const ROUND_WAIT_MS = 15 * 1000;
const BATCH_CONFIG = {
  1: { limit: 3, radius: 3000 },
  2: { limit: 5, radius: 5000 },
  3: { limit: 10, radius: 10000 }
};

const buildPayload = (assignment) => ({
  assignmentId: assignment._id,
  shopOrderId: assignment.shopOrder?._id || assignment.shopOrder,
  orderId: assignment.order?._id || assignment.order,
  pickupAddress: assignment.pickupLocation?.address || "",
  dropAddress: assignment.dropoffLocation?.address || "",
  pickupLatLng: assignment.pickupLocation?.coordinates || [],
  dropLatLng: assignment.dropoffLocation?.coordinates || [],
  paymentMethod: assignment.order?.paymentMethod || "",
  deliveryDistance: assignment.deliveryDistance ?? 0,
  estimatedDeliveryTime: assignment.estimatedDeliveryTime ?? 0
});

const expireTimedOutBroadcasts = (assignment, now) => {
  let changed = false;
  const nextBroadcastedTo = (assignment.broadcastedTo || []).map((entry) => {
    const isSentAndExpired =
      entry.status === "sent" &&
      entry.expiresAt &&
      new Date(entry.expiresAt).getTime() <= now.getTime();

    if (!isSentAndExpired) return entry;

    changed = true;
    return {
      ...entry.toObject?.(),
      status: "expired",
      respondedAt: now
    };
  });

  return { changed, nextBroadcastedTo };
};

const getRoundConfig = (round) => BATCH_CONFIG[round] || null;

const fetchDeliveryPartnerBatch = async ({
  coordinates,
  round,
  excludeDeliveryPartnerIds = []
}) => {
  const config = getRoundConfig(round);
  if (!config) return [];

  const [lng, lat] = coordinates;
  const excludedObjectIds = excludeDeliveryPartnerIds.map(
    (id) => new mongoose.Types.ObjectId(id)
  );

  const connectedDeliveryPartnerIds = getConnectedDeliveryPartnerIds();
  const connectedObjectIds = connectedDeliveryPartnerIds
    .filter((id) => !excludeDeliveryPartnerIds.includes(String(id)))
    .map((id) => new mongoose.Types.ObjectId(id));

  let partners = await DeliveryPartnerModel.aggregate([
    {
      $geoNear: {
        near: { type: "Point", coordinates: [lng, lat] },
        distanceField: "distance",
        maxDistance: config.radius,
        query: {
          role: "deliveryPartner",
          isActive: true,
          isBusy: { $ne: true },
          $or: [{ isAvailable: true }, { _id: { $in: connectedObjectIds } }],
          _id: { $nin: excludedObjectIds }
        },
        spherical: true
      }
    },
    { $sort: { distance: 1, rating: -1 } },
    { $limit: config.limit },
    {
      $project: {
        _id: 1,
        location: 1,
        isAvailable: 1,
        isActive: 1,
        isBusy: 1,
        rating: 1,
        distance: 1
      }
    }
  ]);

  if (partners.length === 0) {
    partners = await DeliveryPartnerModel.find({
      role: "deliveryPartner",
      isActive: true,
      isBusy: { $ne: true },
      $or: [{ isAvailable: true }, { _id: { $in: connectedObjectIds } }],
      _id: { $nin: excludedObjectIds }
    })
      .sort({ rating: -1 })
      .limit(config.limit)
      .select("_id location isAvailable isActive isBusy rating");
  }

  if (partners.length === 0) {
    partners = await DeliveryPartnerModel.aggregate([
      {
        $geoNear: {
          near: { type: "Point", coordinates: [lng, lat] },
          distanceField: "distance",
          maxDistance: config.radius,
          query: {
            role: "deliveryPartner",
            isBusy: { $ne: true },
            $or: [{ isAvailable: true }, { isActive: true }],
            _id: { $nin: excludedObjectIds }
          },
          spherical: true
        }
      },
      { $sort: { distance: 1, rating: -1 } },
      { $limit: config.limit },
      {
        $project: {
          _id: 1,
          location: 1,
          isAvailable: 1,
          isActive: 1,
          isBusy: 1,
          rating: 1,
          distance: 1
        }
      }
    ]);
  }

  if (partners.length === 0) {
    partners = await DeliveryPartnerModel.find({
      role: "deliveryPartner",
      isBusy: { $ne: true },
      $or: [{ isAvailable: true }, { isActive: true }],
      _id: { $nin: excludedObjectIds }
    })
      .sort({ rating: -1 })
      .limit(config.limit)
      .select("_id location isAvailable isActive isBusy rating");
  }

  if (partners.length === 0) {
    partners = await DeliveryPartnerModel.find({
      role: "deliveryPartner",
      _id: { $nin: excludedObjectIds }
    })
      .sort({ rating: -1 })
      .limit(1)
      .select("_id location isAvailable isActive isBusy rating");
  }

  return partners;
};

const markFailedAndAlert = async (assignment, reason) => {
  assignment.broadcastStatus = "failed";
  assignment.broadcastExpiresAt = new Date();
  await assignment.save();

  await enqueueAdminAlert("no_delivery_partners", {
    assignmentId: assignment._id,
    orderId: assignment.order?._id || assignment.order,
    shopOrderId: assignment.shopOrder,
    reason
  });
};

const processBroadcastRound = async (assignment, round) => {
  const now = new Date();
  const { changed, nextBroadcastedTo } = expireTimedOutBroadcasts(assignment, now);
  if (changed) {
    assignment.broadcastedTo = nextBroadcastedTo;
    await assignment.save();
  }

  if (assignment.assignmentStatus !== "unassigned") return;

  const coordinates = assignment.pickupLocation?.coordinates;
  if (!Array.isArray(coordinates) || coordinates.length !== 2) {
    await enqueueAdminAlert("invalid_pickup_location", {
      assignmentId: assignment._id,
      pickupLocation: assignment.pickupLocation
    });
    return;
  }

  const roundConfig = getRoundConfig(round);
  if (!roundConfig) {
    await markFailedAndAlert(assignment, "broadcast_round_exhausted");
    return;
  }

  const alreadySent = (assignment.broadcastedTo || [])
    .map((entry) => entry.deliveryPartnerId?.toString())
    .filter(Boolean);

  const deliveryPartners = await fetchDeliveryPartnerBatch({
    coordinates,
    round,
    excludeDeliveryPartnerIds: alreadySent
  });

  const sentAt = new Date();
  const expiresAt = new Date(sentAt.getTime() + ROUND_WAIT_MS);
  const payload = buildPayload(assignment);

  for (const deliveryPartner of deliveryPartners) {
    const deliveryPartnerId = deliveryPartner._id.toString();
    const existingIndex = (assignment.broadcastedTo || []).findIndex(
      (entry) => entry.deliveryPartnerId?.toString() === deliveryPartnerId
    );

    const nextEntry = {
      deliveryPartnerId: deliveryPartner._id,
      status: "sent",
      sentAt,
      expiresAt,
      respondedAt: null
    };

    if (existingIndex >= 0) {
      assignment.broadcastedTo[existingIndex] = nextEntry;
    } else {
      assignment.broadcastedTo.push(nextEntry);
    }

    emitToDeliveryPartner(deliveryPartnerId, "delivery:new", payload);
  }

  assignment.markModified("broadcastedTo");
  assignment.broadcastStatus = "active";
  assignment.broadcastRound = round;
  assignment.broadcastExpiresAt = expiresAt;
  await assignment.save();

  const freshAssignment = await DeliveryAssignment.findById(assignment._id).select(
    "assignmentStatus"
  );
  if (freshAssignment?.assignmentStatus === "unassigned") {
    await enqueueBroadcastWithDelay(assignment._id.toString(), round + 1, ROUND_WAIT_MS);
  }
};

const startBroadcastWorker = () => {
  //  Fresh dedicated connection for this worker
  const connection = createWorkerRedisClient();

  const worker = new Worker(
    "delivery-broadcast",
    async (job) => {
      const assignmentId = job.data?.assignmentId;
      const attemptNumber = Math.max(1, Number(job.data?.attemptNumber) || 1);

      const assignment = await DeliveryAssignment.findById(assignmentId).populate(
        "order",
        "paymentMethod"
      );

      if (!assignment) return;

      if (attemptNumber > 3) {
        const { changed, nextBroadcastedTo } = expireTimedOutBroadcasts(
          assignment,
          new Date()
        );
        if (changed) {
          assignment.broadcastedTo = nextBroadcastedTo;
          await assignment.save();
        }

        if (assignment.assignmentStatus === "unassigned") {
          await markFailedAndAlert(assignment, "max_rounds_completed_without_accept");
        }
        return;
      }

      if (assignment.assignmentStatus !== "unassigned") return;
      await processBroadcastRound(assignment, attemptNumber);
    },
    {
      connection,
      concurrency: Number(process.env.DELIVERY_BROADCAST_CONCURRENCY || 10)
    }
  );

  return worker;
};

const startAdminAlertWorker = () => {
  //  Fresh dedicated connection for this worker
  const connection = createWorkerRedisClient();

  return new Worker(
    "admin-alerts",
    async () => {},
    {
      connection,
      concurrency: 1
    }
  );
};

export const startDeliveryWorker = async () => {
  if (String(process.env.ENABLE_DELIVERY_WORKER || "true").toLowerCase() === "false") {
    return { broadcastWorker: null, adminAlertWorker: null };
  }

  const redisUp = await isRedisReachable(3000);
  if (!redisUp) {
    console.error("[WORKER] Redis unavailable. Delivery workers not started.");
    return { broadcastWorker: null, adminAlertWorker: null };
  }

  const broadcastWorker = startBroadcastWorker();
  const adminAlertWorker = startAdminAlertWorker();

  broadcastWorker.on("failed", (job, error) => {
    console.error(`[WORKER] delivery-broadcast failed jobId=${job?.id} error=${error.message}`);
  });
  broadcastWorker.on("error", (error) => {
    console.error(`[WORKER] delivery-broadcast worker error: ${error.message}`);
  });

  adminAlertWorker.on("failed", (job, error) => {
    console.error(`[WORKER] admin-alert failed jobId=${job?.id} error=${error.message}`);
  });
  adminAlertWorker.on("error", (error) => {
    console.error(`[WORKER] admin-alert worker error: ${error.message}`);
  });

  console.log("[WORKER] Delivery workers started successfully");

  const shutdown = async () => {
    await Promise.all([broadcastWorker.close(), adminAlertWorker.close()]);
  };

  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);

  return { broadcastWorker, adminAlertWorker };
};
