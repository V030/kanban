import { sendFeedbackEmail } from "../utils/mailer.js";

const ALLOWED_CATEGORIES = new Set([
  "Bug Report",
  "Feature Request",
  "UI/UX Feedback",
  "Performance Issue",
  "General Feedback",
  "Other",
]);

const SUBJECT_MAX_LENGTH = 120;
const MESSAGE_MIN_LENGTH = 40;
const MESSAGE_MAX_LENGTH = 2000;
const SCREENSHOT_MAX_BYTES = 5 * 1024 * 1024;

function normalizeText(value) {
  return String(value ?? "")
    .replace(/\u0000/g, "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .trim();
}

function normalizeSingleLine(value) {
  return normalizeText(value).replace(/\s+/g, " ");
}

function hasOnlyWhitespace(value) {
  return !String(value ?? "").replace(/[\s\u0000]/g, "");
}

function isPlainObject(value) {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function getRequestMetadata(req) {
  const body = isPlainObject(req.body) ? req.body : {};
  const metadata = isPlainObject(body.metadata) ? body.metadata : {};
  const headers = isPlainObject(req.headers) ? req.headers : {};

  return {
    browser: normalizeSingleLine(body.browser || metadata.browser || metadata.userAgent || headers["user-agent"] || ""),
    os: normalizeSingleLine(body.os || metadata.os || headers["sec-ch-ua-platform"] || headers["x-client-os"] || ""),
    route: normalizeSingleLine(body.route || metadata.route || metadata.currentRoute || body.currentRoute || ""),
  };
}

function normalizeScreenshot(value) {
  if (!isPlainObject(value)) return null;

  const dataUrl = normalizeText(value.dataUrl);
  const name = normalizeSingleLine(value.name || "feedback-screenshot");
  const type = normalizeSingleLine(value.type || "");
  const size = Number(value.size || 0);

  if (!dataUrl) return null;

  if (!type.startsWith("image/")) {
    const error = new Error("Screenshot must be an image");
    error.statusCode = 400;
    throw error;
  }

  if (!Number.isFinite(size) || size <= 0 || size > SCREENSHOT_MAX_BYTES) {
    const error = new Error("Screenshot must be 5MB or smaller");
    error.statusCode = 400;
    throw error;
  }

  if (!/^data:image\/[a-zA-Z0-9.+-]+;base64,/.test(dataUrl)) {
    const error = new Error("Invalid screenshot payload");
    error.statusCode = 400;
    throw error;
  }

  return { dataUrl, name, type, size };
}

function getFeedbackEmailErrorMessage(error) {
  if (error?.message === "Email transport is not configured" || error?.message === "Feedback email destination is not configured") {
    return "Feedback email service is not configured";
  }

  if (error?.code === "EAUTH" || error?.responseCode === 535) {
    return "Feedback email service rejected the SMTP credentials. Check SMTP_USER and SMTP_PASS.";
  }

  if (["ECONNECTION", "ETIMEDOUT", "ECONNREFUSED", "ESOCKET"].includes(error?.code)) {
    return "Feedback email service could not connect to Gmail SMTP. Check SMTP_HOST, SMTP_PORT, and network access.";
  }

  return "Unable to send feedback right now. Please try again later.";
}

export async function submitFeedback(req, res) {
  const userId = req.user?.userId;
  const userEmail = normalizeSingleLine(req.user?.email);

  if (!userId) {
    return res.status(401).json({ message: "Authentication required" });
  }

  if (!isPlainObject(req.body)) {
    return res.status(400).json({ message: "Invalid feedback payload" });
  }

  const subject = normalizeSingleLine(req.body.subject);
  const category = normalizeSingleLine(req.body.category);
  const message = normalizeText(req.body.message);
  let screenshot = null;

  try {
    screenshot = normalizeScreenshot(req.body.screenshot);
  } catch (error) {
    return res.status(error.statusCode || 400).json({ message: error.message || "Invalid screenshot payload" });
  }

  if (!subject) {
    return res.status(400).json({ message: "Subject is required" });
  }

  if (subject.length > SUBJECT_MAX_LENGTH) {
    return res.status(400).json({ message: `Subject must be ${SUBJECT_MAX_LENGTH} characters or fewer` });
  }

  if (!category) {
    return res.status(400).json({ message: "Feedback category is required" });
  }

  if (!ALLOWED_CATEGORIES.has(category)) {
    return res.status(400).json({ message: "Invalid feedback category" });
  }

  if (!message || hasOnlyWhitespace(message)) {
    return res.status(400).json({ message: "Feedback message is required" });
  }

  if (message.length < MESSAGE_MIN_LENGTH) {
    return res.status(400).json({ message: `Feedback message must be at least ${MESSAGE_MIN_LENGTH} characters` });
  }

  if (message.length > MESSAGE_MAX_LENGTH) {
    return res.status(400).json({ message: `Feedback message must be ${MESSAGE_MAX_LENGTH} characters or fewer` });
  }

  if (/\u0000/.test(subject) || /\u0000/.test(message)) {
    return res.status(400).json({ message: "Invalid feedback payload" });
  }

  try {
    const metadata = getRequestMetadata(req);
    const timestamp = new Date().toISOString();

    await sendFeedbackEmail({
      to: process.env.FEEDBACK_RECEIVER_EMAIL,
      feedback: {
        userId,
        userEmail,
        userName: req.user?.name || req.user?.displayName || userEmail || "",
        subject,
        category,
        message,
        browser: metadata.browser,
        os: metadata.os,
        route: metadata.route,
        timestamp,
        screenshot,
      },
    });

    return res.status(201).json({
      message: "Feedback sent successfully",
    });
  } catch (error) {
    console.error("Feedback submission error:", error);

    return res.status(500).json({ message: getFeedbackEmailErrorMessage(error) });
  }
}
