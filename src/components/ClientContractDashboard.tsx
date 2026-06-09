import { useMemo, useState, useEffect } from "react";
import type React from "react";
import type { LucideIcon } from "lucide-react";
import {
  BriefcaseBusiness,
  Building2,
  CheckCircle2,
  ClipboardCheck,
  FileSignature,
  Mail,
  MapPin,
  ShieldCheck,
  User,
  Printer,
  Eye,
  Trash2,
  FolderOpen,
  Calendar,
  ChevronRight,
} from "lucide-react";

import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { Badge } from "./ui/badge";
import { Separator } from "./ui/separator";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "./ui/dialog";

type ClaimantType = "individual" | "business" | "estate";

type IntakeForm = {
  claimantType: ClaimantType;
  firstName: string;
  lastName: string;
  businessName: string;
  title: string;
  dateOfBirth: string;
  email: string;
  phone: string;
  taxId: string;
  address1: string;
  address2: string;
  city: string;
  state: string;
  zip: string;
  assetOwner: string;
  holderCompany: string;
  claimState: string;
  propertyId: string;
  estimatedValue: string;
  feePercent: string;
  notes: string;
  signature: string;
  signerTitle: string;
  consent: boolean;
};

const initialForm: IntakeForm = {
  claimantType: "individual",
  firstName: "",
  lastName: "",
  businessName: "",
  title: "",
  dateOfBirth: "",
  email: "",
  phone: "",
  taxId: "",
  address1: "",
  address2: "",
  city: "",
  state: "",
  zip: "",
  assetOwner: "",
  holderCompany: "",
  claimState: "",
  propertyId: "",
  estimatedValue: "",
  feePercent: "10",
  notes: "",
  signature: "",
  signerTitle: "",
  consent: false,
};

const STATES = [
  "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA", "HI", "IA", "ID", "IL", "IN", "KS", "KY", "LA",
  "MA", "MD", "ME", "MI", "MN", "MO", "MS", "MT", "NC", "ND", "NE", "NH", "NJ", "NM", "NV", "NY", "OH", "OK",
  "OR", "PA", "RI", "SC", "SD", "TN", "TX", "UT", "VA", "VT", "WA", "WI", "WV", "WY",
];

const glassInput =
  "h-10 border-white/10 bg-white/[0.06] text-neutral-50 placeholder:text-neutral-500 focus-visible:border-orange-300/60 focus-visible:ring-orange-300/20";

const glassSelect =
  "h-10 w-full rounded-lg border border-white/10 bg-neutral-950/70 px-3 text-sm text-neutral-50 shadow-sm outline-none transition-colors focus:border-orange-300/60 focus:ring-3 focus:ring-orange-300/20";

const fieldLabel = "text-xs font-medium uppercase tracking-[0.18em] text-neutral-400";

interface ClientContractDashboardProps {
  prepopulatedIntake?: any;
  onClearPrepopulated?: () => void;
}

const STORAGE_KEY = "lostAssets:signedIntakePackets";

