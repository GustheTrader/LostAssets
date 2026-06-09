import twilio from "twilio";
import { config } from "./config";
import { logger } from "./logger";

let client: ReturnType<typeof twilio> | null = null;

function getClient(): ReturnType<typeof twilio> | null {
  if (client) return client;
  if (!config.TWILIO_SID || !config.TWILIO_TOKEN) return null;
  client = twilio(config.TWILIO_SID, config.TWILIO_TOKEN);
  return client;
}

function formatCurrency(n: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);
}

export interface CallScript {
  intro: string;
  body: string;
  close: string;
  fullScript: string;
  durationSec: number;
}

export function generateCallScript(
  leadName: string,
  ownerName: string,
  amount: number,
  state: string,
  propertyType: string,
  company: string,
): CallScript {
  const amountText = formatCurrency(amount);
  const firstName = leadName.split(" ")[0];
  const intro = `Hello ${firstName}, this is Alex with the Lost Asset Recovery Team. I'm calling because our research found unclaimed property in ${state} for ${ownerName}.`;
  const body = `It's a ${propertyType} valued at approximately ${amountText}, currently held by ${company}. We help families and rightful owners reconnect with these funds at no upfront cost.`;
  const close = `If you are the owner or a direct heir, I'd love to help. Please call us back at this number or reply to our email. Have a great day.`;
  const fullScript = `${intro} ${body} ${close}`;
  const durationSec = Math.ceil(fullScript.split(" ").length / 2.5); // ~150 wpm
  return { intro, body, close, fullScript, durationSec };
}

export async function sendCall(
  to: string,
  script: CallScript,
): Promise<{ success: boolean; sid?: string; error?: string }> {
  const twilioClient = getClient();
  if (!twilioClient) {
    return { success: false, error: "Twilio not configured. Set TWILIO_SID, TWILIO_TOKEN, TWILIO_PHONE." };
  }
  if (!config.TWILIO_PHONE) {
    return { success: false, error: "TWILIO_PHONE not set." };
  }

  const twiml = `<Response>
    <Say voice="Polly.Joanna">${script.fullScript}</Say>
    <Pause length="2"/>
    <Say>To speak with a specialist, press 1. To leave a voicemail, stay on the line. To opt out of future calls, press 9.</Say>
  </Response>`;

  try {
    const call = await twilioClient.calls.create({
      to,
      from: config.TWILIO_PHONE,
      twiml,
      statusCallback: config.NODE_ENV === "production" ? `${config.FROM_EMAIL}/api/webhooks/twilio-status` : undefined,
      statusCallbackEvent: ["initiated", "ringing", "answered", "completed", "busy", "no-answer", "failed"],
    });
    logger.info("Twilio call created", { sid: call.sid, to, durationSec: script.durationSec });
    return { success: true, sid: call.sid };
  } catch (err: any) {
    logger.error("Twilio call failed", { to, error: err.message });
    return { success: false, error: err.message };
  }
}
