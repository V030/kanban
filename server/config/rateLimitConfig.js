import dotenv from "dotenv";
import { createClient } from "redis";
import rateLimitRedis from "rate-limit-redis";

dotenv.config();

const parsePositiveInt = (value, fallback) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const appEnvironment = String(process.env.NODE_ENV || "development").trim().toLowerCase();
const isProduction = appEnvironment === "production";
const relaxedRateLimits =
  String(process.env.RATE_LIMIT_RELAXED || (!isProduction ? "true" : "false"))
    .trim()
    .toLowerCase() !== "false";

/*
  LIMIT REFERENCE
  ---------------
  general       — all requests by IP. 1000/15min ≈ 66 req/min, covers normal browsing.
  auth          — login / register. 10/15min, strict to block brute force.
  passwordReset — reset email requests. 10/15min, prevents inbox spam attacks.
  authenticated — any request from a logged-in user. 1000/15min ≈ 66 req/min.
  invite        — sending invites. 60/15min, generous for team-building use.
  projectAction — loading + mutating projects. 500/15min, covers page loads + actions.
  taskWrite     — creating/updating tasks. 200/min, covers bulk updates comfortably.
  feedback      — feedback form submissions. 5/15min, prevents spam.
*/

const defaultLimits = relaxedRateLimits
  ? {
      // Development / relaxed — very high ceilings for testing
      general:       { windowMs: 15 * 60 * 1000, max: 10000 },
      auth:          { windowMs: 15 * 60 * 1000, max: 50 },
      passwordReset: { windowMs: 15 * 60 * 1000, max: 20 },
      authenticated: { windowMs: 15 * 60 * 1000, max: 10000 },
      invite:        { windowMs: 15 * 60 * 1000, max: 200 },
      projectAction: { windowMs: 15 * 60 * 1000, max: 500 },
      taskWrite:     { windowMs: 60 * 1000,       max: 500 },
      feedback:      { windowMs: 15 * 60 * 1000, max: 20 },
    }
  : {
      // Production — relaxed enough for real users, strict enough for abuse prevention
      general:       { windowMs: 15 * 60 * 1000, max: 1000 },
      auth:          { windowMs: 15 * 60 * 1000, max: 10 },
      passwordReset: { windowMs: 15 * 60 * 1000, max: 10 },
      authenticated: { windowMs: 15 * 60 * 1000, max: 1000 },
      invite:        { windowMs: 15 * 60 * 1000, max: 60 },
      projectAction: { windowMs: 15 * 60 * 1000, max: 500 },
      taskWrite:     { windowMs: 60 * 1000,       max: 200 },
      feedback:      { windowMs: 15 * 60 * 1000, max: 5 },
    };

/* =========================
   TRUST PROXY PARSER
========================= */

const parseTrustProxy = (value) => {
  if (value === undefined) return false;

  const normalized = String(value).trim().toLowerCase();
  if (normalized === "true" || normalized === "1") return true;
  if (normalized === "false" || normalized === "0") return false;

  const parsed = Number.parseInt(normalized, 10);
  return Number.isFinite(parsed) ? parsed : false;
};

/* =========================
   REDIS STORE
========================= */

const rateLimitStoreType = String(process.env.RATE_LIMIT_STORE || "memory").toLowerCase();
const redisUrl = String(process.env.REDIS_URL || "").trim();

let redisClient;

function getRedisClient() {
  if (!redisClient) {
    redisClient = createClient({ url: redisUrl });
    redisClient.on("error", (error) => {
      console.error("[redis] error:", error);
    });
    redisClient.connect().catch((error) => {
      console.error("[redis] connect error:", error);
    });
  }
  return redisClient;
}

export function getRateLimitStore(prefix) {
  if (rateLimitStoreType !== "redis") return undefined;

  if (!redisUrl) {
    console.warn("[rate-limit] RATE_LIMIT_STORE=redis but REDIS_URL is missing — falling back to memory store.");
    return undefined;
  }

  const client = getRedisClient();
  return new rateLimitRedis({
    sendCommand: (...args) => client.sendCommand(args),
    prefix,
  });
}

/* =========================
   EXPORTS
========================= */

export const rateLimitTrustProxy = parseTrustProxy(process.env.TRUST_PROXY);

export const rateLimitConfig = {
  general: {
    windowMs: parsePositiveInt(process.env.RATE_LIMIT_GENERAL_WINDOW_MS, defaultLimits.general.windowMs),
    max:       parsePositiveInt(process.env.RATE_LIMIT_GENERAL_MAX,       defaultLimits.general.max),
  },
  auth: {
    windowMs: parsePositiveInt(process.env.RATE_LIMIT_AUTH_WINDOW_MS, defaultLimits.auth.windowMs),
    max:       parsePositiveInt(process.env.RATE_LIMIT_AUTH_MAX,       defaultLimits.auth.max),
  },
  passwordReset: {
    windowMs: parsePositiveInt(process.env.RATE_LIMIT_PASSWORD_RESET_WINDOW_MS, defaultLimits.passwordReset.windowMs),
    max:       parsePositiveInt(process.env.RATE_LIMIT_PASSWORD_RESET_MAX,       defaultLimits.passwordReset.max),
  },
  authenticated: {
    windowMs: parsePositiveInt(process.env.RATE_LIMIT_AUTHENTICATED_WINDOW_MS, defaultLimits.authenticated.windowMs),
    max:       parsePositiveInt(process.env.RATE_LIMIT_AUTHENTICATED_MAX,       defaultLimits.authenticated.max),
  },
  invite: {
    windowMs: parsePositiveInt(process.env.RATE_LIMIT_INVITE_WINDOW_MS, defaultLimits.invite.windowMs),
    max:       parsePositiveInt(process.env.RATE_LIMIT_INVITE_MAX,       defaultLimits.invite.max),
  },
  projectAction: {
    windowMs: parsePositiveInt(process.env.RATE_LIMIT_PROJECT_WINDOW_MS, defaultLimits.projectAction.windowMs),
    max:       parsePositiveInt(process.env.RATE_LIMIT_PROJECT_MAX,       defaultLimits.projectAction.max),
  },
  taskWrite: {
    windowMs: parsePositiveInt(process.env.RATE_LIMIT_TASK_WRITE_WINDOW_MS, defaultLimits.taskWrite.windowMs),
    max:       parsePositiveInt(process.env.RATE_LIMIT_TASK_WRITE_MAX,       defaultLimits.taskWrite.max),
  },
  feedback: {
    windowMs: parsePositiveInt(process.env.RATE_LIMIT_FEEDBACK_WINDOW_MS, defaultLimits.feedback.windowMs),
    max:       parsePositiveInt(process.env.RATE_LIMIT_FEEDBACK_MAX,       defaultLimits.feedback.max),
  },
};