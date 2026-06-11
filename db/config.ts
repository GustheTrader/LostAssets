import * as dotenv from "dotenv";
import * as path from "path";

// Load .env from project root
const envPath = path.resolve(process.cwd(), ".env");
dotenv.config({ path: envPath });

export interface EnvConfig {
  // Server
  PORT: number;
  NODE_ENV: "development" | "production" | "test";
  DISABLE_SCHEDULER: boolean;

  // Database
  DB_PATH: string;

  // Email (SendGrid primary)
  SENDGRID_API_KEY: string | undefined;
  SMTP_HOST: string | undefined;
  SMTP_PORT: number;
  SMTP_USER: string | undefined;
  SMTP_PASS: string | undefined;
  SMTP_SECURE: boolean;

  // From address
  FROM_EMAIL: string;
  FROM_NAME: string;

  // Twilio (optional)
  TWILIO_SID: string | undefined;
  TWILIO_TOKEN: string | undefined;
  TWILIO_PHONE: string | undefined;

  // AI / Gemini
  GEMINI_API_KEY: string | undefined;

  // Supabase
  SUPABASE_URL: string | undefined;
  SUPABASE_PROJECT_ID: string | undefined;
  SUPABASE_SERVICE_ROLE_KEY: string | undefined;

  // Scraper Proxy Configurations
  SCRAPER_MODE: "axios" | "scraperapi" | "zenrows" | "brightdata" | "browser";
  SCRAPERAPI_KEY: string | undefined;
  ZENROWS_KEY: string | undefined;
  BRIGHTDATA_USER: string | undefined;
  BRIGHTDATA_PASS: string | undefined;
}

function getStr(key: string, defaultValue?: string): string | undefined {
  return process.env[key] ?? defaultValue;
}

function getNum(key: string, defaultValue: number): number {
  const v = process.env[key];
  if (!v) return defaultValue;
  const n = Number(v);
  return Number.isFinite(n) ? n : defaultValue;
}

function getBool(key: string, defaultValue: boolean): boolean {
  const v = process.env[key];
  if (!v) return defaultValue;
  return v === "true" || v === "1" || v === "yes";
}

export const config: EnvConfig = {
  PORT: getNum("PORT", 3000),
  NODE_ENV: (getStr("NODE_ENV") as any) || "development",
  DISABLE_SCHEDULER: getBool("DISABLE_SCHEDULER", false),
  DB_PATH: getStr("DB_PATH") || "./data.sqlite",
  SENDGRID_API_KEY: getStr("SENDGRID_API_KEY"),
  SMTP_HOST: getStr("SMTP_HOST"),
  SMTP_PORT: getNum("SMTP_PORT", 587),
  SMTP_USER: getStr("SMTP_USER"),
  SMTP_PASS: getStr("SMTP_PASS"),
  SMTP_SECURE: getBool("SMTP_SECURE", false),
  FROM_EMAIL: getStr("FROM_EMAIL") || "noreply@lostassets.app",
  FROM_NAME: getStr("FROM_NAME") || "LostAssets Recovery Team",
  TWILIO_SID: getStr("TWILIO_SID"),
  TWILIO_TOKEN: getStr("TWILIO_TOKEN"),
  TWILIO_PHONE: getStr("TWILIO_PHONE"),
  GEMINI_API_KEY: getStr("GEMINI_API_KEY"),
  SUPABASE_URL: getStr("SUPABASE_URL"),
  SUPABASE_PROJECT_ID: getStr("SUPABASE_PROJECT_ID"),
  SUPABASE_SERVICE_ROLE_KEY: getStr("SUPABASE_SERVICE_ROLE_KEY"),

  SCRAPER_MODE: (getStr("SCRAPER_MODE") || "axios") as any,
  SCRAPERAPI_KEY: getStr("SCRAPERAPI_KEY"),
  ZENROWS_KEY: getStr("ZENROWS_KEY"),
  BRIGHTDATA_USER: getStr("BRIGHTDATA_USER"),
  BRIGHTDATA_PASS: getStr("BRIGHTDATA_PASS"),
};

export function validateEmailConfig(): { ok: boolean; provider: "sendgrid" | "smtp" | "none"; warning?: string } {
  if (config.SENDGRID_API_KEY && config.SENDGRID_API_KEY.length > 20) {
    return { ok: true, provider: "sendgrid" };
  }
  if (config.SMTP_HOST && config.SMTP_USER && config.SMTP_PASS) {
    return { ok: true, provider: "smtp" };
  }
  return { ok: false, provider: "none", warning: "No email provider configured. Set SENDGRID_API_KEY or SMTP_USER/SMTP_PASS." };
}

export function validateTwilioConfig(): { ok: boolean; warning?: string } {
  if (config.TWILIO_SID && config.TWILIO_TOKEN && config.TWILIO_PHONE) {
    return { ok: true };
  }
  return { ok: false, warning: "Twilio not configured. Set TWILIO_SID, TWILIO_TOKEN, TWILIO_PHONE for call campaigns." };
}

export function validateGeminiConfig(): { ok: boolean; warning?: string } {
  if (config.GEMINI_API_KEY && config.GEMINI_API_KEY.length > 10) {
    return { ok: true };
  }
  return { ok: false, warning: "Gemini API key not set. AI outreach drafting will use fallback templates." };
}
