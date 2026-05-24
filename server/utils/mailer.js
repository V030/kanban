import nodemailer from "nodemailer";

let cachedTransporter;

function sanitizeHeaderValue(value) {
  return String(value || "")
    .replace(/[\r\n]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function sanitizeBodyText(value) {
  return String(value || "")
    .replace(/\u0000/g, "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .trim();
}

function getTransporter() {
  const host = String(process.env.SMTP_HOST || "").trim();
  const port = Number.parseInt(process.env.SMTP_PORT || "", 10);
  const user = String(process.env.SMTP_USER || "").trim();
  const pass = String(process.env.SMTP_PASS || "").trim();

  if (!host || !Number.isFinite(port) || !user || !pass) {
    return null;
  }

  if (!cachedTransporter) {
    cachedTransporter = nodemailer.createTransport({
      host,
      port,
      secure: String(process.env.SMTP_SECURE || "false").toLowerCase() === "true",
      auth: { user, pass },
    });
  }

  return cachedTransporter;
}

export async function sendPasswordResetOtpEmail({ to, otp, expiresAt }) {
  const transporter = getTransporter();

  if (!transporter) {
    const env = String(process.env.NODE_ENV || "development").toLowerCase();
    console.warn("[password-reset] SMTP transporter not configured", {
      env,
      SMTP_HOST: !!process.env.SMTP_HOST,
      SMTP_PORT: !!process.env.SMTP_PORT,
      SMTP_USER: !!process.env.SMTP_USER,
      SMTP_FROM: !!process.env.SMTP_FROM,
    });

    if (env !== "production") {
      console.warn(`[password-reset] SMTP is not configured. OTP for ${to}: ${otp}`);
      return;
    }

    throw new Error("Email transport is not configured");
  }

  const sender = String(process.env.SMTP_FROM || process.env.SMTP_USER || "").trim();
  try {
    const info = await transporter.sendMail({
      from: sender,
      to,
      subject: "Your password reset code",
      text: `Use this code to reset your password: ${otp}. It expires at ${expiresAt.toISOString()}.`,
      html: `<p>Use this code to reset your password:</p><p><strong>${otp}</strong></p><p>This code expires at ${expiresAt.toISOString()}.</p>`,
    });

    console.info("[password-reset] Email sent", { to, messageId: info && info.messageId });
    return info;
  } catch (err) {
    console.error("[password-reset] Failed to send email", {
      to,
      message: err && (err.message || String(err)),
      code: err && err.code,
      response: err && err.response,
      stack: err && err.stack,
    });
    throw err;
  }
}

export async function sendFeedbackEmail({ to, feedback }) {
  const transporter = getTransporter();

  if (!transporter) {
    const env = String(process.env.NODE_ENV || "development").toLowerCase();
    console.warn("[feedback] SMTP transporter not configured", {
      env,
      SMTP_HOST: !!process.env.SMTP_HOST,
      SMTP_PORT: !!process.env.SMTP_PORT,
      SMTP_USER: !!process.env.SMTP_USER,
      FEEDBACK_RECEIVER_EMAIL: !!process.env.FEEDBACK_RECEIVER_EMAIL,
    });

    if (env !== "production") {
      console.warn("[feedback] SMTP is not configured. Feedback payload:", feedback);
      return;
    }

    throw new Error("Email transport is not configured");
  }

  const sender = sanitizeHeaderValue(process.env.SMTP_FROM || process.env.SMTP_USER || "");
  const recipient = sanitizeHeaderValue(to || process.env.FEEDBACK_RECEIVER_EMAIL || "");

  if (!sender || !recipient) {
    throw new Error("Feedback email destination is not configured");
  }

  const safeSubject = sanitizeHeaderValue(feedback?.subject || "Feedback submission");
  const safeCategory = sanitizeHeaderValue(feedback?.category || "General Feedback");
  const safeUserName = sanitizeBodyText(feedback?.userName || feedback?.fullName || "");
  const safeUserEmail = sanitizeBodyText(feedback?.userEmail || "");
  const safeUserId = sanitizeBodyText(feedback?.userId || "");
  const safeMessage = sanitizeBodyText(feedback?.message || "");
  const safeBrowser = sanitizeBodyText(feedback?.browser || "");
  const safeOs = sanitizeBodyText(feedback?.os || "");
  const safeRoute = sanitizeBodyText(feedback?.route || "");
  const safeTimestamp = sanitizeBodyText(feedback?.timestamp || new Date().toISOString());

  const text = [
    `New feedback submission`,
    ``,
    `User: ${safeUserName || "Unknown user"}`,
    `Email: ${safeUserEmail || "Unknown"}`,
    `User ID: ${safeUserId || "Unknown"}`,
    `Category: ${safeCategory}`,
    `Subject: ${safeSubject}`,
    `Timestamp: ${safeTimestamp}`,
    safeBrowser ? `Browser: ${safeBrowser}` : null,
    safeOs ? `OS: ${safeOs}` : null,
    safeRoute ? `Current route: ${safeRoute}` : null,
    ``,
    `Message:`,
    safeMessage || "(empty)",
  ].filter(Boolean).join("\n");

  const html = `
    <div style="font-family:Arial,Helvetica,sans-serif;line-height:1.6;color:#1f2937;max-width:720px;margin:0 auto">
      <h2 style="margin:0 0 12px;color:#0f7f8f">New feedback submission</h2>
      <table cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;margin-bottom:18px">
        <tr><td style="padding:6px 0;color:#6b7280;width:160px">User</td><td style="padding:6px 0;font-weight:700">${escapeHtml(safeUserName || "Unknown user")}</td></tr>
        <tr><td style="padding:6px 0;color:#6b7280">Email</td><td style="padding:6px 0">${escapeHtml(safeUserEmail || "Unknown")}</td></tr>
        <tr><td style="padding:6px 0;color:#6b7280">User ID</td><td style="padding:6px 0">${escapeHtml(safeUserId || "Unknown")}</td></tr>
        <tr><td style="padding:6px 0;color:#6b7280">Category</td><td style="padding:6px 0">${escapeHtml(safeCategory)}</td></tr>
        <tr><td style="padding:6px 0;color:#6b7280">Subject</td><td style="padding:6px 0">${escapeHtml(safeSubject)}</td></tr>
        <tr><td style="padding:6px 0;color:#6b7280">Timestamp</td><td style="padding:6px 0">${escapeHtml(safeTimestamp)}</td></tr>
        ${safeBrowser ? `<tr><td style="padding:6px 0;color:#6b7280">Browser</td><td style="padding:6px 0">${escapeHtml(safeBrowser)}</td></tr>` : ""}
        ${safeOs ? `<tr><td style="padding:6px 0;color:#6b7280">OS</td><td style="padding:6px 0">${escapeHtml(safeOs)}</td></tr>` : ""}
        ${safeRoute ? `<tr><td style="padding:6px 0;color:#6b7280">Current route</td><td style="padding:6px 0">${escapeHtml(safeRoute)}</td></tr>` : ""}
      </table>
      <div style="border:1px solid #dbe3ea;border-radius:12px;padding:16px;background:#f8fbfd">
        <div style="font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#6b7280;margin-bottom:8px">Message</div>
        <div style="white-space:pre-wrap">${escapeHtml(safeMessage || "(empty)")}</div>
      </div>
    </div>
  `;

  try {
    const info = await transporter.sendMail({
      from: sender,
      to: recipient,
      replyTo: safeUserEmail || undefined,
      subject: `Feedback: ${safeCategory} - ${safeSubject}`,
      text,
      html,
    });

    console.info("[feedback] Email sent", { to: recipient, messageId: info && info.messageId });
    return info;
  } catch (err) {
    console.error("[feedback] Failed to send email", {
      to: recipient,
      message: err && (err.message || String(err)),
      code: err && err.code,
      response: err && err.response,
      stack: err && err.stack,
    });
    throw err;
  }
}