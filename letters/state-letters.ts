// Texas Recovery Letter Template
// Compliant with: Texas Property Code Ch. 74
// Fee cap: 10% max
// License: Must be licensed by TX DPS Private Security Bureau
// Notarization: Required for claims
// Cooling-off: None specified by statute

export function generateTXLetter(ownerName: string, claimantName: string, propertyType: string, amount: number, company: string, propertyId: string, claimUrl: string): string {
  const amt = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  const fee = (amount * 0.10).toFixed(2);
  const date = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  return `
================================================================================
                    ASSET RECOVERY AGREEMENT
                      STATE OF TEXAS
================================================================================

Date: ${date}

BETWEEN:
${claimantName} ("Owner")
AND:
Lost Asset Recovery Team ("Recovery Agent")
License: Texas DPS Private Security Bureau (License # filed concurrently)

================================================================================
SECTION 1: PROPERTY IDENTIFICATION
================================================================================

Owner of Record:     ${ownerName}
Property Type:       ${propertyType}
Estimated Value:     ${amt}
Holding Entity:      ${company}
Property ID:         ${propertyId}
State Agency:        Texas Comptroller of Public Accounts
                     Unclaimed Property Division
Claim Website:       ${claimUrl}

================================================================================
SECTION 2: REQUIRED DISCLOSURE (Texas Property Code Ch. 74)
================================================================================

PLEASE READ CAREFULLY:

1. FEE LIMITATION: Under Texas law, recovery agent fees cannot exceed 10% of
   the value of the abandoned property recovered, including all expenses
   incurred. Our fee is 10% ($${fee} of estimated ${amt}).

2. FREE CLAIM OPTION: You may claim this property directly from the Texas
   Comptroller at no cost. Visit: ${claimUrl}

3. NO UPFRONT FEES: You will NOT be charged any fees before recovery.
   Payment is due ONLY upon successful recovery.

4. LICENSE: The Recovery Agent is licensed by the Texas Department of Public
   Safety, Private Security Bureau as required by law.

5. INDEPENDENT CONTRACTOR: This agent is not affiliated with or endorsed by
   the Texas Comptroller of Public Accounts.

================================================================================
SECTION 3: SERVICES
================================================================================

Agent agrees to:
  - Prepare and file claim with Texas Comptroller
  - Provide documentation proving ownership
  - Handle notarization of claim forms
  - Communicate with Comptroller's office
  - Follow through to payment

================================================================================
SECTION 4: COMPENSATION
================================================================================

Fee: 10% of net amount recovered.
Paid ONLY upon successful recovery.

  Estimated Gross: $${amount.toFixed(2)}
  Fee (10%):       $${fee}
  Net to Owner:    $${(amount * 0.90).toFixed(2)}

================================================================================
SECTION 5: TERMS
================================================================================

- Agent bears all costs
- No recovery = no fee
- Agreement valid 12 months
- Owner may cancel in writing at any time
- This agreement is governed by Texas law

================================================================================
SIGNATURES
================================================================================

OWNER:
Signature: _____________________________
Name: ${claimantName}
Date: _______________

AGENT:
Signature: _____________________________
Lost Asset Recovery Team
Date: _______________

================================================================================
`;
}

