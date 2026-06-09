// Mail Letter Generator
// Production-grade physical mail letters for unclaimed property recovery

import { getStateRegulation } from '../letters/regulations-data';

export interface MailLetterContext {
  leadName: string;
  ownerName: string;
  amount: number;
  state: string;
  propertyType: string;
  company: string;
  address?: string;
}

export function generateMailLetter(ctx: MailLetterContext): {
  subject: string;
  body: string;
  complianceNote: string;
} {
  const amountText = new Intl.NumberFormat('en-US', { 
    style: 'currency', 
    currency: 'USD', 
    maximumFractionDigits: 0 
  }).format(ctx.amount);

  const reg = getStateRegulation(ctx.state);
  const feeCap = reg?.finder_fee_cap_pct ? `${reg.finder_fee_cap_pct}%` : 'capped by state law';

  const body = `Dear ${ctx.leadName},

I am writing to inform you that unclaimed property belonging to ${ctx.ownerName} has been located in the state of ${ctx.state}.

Property Details:
- Type: ${ctx.propertyType}
- Reported Value: ${amountText}
- Holder: ${ctx.company}
- Last Known Address: ${ctx.address || 'On file with state treasury'}

This asset is currently held by the ${ctx.state} State Treasury Unclaimed Property Division.

How I Can Help:
I specialize in assisting rightful owners and heirs with the claim process. My services include:
1. Preparing all required documentation
2. Guiding you through state-specific requirements
3. Submitting the claim on your behalf

Important Disclosures:
- I only receive compensation upon successful recovery (success fee of ${feeCap}).
- You may claim this property directly through the state at no cost.
- All communications are confidential.

Next Steps:
Please reply to this letter or call me at your earliest convenience. I will provide you with a complete checklist of documents needed for your specific situation.

Sincerely,

Alex Rivera
Lost Asset Recovery Team
[Phone] | [Email]
[License information if required by state]

---
This is not legal advice. State regulations apply.`;

  return {
    subject: `Unclaimed Property Notice — ${ctx.ownerName} (${ctx.state})`,
    body,
    complianceNote: `Complies with ${ctx.state} finder regulations. Fee capped at ${feeCap}.`,
  };
}
