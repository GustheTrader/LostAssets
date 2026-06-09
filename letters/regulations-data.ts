// State Regulation Data for Lost Assets Recovery
// Each state's unclaimed property finder regulations based on official sources
// CA = California, AZ = Arizona, NV = Nevada, TX = Texas
// TN = Tennessee, IL = Illinois, FL = Florida

export interface StateRegulation {
  state: string;
  state_name: string;
  claim_form_url: string;
  required_documents: string[];
  notarization_required: boolean;
  heirship_affidavit_required: boolean;
  probate_required_threshold: number;
  finder_fee_cap_pct: number | null;
  finder_contract_required: boolean;
  contract_must_be_notarized: boolean;
  cooling_off_days: number;
  legal_reference: string;
  license_required: string;
  notes: string;
}

export const STATE_REGULATIONS: Record<string, StateRegulation> = {
  CA: {
    state: 'CA',
    state_name: 'California',
    claim_form_url: 'https://www.sco.ca.gov/upd_contact.html',
    required_documents: [
      'Valid photo ID (Driver License or State ID)',
      'Social Security Number (or Tax ID)',
      'Documentation linking you to the property (old bank statement, utility bill, etc.)',
      'Proof of address matching the property records',
      'Completed SCO Claim Form (SCO-UP-1)'
    ],
    notarization_required: true,
    heirship_affidavit_required: true,
    probate_required_threshold: 166250,
    finder_fee_cap_pct: 10,
    finder_contract_required: true,
    contract_must_be_notarized: false,
    cooling_off_days: 0,
    legal_reference: 'California Code of Civil Procedure § 1500 et seq.; § 1582 (investigator fee limit)',
    license_required: 'No specific license, but must use SCO Standard Investigator Agreement form. Fee cannot exceed 10%.',
    notes: 'Fee cap 10% applies to all non-probate property. No limit on probate estates. Investigators cannot contract during the period after business notifies SCO of escheat but before SCO takes possession (the "window period"). SCO may reject investigator-filed claims if owner also files directly.'
  },
  AZ: {
    state: 'AZ',
    state_name: 'Arizona',
    claim_form_url: 'https://azdor.gov/unclaimed-property',
    required_documents: [
      'Valid photo ID (of both locator and claimant)',
      'Signed contract between locator and claimant',
      'Proof of authority (Power of Attorney or AZ-285UP form)',
      'Death certificate (if deceased owner)',
      'Letters of Office or Will (for estate claims)',
      'Affidavit for Collection of Personal Property (estates under $75,000 without will)'
    ],
    notarization_required: false,
    heirship_affidavit_required: true,
    probate_required_threshold: 75000,
    finder_fee_cap_pct: 30,
    finder_contract_required: true,
    contract_must_be_notarized: false,
    cooling_off_days: 0,
    legal_reference: 'A.R.S. § 44-301 et seq.; § 44-327 (finder fee); § 44-322 (contract form)',
    license_required: 'Must be a licensed Private Investigator under ARS § 32-2410',
    notes: 'Fee cap 30%, but only after property has been held by AZ DOR for OVER 2 YEARS (ARS § 44-327). ADOR issues check directly to locator for assigned percentage (not to exceed 30%). Locator must provide signed contract with claim submission. Joint owners must claim together with exceptions.'
  },
  NV: {
    state: 'NV',
    state_name: 'Nevada',
    claim_form_url: 'https://nevadatreasurer.gov/unclaimed-property/',
    required_documents: [
      'Valid photo ID',
      'Proof of ownership',
      'Signed written agreement (per NRS 120A.740)',
      'Completed claim form'
    ],
    notarization_required: false,
    heirship_affidavit_required: false,
    probate_required_threshold: 0,
    finder_fee_cap_pct: 20,
    finder_contract_required: true,
    contract_must_be_notarized: false,
    cooling_off_days: 0,
    legal_reference: 'NRS 120A.500 et seq.; NRS 120A.740 (locator agreements)',
    license_required: 'Must be licensed as private investigator in Nevada per PI board ruling',
    notes: 'Tiered fee cap: 10% if property held by administrator <5 years, 20% if >=5 years (NRS 120A.740(4)). 24-month ban on entering agreements after property is paid/delivered to administrator. Agreement must state nature of property, services, date delivered, value before/after fee deduction. No standard form — agreement is flexible but must meet statutory requirements.'
  },
  TX: {
    state: 'TX',
    state_name: 'Texas',
    claim_form_url: 'https://claimittexas.gov/',
    required_documents: [
      'Valid photo ID',
      'Proof of ownership documentation',
      'Documentation linking claimant to property',
      'Completed claim form',
      'Notarized affidavit (for certain claims)'
    ],
    notarization_required: true,
    heirship_affidavit_required: true,
    probate_required_threshold: 0,
    finder_fee_cap_pct: 10,
    finder_contract_required: true,
    contract_must_be_notarized: false,
    cooling_off_days: 0,
    legal_reference: 'Texas Property Code Ch. 72-77; Ch. 74 (claims)',
    license_required: 'Must be licensed by Texas DPS Private Security Bureau (heir finder/asset recovery company license)',
    notes: 'Fee cap 10% including all expenses. Must be licensed by TX DPS. No cooling-off period specified. Texas Comptroller manages claims. No statute of limitations on unclaimed property.'
  },
  TN: {
    state: 'TN',
    state_name: 'Tennessee',
    claim_form_url: 'https://claimittn.gov/',
    required_documents: [
      'Valid photo ID',
      'Proof of Social Security Number',
      'Proof of ownership or relationship',
      'Completed claim form'
    ],
    notarization_required: false,
    heirship_affidavit_required: false,
    probate_required_threshold: 0,
    finder_fee_cap_pct: 10,
    finder_contract_required: true,
    contract_must_be_notarized: false,
    cooling_off_days: 0,
    legal_reference: 'T.C.A. § 66-29-101 et seq.; § 66-29-176 (locator contracts)',
    license_required: 'Must be licensed private investigator in TN (TN Private Investigation and Polygraph Commission)',
    notes: 'Fee: 10% of recovered value OR $50, whichever is greater. Contract must be APPROVED by TN Treasury Unclaimed Property Division (TCA 66-29-176). Locator cannot imply affiliation with TN Treasury. Free claim option at ClaimItTN.gov or (866) 370-9429.'
  },
  IL: {
    state: 'IL',
    state_name: 'Illinois',
    claim_form_url: 'https://icash.illinoistreasurer.gov/',
    required_documents: [
      'Valid photo ID',
      'Proof of Social Security Number',
      'Documentation linking to property'
    ],
    notarization_required: false,
    heirship_affidavit_required: false,
    probate_required_threshold: 0,
    finder_fee_cap_pct: 10,
    finder_contract_required: true,
    contract_must_be_notarized: false,
    cooling_off_days: 0,
    legal_reference: '765 ILCS 1026/1 et seq. (Revised Uniform Unclaimed Property Act)',
    license_required: 'REQUIRED: Unclaimed Property Finder License from IL State Treasurer (since 2025). $500 application fee. $25,000 fidelity bond. License valid 3 years. Must be 21+. Background check required.',
    notes: 'NEW licensing requirement as of 2025. Businesses and individuals must obtain license. CPA firms also need registration. $500 non-refundable application fee. Fidelity bond required. Background check conducted by IL State Treasurer. 3-year license term. Application valid for 90 days.'
  },
  FL: {
    state: 'FL',
    state_name: 'Florida',
    claim_form_url: 'https://www.fltreasurehunt.gov/',
    required_documents: [
      'Valid photo ID',
      'Proof of Social Security Number',
      'Documentation linking to property',
      'Notarized claim form',
      'Official Unclaimed Property Recovery Agreement (s. 717.135 form)'
    ],
    notarization_required: true,
    heirship_affidavit_required: true,
    probate_required_threshold: 0,
    finder_fee_cap_pct: null,
    finder_contract_required: true,
    contract_must_be_notarized: false,
    cooling_off_days: 5,
    legal_reference: 'Ch. 717, Florida Statutes; Rule 69I-20, F.A.C.',
    license_required: 'Must use official state-adopted Unclaimed Property Recovery Agreement form (s. 717.135). No specific license requirement but must use the state-prescribed contract form.',
    notes: 'CRITICAL: Must use the OFFICIAL "Unclaimed Property Recovery Agreement" form adopted by the Department per FL Statute 717.135(1). ANY agreement not using this form is VOID. Required disclosures include total dollar amount, fee amount, percentage, and name/address of agent. 5 BUSINESS DAY right of rescission. Fee caps are determined by contract terms in the official form — no statutory percentage cap but the form must be used without modification.'
  }
};

export function getStateRegulation(stateCode: string): StateRegulation | null {
  return STATE_REGULATIONS[stateCode.toUpperCase()] || null;
}

export function getRegulationsArray(): StateRegulation[] {
  return Object.values(STATE_REGULATIONS);
}