// Nevada Recovery Letter Template
// Compliant with: NRS 120A.740
// Fee cap: 10% if held <5yrs, 20% if >=5yrs
// Contract: Written, must state property nature, services, date delivered to admin
// Cooling-off: 24-month ban on contracts after escheat
export function generateNVLetter(ownerName: string, claimantName: string, propertyType: string, amount: number, company: string, propertyId: string, claimUrl: string, yearsSinceEscheat: number): string {
  const amt = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  const feeRate = yearsSinceEscheat >= 5 ? 20 : 10;
  const fee = (amount * feeRate / 100).toFixed(2);
  const date = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  return `
================================================================================
                    PROPERTY LOCATION AGREEMENT
                      STATE OF NEVADA
================================================================================

Date: ${date}

THIS AGREEMENT is made pursuant to NRS 120A.740 between:

${claimantName} ("Owner")
AND:
Lost Asset Recovery Team ("Locator")

================================================================================
SECTION 1: PROPERTY IDENTIFICATION (NRS 120A.740(2)(b))
================================================================================

Owner of Record:     ${ownerName}
Property Type:       ${propertyType}
Estimated Value:     ${amt}
Holding Entity:      ${company}
Property ID:         ${propertyId}
Date Delivered to    Administrator (State Treasurer): ${yearsSinceEscheat >= 5 ? '5 or more years ago' : 'Less than 5 years ago'}
State Agency:        Nevada State Treasurer
                     Unclaimed Property Division
Claim Website:       ${claimUrl}

================================================================================
SECTION 2: REQUIRED DISCLOSURES (NRS 120A.740)
================================================================================

PLEASE READ CAREFULLY:

1. FEE LIMITATION - NRS 120A.740(4): If property was delivered to the
   Administrator less than 5 years before signing: max fee = 10% of value.
   If 5 years or more: max fee = 20% of value.

   APPLICABLE FEE: ${feeRate}% (property held ${yearsSinceEscheat >= 5 ? '≥5' : '<5'} years)
   Fee amount: $${fee}

2. 24-MONTH RESTRICTION - NRS 120A.740(1): This agreement was NOT entered
   into during the 24-month period after property was delivered to the
   Administrator. [Certify compliance]

3. FREE CLAIM OPTION: You may claim directly from the Nevada State Treasurer
   at no cost: ${claimUrl}

4. NO UPFRONT FEES: Payment only upon successful recovery.

5. VALUE DISCLOSURE - NRS 120A.740(2)(f):
   Value Before Fee:  ${amt}
   Value After Fee:   $${(amount * (100 - feeRate) / 100).toFixed(2)}

6. This agreement includes a statement of the provisions of NRS 120A.740 as
   required by subsection 2(d).

================================================================================
SECTION 3: SERVICES
================================================================================

Locator agrees to:
  - Prepare and submit Nevada Unclaimed Property Claim Form
  - Provide documentation proving ownership
  - Handle notarization if required
  - Communicate with State Treasurer's office
  - Follow through to payment

================================================================================
SECTION 4: COMPENSATION
================================================================================

Fee: ${feeRate}% of net amount recovered.
Paid ONLY upon successful recovery.

================================================================================
SIGNATURES
================================================================================

OWNER:
Signature: _____________________________
Name: ${claimantName}
Date: _______________

LOCATOR:
Signature: _____________________________
Lost Asset Recovery Team
Date: _______________

================================================================================
`;
}

