import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { BookOpen, FileText, Download, Mail, Copy, Check, Info, FileSignature, Sparkles, Building, User, DollarSign, ExternalLink, AlertTriangle, Scale, Coins, ShieldAlert, ArrowRight } from "lucide-react";

interface CAInvestigatorCenterProps {
  onSwitchTab?: (tab: string) => void;
}

export function CAInvestigatorCenter({ onSwitchTab }: CAInvestigatorCenterProps) {
  // Input fields for Letter / Contract Generator
  const [recipientType, setRecipientType] = useState<"individual" | "business" | "contract">("individual");
  const [ownerName, setOwnerName] = useState("JOHN DOE");
  const [amount, setAmount] = useState("14350.00");
  const [propertyId, setPropertyId] = useState("CA-1829471");
  const [propertyType, setPropertyType] = useState("UNCASHED CHECK / DIVIDEND");
  const [holderName, setHolderName] = useState("WELLS FARGO BANK");
  const [finderFee, setFinderFee] = useState("10"); // CA standard is max 10% on most agreements
  const [agentName, setAgentName] = useState("Lost Asset Recovery Group");
  const [agentPhone, setAgentPhone] = useState("(800) 555-0199");
  const [agentEmail, setAgentEmail] = useState("claims@lostassetlocator.com");

  const [copied, setCopied] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState("generator");

  // Official resources scraped from sco.ca.gov
  const officialResources = [
    {
      title: "Investigator Handbook",
      desc: "Complete guide on California unclaimed property laws, policies, and guidelines (rev. 01/2023).",
      url: "https://www.sco.ca.gov/Files-UPD/guide_investigator_handbook.pdf",
      badge: "Handbook"
    },
    {
      title: "How to Submit an Investigator Claim",
      desc: "Step-by-step procedural PDF for locating, packaging, and submitting claims.",
      url: "https://www.sco.ca.gov/Files-UPD/upd_how_to_submit_an_investigator_claim.pdf",
      badge: "Instructional"
    },
    {
      title: "Standard Investigator Agreement",
      desc: "Official contingency contract for standard individual/business property claims.",
      url: "https://www.sco.ca.gov/Files-UPD/form_investigator_agreement.pdf",
      badge: "Mandatory Form"
    },
    {
      title: "Investigator Agreement - Estates",
      desc: "Official agreement form for claiming assets belonging to deceased owner estates.",
      url: "https://www.sco.ca.gov/Files-UPD/form_investigator_agreement_estates.pdf",
      badge: "Mandatory Form"
    },
    {
      title: "Request for Final Decree of Distribution",
      desc: "Required form for heir claims to verify deceased estate distribution.",
      url: "https://www.sco.ca.gov/Files-UPD/form_investigator_decreeofdistribution.pdf",
      badge: "Probate Form"
    },
    {
      title: "Declaration Under Probate Code 13101",
      desc: "Mandatory statutory affidavit for claiming estates valued under $166,250 without formal probate.",
      url: "https://www.sco.ca.gov/Files-UPD/CA_Declaration_Under_Probate_Code.pdf",
      badge: "Probate Form"
    },
    {
      title: "Table of Heirship Chart",
      desc: "Required relationship chart detailing line of succession for deceased owner claims.",
      url: "https://www.sco.ca.gov/Files-UPD/CA_Table_of_Heirship.pdf",
      badge: "Estate Form"
    },
    {
      title: "Safe Deposit Box Property Release",
      desc: "Required form for authorized investigators to release contents of safe deposit vaults.",
      url: "https://www.sco.ca.gov/Files-UPD/CA_Safe_Deposit_Box_Form.pdf",
      badge: "Vault Form"
    }
  ];

  const filingInstructions = [
    {
      title: "Filing Instructions For A Property Owner",
      url: "https://www.sco.ca.gov/upd_claim_filinginstr_original.html",
      type: "Owner"
    },
    {
      title: "Filing Instructions For Heir (Deceased)",
      url: "https://www.sco.ca.gov/upd_claim_filinginstr_heirs.html",
      type: "Heir"
    },
    {
      title: "Filing Instructions For A Business / Corp",
      url: "https://www.sco.ca.gov/upd_claim_filinginstr_business.html",
      type: "Business"
    },
    {
      title: "Filing Instructions For A Government Agency",
      url: "https://www.sco.ca.gov/upd_claim_filinginstr_government.html",
      type: "Gov"
    }
  ];

  // Dynamic Letter Generators
  const generateIndividualLetter = () => {
    const formattedAmount = Number(amount || 0).toLocaleString("en-US", { style: "currency", currency: "USD" });
    return `Subject: SECURED ASSET RECOVERY ADVISORY - Unclaimed Funds Identified for ${ownerName}

Date: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}

Dear ${ownerName},

This is an official asset recovery advisory regarding unclaimed capital accounts currently being held in state custody. 

Our quantitative asset management agency has identified an outstanding balance matching your profile in the official registries:
• Property ID / Claim Reference: ${propertyId}
• Declared Balance: ${formattedAmount}
• Property Source / Classification: ${propertyType}
• Original Custodian: ${holderName}

Under the California Code of Civil Procedure Section 1500 et seq., these assets are subject to permanent escheatment if a compliant recovery package is not filed. As a registered asset recovery specialist, our group offers a complete, turn-key retrieval service. 

We operate strictly on a contingency basis under California's statutory guidelines:
1. We handle the entire claims process, including State Controller communications, notary validation, and legal document submission.
2. We charge a standard finder's fee of only ${finderFee}% upon the successful release of funds.
3. If no capital is successfully recovered, you owe absolutely nothing.

To authorize recovery of these funds, please reply to this notice or contact our intake office immediately.

Sincerely,

_______________________________
${agentName}
Intake Office: ${agentPhone}
Email Contact: ${agentEmail}
Authorized under CA Unclaimed Property Regulations`;
  };

  const generateBusinessLetter = () => {
    const formattedAmount = Number(amount || 0).toLocaleString("en-US", { style: "currency", currency: "USD" });
    return `Subject: CORPORATE TREASURY ADVISORY: Audit Reconciliation / Unclaimed Property ID #${propertyId}

Date: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}

TO: Chief Financial Officer / Corporate Treasurer
Entity Name: ${ownerName}

RE: Corporate Treasury Recovery - Outstanding State Balances

Dear Financial Officer,

Our research group specializes in corporate asset recovery, corporate treasury audit reconciliation, and state registry recovery programs. 

During our active audit of California's industrial accounts database, we detected a high-value outstanding claim registered to ${ownerName}:
• Claim Reference Tag: ${propertyId}
• Reconcilable Balance: ${formattedAmount}
• Asset Property Class: ${propertyType}
• Reported Custodian: ${holderName}

Many corporate claims remain unliquidated due to corporate reorganizations, mergers, address changes, or vendor accounting adjustments. Under California Civil Procedure § 1500, corporate properties require specific officer verification, secretary of state active standings, and certified corporate resolutions to avoid claim rejections.

Our agency provides full-scope administrative claims execution:
• Preparation of standard CA State Investigator Agreements.
• Certified corporate documentation assembly and notary processing.
• Direct processing with the California State Controller's Office (SCO).

Our compensation is strictly contingency-based, locked at a flat ${finderFee}% finder fee of successfully recovered funds. Our work is fully transparent—we absorb all upfront research and processing costs.

Please pass this notification to your treasury or legal department, or contact our corporate agent to execute our recovery mandate:
• Recovery Executive: ${agentName}
• Direct Phone: ${agentPhone}
• Corporate Email: ${agentEmail}

We look forward to restoring this idle capital to your balance sheet.

Sincerely,

_______________________________
Corporate Recovery Division
${agentName}`;
  };

  const generateAgreementText = () => {
    const formattedAmount = Number(amount || 0).toLocaleString("en-US", { style: "currency", currency: "USD" });
    return `STATE OF CALIFORNIA
UNCLAIMED PROPERTY INVESTIGATOR DISCLOSURE & CONTINGENCY AGREEMENT
(CA Code of Civil Procedure § 1500 et seq.)

This Agreement is made by and between the Owner and the licensed/registered Investigator named below:

I. OWNER INFORMATION
Owner Name: ${ownerName}
Current Address: ____________________________________________________
City/State/Zip: _____________________________________________________

II. PROPERTY DETAILS DISCLOSURE
State Unclaimed Property ID: ${propertyId}
Reported Owner Name: ${ownerName}
Type of Property: ${propertyType}
Reported Amount (Approximate): ${formattedAmount}
Reported Holder: ${holderName}

III. INVESTIGATOR DISCLOSURE & FEE AGREEMENT
The Investigator has disclosed the existence of the above-listed property, which is currently held by the California State Controller's Office (SCO). The Owner is hereby advised that they have the right to claim their property directly from the State Controller's Office WITHOUT employing an investigator or paying a finder's fee.

In consideration of the services rendered by the Investigator in locating, identifying, and preparing the required administrative recovery filings, the Owner hereby agrees to pay the Investigator a contingency fee equal to:

                  === ${finderFee}% OF THE TOTAL VALUE RECOVERED ===

Owner agrees that the Investigator shall be authorized to receive the claim check, or that a joint multi-payee check shall be issued, or that Owner shall pay the Investigator the agreed-upon fee within ten (10) business days of funds receipt.

IV. ENTIRE AGREEMENT & LEGAL SIGNATURES
This agreement constitutes the complete contract between Owner and Investigator. No fee is due if the funds are not successfully recovered. Both parties warrant that this contract is entered into in compliance with the rules set by State Controller Malia M. Cohen.

OWNER SIGNATURE: ______________________________  DATE: ______________

INVESTIGATOR SIGNATURE: _______________________  DATE: ______________
Intake Agent: ${agentName} | Tel: ${agentPhone} | Email: ${agentEmail}

NOTARY ACKNOWLEDGMENT REQUIRED FOR FILING:
State of ______________ , County of ______________
Subscribed and sworn before me on this _____ day of ____________ , 20___`;
  };

  const getActiveLetterText = () => {
    if (recipientType === "business") return generateBusinessLetter();
    if (recipientType === "contract") return generateAgreementText();
    return generateIndividualLetter();
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(getActiveLetterText());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <BookOpen className="w-6 h-6 text-orange-500" />
          <div>
            <h2 className="text-xl font-light tracking-tight text-neutral-100">CA Investigator Hub & Letter Center</h2>
            <p className="text-xs text-neutral-500">
              Official escheatment rules, Section 1582 compliance guidelines, and outreach generator for California recovery agents.
            </p>
          </div>
        </div>
        <Badge variant="outline" className="px-3 py-1 font-mono text-xs border-orange-500/20 text-orange-400 bg-orange-500/5">
          CA SCO MALIA M. COHEN PORTAL
        </Badge>
      </div>

      <Tabs value={activeSubTab} onValueChange={setActiveSubTab} className="w-full">
        <TabsList className="bg-neutral-950/80 border border-neutral-850 p-1 mb-6">
          <TabsTrigger value="generator" className="font-mono text-xs uppercase px-4 py-1.5">
            <Mail className="w-3.5 h-3.5 mr-1.5" /> Outreach & Forms
          </TabsTrigger>
          <TabsTrigger value="rules" className="font-mono text-xs uppercase px-4 py-1.5 text-orange-400">
            <BookOpen className="w-3.5 h-3.5 mr-1.5 text-orange-500" /> Section 1582 & Rules
          </TabsTrigger>
        </TabsList>

        <TabsContent value="generator" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
            {/* Left Column: Official SCO Forms & Guidelines (1/3 wide) */}
            <div className="space-y-6 lg:col-span-1">
              {/* Handbook Links */}
              <Card className="border-neutral-800 bg-neutral-900/60 backdrop-blur-md">
                <CardHeader className="pb-3 border-b border-neutral-800">
                  <CardTitle className="text-sm font-semibold uppercase tracking-wider text-neutral-300 flex items-center">
                    <FileSignature className="w-4 h-4 mr-2 text-orange-500" />
                    Official SCO PDFs & Agreements
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Direct downlinks to Malia M. Cohen's official investigator filings.
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-3 divide-y divide-neutral-850">
                  {officialResources.map((res, i) => (
                    <div key={i} className="py-2.5 hover:bg-neutral-900/40 px-2 rounded-md transition-colors flex justify-between items-start gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-semibold text-neutral-200 hover:text-orange-400 cursor-pointer">
                            <a href={res.url} target="_blank" rel="noreferrer" className="flex items-center gap-1">
                              {res.title} <ExternalLink className="w-2.5 h-2.5 opacity-60" />
                            </a>
                          </span>
                        </div>
                        <p className="text-[10px] text-neutral-500 leading-normal">{res.desc}</p>
                      </div>
                      <Badge variant="outline" className="text-[9px] bg-orange-500/5 text-orange-400 border-orange-500/10 shrink-0 font-mono">
                        {res.badge}
                      </Badge>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Filing Instructions Guide */}
              <Card className="border-neutral-800 bg-neutral-900/60 backdrop-blur-md">
                <CardHeader className="pb-3 border-b border-neutral-800">
                  <CardTitle className="text-sm font-semibold uppercase tracking-wider text-neutral-300 flex items-center">
                    <Info className="w-4 h-4 mr-2 text-orange-500" />
                    SCO Filing Instructions
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 space-y-3">
                  <div className="text-xs text-neutral-400 leading-normal">
                    Submit claims according to specific criteria to prevent review rejections:
                  </div>
                  <div className="grid grid-cols-1 gap-2">
                    {filingInstructions.map((instr, idx) => (
                      <a
                        key={idx}
                        href={instr.url}
                        target="_blank"
                        rel="noreferrer"
                        className="flex justify-between items-center p-2.5 bg-neutral-950/60 hover:bg-neutral-950 rounded-lg border border-neutral-850 hover:border-orange-500/30 transition-all text-xs font-mono group"
                      >
                        <span className="text-neutral-300 group-hover:text-orange-400 transition-colors">{instr.title}</span>
                        <Badge variant="outline" className="text-[9px] border-neutral-800">{instr.type}</Badge>
                      </a>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Center & Right Column: Letter & Contract Generator Workspace (2/3 wide) */}
            <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
              {/* Dynamic Input Control Panel */}
              <Card className="border-neutral-800 bg-neutral-900/60 backdrop-blur-md md:col-span-5">
                <CardHeader className="pb-3 border-b border-neutral-800">
                  <CardTitle className="text-sm font-semibold uppercase tracking-wider text-neutral-300 flex items-center">
                    <Sparkles className="w-4 h-4 mr-2 text-orange-500" />
                    Generator Inputs
                  </CardTitle>
                  <CardDescription className="text-xs">Customize letters/agreements dynamically.</CardDescription>
                </CardHeader>
                <CardContent className="p-4 space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase font-semibold text-neutral-500">Document Type</label>
                    <div className="grid grid-cols-3 gap-1 bg-neutral-950 p-1 rounded-md border border-neutral-850">
                      <button
                        onClick={() => setRecipientType("individual")}
                        className={`py-1 text-[10px] uppercase rounded font-mono ${recipientType === "individual" ? "bg-orange-600 text-white font-bold" : "text-neutral-400 hover:text-neutral-200"}`}
                      >
                        <User className="w-3 h-3 inline mr-1" /> Individual
                      </button>
                      <button
                        onClick={() => setRecipientType("business")}
                        className={`py-1 text-[10px] uppercase rounded font-mono ${recipientType === "business" ? "bg-orange-600 text-white font-bold" : "text-neutral-400 hover:text-neutral-200"}`}
                      >
                        <Building className="w-3 h-3 inline mr-1" /> Business
                      </button>
                      <button
                        onClick={() => setRecipientType("contract")}
                        className={`py-1 text-[10px] uppercase rounded font-mono ${recipientType === "contract" ? "bg-orange-600 text-white font-bold" : "text-neutral-400 hover:text-neutral-200"}`}
                      >
                        <FileSignature className="w-3 h-3 inline mr-1" /> Contract
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase font-semibold text-neutral-500">Owner Name</label>
                    <Input
                      value={ownerName}
                      onChange={(e) => setOwnerName(e.target.value.toUpperCase())}
                      className="bg-neutral-950 border-neutral-800 text-xs font-mono"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase font-semibold text-neutral-500">Amount ($)</label>
                    <Input
                      type="number"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="bg-neutral-950 border-neutral-800 text-xs font-mono text-emerald-400"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase font-semibold text-neutral-500">Property ID Tag</label>
                    <Input
                      value={propertyId}
                      onChange={(e) => setPropertyId(e.target.value)}
                      className="bg-neutral-950 border-neutral-800 text-xs font-mono text-orange-400"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase font-semibold text-neutral-500">Property Classification</label>
                    <Input
                      value={propertyType}
                      onChange={(e) => setPropertyType(e.target.value.toUpperCase())}
                      className="bg-neutral-950 border-neutral-800 text-xs font-mono"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase font-semibold text-neutral-500">Holder Company</label>
                    <Input
                      value={holderName}
                      onChange={(e) => setHolderName(e.target.value.toUpperCase())}
                      className="bg-neutral-950 border-neutral-800 text-xs font-mono"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase font-semibold text-neutral-500">Finder Fee (%)</label>
                    <Input
                      type="number"
                      max={10}
                      value={finderFee}
                      onChange={(e) => setFinderFee(e.target.value)}
                      className="bg-neutral-950 border-neutral-800 text-xs font-mono text-orange-400"
                    />
                    <span className="text-[9px] text-neutral-500 leading-normal block">
                      * Note: CA standard fee is max 10% on unclaimed properties.
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase font-semibold text-neutral-500">Agent Firm Name</label>
                    <Input
                      value={agentName}
                      onChange={(e) => setAgentName(e.target.value)}
                      className="bg-neutral-950 border-neutral-800 text-xs font-mono"
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Letter Rich Text Preview Panel */}
              <Card className="border-neutral-800 bg-neutral-900/60 backdrop-blur-md md:col-span-7 h-full flex flex-col">
                <CardHeader className="pb-3 border-b border-neutral-800 flex flex-row justify-between items-center">
                  <div>
                    <CardTitle className="text-sm font-semibold uppercase tracking-wider text-neutral-300 flex items-center">
                      <Mail className="w-4 h-4 mr-2 text-orange-500" />
                      Document Draft Preview
                    </CardTitle>
                    <CardDescription className="text-xs">Copy ready-to-dispatch outreach text.</CardDescription>
                  </div>
                  <Button
                    size="sm"
                    onClick={handleCopy}
                    className="bg-orange-600 hover:bg-orange-700 text-white font-semibold transition-colors"
                  >
                    {copied ? <Check className="w-4 h-4 mr-1" /> : <Copy className="w-4 h-4 mr-1" />}
                    {copied ? "Copied" : "Copy"}
                  </Button>
                </CardHeader>
                <CardContent className="p-4 flex-grow">
                  <textarea
                    readOnly
                    value={getActiveLetterText()}
                    className="w-full h-[480px] bg-neutral-950 border border-neutral-850 p-4 rounded-lg font-mono text-[11px] text-neutral-300 focus:outline-none resize-none leading-relaxed"
                  />
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="rules" className="space-y-6">
          {/* The Unbreakable Law Section */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="border-red-900/30 bg-red-950/5 backdrop-blur-md">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs uppercase font-bold tracking-wider text-red-400 flex items-center gap-1.5">
                  <Scale className="w-4 h-4 text-red-500" />
                  The 10% Fee Cap
                </CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-neutral-300 leading-relaxed space-y-1.5">
                <p>Under California Code of Civil Procedure Section 1582, any contract made with a living owner to locate, deliver, or recover unclaimed property is strictly capped at <strong>10%</strong> of the asset's total value.</p>
                <p className="text-[10px] text-neutral-500 leading-normal">
                  The 10% Cap applies to all values: Even if the asset is worth $500,000 or $5,000,000, if the owner is alive, an investigator cannot charge more than 10%.
                </p>
              </CardContent>
            </Card>

            <Card className="border-neutral-800 bg-neutral-900/60 backdrop-blur-md">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs uppercase font-bold tracking-wider text-neutral-300 flex items-center gap-1.5">
                  <ShieldAlert className="w-4 h-4 text-amber-500" />
                  The "No Pre-Escheat" Rule
                </CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-neutral-300 leading-relaxed space-y-1.5">
                <p>You cannot legally enter into a contract with the owner while the money is still sitting with the original bank or corporation (the "pre-escheat" phase).</p>
                <p className="text-[10px] text-neutral-500 leading-normal">
                  The asset must already be fully transferred and sitting with the California State Controller's Office (SCO).
                </p>
              </CardContent>
            </Card>

            <Card className="border-orange-950/30 bg-orange-950/5 backdrop-blur-md">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs uppercase font-bold tracking-wider text-orange-400 flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-orange-500" />
                  Void Contracts
                </CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-neutral-300 leading-relaxed space-y-1.5">
                <p>If a contract specifies a 15%, 20%, or 30% recovery fee for a living person, the State Controller's Office will flag it as a violation of Section 1582.</p>
                <p className="text-[10px] text-red-400 font-semibold leading-normal">
                  The SCO will refuse to process the claim entirely.
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Three Legal Pathways */}
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wider text-neutral-300">
                The Three Available Options
              </h3>
              <p className="text-xs text-neutral-500 mt-1">
                If you have discovered a $208K+ asset belonging to a living person and want to structure a deal to recover it, you have three legal pathways:
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Option 1 */}
              <Card className="border-neutral-855 bg-neutral-900/40">
                <CardHeader className="pb-3 border-b border-neutral-850 bg-neutral-950/40">
                  <Badge className="mb-1 text-[9px] bg-neutral-850 text-neutral-300 hover:bg-neutral-800 border-neutral-800">Option 1</Badge>
                  <CardTitle className="text-sm font-semibold text-neutral-200">Standard Investigator</CardTitle>
                  <CardDescription className="text-xs text-neutral-500 font-mono text-orange-400">The 10% Max Route</CardDescription>
                </CardHeader>
                <CardContent className="p-4 space-y-3.5 text-xs text-neutral-300">
                  <div>
                    <span className="block font-semibold uppercase text-[9px] text-neutral-500">How it works:</span>
                    <span>You register as a licensed investigator with the state, reveal the asset details, and have the living owner sign a standard contract. Disclose property details, value, and location before they sign.</span>
                  </div>
                  <div>
                    <span className="block font-semibold uppercase text-[9px] text-neutral-500">The Payout:</span>
                    <span className="text-emerald-400 font-bold font-mono">For a $208,000 claim, your maximum legal fee is $20,800.</span>
                  </div>
                  <div className="p-2.5 rounded bg-red-950/10 border border-red-950/20 space-y-1">
                    <span className="block font-semibold uppercase text-[9px] text-red-400 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" /> The Risk
                    </span>
                    <span className="text-[11px] leading-relaxed text-neutral-400 block">
                      Under Section 1582, the owner can bypass you at any time. If they bypass you and mail a claim directly to the state, the SCO will cut the check directly to the owner. You would have to sue the owner in civil court to collect.
                    </span>
                  </div>
                </CardContent>
              </Card>

              {/* Option 2 */}
              <Card className="border-neutral-855 bg-neutral-900/40">
                <CardHeader className="pb-3 border-b border-neutral-850 bg-neutral-950/40">
                  <Badge className="mb-1 text-[9px] bg-neutral-855 text-neutral-300 hover:bg-neutral-800 border-neutral-800">Option 2</Badge>
                  <CardTitle className="text-sm font-semibold text-neutral-200">Retain Legal Counsel</CardTitle>
                  <CardDescription className="text-xs text-neutral-500 font-mono text-orange-400">The Contingency Route</CardDescription>
                </CardHeader>
                <CardContent className="p-4 space-y-3.5 text-xs text-neutral-300">
                  <div>
                    <span className="block font-semibold uppercase text-[9px] text-neutral-500">How it works:</span>
                    <span>While investigators are capped at 10%, attorneys performing legal services (managing documentation, validating identification, or contesting blocks) operate under standard legal retainer frameworks.</span>
                  </div>
                  <div>
                    <span className="block font-semibold uppercase text-[9px] text-neutral-500">The Payout:</span>
                    <span className="text-emerald-400 font-bold font-mono">The attorney can structure a representation agreement with justified contingency percentages or hourly legal fees.</span>
                  </div>
                  <div>
                    <span className="block font-semibold uppercase text-[9px] text-neutral-500">The Setup:</span>
                    <span>You act as the consultant or "finder" who brought the case to the law firm, splitting or receiving a referral payout in accordance with California State Bar rules.</span>
                  </div>
                </CardContent>
              </Card>

              {/* Option 3 */}
              <Card className="border-neutral-855 bg-neutral-900/40">
                <CardHeader className="pb-3 border-b border-neutral-850 bg-neutral-950/40">
                  <Badge className="mb-1 text-[9px] bg-neutral-855 text-neutral-300 hover:bg-neutral-800 border-neutral-800">Option 3</Badge>
                  <CardTitle className="text-sm font-semibold text-neutral-200">Buy the Asset Directly</CardTitle>
                  <CardDescription className="text-xs text-neutral-500 font-mono text-orange-400">The Assignment/Purchase Route</CardDescription>
                </CardHeader>
                <CardContent className="p-4 space-y-3.5 text-xs text-neutral-300">
                  <div>
                    <span className="block font-semibold uppercase text-[9px] text-neutral-500">How it works:</span>
                    <span>Instead of contracting to recover for a fee, you purchase the rights to the underlying asset directly from the living owner (e.g. paying $130,000 cash upfront for a $208,000 asset) via notarized assignment of rights.</span>
                  </div>
                  <div>
                    <span className="block font-semibold uppercase text-[9px] text-neutral-500">The Payout:</span>
                    <span className="text-emerald-400 font-bold font-mono">Once processed, you become the rightful owner of the asset and collect the full $208,000+ from the State Controller.</span>
                  </div>
                  <div className="p-2.5 rounded bg-amber-950/10 border border-amber-950/20 space-y-1">
                    <span className="block font-semibold uppercase text-[9px] text-amber-400 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" /> The Risk
                    </span>
                    <span className="text-[11px] leading-relaxed text-neutral-400 block">
                      SCO heavily scrutinizes assignments of ownership to prevent fraud. The documentation must be airtight, the owner must fully consent to the discount, and you require significant upfront capital.
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Comparison Table */}
          <Card className="border-neutral-800 bg-neutral-900/60 overflow-hidden">
            <CardHeader className="pb-3 border-b border-neutral-855">
              <CardTitle className="text-sm font-semibold uppercase tracking-wider text-neutral-300">
                Strategic Comparison
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left text-neutral-300">
                  <thead className="text-[10px] uppercase font-mono tracking-wider bg-neutral-950 border-b border-neutral-855 text-neutral-400">
                    <tr>
                      <th className="px-4 py-3 font-semibold">Route</th>
                      <th className="px-4 py-3 font-semibold text-center">Max Fee Allowed</th>
                      <th className="px-4 py-3 font-semibold">Main Advantage</th>
                      <th className="px-4 py-3 font-semibold">Critical Warning</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-855">
                    <tr className="hover:bg-neutral-900/20">
                      <td className="px-4 py-3.5 font-bold text-neutral-200">Option 1: Investigator</td>
                      <td className="px-4 py-3.5 text-center text-red-400 font-semibold font-mono">Strictly 10% ($20.8K on $208K)</td>
                      <td className="px-4 py-3.5 leading-relaxed text-neutral-300">Cleanest, state-approved pathway.</td>
                      <td className="px-4 py-3.5 leading-relaxed text-amber-400 font-semibold">Owner can easily circumvent you mid-claim.</td>
                    </tr>
                    <tr className="hover:bg-neutral-900/20">
                      <td className="px-4 py-3.5 font-bold text-neutral-200">Option 2: Legal Counsel</td>
                      <td className="px-4 py-3.5 text-center text-emerald-400 font-semibold font-mono">Varies by legal fee agreement</td>
                      <td className="px-4 py-3.5 leading-relaxed text-neutral-300">High compliance; allows for complex asset recovery hurdles.</td>
                      <td className="px-4 py-3.5 leading-relaxed text-amber-400 font-semibold">Requires a licensed California attorney to front the representation.</td>
                    </tr>
                    <tr className="hover:bg-neutral-900/20">
                      <td className="px-4 py-3.5 font-bold text-neutral-200">Option 3: Purchase/Assignment</td>
                      <td className="px-4 py-3.5 text-center text-emerald-400 font-semibold font-mono">Unlimited (Based on purchase discount)</td>
                      <td className="px-4 py-3.5 leading-relaxed text-emerald-400 font-semibold">High profit margins; you control the final check.</td>
                      <td className="px-4 py-3.5 leading-relaxed text-amber-400 font-semibold">High capital required upfront to buy out the owner.</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Decision Guide / Action block */}
          <Card className="border-orange-500/20 bg-orange-950/5">
            <CardContent className="p-5 flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="space-y-1 text-center md:text-left">
                <h4 className="text-sm font-semibold text-neutral-200 flex items-center gap-1.5 justify-center md:justify-start">
                  <Sparkles className="w-4 h-4 text-orange-500" />
                  Filing Strategy Assistant
                </h4>
                <p className="text-xs text-neutral-400 leading-relaxed">
                  Are you trying to figure out how to pull the public data for this living person from the State Controller's database, or do you need a copy of the official California Investigator Handbook to look over the standard contract templates?
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-2 shrink-0 w-full sm:w-auto">
                <Button 
                  onClick={() => {
                    if (onSwitchTab) onSwitchTab("search");
                  }}
                  className="bg-neutral-950 border border-neutral-800 hover:border-orange-500/30 hover:bg-neutral-900 text-xs font-mono font-medium text-neutral-300"
                >
                  Pull Public Data <ArrowRight className="w-3 h-3 ml-1.5" />
                </Button>
                <Button 
                  onClick={() => {
                    window.open("https://www.sco.ca.gov/Files-UPD/guide_investigator_handbook.pdf", "_blank");
                  }}
                  className="bg-orange-600 hover:bg-orange-700 text-white text-xs font-mono font-medium"
                >
                  <Download className="w-3 h-3 mr-1.5" /> Get Investigator Handbook
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
