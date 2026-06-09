import { GoogleGenAI } from "@google/genai";
import { config } from "./config";
import { getStateRegulation } from "../letters/regulations-data";
import { logger } from "./logger";

export interface AIOutreachInput {
  leadName: string;
  relation: string | null;
  ownerName: string;
  amount: number;
  state: string;
  propertyType: string;
  company: string;
  address?: string | null;
  step: number;
}

export interface AIOutreachResult {
  subject: string;
  html: string;
  text: string;
}

/**
 * Uses Gemini 2.5 Flash to generate a hyper-personalized, state-compliant outreach email.
 */
export async function generateAIOutreachEmail(input: AIOutreachInput): Promise<AIOutreachResult | null> {
  const apiKey = config.GEMINI_API_KEY;
  if (!apiKey) {
    logger.warn("[AIOutreach] GEMINI_API_KEY is not configured. Falling back to static templates.");
    return null;
  }

  const stateReg = getStateRegulation(input.state);
  const feeCap = stateReg?.finder_fee_cap_pct ? `${stateReg.finder_fee_cap_pct}%` : "capped by state law";
  const claimUrl = stateReg?.claim_form_url || `https://missingmoney.com/app/claim-search?state=${input.state}`;
  const amountText = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(input.amount);
  const firstName = input.leadName.split(" ")[0];

  const ai = new GoogleGenAI({ apiKey });

  const prompt = `
You are Alex Rivera, a professional unclaimed property investigator at the Lost Asset Recovery Team.
Your job is to reunite people with assets held by state treasury unclaimed property divisions.

Generate a warm, professional, trustworthy, and compliant outreach email to a contact/relative of an owner of unclaimed property.

Details:
- Contact Name: ${input.leadName} (refer to them as "${firstName}")
- Contact's relation to property owner: ${input.relation || "potential heir or owner"}
- Original Property Owner Name: ${input.ownerName}
- Estimated Asset Amount: ${amountText}
- Property Type: ${input.propertyType || "Unclaimed Property"}
- Holding Entity / Original Company: ${input.company || "State Treasury"}
- Asset State: ${input.state}
- Outreach Step / Sequence Number: ${input.step} (1 = initial introduction, 2 = polite follow-up, 3 = final notice)

State Legal Compliance Requirements (You MUST include these transparently):
1. State Fee Limit: Explain that we only charge a success fee of ${feeCap} of the recovered amount, and only upon successful recovery (no upfront fees).
2. Free State Claim Option: Inform the recipient that they have the right to search for and claim this property directly from the state treasury at no cost (Official State Treasury Link: ${claimUrl}).

Email Construction Guidelines:
- Tone: Professional, helpful, secure, respectful, and clear. Avoid looking like spam or a phishing scam.
- Structure for Step ${input.step}:
  - Step 1 (Intro): Introduce yourself, state the specific asset and holder, mention how you found their relationship, and explain how the claim process works (including disclosures).
  - Step 2 (Follow up): Refer to your previous note, keep it brief, reiterate the value and that you can guide them through the paperwork, and ask if they are ready to proceed or if they have questions.
  - Step 3 (Final notice): State that this is your final attempt to contact them regarding the ${amountText} asset, and if you don't hear back you will close their case file.
- Formatting: Return a subject line and the HTML email body.
- Formatting Constraints:
  - Do not use markdown backticks (\`\`\`) or include wordings like "Subject:" inside the email body.
  - Return the response strictly as a JSON object with two fields: "subject" and "htmlBody".
  - Make the HTML body clean, using paragraphs (<p>), bold text (<strong>), lists (<ul>/<li>) if needed, and lines (<br>).
  
Example response format (JSON):
{
  "subject": "Important: Unclaimed property in ${input.state} for ${input.ownerName}",
  "htmlBody": "<p>Hi ${firstName},</p><p>My name is Alex..."
}
`;

  try {
    logger.info(`[AIOutreach] Requesting Gemini to draft email (Step ${input.step}) for ${input.leadName}...`);
    
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      }
    });

    const textResult = response.text;
    if (!textResult) {
      throw new Error("Empty response from Gemini model.");
    }

    const json = JSON.parse(textResult.trim());
    
    if (!json.subject || !json.htmlBody) {
      throw new Error("Gemini response missing subject or htmlBody fields.");
    }

    const html = json.htmlBody;
    const plainText = html.replace(/<[^>]+>/g, " ").replace(/\s{2,}/g, " ").trim();

    logger.info(`[AIOutreach] Email generated successfully by Gemini.`);

    return {
      subject: json.subject,
      html,
      text: plainText,
    };
  } catch (error: any) {
    logger.error(`[AIOutreach] Failed to generate email with Gemini: ${error.message}`);
    return null;
  }
}
