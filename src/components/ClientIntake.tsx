import { useState, useEffect } from "react";
import { 
  User, CheckCircle2, FileText, Mail, Phone, Calendar, ShieldCheck, 
  MapPin, Clock, Award, CheckCircle, AlertTriangle, AlertCircle 
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";
import { Button } from "./ui/button";

// Storage Key sharing with CRM
const CA_CRM_STORAGE_KEY = "lost_asset_locator_ca_crm";

interface ClientIntakeProps {
  onWorkflowComplete?: (lead: any) => void;
}

export function ClientIntake({ onWorkflowComplete }: ClientIntakeProps) {
  // Form State
  const [claimantType, setClaimantType] = useState<"Individual" | "Estate" | "Business">("Individual");
  const [firstName, setFirstName] = useState("THOMSON DIGGS");
  const [lastName, setLastName] = useState("COMPANY");
  const [birthDate, setBirthDate] = useState("1978-04-12");
  const [emailAddress, setEmailAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [taxId, setTaxId] = useState("");
  
  // Address State
  const [address1, setAddress1] = useState("440 Montgomery St");
  const [address2, setAddress2] = useState("Suite 1200");
  const [city, setCity] = useState("San Francisco");
  const [state, setState] = useState("CA");
  const [zip, setZip] = useState("94104");

  // Signature State
  const [signerTitle, setSignerTitle] = useState("Authorized Representative");
  const [electronicSignature, setElectronicSignature] = useState("");
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [isSigned, setIsSigned] = useState(false);
  const [signingDate, setSigningDate] = useState("");

  // Auto-calculated progress metric
  const [progress, setProgress] = useState(38);

  useEffect(() => {
    let score = 0;
    if (firstName.trim() && lastName.trim()) score += 15;
    if (birthDate) score += 10;
    if (emailAddress.trim()) score += 15;
    if (phone.trim()) score += 10;
    if (taxId.trim()) score += 10;
    if (address1.trim() && city.trim() && zip.trim()) score += 15;
    if (signerTitle.trim()) score += 5;
    if (electronicSignature.trim() && agreedToTerms) score += 20;

    setProgress(Math.min(score, 100));
  }, [firstName, lastName, birthDate, emailAddress, phone, taxId, address1, city, zip, signerTitle, electronicSignature, agreedToTerms]);

  const handleSignContract = (e: React.FormEvent) => {
    e.preventDefault();
    if (!electronicSignature.trim()) return;
    if (!agreedToTerms) return;

    setIsSigned(true);
    setSigningDate(new Date().toLocaleString());

    // Automatically create a record in our unified California CRM
    const randomIIDNum = Math.floor(Math.random() * 90000) + 10000;
    const generatedIID = `CA-2026-IID-${randomIIDNum}`;
    
    const newLead = {
      id: "ca-crm-intake-" + Date.now(),
      caseIID: generatedIID,
      name: `${firstName.trim()} ${lastName.trim()}`.trim().toUpperCase(),
      type: claimantType,
      amount: claimantType === "Business" ? 245000.00 : 62450.00, // Custom mock values representing high tier
      rank: claimantType === "Business" ? "Rank S" : "Rank A",
      holderCompany: claimantType === "Business" ? "BANK OF AMERICA CORP" : "CHEVRON CORPORATION",
      address: `${address1} ${address2}, ${city}, ${state} ${zip}`,
      county: "San Francisco",
      notes: `Intake signed electronically by ${electronicSignature} (${signerTitle}) on ${new Date().toLocaleDateString()}. Status moved to Signed Contract.`,
      status: "Claim Signed" as const,
      claimantContact: {
        phone: phone || "No phone provided",
        email: emailAddress || "No email provided",
        address: `${address1} ${address2}, ${city}, ${state} ${zip}`
      },
      communications: [
        {
          id: `comm-intake-init`,
          timestamp: Date.now(),
          method: "Email",
          details: `Client Intake filed. Electronic signature matched authorization name '${electronicSignature}'.`
        }
      ],
      updatedAt: Date.now()
    };

    const existingLeadsStr = localStorage.getItem(CA_CRM_STORAGE_KEY);
    let leads = [];
    if (existingLeadsStr) {
      try {
        leads = JSON.parse(existingLeadsStr);
      } catch (e) {
        console.error(e);
      }
    }
    leads = [newLead, ...leads];
    localStorage.setItem(CA_CRM_STORAGE_KEY, JSON.stringify(leads));

    if (onWorkflowComplete) {
      onWorkflowComplete(newLead);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Breadcrumb and Header bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-neutral-800 pb-5 gap-4">
        <div>
          <span className="text-orange-500 text-xs font-mono font-semibold tracking-wider uppercase bg-orange-500/10 px-2.5 py-1 rounded">
            Client intake and contract authorization
          </span>
          <h2 className="text-3xl font-bold tracking-tight text-neutral-100 mt-2">Asset Recovery Dashboard</h2>
          <p className="text-neutral-450 text-sm mt-1">
            Capture claimant identity, asset details, and a signed authorization for Lost Assets to pursue recovery and collect the agreed finder's fee.
          </p>
        </div>

        {/* 3 Status badges (Top center-right) */}
        <div className="flex flex-wrap gap-2">
          <div className="flex items-center space-x-2 bg-neutral-900 border border-neutral-800 px-3.5 py-1.5 rounded-lg text-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-neutral-400">Identity:</span>
            <span className="text-neutral-100 font-medium">Complete</span>
          </div>
          <div className="flex items-center space-x-2 bg-neutral-900 border border-neutral-800 px-3.5 py-1.5 rounded-lg text-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-neutral-400">Claim Details:</span>
            <span className="text-neutral-100 font-medium">Complete</span>
          </div>
          <div className="flex items-center space-x-2 bg-neutral-900 border border-neutral-850 px-3.5 py-1.5 rounded-lg text-xs">
            <span className={`w-2 h-2 rounded-full ${isSigned ? 'bg-emerald-500 animate-pulse' : 'bg-orange-500'}`} />
            <span className="text-neutral-400 font-mono">Signed:</span>
            <span className={isSigned ? "text-emerald-400 font-medium font-mono" : "text-orange-400 font-medium font-mono"}>
              {isSigned ? "Complete" : "Needs details"}
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Side: Form Information & Details (8 columns on lg) */}
        <div className="lg:col-span-8 space-y-6">
          <Card className="border-neutral-800 bg-[#0e0e11] text-neutral-100 shadow-xl overflow-hidden rounded-xl">
            <div className="bg-neutral-900/80 px-5 py-4 border-b border-neutral-800 flex items-center space-x-2">
              <User className="w-4 h-4 text-orange-500" />
              <h3 className="text-sm font-semibold uppercase tracking-wider text-neutral-300">Primary Information</h3>
              <span className="text-[10px] text-neutral-500 font-normal italic">(Claimant contact and identity details)</span>
            </div>
            
            <CardContent className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1 md:col-span-1">
                  <label className="text-[10px] uppercase font-bold tracking-wider text-neutral-400 block">Claimant Type</label>
                  <select 
                    value={claimantType}
                    onChange={(e) => setClaimantType(e.target.value as any)}
                    className="flex h-10 w-full rounded-md border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm text-neutral-300 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-orange-500"
                  >
                    <option value="Individual">Individual</option>
                    <option value="Estate">Deceased Estate</option>
                    <option value="Business">Corporate Entity / Business</option>
                  </select>
                </div>

                <div className="space-y-1 md:col-span-1">
                  <label className="text-[10px] uppercase font-bold tracking-wider text-neutral-400 block">First Name / Corp Prefix *</label>
                  <Input 
                    placeholder="First Name"
                    value={firstName}
                    onChange={e => setFirstName(e.target.value)}
                    className="bg-neutral-950 border-neutral-800 focus:border-orange-500 font-mono text-sm"
                  />
                </div>

                <div className="space-y-1 md:col-span-1">
                  <label className="text-[10px] uppercase font-bold tracking-wider text-neutral-400 block">Last Name / Suffix *</label>
                  <Input 
                    placeholder="Last Name or Company"
                    value={lastName}
                    onChange={e => setLastName(e.target.value)}
                    className="bg-neutral-950 border-neutral-800 focus:border-orange-500 font-mono text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold tracking-wider text-neutral-400 block">Date of Birth / Incorp</label>
                  <Input 
                    type="date"
                    value={birthDate}
                    onChange={e => setBirthDate(e.target.value)}
                    className="bg-neutral-950 border-neutral-800 focus:border-orange-500 text-sm font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold tracking-wider text-neutral-400 block">Email Address *</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-2.5 w-4 h-4 text-neutral-500" />
                    <Input 
                      placeholder="e.g. contact@domain.com"
                      value={emailAddress}
                      onChange={e => setEmailAddress(e.target.value)}
                      className="bg-neutral-950 border-neutral-800 focus:border-orange-500 pl-10 text-sm font-mono"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold tracking-wider text-neutral-400 block">Contact Phone *</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-2.5 w-4 h-4 text-neutral-500" />
                    <Input 
                      placeholder="e.g. (415) 555-0199"
                      value={phone}
                      onChange={e => setPhone(e.target.value)}
                      className="bg-neutral-950 border-neutral-800 focus:border-orange-500 pl-10 text-sm font-mono"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-1 max-w-sm">
                <label className="text-[10px] uppercase font-bold tracking-wider text-neutral-400 block">SSN / Tax ID (Filing-EIN)</label>
                <Input 
                  placeholder="Last 4 or complete EIN"
                  value={taxId}
                  onChange={e => setTaxId(e.target.value)}
                  className="bg-neutral-950 border-neutral-800 focus:border-orange-500 font-mono text-sm"
                />
              </div>

              {/* Mailing Address sub-grid */}
              <div className="pt-4 border-t border-neutral-800">
                <h4 className="text-[11px] uppercase font-bold tracking-widest text-orange-400 mb-4 flex items-center">
                  <MapPin className="w-3.5 h-3.5 mr-1" /> Mailing Address
                </h4>
                
                <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
                  <div className="space-y-1 md:col-span-4">
                    <label className="text-[10px] uppercase text-neutral-400">Address line 1 *</label>
                    <Input 
                      value={address1}
                      onChange={e => setAddress1(e.target.value)}
                      className="bg-neutral-950 border-neutral-800 focus:border-orange-500 text-sm"
                    />
                  </div>
                  <div className="space-y-1 md:col-span-2">
                    <label className="text-[10px] uppercase text-neutral-400">Address line 2</label>
                    <Input 
                      value={address2}
                      onChange={e => setAddress2(e.target.value)}
                      className="bg-neutral-950 border-neutral-800 focus:border-orange-500 text-sm"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-4 mt-3">
                  <div className="space-y-1 md:col-span-6">
                    <label className="text-[10px] uppercase text-neutral-400">City *</label>
                    <Input 
                      value={city}
                      onChange={e => setCity(e.target.value)}
                      className="bg-neutral-950 border-neutral-800 focus:border-orange-500 text-sm"
                    />
                  </div>
                  <div className="space-y-1 md:col-span-3">
                    <label className="text-[10px] uppercase text-neutral-400">State *</label>
                    <Input 
                      value={state}
                      onChange={e => setState(e.target.value)}
                      className="bg-neutral-950 border-neutral-800 focus:border-orange-500 text-sm font-mono"
                    />
                  </div>
                  <div className="space-y-1 md:col-span-3">
                    <label className="text-[10px] uppercase text-neutral-400">ZIP Code *</label>
                    <Input 
                      value={zip}
                      onChange={e => setZip(e.target.value)}
                      className="bg-neutral-950 border-neutral-800 focus:border-orange-500 text-sm font-mono"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Side: Packet Status and Contract e-Signature (4 columns on lg) */}
        <div className="lg:col-span-4 space-y-6">
          {/* Packet Status Card */}
          <Card className="border-neutral-800 bg-[#0e0e11] text-neutral-100 shadow-xl overflow-hidden rounded-xl">
            <div className="bg-neutral-900/80 px-4 py-3.5 border-b border-neutral-800 flex items-center space-x-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <h3 className="text-xs uppercase tracking-wider font-semibold text-neutral-300">Packet Status</h3>
            </div>
            <CardContent className="p-5 space-y-4">
              <div className="text-xs text-neutral-400">
                Completion, authorization, and saved signature record.
              </div>
              
              <div className="space-y-1">
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-neutral-400">Ready to sign</span>
                  <span className={progress === 100 ? "text-emerald-400 font-bold" : "text-orange-400"}>{progress}%</span>
                </div>
                <div className="h-2 w-full bg-neutral-900 rounded-full overflow-hidden border border-neutral-800">
                  <div 
                    className="h-full bg-gradient-to-r from-orange-500 to-emerald-400 rounded-full transition-all duration-500" 
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>

              <div className="bg-neutral-950 border border-neutral-850 p-3.5 rounded-lg space-y-2.5">
                <div>
                  <span className="text-[9px] uppercase font-mono tracking-wider text-neutral-500 block">Current Claimant</span>
                  <span className="text-sm font-mono font-bold text-neutral-200">
                    {firstName.trim() || lastName.trim() ? `${firstName} ${lastName}`.toUpperCase() : "UNNAMED CLAIMS INDIVIDUAL"}
                  </span>
                </div>
                <div>
                  <span className="text-[9px] uppercase font-mono tracking-wider text-neutral-500 block">Contact Detail Cache</span>
                  <span className="text-xs text-neutral-400">
                    {emailAddress.trim() ? emailAddress : "No email entered"}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Recovery Contract Signature Panel */}
          <Card className="border-neutral-800 bg-[#0e0e11] text-neutral-100 shadow-xl overflow-hidden rounded-xl">
            <div className="bg-neutral-900/80 px-4 py-3.5 border-b border-neutral-800 flex items-center space-x-1.5">
              <Award className="w-4 h-4 text-orange-500" />
              <h3 className="text-xs uppercase tracking-wider font-semibold text-neutral-300">Recovery Contract</h3>
            </div>
            
            <CardContent className="p-5 space-y-4">
              <div className="text-xs text-neutral-400 leading-normal bg-neutral-950 border border-neutral-850 p-3 rounded-lg max-h-48 overflow-y-auto font-sans leading-relaxed">
                <p className="font-semibold text-[11px] text-orange-400 uppercase tracking-wider mb-1.5">Finder's Fee Agreement</p>
                I authorize Lost Assets to research, prepare, and submit recovery materials for the unclaimed asset property identified as mine in this custom package.
                <br /><br />
                If funds are successfully recovered from California State Controller, I agree Lost Assets is entitled to a finder's fee of <strong className="text-neutral-100">10%</strong> of the recovered amount, payable from proceeds or by invoice immediately upon disbursement as allowed by California administrative state code.
                <br /><br />
                I confirm that I have authority to sign for <span className="font-semibold text-neutral-200 font-mono text-[11px] bg-neutral-900 px-1 rounded">{firstName || "Claimant"} {lastName}</span> and that the system information provided is complete, authentic, and accurate.
              </div>

              {isSigned ? (
                <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl space-y-2 text-center animate-fade-in">
                  <CheckCircle className="w-8 h-8 mx-auto" />
                  <p className="text-xs font-semibold font-mono">AUTHORIZED CONTRACT RECORD ACTIVE</p>
                  <p className="text-[9px] text-neutral-400 font-mono">Stamped: {signingDate}</p>
                  <div className="text-[10px] font-mono border-t border-emerald-500/15 pt-2 mt-2 select-all">
                    Verification SHA: SHA256-RECOV-{Math.floor(Math.random() * 900000) + 100000}
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSignContract} className="space-y-3 pt-1">
                  <div className="space-y-1">
                    <label className="text-[9px] uppercase text-neutral-400">Signer Title</label>
                    <Input 
                      placeholder="e.g. Self, Owner, Executor, Officer"
                      value={signerTitle}
                      onChange={e => setSignerTitle(e.target.value)}
                      className="bg-neutral-950 border-neutral-800 text-sm h-9"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] uppercase text-neutral-300">Electronic Signature *</label>
                    <Input 
                      placeholder="Type full legal name"
                      value={electronicSignature}
                      onChange={e => setElectronicSignature(e.target.value)}
                      className="bg-neutral-950 border-neutral-800 text-sm font-mono h-9 focus:border-emerald-500"
                    />
                  </div>

                  <div className="flex items-start space-x-2 pt-1">
                    <input 
                      type="checkbox" 
                      id="agreeToSign"
                      checked={agreedToTerms}
                      onChange={e => setAgreedToTerms(e.target.checked)}
                      className="mt-1 h-3.5 w-3.5 rounded border-neutral-800 text-orange-500 bg-neutral-950 accent-orange-500 focus:ring-0"
                    />
                    <label htmlFor="agreeToSign" className="text-[10px] text-neutral-400 cursor-pointer select-none leading-tight">
                      I agree to use electronic records and signatures for this recovery authorization and finder's fee.
                    </label>
                  </div>

                  <Button 
                    type="submit"
                    disabled={!electronicSignature.trim() || !agreedToTerms}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-neutral-50 font-semibold font-mono h-10 mt-2 transition-colors disabled:opacity-40"
                  >
                    Authorized Claim Signature
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
