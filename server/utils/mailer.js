import nodemailer from "nodemailer";

let cachedTransporter;

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