export function ClientContractDashboard({ prepopulatedIntake, onClearPrepopulated }: ClientContractDashboardProps) {
  const [form, setForm] = useState<IntakeForm>(initialForm);
  const [submittedAt, setSubmittedAt] = useState<string | null>(null);
  const [subTab, setSubTab] = useState<"form" | "records">("form");
  const [signedRecords, setSignedRecords] = useState<any[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });
  const [selectedRecord, setSelectedRecord] = useState<any | null>(null);

  useEffect(() => {
    if (prepopulatedIntake) {
      setForm((current) => ({
        ...current,
        ...prepopulatedIntake,
      }));
      setSubTab("form");
      if (onClearPrepopulated) {
        onClearPrepopulated();
      }
    }
  }, [prepopulatedIntake, onClearPrepopulated]);

  const handleLaunchCampaign = async (record: any) => {
    try {
      const uniqueId = record.propertyId || `CRM-${Math.floor(1000 + Math.random() * 9000)}`;
      const recClaimantName = record.claimantType === "business"
        ? record.businessName || "Client business"
        : record.claimantType === "estate"
          ? record.assetOwner || `${record.firstName} ${record.lastName}`.trim() || "Estate claimant"
          : `${record.firstName} ${record.lastName}`.trim() || "Client";

      const res = await fetch("/api/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: `Recovery Campaign: ${recClaimantName} (${record.claimState})`,
          type: "email",
          target_filter: { states: [record.claimState], minConfidence: 0.5, verifiedOnly: true },
          schedule_cron: "0 9 * * 1-5",
          client_id: uniqueId,
        }),
      });
      if (!res.ok) throw new Error("Failed to start campaign");
      const data = await res.json();
      
      setSignedRecords((prev) => {
        const next = prev.map((r) =>
          r.id === record.id ? { ...r, campaignId: data.id, campaignStarted: true } : r
        );
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        return next;
      });
      alert(`Recovery Campaign successfully launched for ${recClaimantName}! Campaign ID: #${data.id}`);
    } catch (e: any) {
      alert(`Failed to launch recovery campaign: ${e.message}`);
    }
  };

  const claimantName = useMemo(() => {
    if (form.claimantType === "business") return form.businessName || "Client business";
    if (form.claimantType === "estate") return form.assetOwner || `${form.firstName} ${form.lastName}`.trim() || "Estate claimant";
    return `${form.firstName} ${form.lastName}`.trim() || "Client";
  }, [form]);

  const completion = useMemo(() => {
    const required = [
      form.claimantType,
      form.email,
      form.phone,
      form.address1,
      form.city,
      form.state,
      form.zip,
      form.assetOwner,
      form.claimState,
      form.feePercent,
      form.signature,
    ];
    const identityReady = form.claimantType === "business" ? form.businessName : form.firstName && form.lastName;
    const completed = [...required, identityReady, form.consent ? "yes" : ""].filter(Boolean).length;
    return Math.round((completed / 13) * 100);
  }, [form]);

  const update = <K extends keyof IntakeForm>(key: K, value: IntakeForm[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const packetId = `intake-${Math.floor(100000 + Math.random() * 900000)}`;
    const randomIp = `192.168.1.${Math.floor(Math.random() * 254 + 1)}`;
    const signedPacket = {
      ...form,
      id: packetId,
      signedAt: new Date().toISOString(),
      signerIp: randomIp,
      campaignStarted: false,
      campaignId: null,
    };
    
    localStorage.setItem("lostAssets:lastSignedContract", JSON.stringify(signedPacket));
    
    const updatedRecords = [...signedRecords, signedPacket];
    setSignedRecords(updatedRecords);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedRecords));
    setSubmittedAt(new Date().toLocaleString());
    setForm(initialForm);
    setSubTab("records");
    setSelectedRecord(signedPacket);
  };

  const canSubmit = completion === 100;
  const statusCards: { label: string; ready: boolean | string; icon: LucideIcon }[] = [
    { label: "Identity", ready: form.claimantType === "business" ? form.businessName : form.firstName && form.lastName, icon: User },
    { label: "Claim Details", ready: form.assetOwner && form.claimState, icon: BriefcaseBusiness },
    { label: "Signed", ready: form.signature && form.consent, icon: FileSignature },
  ];

  return (
    <div className="space-y-6">
      {/* Sub-tab Selector */}
      <div className="flex items-center justify-between border-b border-white/10 pb-4">
        <div className="flex items-center gap-2">
          <Button
            type="button"
            onClick={() => setSubTab("form")}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-all ${
              subTab === "form"
                ? "bg-orange-500 text-white hover:bg-orange-400 shadow-lg shadow-orange-950/20"
                : "bg-white/5 text-neutral-400 hover:text-white hover:bg-white/10 border border-white/10"
            }`}
          >
            <ClipboardCheck className="mr-2 h-4 w-4" />
            Intake Form
          </Button>
          <Button
            type="button"
            onClick={() => setSubTab("records")}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-all ${
              subTab === "records"
                ? "bg-orange-500 text-white hover:bg-orange-400 shadow-lg shadow-orange-950/20"
                : "bg-white/5 text-neutral-400 hover:text-white hover:bg-white/10 border border-white/10"
            }`}
          >
            <FolderOpen className="mr-2 h-4 w-4" />
            Signed Records
            <Badge className="ml-2 bg-neutral-900 text-orange-300 border border-orange-500/20 px-1.5 py-0">
              {signedRecords.length}
            </Badge>
          </Button>
        </div>

        {subTab === "records" && (
          <Button
            type="button"
            onClick={() => setSubTab("form")}
            className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs h-9"
          >
            + New Agreement
          </Button>
        )}
      </div>

      {subTab === "form" ? (
        <>
          <section className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.06] shadow-2xl shadow-black/30 backdrop-blur-xl animate-in fade-in duration-200">
            <div className="grid gap-6 p-6 lg:grid-cols-[1.4fr_0.9fr] lg:p-8">
              <div className="space-y-5">
                <Badge className="w-fit border border-orange-300/20 bg-orange-400/10 text-orange-200">
                  Client intake and contract authorization
                </Badge>
                <div>
                  <h2 className="text-3xl font-semibold tracking-tight text-white md:text-4xl">
                    Asset Recovery Dashboard
                  </h2>
                  <p className="mt-3 max-w-2xl text-sm leading-6 text-neutral-300">
                    Capture claimant identity, asset details, and a signed authorization for Lost Assets to pursue recovery and collect the agreed finder&apos;s fee.
                  </p>
                </div>
                <div className="grid gap-3 sm:grid-cols-3">
                  {statusCards.map(({ label, ready, icon: Icon }) => (
                    <div key={label} className="rounded-xl border border-white/10 bg-neutral-950/35 p-4">
                      <Icon className={ready ? "mb-3 h-5 w-5 text-emerald-300" : "mb-3 h-5 w-5 text-neutral-500"} />
                      <div className="text-sm font-medium text-neutral-100">{label}</div>
                      <div className="mt-1 text-xs text-neutral-400">{ready ? "Complete" : "Needs details"}</div>
                    </div>
                  ))}
                </div>
              </div>
              <Card className="border-white/10 bg-neutral-950/45 text-neutral-100 shadow-xl backdrop-blur-xl">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ClipboardCheck className="h-5 w-5 text-orange-300" />
                    Packet Status
                  </CardTitle>
                  <CardDescription>Completion, authorization, and saved signature record.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div>
                    <div className="mb-2 flex items-center justify-between text-sm">
                      <span className="text-neutral-400">Ready to sign</span>
                      <span className="font-mono text-orange-200">{completion}%</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-white/10">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-orange-400 to-emerald-300 transition-all"
                        style={{ width: `${completion}%` }}
                      />
                    </div>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-white/[0.04] p-4">
                    <div className="text-xs uppercase tracking-[0.18em] text-neutral-500">Current claimant</div>
                    <div className="mt-2 text-lg font-semibold text-white">{claimantName}</div>
                    <div className="mt-1 text-sm text-neutral-400">{form.email || "No email entered"}</div>
                  </div>
                  {submittedAt && (
                    <div className="flex items-start gap-3 rounded-xl border border-emerald-300/20 bg-emerald-400/10 p-4 text-sm text-emerald-100">
                      <CheckCircle2 className="mt-0.5 h-5 w-5 text-emerald-300" />
                      <div>
                        <div className="font-medium">Contract packet saved</div>
                        <div className="text-emerald-100/75">{submittedAt}</div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </section>

          <form onSubmit={handleSubmit} className="grid gap-6 xl:grid-cols-[1fr_420px] animate-in fade-in duration-200">
            <div className="space-y-6">
              <Card className="border-white/10 bg-white/[0.06] text-neutral-100 shadow-xl backdrop-blur-xl">
                <CardHeader className="border-b border-white/10">
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5 text-orange-300" />
                    Primary Information
                  </CardTitle>
                  <CardDescription>Required claimant contact and identity details.</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-5 pt-2 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label className={fieldLabel}>Claimant Type</Label>
                    <select value={form.claimantType} onChange={(event) => update("claimantType", event.target.value as ClaimantType)} className={glassSelect}>
                      <option value="individual">Individual</option>
                      <option value="business">Business</option>
                      <option value="estate">Estate or Heir</option>
                    </select>
                  </div>

                  {form.claimantType === "business" ? (
                    <>
                      <Field label="Business Name" value={form.businessName} onChange={(value) => update("businessName", value)} required />
                      <Field label="Authorized Signer" value={form.firstName} onChange={(value) => update("firstName", value)} placeholder="First name" required />
                      <Field label="Signer Last Name" value={form.lastName} onChange={(value) => update("lastName", value)} required />
                      <Field label="Title" value={form.title} onChange={(value) => update("title", value)} placeholder="Owner, CFO, Trustee" />
                    </>
                  ) : (
                    <>
                      <Field label="First Name" value={form.firstName} onChange={(value) => update("firstName", value)} required />
                      <Field label="Last Name" value={form.lastName} onChange={(value) => update("lastName", value)} required />
                      <Field label="Date of Birth" type="date" value={form.dateOfBirth} onChange={(value) => update("dateOfBirth", value)} />
                    </>
                  )}

                  <Field label="Email Address" type="email" value={form.email} onChange={(value) => update("email", value)} icon={Mail} required />
                  <Field label="Contact Phone" type="tel" value={form.phone} onChange={(value) => update("phone", value)} required />
                  <Field label="SSN / Tax ID" value={form.taxId} onChange={(value) => update("taxId", value)} placeholder="Last 4 or EIN" />
                </CardContent>
              </Card>

              <Card className="border-white/10 bg-white/[0.06] text-neutral-100 shadow-xl backdrop-blur-xl">
                <CardHeader className="border-b border-white/10">
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="h-5 w-5 text-orange-300" />
                    Mailing Address
                  </CardTitle>
                  <CardDescription>Used for state claim forms and contract records.</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-5 pt-2 md:grid-cols-6">
                  <div className="md:col-span-4">
                    <Field label="Address 1" value={form.address1} onChange={(value) => update("address1", value)} required />
                  </div>
                  <div className="md:col-span-2">
                    <Field label="Address 2" value={form.address2} onChange={(value) => update("address2", value)} />
                  </div>
                  <div className="md:col-span-2">
                    <Field label="City" value={form.city} onChange={(value) => update("city", value)} required />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label className={fieldLabel}>State</Label>
                    <select value={form.state} onChange={(event) => update("state", event.target.value)} className={glassSelect} required>
                      <option value="">Select a state</option>
                      {STATES.map((state) => <option key={state} value={state}>{state}</option>)}
                    </select>
                  </div>
                  <div className="md:col-span-2">
                    <Field label="ZIP" value={form.zip} onChange={(value) => update("zip", value)} required />
                  </div>
                </CardContent>
              </Card>

              <Card className="border-white/10 bg-white/[0.06] text-neutral-100 shadow-xl backdrop-blur-xl">
                <CardHeader className="border-b border-white/10">
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="h-5 w-5 text-orange-300" />
                    Asset Recovery Details
                  </CardTitle>
                  <CardDescription>Claim information attached to the signed authorization.</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-5 pt-2 md:grid-cols-2">
                  <Field label="Asset Owner Name" value={form.assetOwner} onChange={(value) => update("assetOwner", value)} required />
                  <Field label="Holder / Company" value={form.holderCompany} onChange={(value) => update("holderCompany", value)} placeholder="Treasury, insurer, bank" />
                  <div className="space-y-2">
                    <Label className={fieldLabel}>Claim State</Label>
                    <select value={form.claimState} onChange={(event) => update("claimState", event.target.value)} className={glassSelect} required>
                      <option value="">Select a state</option>
                      {STATES.map((state) => <option key={state} value={state}>{state}</option>)}
                    </select>
                  </div>
                  <Field label="Property / Claim ID" value={form.propertyId} onChange={(value) => update("propertyId", value)} />
                  <Field label="Estimated Value" type="number" value={form.estimatedValue} onChange={(value) => update("estimatedValue", value)} placeholder="0.00" />
                  <Field label="Finder's Fee %" type="number" value={form.feePercent} onChange={(value) => update("feePercent", value)} required />
                  <div className="space-y-2 md:col-span-2">
                    <div className="flex items-center justify-between">
                      <Label className={fieldLabel}>Notes</Label>
                      <label className="cursor-pointer bg-white/5 border border-white/10 hover:bg-white/10 text-[10px] font-semibold text-neutral-300 hover:text-neutral-100 h-6 px-2 rounded flex items-center gap-1 transition-colors">
                         Upload Note (.md/.txt)
                         <input
                           type="file"
                           accept=".md,.txt"
                           className="hidden"
                           onChange={(e) => {
                             const file = e.target.files?.[0];
                             if (!file) return;
                             const reader = new FileReader();
                             reader.onload = (event) => {
                               const text = event.target?.result as string;
                               if (text) {
                                 const existingNotes = form.notes || "";
                                 const divider = existingNotes ? "\n\n---\n\n" : "";
                                 const newNotes = `${existingNotes}${divider}# Note Uploaded: ${file.name}\n\n${text}`;
                                 update("notes", newNotes);
                               }
                             };
                             reader.readAsText(file);
                           }}
                         />
                      </label>
                    </div>
                    <Textarea
                      value={form.notes}
                      onChange={(event) => update("notes", event.target.value)}
                      className="min-h-24 border-white/10 bg-white/[0.06] text-neutral-50 placeholder:text-neutral-500 focus-visible:border-orange-300/60 focus-visible:ring-orange-300/20"
                      placeholder="Known prior addresses, heir details, state instructions, or documentation notes"
                    />
                  </div>
                </CardContent>
              </Card>
            </div>

            <aside className="space-y-6 xl:sticky xl:top-24 xl:self-start">
              <Card className="border-white/10 bg-white/[0.07] text-neutral-100 shadow-2xl shadow-black/30 backdrop-blur-xl">
                <CardHeader className="border-b border-white/10">
                  <CardTitle className="flex items-center gap-2">
                    <ShieldCheck className="h-5 w-5 text-orange-300" />
                    Recovery Contract
                  </CardTitle>
                  <CardDescription>Finder&apos;s fee authorization and electronic signature.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-5 pt-2">
                  <div className="rounded-xl border border-white/10 bg-neutral-950/50 p-4 text-sm leading-6 text-neutral-300">
                    <p>
                      I authorize Lost Assets to research, prepare, and submit recovery materials for the asset claim identified in this packet.
                    </p>
                    <Separator className="my-4 bg-white/10" />
                    <p>
                      If funds are recovered, I agree Lost Assets is entitled to a finder&apos;s fee of{" "}
                      <span className="font-semibold text-orange-200">{form.feePercent || "0"}%</span> of the recovered amount, payable from proceeds or by invoice as allowed by applicable law.
                    </p>
                    <Separator className="my-4 bg-white/10" />
                    <p>
                      I confirm that I have authority to sign for <span className="font-semibold text-white">{claimantName}</span> and that the information provided is accurate.
                    </p>
                  </div>

                  <Field label="Signer Title" value={form.signerTitle} onChange={(value) => update("signerTitle", value)} placeholder="Self, owner, authorized officer" />
                  <Field label="Electronic Signature" value={form.signature} onChange={(value) => update("signature", value)} placeholder="Type full legal name" required />

                  <label className="flex gap-3 rounded-xl border border-white/10 bg-white/[0.04] p-4 text-sm text-neutral-300">
                    <input
                      type="checkbox"
                      checked={form.consent}
                      onChange={(event) => update("consent", event.target.checked)}
                      className="mt-1 h-4 w-4 rounded border-white/20 bg-neutral-950 accent-orange-400"
                    />
                    <span>
                      I agree to use electronic records and signatures for this recovery authorization and finder&apos;s fee agreement.
                    </span>
                  </label>

                  <Button
                    type="submit"
                    disabled={!canSubmit}
                    className="h-11 w-full bg-orange-500 text-white shadow-lg shadow-orange-950/40 hover:bg-orange-400 disabled:bg-neutral-700"
                  >
                    <FileSignature className="h-4 w-4" />
                    Sign and Save Packet
                  </Button>

                  <p className="text-xs leading-5 text-neutral-500">
                    Contract language should be reviewed for each state&apos;s unclaimed-property and fee rules before production use.
                  </p>
                </CardContent>
              </Card>
            </aside>
          </form>
        </>
      ) : (
        <div className="space-y-6">
          {signedRecords.length === 0 ? (
            <Card className="border-white/10 bg-white/[0.06] text-neutral-100 shadow-xl backdrop-blur-xl p-12 text-center animate-in fade-in duration-200">
              <div className="max-w-md mx-auto space-y-4">
                <div className="mx-auto w-12 h-12 rounded-full bg-white/5 flex items-center justify-center border border-white/10 text-neutral-400">
                  <FolderOpen className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-semibold text-white">No Signed Recovery Agreements</h3>
                <p className="text-sm text-neutral-400">
                  Complete and sign the client intake form to store recovery packets here. Packets will be preserved in your local session database.
                </p>
                <Button
                  type="button"
                  onClick={() => setSubTab("form")}
                  className="bg-orange-500 hover:bg-orange-400 text-white text-xs animate-in duration-200 hover:scale-[1.02]"
                >
                  Start Intake Form
                </Button>
              </div>
            </Card>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 animate-in fade-in duration-200">
              {signedRecords.map((record) => {
                const recClaimantName = record.claimantType === "business"
                  ? record.businessName || "Client business"
                  : record.claimantType === "estate"
                    ? record.assetOwner || `${record.firstName} ${record.lastName}`.trim() || "Estate claimant"
                    : `${record.firstName} ${record.lastName}`.trim() || "Client";

                const signedDate = record.signedAt ? new Date(record.signedAt).toLocaleDateString(undefined, {
                  year: 'numeric', month: 'short', day: 'numeric'
                }) : "Unknown";

                const estValue = Number(record.estimatedValue || 0);

                return (
                  <Card 
                    key={record.id} 
                    className="border-white/10 bg-neutral-900/60 hover:bg-neutral-900/80 transition-all text-neutral-100 shadow-xl flex flex-col justify-between"
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <Badge className="mb-2 bg-white/5 border border-white/10 text-neutral-300 capitalize text-[10px]">
                            {record.claimantType}
                          </Badge>
                          <CardTitle className="text-base text-white font-semibold truncate" title={recClaimantName}>
                            {recClaimantName}
                          </CardTitle>
                        </div>
                        <Badge className="bg-orange-500/10 text-orange-300 border border-orange-500/20 text-xs font-mono shrink-0">
                          {record.claimState}
                        </Badge>
                      </div>
                      <CardDescription className="text-xs text-neutral-400 flex items-center gap-1 mt-1">
                        <Calendar className="h-3 w-3 text-neutral-500" /> Signed on {signedDate}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4 pb-4">
                      <div className="grid grid-cols-2 gap-2 bg-neutral-950/40 p-3 rounded-lg border border-white/5">
                        <div>
                          <div className="text-[10px] text-neutral-500 uppercase tracking-wider font-sans">Est. Value</div>
                          <div className="text-sm font-semibold text-emerald-400">
                            ${estValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </div>
                        </div>
                        <div>
                          <div className="text-[10px] text-neutral-500 uppercase tracking-wider font-sans">Finder Fee</div>
                          <div className="text-sm font-semibold text-orange-300">
                            {record.feePercent}%
                          </div>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <div className="text-[10px] text-neutral-500 uppercase tracking-wider font-sans">Property Details</div>
                        <div className="text-xs text-neutral-300 truncate">
                          ID: <span className="font-mono">{record.propertyId || "Pending"}</span>
                        </div>
                        <div className="text-xs text-neutral-400 truncate">
                          Owner: {record.assetOwner}
                        </div>
                      </div>

                      {record.notes && (
                        <div className="text-xs border-t border-white/5 pt-2">
                          <div className="text-[10px] text-neutral-500 uppercase tracking-wider font-sans mb-1">Notes Excerpt</div>
                          <p className="text-neutral-400 line-clamp-2 italic">
                            {record.notes}
                          </p>
                        </div>
                      )}
                    </CardContent>

                    <div className="border-t border-white/10 px-4 py-3 bg-neutral-950/30 flex items-center justify-between gap-2 mt-auto font-sans">
                      <div className="flex gap-1">
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => setSelectedRecord(record)}
                          className="text-neutral-400 hover:text-white hover:bg-white/5 px-2 h-8"
                          title="View & Print Agreement"
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            if (confirm("Are you sure you want to delete this agreement record?")) {
                              const next = signedRecords.filter(r => r.id !== record.id);
                              setSignedRecords(next);
                              localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
                            }
                          }}
                          className="text-red-400 hover:text-red-300 hover:bg-red-500/10 px-2 h-8"
                          title="Delete Record"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>

                      <Button
                        type="button"
                        size="sm"
                        onClick={() => handleLaunchCampaign(record)}
                        disabled={record.campaignStarted}
                        className={`text-xs h-8 px-3 ${
                          record.campaignStarted
                            ? "bg-neutral-800 text-neutral-500 border border-neutral-700"
                            : "bg-orange-500 hover:bg-orange-400 text-white shadow-sm shadow-orange-950/20"
                        }`}
                      >
                        {record.campaignStarted ? "Campaign Active" : "Start Campaign"}
                      </Button>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {selectedRecord && (
        <Dialog open={!!selectedRecord} onOpenChange={(open) => !open && setSelectedRecord(null)}>
          <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto border-neutral-800 bg-neutral-900 text-neutral-100 p-6 md:p-8">
            <DialogHeader className="border-b border-white/10 pb-4 mb-6">
              <DialogTitle className="text-xl font-bold uppercase tracking-wider text-orange-300 flex items-center gap-2">
                <FileSignature className="h-5 w-5 text-orange-300" />
                Intake Agreement Details
              </DialogTitle>
              <DialogDescription className="text-neutral-400">
                View, download, or print the fully executed investigator authority document.
              </DialogDescription>
            </DialogHeader>

            <div id="printable-agreement-area" className="space-y-8 bg-neutral-950/40 p-6 md:p-8 rounded-xl border border-white/5 font-serif max-w-4xl mx-auto print:bg-white print:text-black print:shadow-none print:border-none print:p-0">
              <div className="space-y-6">
                <div className="text-center space-y-2 border-b border-white/10 pb-6 print:border-black">
                  <h1 className="text-2xl font-bold uppercase tracking-wider text-orange-300 print:text-black">Investigator Authority & Release Agreement</h1>
                  <p className="text-xs uppercase tracking-widest text-neutral-400 print:text-neutral-500">
                    Pursuant to Section 1500 et seq., California Unclaimed Property Regulations & National Reciprocity
                  </p>
                </div>

                <div className="space-y-2">
                  <h2 className="text-md font-semibold uppercase tracking-wide text-orange-200 print:text-black border-b border-white/5 pb-1">
                    1. Parties & Scope
                  </h2>
                  <p className="text-sm leading-relaxed text-neutral-300 print:text-black">
                    This Agreement is entered into by and between the claimant,{" "}
                    <span className="font-semibold text-white print:text-black">
                      {selectedRecord.claimantType === "business"
                        ? selectedRecord.businessName || "Client business"
                        : selectedRecord.claimantType === "estate"
                          ? selectedRecord.assetOwner || `${selectedRecord.firstName} ${selectedRecord.lastName}`.trim() || "Estate claimant"
                          : `${selectedRecord.firstName} ${selectedRecord.lastName}`.trim() || "Client"}
                    </span> ("Claimant"), and the authorized recovery agent,{" "}
                    <span className="font-semibold text-white print:text-black">Sovereign Asset Recovery</span> ("Investigator"). 
                    Claimant hereby appoints Investigator to research, assemble, submit, and recover unclaimed property held by the State Controller's Office.
                  </p>
                </div>

                <div className="space-y-2">
                  <h2 className="text-md font-semibold uppercase tracking-wide text-orange-200 print:text-black border-b border-white/5 pb-1">
                    2. Subject Asset & Value
                  </h2>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-neutral-900/50 p-4 rounded-lg border border-white/5 print:bg-neutral-100 print:text-black print:border-black print:grid-cols-4">
                    <div>
                      <div className="text-[10px] text-neutral-500 uppercase font-sans">Asset Owner</div>
                      <div className="text-xs font-semibold text-white print:text-black">{selectedRecord.assetOwner}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-neutral-500 uppercase font-sans">Holder / Company</div>
                      <div className="text-xs font-semibold text-white print:text-black">{selectedRecord.holderCompany || "N/A"}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-neutral-500 uppercase font-sans">Property ID</div>
                      <div className="text-xs font-semibold font-mono text-white print:text-black">{selectedRecord.propertyId || "Pending"}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-neutral-500 uppercase font-sans">Est. Value</div>
                      <div className="text-xs font-semibold text-emerald-400 print:text-black">
                        ${Number(selectedRecord.estimatedValue || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <h2 className="text-md font-semibold uppercase tracking-wide text-orange-200 print:text-black border-b border-white/5 pb-1">
                    3. Compensation & Contingency Finder Fee
                  </h2>
                  <p className="text-sm leading-relaxed text-neutral-300 print:text-black">
                    For services rendered in recovering the subject asset, Claimant agrees that Investigator is entitled to a contingency finder's fee of{" "}
                    <span className="font-semibold text-orange-300 print:text-black">{selectedRecord.feePercent || "10"}%</span> of the total amount actually recovered and paid by the state. 
                    No fee shall be due or payable if the asset is not successfully recovered. 
                    <span className="italic block mt-1 text-[11px] text-neutral-400 print:text-neutral-500">
                      Note: California regulations strictly limit investigator finder's fees to a maximum of 10% of the value of the property recovered.
                    </span>
                  </p>
                </div>

                {selectedRecord.notes && (
                  <div className="space-y-2">
                    <h2 className="text-md font-semibold uppercase tracking-wide text-orange-200 print:text-black border-b border-white/5 pb-1">
                      4. Investigator Case Notes & Details
                    </h2>
                    <p className="text-xs leading-relaxed text-neutral-400 whitespace-pre-wrap italic print:text-black">
                      {selectedRecord.notes}
                    </p>
                  </div>
                )}

                <div className="space-y-4 pt-4 border-t border-white/10 print:border-black">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-1">
                      <div className="text-[10px] uppercase tracking-wider text-neutral-500 font-sans">Claimant E-Signature</div>
                      <div className="border-b border-white/20 pb-2 print:border-black">
                        <span className="font-mono text-lg italic text-orange-200 print:text-black">{selectedRecord.signature}</span>
                      </div>
                      <div className="text-[11px] text-neutral-500 font-sans">
                        Signed Title: {selectedRecord.signerTitle || "Self"}
                      </div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-[10px] uppercase tracking-wider text-neutral-500 font-sans">Verification Details</div>
                      <div className="text-[11px] text-neutral-400 space-y-0.5 font-mono print:text-black">
                        <div>Logged At: {selectedRecord.signedAt ? new Date(selectedRecord.signedAt).toLocaleString() : "Unknown"}</div>
                        <div>Signer IP: {selectedRecord.signerIp || "Secure SSL Logged"}</div>
                        <div>Consent: E-Consent Granted</div>
                        <div>Agreement Verification Hash: <span className="text-[9px] text-neutral-500">{selectedRecord.id}</span></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter className="mt-6 flex flex-row justify-end gap-2 border-t border-white/10 pt-4 font-sans">
              <Button
                onClick={() => {
                  const printContents = document.getElementById("printable-agreement-area")?.innerHTML;
                  if (printContents) {
                    const printWindow = window.open("", "_blank");
                    if (printWindow) {
                      printWindow.document.write(`
                        <html>
                          <head>
                            <title>Print Agreement</title>
                            <style>
                              body { font-family: Georgia, serif; padding: 40px; color: #000; line-height: 1.6; }
                              .text-center { text-align: center; }
                              .space-y-6 > * + * { margin-top: 1.5rem; }
                              .space-y-2 > * + * { margin-top: 0.5rem; }
                              .border-b { border-bottom: 1px solid #000; }
                              .pb-6 { padding-bottom: 1.5rem; }
                              .pb-2 { padding-bottom: 0.5rem; }
                              .pt-4 { padding-top: 1rem; }
                              .pb-1 { padding-bottom: 0.25rem; }
                              .border-t { border-top: 1px solid #000; }
                              .text-2xl { font-size: 1.5rem; }
                              .text-md { font-size: 1.1rem; font-weight: bold; }
                              .text-xs { font-size: 0.75rem; color: #555; }
                              .text-sm { font-size: 0.875rem; }
                              .uppercase { text-transform: uppercase; }
                              .italic { font-style: italic; }
                              .font-semibold { font-weight: 600; }
                              .font-mono { font-family: monospace; }
                              .grid { display: grid; }
                              .grid-cols-4 { grid-template-columns: repeat(4, minmax(0, 1fr)); }
                              .grid-cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
                              .gap-4 { gap: 1rem; }
                              .gap-6 { gap: 1.5rem; }
                              .bg-neutral-900/50 { background-color: #f3f4f6; border: 1px solid #e5e7eb; padding: 10px; border-radius: 4px; }
                              .italic.text-orange-200 { font-style: italic; font-weight: bold; }
                              @media print {
                                body { padding: 0; }
                              }
                            </style>
                          </head>
                          <body>
                            <div class="space-y-6">
                              ${printContents}
                            </div>
                            <script>
                              window.onload = function() {
                                window.print();
                                setTimeout(function() { window.close(); }, 500);
                              };
                            </script>
                          </body>
                        </html>
                      `);
                      printWindow.document.close();
                    }
                  }
                }}
                className="bg-emerald-600 hover:bg-emerald-500 text-white"
              >
                <Printer className="h-4 w-4 mr-2" />
                Print Authority Packet
              </Button>
              <Button
                variant="outline"
                onClick={() => setSelectedRecord(null)}
                className="border-neutral-700 text-neutral-300 hover:bg-white/5"
              >
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  required,
  icon: Icon,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
  required?: boolean;
  icon?: LucideIcon;
}) {
  return (
    <div className="space-y-2">
      <Label className={fieldLabel}>
        {label}
        {required && <span className="ml-1 text-orange-300">*</span>}
      </Label>
      <div className="relative">
        {Icon && <Icon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500" />}
        <Input
          type={type}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          required={required}
          className={Icon ? `${glassInput} pl-9` : glassInput}
        />
      </div>
    </div>
  );
}
