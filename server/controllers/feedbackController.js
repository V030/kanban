import { getUserSummary } from "../models/notificationModel.js";
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
    const user = await getUserSummary(userId);

    const metadata = getRequestMetadata(req);
    const timestamp = new Date().toISOString();

    await sendFeedbackEmail({
      to: process.env.FEEDBACK_RECEIVER_EMAIL,
      feedback: {
        userId,
        userEmail: userEmail || user?.email || "",
        userName: user?.displayName || [user?.firstName, user?.lastName].filter(Boolean).join(" ") || userEmail || "",
        subject,
        category,
        message,
        browser: metadata.browser,
        os: metadata.os,
        route: metadata.route,
        timestamp,
      },
    });

    return res.status(201).json({
      message: "Feedback sent successfully",
    });
  } catch (error) {
    console.error("Feedback submission error:", error);

    if (error?.message === "Email transport is not configured" || error?.message === "Feedback email destination is not configured") {
      return res.status(500).json({ message: "Feedback email service is not configured" });
    }

    return res.status(500).json({ message: "Unable to send feedback right now. Please try again later." });
  }
}