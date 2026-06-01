import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendEmail({ to, subject, html, text }) {
  if (!process.env.RESEND_API_KEY) {
    console.warn("[email] RESEND_API_KEY missing");
    return;
  }

  try {
    const result = await resend.emails.send({
      from: process.env.EMAIL_FROM,
      to,
      subject,
      html,
      text,
    });

    console.log("[email] sent:", result.id);
    return result;
  } catch (err) {
    console.error("[email] resend error:", err);
    throw err;
  }
}