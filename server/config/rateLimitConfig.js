import dotenv from "dotenv";
import { createClient } from "redis";
import rateLimitRedis from "rate-limit-redis";

dotenv.config();

const parsePositiveInt = (value, fallback) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const parseTrustProxy = (value) => {
  if (value === undefined) {
    return false;
  }

  const normalized = String(value).trim().toLowerCase();

  if (normalized === "true" || normalized === "1") {
    return true;
  }

  if (normalized === "false" || normalized === "0") {
    return false;
  }

  const parsed = Number.parseInt(normalized, 10);
  return Number.isFinite(parsed) ? parsed : false;
};

const rateLimitStoreType = String(process.env.RATE_LIMIT_STORE || "memory").toLowerCase();
const redisUrl = String(process.env.REDIS_URL || "").trim();

let redisClient;

function getRedisClient() {
  if (!redisClient) {
    redisClient = createClient({ url: redisUrl });
    redisClient.on("error", (error) => {
      console.error("Redis error:", error);
    });
    redisClient.connect().catch((error) => {
      console.error("Redis connect error:", error);
    });
  }

  return redisClient;
}

export function getRateLimitStore(prefix) {
  if (rateLimitStoreType !== "redis") {
    return undefined;
  }

  if (!redisUrl) {
    console.warn("RATE_LIMIT_STORE is set to redis, but REDIS_URL is missing. Falling back to memory store.");
    return undefined;
  }

  const client = getRedisClient();

  return new rateLimitRedis({
    sendCommand: (...args) => client.sendCommand(args),
    prefix,
  });
}

export const rateLimitTrustProxy = parseTrustProxy(process.env.TRUST_PROXY);

export const rateLimitConfig = {
  general: {
    windowMs: parsePositiveInt(process.env.RATE_LIMIT_GENERAL_WINDOW_MS, 15 * 60 * 1000),
    max: parsePositiveInt(process.env.RATE_LIMIT_GENERAL_MAX, 600),
  },
  auth: {
    windowMs: parsePositiveInt(process.env.RATE_LIMIT_AUTH_WINDOW_MS, 15 * 60 * 1000),
    max: parsePositiveInt(process.env.RATE_LIMIT_AUTH_MAX, 5),
  },
  authenticated: {
    windowMs: parsePositiveInt(process.env.RATE_LIMIT_AUTHENTICATED_WINDOW_MS, 15 * 60 * 1000),
    max: parsePositiveInt(process.env.RATE_LIMIT_AUTHENTICATED_MAX, 300),
  },
  invite: {
    windowMs: parsePositiveInt(process.env.RATE_LIMIT_INVITE_WINDOW_MS, 15 * 60 * 1000),
    max: parsePositiveInt(process.env.RATE_LIMIT_INVITE_MAX, 30),
  },
  projectAction: {
    windowMs: parsePositiveInt(process.env.RATE_LIMIT_PROJECT_WINDOW_MS, 15 * 60 * 1000),
    max: parsePositiveInt(process.env.RATE_LIMIT_PROJECT_MAX, 10),
  },
  taskWrite: {
    windowMs: parsePositiveInt(process.env.RATE_LIMIT_TASK_WRITE_WINDOW_MS, 60 * 1000),
    max: parsePositiveInt(process.env.RATE_LIMIT_TASK_WRITE_MAX, 60),
  },
};
