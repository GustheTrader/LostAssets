import { GoogleGenAI } from "@google/genai";
import { AssetRecord, Relative } from "../types";

export const generateOutreachEmail = async (
  targetPerson: { firstName: string; lastName: string },
  assets: AssetRecord[],
  relative: Relative
): Promise<string> => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not set.");
  }

  const ai = new GoogleGenAI({ apiKey });

  const totalAmount = assets.reduce((sum, asset) => sum + asset.amount, 0);
  const states = Array.from(new Set(assets.map((a) => a.state))).join(", ");

  const prompt = `
You are a professional investigator specializing in unclaimed property and asset recovery.
You have located unclaimed assets belonging to ${targetPerson.firstName} ${targetPerson.lastName}.
The assets are located in the following states: ${states}, totaling approximately $${totalAmount.toFixed(2)}.

Write a professional, polite, and persuasive outreach email to their relative or associate.
Relative Name: ${relative.name}
Relation to target: ${relative.relation}

The goal of the email is to:
1. Briefly introduce yourself and your firm's purpose (locating unclaimed property).
2. State that you are trying to contact ${targetPerson.firstName} ${targetPerson.lastName} regarding assets held by the state.
3. Assure them that this is not a scam, you are simply trying to return funds to their rightful owner.
4. Request that they pass along your contact information to the target person, or reply to learn more.
5. Provide placeholders for [Your Name] and [Your Contact Information].

Tone: Professional, urgent but not alarming, respectful, and clear.
Make sure the subject line is clear, perhaps styled as a bold paragraph or header at the top (e.g. <p><strong>Subject: ...</strong></p>).
Format the entire email as a clean HTML snippet (using <p>, <strong>, <em>, <br> where appropriate) so it can be rendered directly into a rich text editor.
Do not include any markdown format blocks, html tags around the text, or JSON wrapper, just the raw HTML content.
`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.1-pro-preview",
      contents: prompt,
    });
    return response.text || "Failed to generate email.";
  } catch (error) {
    console.error("Error generating email with Gemini:", error);
    throw new Error("Unable to draft email at this time. Please check your API key or try again.");
  }
};
