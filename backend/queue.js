import { Queue } from "bullmq";
import Redis from "ioredis";
import net from "net";

export const redisConnectionOptions = {
  host: process.env.REDIS_HOST || "127.0.0.1",
  port: Number(process.env.REDIS_PORT || 6380),
  maxRetriesPerRequest: null
};

// FIX: Shared Redis connection with error handler
// This prevents "missing 'error' handler" warnings
export const redisConnection = new Redis(redisConnectionOptions);
redisConnection.on("error", (err) => {
  console.error(`[REDIS] Global connection error (${redisConnectionOptions.host}:${redisConnectionOptions.port}): ${err.message}`);
});

let deliveryBroadcastQueue = null;
let adminAlertQueue = null;

const createQueueWithLogging = (name) => {
  const queue = new Queue(name, { connection: redisConnection });
  queue.on("error", (error) => {
    console.error(
      `[QUEUE] ${name} connection error: ${error.message}`
    );
  });
  return queue;
};

const getDeliveryBroadcastQueue = () => {
  if (!deliveryBroadcastQueue) {
    deliveryBroadcastQueue = createQueueWithLogging("delivery-broadcast");
  }
  return deliveryBroadcastQueue;
};

const getAdminAlertQueue = () => {
  if (!adminAlertQueue) {
    adminAlertQueue = createQueueWithLogging("admin-alerts");
  }
  return adminAlertQueue;
};

export const isRedisReachable = (timeoutMs = 1500) =>
  new Promise((resolve) => {
    const socket = net.createConnection({
      host: redisConnectionOptions.host,
      port: redisConnectionOptions.port
    });

    let settled = false;
    const done = (result) => {
      if (settled) return;
      settled = true;
      socket.destroy();
      resolve(result);
    };

    socket.setTimeout(timeoutMs);
    socket.on("connect", () => done(true));
    socket.on("error", () => done(false));
    socket.on("timeout", () => done(false));
  });

export const enqueueBroadcast = async (assignmentId, attemptNumber = 1) => {
  try {
    const normalizedAttempt = Math.max(1, Number(attemptNumber) || 1);
    const deterministicJobId = `${assignmentId}:${normalizedAttempt}`;
    if (!assignmentId) {
      throw new Error("assignmentId is required for enqueueBroadcast");
    }
    const queue = getDeliveryBroadcastQueue();
    const existingJob = await queue.getJob(deterministicJobId);
    if (existingJob) {
      const state = await existingJob.getState();
      if (state !== "active") {
        await existingJob.remove();
      }
    }

    const job = await queue.add(
      "broadcast-assignment",
      {
        assignmentId,
        attemptNumber: normalizedAttempt
      },
      {
        jobId: deterministicJobId,
        attempts: 3,
        backoff: {
          type: "exponential",
          delay: 2000
        },
        removeOnComplete: { age: 3600, count: 1000 },
        removeOnFail: { age: 24 * 3600, count: 1000 },
        delay: 0
      }
    );
    return job;
  } catch (error) {
    console.error(
      `[QUEUE] Failed to enqueue delivery broadcast: assignment=${assignmentId} attempt=${attemptNumber}`,
      error
    );
    throw error;
  }
};

export const enqueueBroadcastWithDelay = async (
  assignmentId,
  attemptNumber,
  delayMs = 15000
) => {
  try {
    const normalizedAttempt = Math.max(1, Number(attemptNumber) || 1);
    const normalizedDelay = Math.max(0, Number(delayMs) || 0);
    const deterministicJobId = `${assignmentId}:${normalizedAttempt}`;
    if (!assignmentId) {
      throw new Error("assignmentId is required for enqueueBroadcastWithDelay");
    }

    const job = await getDeliveryBroadcastQueue().add(
      "broadcast-assignment",
      {
        assignmentId,
        attemptNumber: normalizedAttempt
      },
      {
        jobId: deterministicJobId,
        attempts: 3,
        backoff: {
          type: "exponential",
          delay: 2000
        },
        removeOnComplete: { age: 3600, count: 1000 },
        removeOnFail: { age: 24 * 3600, count: 1000 },
        delay: normalizedDelay
      }
    );
    return job;
  } catch (error) {
    console.error(
      `[QUEUE] Failed to enqueue delayed delivery broadcast: assignment=${assignmentId} attempt=${attemptNumber}`,
      error
    );
    throw error;
  }
};

export const enqueueAdminAlert = async (type, data = {}) => {
  try {
    const job = await getAdminAlertQueue().add(
      "admin-alert",
      {
        type,
        data,
        timestamp: new Date().toISOString()
      },
      {
        removeOnComplete: { age: 24 * 3600, count: 1000 },
        removeOnFail: { age: 7 * 24 * 3600, count: 1000 }
      }
    );
    return job;
  } catch (error) {
    console.error(`[QUEUE] Failed to enqueue admin alert: type=${type}`, error);
    throw error;
  }
};