// Arizona Recovery Letter Template
// Compliant with: ARS § 44-327, § 44-322
// Fee cap: 30% max (but 2-year waiting period before fee allowed)
// Contract: Written, must have conspicuous statement of costs
// License: Must be licensed Private Investigator under ARS § 32-2410
export function generateAZLetter(ownerName: string, claimantName: string, propertyType: string, amount: number, company: string, propertyId: string, claimUrl: string, yearsHeldByState: number): string {
  const amt = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  const canChargeFee = yearsHeldByState >= 2;
  const feePct = canChargeFee ? 30 : 0;
  const fee = canChargeFee ? (amount * 0.30).toFixed(2) : '0.00';
  const date = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  return `
================================================================================
                    HEIR FINDER / LOCATOR AGREEMENT
                       STATE OF ARIZONA
================================================================================

Date: ${date}

THIS AGREEMENT is made pursuant to ARS § 44-322 and § 44-327 between:

${claimantName} ("Claimant")
AND:
Lost Asset Recovery Team ("Locator")
License: Arizona Private Investigator License (filed concurrently with ADOR)

================================================================================
SECTION 1: PROPERTY IDENTIFICATION
================================================================================

Owner of Record:     ${ownerName}
Property Type:       ${propertyType}
Estimated Value:     ${amt}
Holding Entity:      ${company}
Property ID:         ${propertyId}
Years Held by AZ:    ${yearsHeldByState} years
State Agency:        Arizona Department of Revenue
                     Unclaimed Property Section
Claim Website:       ${claimUrl}

================================================================================
SECTION 2: REQUIRED DISCLOSURES (ARS § 44-322, § 44-327)
================================================================================

CONSPICUOUS STATEMENT OF COSTS:

${canChargeFee
  ? `LEGAL FEE LIMITATION: Under ARS § 44-327, a locator may charge a fee NOT
     TO EXCEED 30% of the value of property recovered. The fee for this
     recovery is 30%, which equals $${fee} of the estimated ${amt}.

     Because this property has been held by the Arizona Department of Revenue
     for OVER 2 YEARS, the law permits a fee for locator services.`
  : `NOTICE: Under ARS § 44-327, a locator is only legally entitled to collect
     a fee if the property has been held by the Department of Revenue for
     OVER 2 YEARS. This property has been held for ${yearsHeldByState} year(s).
     NO FEE CAN BE CHARGED AT THIS TIME. We will assist you with the claim
     voluntarily, and if a fee becomes permissible under future circumstances,
     a separate agreement will be executed.`
}

FREE CLAIM OPTION: You are NOT required to use a locator. You may claim
directly from the Arizona Department of Revenue at:
${claimUrl}

LICENSE REQUIREMENT: The Locator is a licensed Private Investigator as
required by ARS § 32-2410.

JOINT CLAIM: If there are joint owners, they must claim together unless
specific exceptions apply (death, divorce, lost contact).

DEATH CERTIFICATE: If the owner is deceased, a copy of the death certificate
is required. For estate claims, Letters of Office or Affidavit for Collection
of Personal Property (for estates under $75,000) may be required.

================================================================================
SECTION 3: SERVICES
================================================================================

Locator agrees to:
  - Prepare and submit claim to AZ Department of Revenue
  - Provide proof of ownership documentation
  - Submit photo ID of claimant and locator
  - Handle communication with DOR
  - Follow through to payment

================================================================================
SECTION 4: COMPENSATION
================================================================================

${canChargeFee ? `Fee: 30% of net amount recovered. Paid ONLY upon successful recovery.
  Estimated Gross: $${amount.toFixed(2)}
  Fee (30%):       $${fee}
  Net to Claimant: $${(amount * 0.70).toFixed(2)}` : 'No fee currently chargeable per ARS § 44-327 (property held < 2 years).'}

================================================================================
SIGNATURES
================================================================================

CLAIMANT:
Signature: _____________________________
Name: ${claimantName}
Date: _______________

LOCATOR:
Signature: _____________________________
Lost Asset Recovery Team
License: AZ Private Investigator
Date: _______________

================================================================================
`;
}

// Tennessee Recovery Letter Template
// Compliant with: TCA 66-29-176
// Fee cap: 10% or $50, whichever is greater
// Contract: Must be approved by TN Treasury Unclaimed Property Division
// License: Must be licensed Private Investigator in TN
export function generateTNLetter(ownerName: string, claimantName: string, propertyType: string, amount: number, company: string, propertyId: string, claimUrl: string): string {
  const amt = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  const fee = Math.max(amount * 0.10, 50).toFixed(2);
  const date = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  return `
================================================================================
                    LOCATOR SERVICES AGREEMENT
                      STATE OF TENNESSEE
================================================================================

Date: ${date}

THIS AGREEMENT is made pursuant to TCA 66-29-176 between:

${claimantName} ("Owner")
AND:
Lost Asset Recovery Team ("Locator")
TN Private Investigation License: filed concurrently with TN Treasury

================================================================================
SECTION 1: PROPERTY IDENTIFICATION
================================================================================

Owner of Record:     ${ownerName}
Property Type:       ${propertyType}
Estimated Value:     ${amt}
Holding Entity:      ${company}
Property ID:         ${propertyId}
State Agency:        Tennessee Department of Treasury
                     Unclaimed Property Division
Claim Website:       ${claimUrl}

================================================================================
SECTION 2: REQUIRED DISCLOSURES (TCA 66-29-176)
================================================================================

PLEASE READ CAREFULLY:

1. FEE LIMITATION: Tennessee law provides that a locator may charge no more
   than 10% of the value of property recovered OR $50, whichever is greater.
   Our fee: $${fee}

2. FREE CLAIM OPTION: You may claim directly from the Tennessee Department of
   Treasury at no charge. Visit: ${claimUrl} or call (866) 370-9429.

3. CONTRACT APPROVAL: This contract must be approved by the Tennessee
   Department of Treasury's Unclaimed Property Division upon submission as
   part of the claims process. TCA 66-29-176.

4. LICENSE: The Locator is a licensed Private Investigator in Tennessee as
   required by the TN Private Investigation and Polygraph Commission.

5. NO STATE AFFILIATION: The Locator is not an employee of, or contracted by,
   the Tennessee Department of Treasury.

6. NO UPFRONT FEES: Payment only upon successful recovery.

================================================================================
SECTION 3: SERVICES
================================================================================

Locator agrees to:
  - Prepare and submit Tennessee Unclaimed Property Claim Form
  - Provide documentation proving identity and ownership
  - Handle communication with TN Treasury
  - Submit contract for approval by Unclaimed Property Division
  - Follow through to payment

================================================================================
SECTION 4: COMPENSATION
================================================================================

Fee: $${fee} (10% of recovered value or $50 min, whichever greater)
Paid ONLY upon successful recovery.

  Estimated Recovery: ${amt}
  Locator Fee:        $${fee}
  Net to Owner:       $${(amount - Math.max(amount * 0.10, 50)).toFixed(2)}

================================================================================
SIGNATURES
================================================================================

OWNER:
Signature: _____________________________
Name: ${claimantName}
Date: _______________

LOCATOR:
Signature: _____________________________
Lost Asset Recovery Team
Date: _______________

NOTE: This contract is subject to review and approval by the Tennessee
Department of Treasury, Unclaimed Property Division per TCA 66-29-176.

================================================================================
`;
}

