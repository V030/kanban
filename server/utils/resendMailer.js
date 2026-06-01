import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendEmail({ to, subject, html, text }) {
  if (!process.env.RESEND_API_KEY) {
    throw new Error("RESEND_API_KEY missing");
  }

  const from = process.env.EMAIL_FROM;

  if (!from) {
    throw new Error("EMAIL_FROM is missing");
  }

  try {
    const result = await resend.emails.send({
      from,
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