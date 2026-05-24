import rateLimit from "express-rate-limit";
import { getRateLimitStore, rateLimitConfig } from "../config/rateLimitConfig.js";

const getClientIp = (req) => {
  const forwardedFor = req.headers["x-forwarded-for"];

  if (typeof forwardedFor === "string" && forwardedFor.trim().length > 0) {
    return forwardedFor.split(",")[0].trim();
  }

  return req.ip || req.connection?.remoteAddress || "unknown";
};

const keyByUserOrIp = (req) => {
  const userId = req.user?.userId;
  if (userId) {
    return `user:${userId}`;
  }

  return `ip:${getClientIp(req)}`;
};

const keyByIpAndEmail = (req) => {
  const email = String(req.body?.email || "").trim().toLowerCase();
  const ip = getClientIp(req);

  if (email) {
    return `ip:${ip}|email:${email}`;
  }

  return `ip:${ip}`;
};

const buildRateLimitHandler = (message) => (req, res, _next, options) => {
  const resetTime = req.rateLimit?.resetTime instanceof Date
    ? req.rateLimit.resetTime.getTime()
    : Date.now() + options.windowMs;
  const retryAfterSeconds = Math.max(1, Math.ceil((resetTime - Date.now()) / 1000));

  res.set("Retry-After", String(retryAfterSeconds));

  return res.status(options.statusCode).json({
    message,
    retryAfterSeconds,
  });
};

const createLimiter = ({ windowMs, max, keyGenerator, message, prefix }) =>
  rateLimit({
    windowMs,
    max,
    keyGenerator,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    statusCode: 429,
    message,
    store: getRateLimitStore(prefix),
    handler: buildRateLimitHandler(message),
  });

export const generalApiLimiter = createLimiter({
  windowMs: rateLimitConfig.general.windowMs,
  max: rateLimitConfig.general.max,
  keyGenerator: (req) => `ip:${getClientIp(req)}`,
  message: "Too many requests. Please try again later.",
  prefix: "rl:general:",
});

export const authLimiter = createLimiter({
  windowMs: rateLimitConfig.auth.windowMs,
  max: rateLimitConfig.auth.max,
  keyGenerator: keyByIpAndEmail,
  message: "Too many authentication attempts. Please try again later.",
  prefix: "rl:auth:",
});

export const passwordResetRequestLimiter = createLimiter({
  windowMs: rateLimitConfig.passwordReset.windowMs,
  max: rateLimitConfig.passwordReset.max,
  keyGenerator: keyByIpAndEmail,
  message: "Too many password reset requests. Please try again later.",
  prefix: "rl:password-reset-request:",
});

export const passwordResetConfirmLimiter = createLimiter({
  windowMs: rateLimitConfig.passwordReset.windowMs,
  max: rateLimitConfig.passwordReset.max,
  keyGenerator: keyByIpAndEmail,
  message: "Too many password reset attempts. Please try again later.",
  prefix: "rl:password-reset-confirm:",
});

export const authenticatedLimiter = createLimiter({
  windowMs: rateLimitConfig.authenticated.windowMs,
  max: rateLimitConfig.authenticated.max,
  keyGenerator: keyByUserOrIp,
  message: "Too many requests for this account. Please try again later.",
  prefix: "rl:auth-user:",
});

export const inviteLimiter = createLimiter({
  windowMs: rateLimitConfig.invite.windowMs,
  max: rateLimitConfig.invite.max,
  keyGenerator: keyByUserOrIp,
  message: "Too many invite or request attempts. Please try again later.",
  prefix: "rl:invite:",
});

export const projectActionLimiter = createLimiter({
  windowMs: rateLimitConfig.projectAction.windowMs,
  max: rateLimitConfig.projectAction.max,
  keyGenerator: keyByUserOrIp,
  message: "Too many project changes. Please try again later.",
  prefix: "rl:project:",
});

export const taskWriteLimiter = createLimiter({
  windowMs: rateLimitConfig.taskWrite.windowMs,
  max: rateLimitConfig.taskWrite.max,
  keyGenerator: keyByUserOrIp,
  message: "Too many task updates. Please try again later.",
  prefix: "rl:task-write:",
});

export const feedbackLimiter = createLimiter({
  windowMs: rateLimitConfig.feedback.windowMs,
  max: rateLimitConfig.feedback.max,
  keyGenerator: keyByUserOrIp,
  message: "Too many feedback submissions. Please try again later.",
  prefix: "rl:feedback:",
});
