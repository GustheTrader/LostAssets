// California Recovery Letter Template
// Compliant with: California Code of Civil Procedure § 1582
// Fee cap: 10% max (except probate estates)
// Contract required: Yes, must use SCO Standard Investigator Agreement
// Notarization: Required for claim
// Cooling-off: None specified by statute

export interface LetterInput {
  ownerName: string;
  claimantName: string;
  propertyType: string;
  amount: number;
  company: string;
  stateId: string;
  propertyId: string;
  claimFormUrl: string;
}

export function generateCALetter(input: LetterInput): string {
  const { ownerName, claimantName, propertyType, amount, company, stateId, propertyId, claimFormUrl } = input;
  const amtFormatted = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(amount);
  const fee = (amount * 0.10).toFixed(2);
  const date = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  return `
================================================================================
                    INVESTIGATOR DISCLOSURE & RECOVERY AGREEMENT
                            STATE OF CALIFORNIA
================================================================================

Date: ${date}

This agreement is entered into by and between:

Claimant: ${claimantName}
("Claimant")

and

Investigator: Lost Asset Recovery Team
("Investigator")

================================================================================
SECTION 1: PROPERTY IDENTIFICATION
================================================================================

Owner of Record:     ${ownerName}
Property Type:       ${propertyType}
Estimated Value:     ${amtFormatted}
Holding Entity:      ${company}
Property ID:         ${propertyId}
State ID:            ${stateId}
State Controller:    California State Controller's Office
                     P.O. Box 942850
                     Sacramento, CA 94250-5873
Claim Website:       ${claimFormUrl}
Status:              Held by State Controller as Unclaimed Property

================================================================================
SECTION 2: DISCLOSURE (Required by California Code of Civil Procedure § 1582)
================================================================================

PLEASE READ THE FOLLOWING DISCLOSURES CAREFULLY:

1. NO FEE GREATER THAN 10%: Under California law (CCP § 1582), an investigator
   may NOT charge a fee greater than TEN PERCENT (10%) of the value of the
   property returned to you. The fee for this recovery is 10%, which equals
   $${fee} of the estimated $${amount.toFixed(2)} total value.

2. FREE CLAIM OPTION: You are NOT required to use an Investigator to file a
   claim. You may file a claim directly with the California State Controller's
   Office at no cost by visiting:
   ${claimFormUrl}

3. NO UPFRONT PAYMENT: You will NOT be asked to pay any money before the
   property is returned to you. The fee is paid ONLY upon successful recovery.

4. CONTRACT DURATION: This agreement is valid for twelve (12) months from the
   date signed by Claimant, as required by the SCO Standard Agreement.

5. RIGHT TO CANCEL: If you were already aware of this property and would have
   recovered it without our assistance, you are under no obligation.

6. INDEPENDENT AGREEMENT: This is a private agreement between you and the
   Investigator. The State Controller's Office does not endorse or regulate
   the terms of this agreement.

================================================================================
SECTION 3: SERVICES TO BE PROVIDED
================================================================================

Investigator agrees to:

  a) Prepare and submit the California Unclaimed Property Claim Form (SCO-UP-1)
  b) Provide documentation linking Claimant to the property
  c) Notarize the claim form (California requires notarization for claims)
  d) Submit all required supporting documents
  e) Communicate with the State Controller's Office on behalf of Claimant
  f) Follow up on claim status until resolution

================================================================================
SECTION 4: COMPENSATION
================================================================================

Claimant agrees to pay Investigator a fee of TEN PERCENT (10%) of the net
amount recovered. This fee shall be paid ONLY upon successful recovery and
receipt of funds by Claimant.

  Estimated Gross Recovery:  $${amount.toFixed(2)}
  Investigator Fee (10%):    $${fee}
  Estimated Net to Claimant: $${(amount * 0.90).toFixed(2)}

If the actual recovery differs from the estimate, the fee shall be calculated
as 10% of the actual amount recovered.

================================================================================
SECTION 5: TERMS AND CONDITIONS
================================================================================

1. Investigator bears all costs and expenses of recovery.
2. If no property is recovered, Claimant owes nothing.
3. This agreement is not transferable.
4. Any dispute shall be resolved in the county of Claimant's residence.
5. Investigator represents that they are not an employee of the California
   State Controller's Office or any state agency.

================================================================================
SECTION 6: SIGNATURES
================================================================================

IN WITNESS WHEREOF, the parties have executed this agreement on the date above.

CLAIMANT:
_____________________________
Signature

_____________________________
Printed Name: ${claimantName}

_____________________________
Social Security or Tax ID No.

_____________________________
Date

INVESTIGATOR:
_____________________________
Signature

Lost Asset Recovery Team

_____________________________
Date

(NOTARIZATION RECOMMENDED - California claim forms require notarization)

================================================================================
                    NOTARY ACKNOWLEDGMENT (FOR CLAIM FORM)
================================================================================

State of California     )
                        ) ss.
County of _____________ )

On this ____ day of ________________, 20____, before me, a Notary Public,
personally appeared __________________________________, proved to me on the
basis of satisfactory evidence to be the person(s) whose name(s) is/are
subscribed to the within instrument and acknowledged to me that he/she/they
executed the same in his/her/their authorized capacity(ies), and that by
his/her/their signature(s) on the instrument the person(s), or the entity
upon behalf of which the person(s) acted, executed the instrument.

WITNESS my hand and official seal.

_____________________________
Notary Public

My Commission Expires: _______________

================================================================================
`;
}
