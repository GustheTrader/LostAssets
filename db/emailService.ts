import { createTransport, Transporter } from "nodemailer";

const FROM_EMAIL = process.env.FROM_EMAIL || "noreply@lostassets.app";
const FROM_NAME = process.env.FROM_NAME || "Lost Asset Recovery Team";

let sgMail: any = null;
let sgInitAttempted = false;

async function getSendGrid() {
  if (sgInitAttempted) return sgMail;
  sgInitAttempted = true;
  if (!process.env.SENDGRID_API_KEY) return null;
  try {
    const sgModule = await import("@sendgrid/mail");
    const sg = (sgModule as any).default || sgModule;
    sg.setApiKey(process.env.SENDGRID_API_KEY);
    sgMail = sg;
    return sg;
  } catch {
    return null;
  }
}

function getSMTPTransporter(): Transporter | null {
  const user = process.env.SMTP_USER || "";
  const pass = process.env.SMTP_PASS || "";
  if (!user || !pass) return null;
  return createTransport({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === "true",
    auth: { user, pass },
  });
}

export interface SendEmailInput {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export async function sendEmail(input: SendEmailInput): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const sg = await getSendGrid();
  if (sg) {
    try {
      const [response] = await sg.send({
        to: input.to,
        from: { email: FROM_EMAIL, name: FROM_NAME },
        subject: input.subject,
        html: input.html,
        text: input.text || input.html.replace(/&lt;[^&gt;]+&gt;/g, ""),
      });
      return { success: true, messageId: response?.headers?.["x-message-id"] || "sendgrid-ok" };
    } catch (err: any) {
      return { success: false, error: err?.response?.body?.errors?.[0]?.message || err.message };
    }
  }

  const transporter = getSMTPTransporter();
  if (!transporter) {
    return { success: false, error: "No email provider configured. Set SENDGRID_API_KEY or SMTP_USER/SMTP_PASS." };
  }

  try {
    const info = await transporter.sendMail({
      from: `"${FROM_NAME}" <${FROM_EMAIL}>`,
      to: input.to,
      subject: input.subject,
      html: input.html,
      text: input.text || input.html.replace(/&lt;[^&gt;]+&gt;/g, ""),
    });
    return { success: true, messageId: info.messageId };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
