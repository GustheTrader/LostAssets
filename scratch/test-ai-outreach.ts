import { generateAIOutreachEmail } from "../db/aiOutreachService";
import { validateGeminiConfig } from "../db/config";
import { getStateRegulation } from "../letters/regulations-data";
import { logger } from "../db/logger";

async function runTest() {
  logger.info("Starting AI Outreach generation test...");

  const input = {
    leadName: "Dorothy Bellevue",
    relation: "spouse",
    ownerName: "Eugene Bellevue",
    amount: 15420.50,
    state: "FL",
    propertyType: "Life Insurance Policy",
    company: "MetLife Insurance Company",
    step: 1,
  };

  const geminiCheck = validateGeminiConfig();
  
  if (!geminiCheck.ok) {
    logger.warn(`GEMINI_API_KEY is not set in environment. Running dynamic prompt validation in simulation mode.`);
    
    // Retrieve state specific compliance parameters to show how they compile
    const stateReg = getStateRegulation(input.state);
    const feeCap = stateReg?.finder_fee_cap_pct ? `${stateReg.finder_fee_cap_pct}%` : "capped by state law";
    const claimUrl = stateReg?.claim_form_url || `https://missingmoney.com/app/claim-search?state=${input.state}`;
    const amountText = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(input.amount);
    
    console.log("\n================ SIMULATING DYNAMIC PROMPT COMPILATION ================");
    console.log(`Model target: gemini-2.5-flash`);
    console.log(`Context parameters:`);
    console.log(`  - Target State: ${input.state}`);
    console.log(`  - Fee Cap constraint: ${feeCap}`);
    console.log(`  - State Claim Portal URL: ${claimUrl}`);
    console.log(`  - Target Owner: ${input.ownerName}`);
    console.log(`  - Lead/Relation: ${input.leadName} (${input.relation})`);
    console.log(`  - Amount: ${amountText}`);
    
    console.log("\n---------------------------------------------------------------------");
    console.log("Compiled System & Context Instructions for Gemini:");
    console.log("---------------------------------------------------------------------");
    const prompt = `
You are Alex Rivera, a professional unclaimed property investigator at the Lost Asset Recovery Team.
Your job is to reunite people with assets held by state treasury unclaimed property divisions.

Generate a warm, professional, trustworthy, and compliant outreach email to a contact/relative of an owner of unclaimed property.

Details:
- Contact Name: ${input.leadName} (refer to them as "Dorothy")
- Contact's relation to property owner: ${input.relation}
- Original Property Owner Name: ${input.ownerName}
- Estimated Asset Amount: ${amountText}
- Property Type: ${input.propertyType}
- Holding Entity / Original Company: ${input.company}
- Asset State: ${input.state}
- Outreach Step / Sequence Number: ${input.step}

State Legal Compliance Requirements (You MUST include these transparently):
1. State Fee Limit: Explain that we only charge a success fee of ${feeCap} of the recovered amount, and only upon successful recovery (no upfront fees).
2. Free State Claim Option: Inform the recipient that they have the right to search for and claim this property directly from the state treasury at no cost (Official State Treasury Link: ${claimUrl}).
`;
    console.log(prompt.trim());
    console.log("---------------------------------------------------------------------");
    console.log("\nSimulated Generated Email (HTML Preview):");
    console.log(`Subject: Important: Unclaimed ${input.propertyType} in ${input.state} for ${input.ownerName}`);
    console.log(`<body>
  <p>Dear Dorothy,</p>
  <p>My name is Alex Rivera from the Lost Asset Recovery Team. I specialize in helping individuals reunite with unclaimed assets held by state treasuries.</p>
  <p>I located a record in Florida for <strong>${input.ownerName}</strong> — a ${input.propertyType} valued at approximately <strong>${amountText}</strong>, originally held by ${input.company}.</p>
  <p>Our research indicates you are the ${input.relation} of ${input.ownerName}, which is why we are reaching out directly to you. We want to help connect you with these funds.</p>
  <p><strong>Please note these important disclosures:</strong></p>
  <ul>
    <li><strong>No Upfront Fees:</strong> We work entirely on a contingency basis. Our success fee is ${feeCap} of recovered funds, paid only after you receive the payout.</li>
    <li><strong>Claim Directly:</strong> You have the right to file a claim directly with the Florida Division of Unclaimed Property for free at <a href="${claimUrl}">${claimUrl}</a>.</li>
  </ul>
  <p>If you are interested in our assistance to navigate the paperwork and expedite the recovery, please reply to this email.</p>
  <p>Best regards,<br/>Alex Rivera<br/>Lost Asset Recovery Team</p>
</body>`);
    console.log("=======================================================================\n");
    console.log("Tip: Set GEMINI_API_KEY in your .env file to generate live drafts from the model.");
    return;
  }

  try {
    const result = await generateAIOutreachEmail(input);

    if (result) {
      console.log("\n=== TEST AI OUTREACH EMAIL ===");
      console.log(`Subject: ${result.subject}`);
      console.log("-----------------------------------------");
      console.log("HTML Body Preview:");
      console.log(result.html);
      console.log("-----------------------------------------");
      console.log("Plain Text Body Preview:");
      console.log(result.text);
      console.log("=========================================\n");
    } else {
      console.log("Outreach generator returned null.");
    }
  } catch (error: any) {
    console.error("Test failed with error:", error);
  }
}

runTest();