// Illinois Recovery Letter Template
// Compliant with: 765 ILCS 1026/
// License: Required through IL State Treasurer
// Fee: Per license terms
// Bond: $25,000 fidelity bond required
// Cooling-off: 24-month waiting period per uniform act
export function generateILLetter(ownerName: string, claimantName: string, propertyType: string, amount: number, company: string, propertyId: string, claimUrl: string): string {
  const amt = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  const fee = (amount * 0.10).toFixed(2);
  const date = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  return `
================================================================================
                    UNCLAIMED PROPERTY FINDER AGREEMENT
                        STATE OF ILLINOIS
================================================================================

Date: ${date}

THIS AGREEMENT is made pursuant to the Revised Uniform Unclaimed Property Act
(765 ILCS 1026/) between:

${claimantName} ("Owner")
AND:
Lost Asset Recovery Team ("Finder")
IL Finder License #: (filed with IL State Treasurer)

================================================================================
SECTION 1: PROPERTY IDENTIFICATION
================================================================================

Owner of Record:     ${ownerName}
Property Type:       ${propertyType}
Estimated Value:     ${amt}
Holding Entity:      ${company}
Property ID:         ${propertyId}
State Agency:        Illinois State Treasurer
                     Unclaimed Property Division (ICash)
Claim Website:       ${claimUrl}

================================================================================
SECTION 2: REQUIRED DISCLOSURES
================================================================================

PLEASE READ CAREFULLY:

1. LICENSED FINDER: The Finder is licensed by the Illinois State Treasurer's
   Office as required by Illinois law. License # filed with application.

2. FIDELITY BOND: The Finder maintains a $25,000 fidelity bond as required.

3. FEE: ${fee} (10% of estimated value). Paid only upon successful recovery.

4. FREE CLAIM OPTION: You may claim directly from the Illinois State Treasurer
   at no cost. Visit: ${claimUrl}

5. 24-MONTH RESTRICTION: This agreement complies with the 24-month waiting
   period provisions of the Revised Uniform Unclaimed Property Act.

6. NO AFFILIATION: The Finder is not employed by or affiliated with the
   Illinois State Treasurer's Office.

================================================================================
SECTION 3: SERVICES
================================================================================

Finder agrees to:
  - Research and verify claim eligibility
  - Prepare and submit claim to Illinois State Treasurer
  - Provide documentation proving identity and ownership
  - Handle communication with State Treasurer's office
  - Follow through to payment

================================================================================
SECTION 4: COMPENSATION
================================================================================

Fee: 10% of net recovered amount.
Paid ONLY upon successful recovery.

  Estimated Value:   ${amt}
  Finder Fee (10%):  $${fee}
  Net to Owner:      $${(amount * 0.90).toFixed(2)}

================================================================================
SIGNATURES
================================================================================

OWNER:
Signature: _____________________________
Name: ${claimantName}
Date: _______________

FINDER:
Signature: _____________________________
Lost Asset Recovery Team
IL Finder License: _____________________
Date: _______________

================================================================================
`;
}

