import { Queue } from "bullmq";
import Redis from "ioredis";

const parseBoolean = (value) => String(value || "").trim().toLowerCase() === "true";

const parseRedisConnectionFromUrl = (redisUrl) => {
  try {
    const parsedUrl = new URL(redisUrl);
    const protocol = String(parsedUrl.protocol || "").replace(":", "").toLowerCase();

    if (protocol !== "redis" && protocol !== "rediss") {
      throw new Error("REDIS_URL must start with redis:// or rediss://");
    }

    const useTlsFromUrl = protocol === "rediss";
    const username = parsedUrl.username ? decodeURIComponent(parsedUrl.username) : undefined;
    const passwordFromUrl = parsedUrl.password
      ? decodeURIComponent(parsedUrl.password)
      : undefined;

    return {
      host: parsedUrl.hostname,
      port: Number(parsedUrl.port || 6379),
      username: username || undefined,
      password: passwordFromUrl || process.env.REDIS_PASSWORD || undefined,
      tls: useTlsFromUrl || parseBoolean(process.env.REDIS_TLS) ? {} : undefined,
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
      lazyConnect: false,
      retryStrategy: (times) => {
        if (times > 5) return null; // Stop retrying after 5 attempts
        return Math.min(times * 500, 3000);
      },
    };
  } catch (error) {
    throw new Error(`Invalid REDIS_URL: ${error.message}`);
  }
};

const buildRedisConnectionOptions = () => {
  const redisUrl = String(process.env.REDIS_URL || "").trim();
  if (redisUrl) {
    return parseRedisConnectionFromUrl(redisUrl);
  }

  const useTls =
    parseBoolean(process.env.REDIS_TLS) ||
    String(process.env.REDIS_HOST || "").includes("upstash.io");

  return {
    host: process.env.REDIS_HOST,
    port: Number(process.env.REDIS_PORT || 6379),
    password: process.env.REDIS_PASSWORD || undefined,
    tls: useTls ? {} : undefined,
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    lazyConnect: false,
    retryStrategy: (times) => {
      if (times > 5) return null;
      return Math.min(times * 500, 3000);
    },
  };
};

export const redisConnectionOptions = buildRedisConnectionOptions();
const redisEndpointLabel = `${redisConnectionOptions.host}:${redisConnectionOptions.port}`;

export const createRedisClient = () => {
  const client = new Redis(redisConnectionOptions);
  client.on("error", (err) => {
    console.error(`[REDIS] Client error (${redisEndpointLabel}): ${err.message}`);
  });
  client.on("connect", () => {
    console.log(`[REDIS] Connected to ${redisEndpointLabel}`);
  });
  client.on("ready", () => {
    console.log(`[REDIS] Ready at ${redisEndpointLabel}`);
  });
  return client;
};

// Shared Redis connection for BullMQ
export const redisConnection = createRedisClient();
redisConnection.on("error", (err) => {
  console.error(`[REDIS] Global connection error (${redisEndpointLabel}): ${err.message}`);
});

// ✅ Fixed: Uses PING instead of raw TCP (works with TLS/Upstash)
export const isRedisReachable = async (timeoutMs = 3000) => {
  let testClient = null;
  try {
    testClient = new Redis({
      ...redisConnectionOptions,
      lazyConnect: true,
      connectTimeout: timeoutMs,
      maxRetriesPerRequest: 1,
      retryStrategy: () => null, // No retries for health check
    });

    await Promise.race([
      testClient.ping(),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Redis health check timed out")), timeoutMs)
      ),
    ]);

    return true;
  } catch (err) {
    console.warn(`[REDIS] Health check failed: ${err.message}`);
    return false;
  } finally {
    if (testClient) {
      testClient.disconnect();
    }
  }
};

// ─── Queue Instances ──────────────────────────────────────────────────────────

let deliveryBroadcastQueue = null;
let adminAlertQueue = null;

const createQueueWithLogging = (name) => {
  const queue = new Queue(name, {
    connection: redisConnection,
    defaultJobOptions: {
      removeOnComplete: { age: 3600, count: 1000 },
      removeOnFail: { age: 24 * 3600, count: 1000 },
    },
  });
  queue.on("error", (error) => {
    console.error(`[QUEUE] ${name} error: ${error.message}`);
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

// ─── Enqueue Helpers ──────────────────────────────────────────────────────────

export const enqueueBroadcast = async (assignmentId, attemptNumber = 1) => {
  try {
    if (!assignmentId) {
      throw new Error("assignmentId is required for enqueueBroadcast");
    }

    const normalizedAttempt = Math.max(1, Number(attemptNumber) || 1);
    const deterministicJobId = `${assignmentId}:${normalizedAttempt}`;
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
      { assignmentId, attemptNumber: normalizedAttempt },
      {
        jobId: deterministicJobId,
        attempts: 3,
        backoff: { type: "exponential", delay: 2000 },
        delay: 0,
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
    if (!assignmentId) {
      throw new Error("assignmentId is required for enqueueBroadcastWithDelay");
    }

    const normalizedAttempt = Math.max(1, Number(attemptNumber) || 1);
    const normalizedDelay = Math.max(0, Number(delayMs) || 0);
    const deterministicJobId = `${assignmentId}:${normalizedAttempt}`;

    const job = await getDeliveryBroadcastQueue().add(
      "broadcast-assignment",
      { assignmentId, attemptNumber: normalizedAttempt },
      {
        jobId: deterministicJobId,
        attempts: 3,
        backoff: { type: "exponential", delay: 2000 },
        delay: normalizedDelay,
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
      { type, data, timestamp: new Date().toISOString() }
    );
    return job;
  } catch (error) {
    console.error(`[QUEUE] Failed to enqueue admin alert: type=${type}`, error);
    throw error;
  }
};

// ─── Graceful Shutdown ────────────────────────────────────────────────────────

const shutdown = async () => {
  console.log("[REDIS] Shutting down Redis connections...");
  try {
    if (deliveryBroadcastQueue) await deliveryBroadcastQueue.close();
    if (adminAlertQueue) await adminAlertQueue.close();
    await redisConnection.quit();
  } catch (err) {
    console.error("[REDIS] Error during shutdown:", err.message);
  }
};

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);