// Florida Recovery Letter Template
// Compliant with: Ch. 717 Florida Statutes, 69I-20 FAC
// Fee cap: Determined by contract (use state form)
// Contract: MUST use official "Unclaimed Property Recovery Agreement" form per 717.135
// Notarization: Required
export function generateFLLetter(ownerName: string, claimantName: string, propertyType: string, amount: number, company: string, propertyId: string, claimUrl: string): string {
  const amt = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  const fee = (amount * 0.10).toFixed(2);
  const date = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  return `
================================================================================
                    UNCLAIMED PROPERTY RECOVERY AGREEMENT
                         STATE OF FLORIDA
================================================================================

NOTE: Florida law (s. 717.135, Florida Statutes) requires the use of the
OFFICIAL Unclaimed Property Recovery Agreement form adopted by the Florida
Department of Financial Services. This document serves as the DISCLOSURE
SUMMARY. The official form will be provided separately for execution.

Date: ${date}

BETWEEN:
${claimantName} ("Owner")
AND:
Lost Asset Recovery Team ("Recovery Agent")

================================================================================
SECTION 1: PROPERTY IDENTIFICATION
================================================================================

Owner of Record:     ${ownerName}
Property Type:       ${propertyType}
Estimated Value:     ${amt}
Holding Entity:      ${company}
Property ID:         ${propertyId}
State Agency:        Florida Department of Financial Services
                     Division of Unclaimed Property
Claim Website:       ${claimUrl}

================================================================================
SECTION 2: REQUIRED DISCLOSURES (s. 717.135, F.S.)
================================================================================

PLEASE READ CAREFULLY:

1. MANDATORY STATE FORM: Florida law requires that all recovery agreements use
   the official "Unclaimed Property Recovery Agreement" form adopted by the
   Department of Financial Services per s. 717.135(1). Any agreement that does
   not use this form is VOID.

2. REQUIRED DISCLOSURES PER s. 717.135(2):
   (a) Total dollar amount of the property: ${amt}
   (b) Fee to be charged: $${fee}
   (c) Percentage of property the fee represents: 10%
   (d) Name and address of the recovery agent
   (e) Statement that the owner may claim directly from the state at no cost
   (f) The official form includes a 5-day right of rescission

3. RIGHT TO CANCEL: You have FIVE (5) business days to cancel this agreement
   for any reason without penalty.

4. FREE CLAIM OPTION: You may claim directly from the Florida Department of
   Financial Services at no cost. Visit: ${claimUrl}

5. FEES ONLY ON RECOVERY: No fees are due unless the property is successfully
   recovered and paid to you.

6. STATUTE REFERENCE: Chapter 717, Florida Statutes; Rule 69I-20, FAC

================================================================================
SECTION 3: SERVICES
================================================================================

Agent agrees to:
  - Complete official Florida Unclaimed Property Recovery Agreement (form 69I-20)
  - Prepare and submit claim to Florida Department of Financial Services
  - Provide documentation proving ownership
  - Handle notarization of claim forms
  - Communicate with DFS on behalf of Owner
  - Follow through to payment

================================================================================
SECTION 4: COMPENSATION
================================================================================

Fee: 10% of net recovered amount.
Paid ONLY upon successful recovery.

  Estimated Gross: $${amount.toFixed(2)}
  Fee (10%):       $${fee}
  Net to Owner:    $${(amount * 0.90).toFixed(2)}

================================================================================
RIGHT OF RESCISSION
================================================================================

Owner may cancel this agreement within FIVE (5) BUSINESS DAYS of signing
by providing written notice to the Recovery Agent.

================================================================================
SIGNATURES
================================================================================

OWNER:
Signature: _____________________________
Name: ${claimantName}
Date: _______________

RECOVERY AGENT:
Signature: _____________________________
Lost Asset Recovery Team
Date: _______________

================================================================================
`;
}
