import { useState } from "react";
import { 
  Clock, Calendar, PlusCircle, Copy, Check, Printer, FileText, Globe, 
  Scale, Users, Mail, Phone, Info, HelpCircle, ArrowRight, ShieldCheck, 
  Landmark, ListFilter, AlertCircle, ChevronRight, MessageSquare, Briefcase
} from "lucide-react";
import { DialogContent, DialogHeader, DialogTitle, DialogDescription } from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Badge } from "./ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { STATE_RULES, StateRule } from "../services/stateRulesService";
import { SavedCase } from "../types";

interface LeadHistoryModalProps {
  savedCase: SavedCase;
  onUpdateCase: (updatedCase: SavedCase) => void;
}

export function LeadHistoryModal({ savedCase, onUpdateCase }: LeadHistoryModalProps) {
  // States for timeline filter & search
  const [filterCategory, setFilterCategory] = useState<"all" | "milestone" | "outreach" | "note">("all");
  const [filterState, setFilterState] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  // States for new timeline event log form
  const [newDate, setNewDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split("T")[0]; // YYYY-MM-DD
  });
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newCategory, setNewCategory] = useState<"milestone" | "outreach" | "note">("milestone");
  const [newEventState, setNewEventState] = useState("");
  const [newChannel, setNewChannel] = useState("Email");

  const [copied, setCopied] = useState(false);
  const [formSuccess, setFormSuccess] = useState(false);

  // Derive unique states represented in the assets of this estate
  const statesInCase = Array.from(new Set(savedCase.assets.map(a => a.state.toUpperCase())));

  // Calculate sum of assets for each state
  const stateSummary = statesInCase.map(st => {
    const assets = savedCase.assets.filter(a => a.state.toUpperCase() === st);
    const total = assets.reduce((sum, a) => sum + a.amount, 0);
    return {
      state: st,
      claimsCount: assets.length,
      totalAmount: total,
      rule: STATE_RULES[st] || null
    };
  }).sort((a, b) => b.totalAmount - a.totalAmount);

  const grandTotal = savedCase.assets.reduce((sum, a) => sum + a.amount, 0);

  // Timeline events parsing (with defaults if empty)
  const defaultTimeline = [
    { 
      date: new Date(savedCase.createdAt).toLocaleDateString(), 
      stage: "Lead Initialized", 
      desc: "Estate consolidated lead index created in active-lead CRM with identified property files.",
      category: "milestone",
      state: statesInCase[0] || "CA"
    }
  ];

  const rawEvents = savedCase.timeline || [];
  const normalizedEvents = rawEvents.map((evt, idx) => ({
    date: evt.date,
    stage: evt.stage,
    desc: evt.desc,
    // Infer category and state if missing
    category: (evt as any).category || (
      evt.stage.toLowerCase().includes("manually") || evt.stage.toLowerCase().includes("status") ? "milestone" :
      evt.stage.toLowerCase().includes("outreach") || evt.stage.toLowerCase().includes("email") || evt.stage.toLowerCase().includes("letter") || evt.stage.toLowerCase().includes("call") ? "outreach" : "note"
    ),
    state: (evt as any).state || "Global"
  }));

  const allEvents = normalizedEvents.length > 0 ? normalizedEvents : defaultTimeline;

  // Filter events
  const filteredEvents = allEvents.filter(evt => {
    const matchesCategory = filterCategory === "all" || evt.category === filterCategory;
    const matchesState = filterState === "all" || evt.state === filterState || evt.state === "Global";
    const matchesSearch = !searchQuery || 
      evt.stage.toLowerCase().includes(searchQuery.toLowerCase()) || 
      evt.desc.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesState && matchesSearch;
  });

  // Handle adding new custom entry
  const handleAddEvent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newDesc.trim()) return;

    // Convert date YYYY-MM-DD to locale for storage consistency
    const dateFormatted = new Date(newDate + "T12:00:00").toLocaleDateString();

    const displayStage = newCategory === "outreach" 
      ? `[Outreach: ${newChannel}] ${newTitle.trim()}`
      : newTitle.trim();

    const newTimelineEntry = {
      date: dateFormatted,
      stage: displayStage,
      desc: newDesc.trim(),
      category: newCategory,
      state: newEventState || "Global"
    };

    const updatedCase = {
      ...savedCase,
      timeline: [
        ...(savedCase.timeline || []),
        newTimelineEntry
      ]
    };

    onUpdateCase(updatedCase);
    
    // Clear form inputs & show success
    setNewTitle("");
    setNewDesc("");
    setFormSuccess(true);
    setTimeout(() => setFormSuccess(false), 3000);
  };

  // Compile full text ledger for copying
  const handleCopyLedger = () => {
    let report = `CASE AUDIT LEDGER: ${savedCase.categoryName}\n`;
    report += `Reference ID: ${savedCase.id}\n`;
    report += `Recovery State: ${savedCase.status || "Lead"}\n`;
    report += `Timestamp: ${new Date().toLocaleString()}\n`;
    report += `Consolidated Value: $${grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}\n`;
    report += `Claims Distribution: \n`;
    stateSummary.forEach(st => {
      report += `  - ${st.state}: ${st.claimsCount} claim(s), Total: $${st.totalAmount.toLocaleString()}\n`;
    });
    report += `\n========================================================================\n`;
    report += `CHRONOLOGICAL TIME EVENT LOG & CORRESPONDENCE HISTORY\n`;
    report += `========================================================================\n`;
    
    allEvents.forEach((evt, idx) => {
      report += `\n[${idx + 1}] DATE: ${evt.date}\n`;
      report += `    EVENT type: ${evt.stage} (${evt.category.toUpperCase()})\n`;
      report += `    JURISDICTION: ${evt.state}\n`;
      report += `    DETAILS: ${evt.desc}\n`;
    });

    navigator.clipboard.writeText(report);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto bg-neutral-950 text-neutral-200 border border-neutral-850 p-0 shadow-2xl rounded-xl scrollbar-thin">
      {/* Brand Header Band */}
      <div className="bg-gradient-to-r from-orange-500/10 via-neutral-900 to-neutral-900 p-6 border-b border-neutral-850">
        <DialogHeader className="space-y-1">
          <div className="flex flex-wrap items-center gap-2 mb-1.5">
            <Badge variant="outline" className="border-orange-500/20 text-orange-400 bg-orange-500/5 font-mono text-[10px]">
              Active Case Vault
            </Badge>
            <Badge className="bg-emerald-500/10 hover:bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono text-[10px]">
              Estates Portal
            </Badge>
            {statesInCase.length > 1 && (
              <Badge className="bg-cyan-500/10 hover:bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 font-mono text-[10px] animate-pulse">
                Complex Multi-State Portfolio
              </Badge>
            )}
          </div>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <DialogTitle className="text-xl font-bold tracking-tight text-neutral-100 font-sans">
                {savedCase.categoryName} <span className="font-mono text-neutral-500 font-normal text-sm">#{savedCase.id.slice(0, 8)}</span>
              </DialogTitle>
              <DialogDescription className="text-neutral-400 text-xs mt-1 leading-relaxed">
                Comprehensive Chronological Timeline Ledger, Correspondence Logs, and Multi-State Probate Commission Rules Guide.
              </DialogDescription>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleCopyLedger}
                className="border-neutral-800 bg-neutral-950 text-xs font-mono h-8 hover:bg-neutral-900 text-neutral-300"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-450 mr-1.5" />
                    Copied to Clipboard
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 mr-1.5 text-orange-400" />
                    Clipboard Export (MD)
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogHeader>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-neutral-850">
        
        {/* LEFT COLUMN: Ledger History Feed + New Event Logging */}
        <div className="lg:col-span-7 p-6 space-y-6">
          
          {/* Header Actions: Filters & Search */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-400 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-orange-400" /> Chronological Activity Audit Trail
              </h3>
              <span className="text-[10px] font-mono text-neutral-550">{filteredEvents.length} ledger logs found</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
              {/* Query search Input */}
              <div className="sm:col-span-5">
                <Input
                  placeholder="Filter logs by keyword..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-8 bg-neutral-950 border-neutral-850 text-xs text-neutral-200"
                />
              </div>

              {/* State Filter dropdown */}
              <div className="sm:col-span-3">
                <select
                  value={filterState}
                  onChange={(e) => setFilterState(e.target.value)}
                  className="w-full h-8 rounded-md border border-neutral-850 bg-neutral-950 px-2 text-xs text-neutral-300"
                >
                  <option value="all">Any State</option>
                  <option value="Global">Global/Unassigned</option>
                  {statesInCase.map(st => (
                    <option key={st} value={st}>{st} Claims</option>
                  ))}
                </select>
              </div>

              {/* Category selector */}
              <div className="sm:col-span-4">
                <select
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value as any)}
                  className="w-full h-8 rounded-md border border-neutral-850 bg-neutral-950 px-2 text-xs text-neutral-300"
                >
                  <option value="all">All Event Types</option>
                  <option value="milestone">Milestones & Pipeline</option>
                  <option value="outreach">Correspondence Logs</option>
                  <option value="note">Internal Notes</option>
                </select>
              </div>
            </div>
          </div>

          {/* Timeline Feed Stream container */}
          <div className="border border-neutral-900 bg-neutral-950/40 rounded-xl p-4 max-h-[320px] overflow-y-auto scrollbar-thin space-y-4">
            {filteredEvents.length === 0 ? (
              <div className="text-center py-10 text-neutral-500 space-y-2">
                <ListFilter className="w-8 h-8 mx-auto text-neutral-700" />
                <p className="text-xs">No activity entries match chosen filter queries.</p>
                <button 
                  onClick={() => { setFilterCategory("all"); setFilterState("all"); setSearchQuery(""); }}
                  className="text-orange-400 text-[10px] uppercase font-mono hover:underline"
                >
                  Reset Active Filters
                </button>
              </div>
            ) : (
              <div className="relative pl-4 border-l border-neutral-850/60 ml-2 space-y-5 py-1">
                {filteredEvents.map((evt, idx) => {
                  // Determine look and feel based on category
                  const indicatorColors = {
                    milestone: "border-orange-500 bg-neutral-950 text-orange-400",
                    outreach: "border-emerald-500 bg-neutral-950 text-emerald-400",
                    note: "border-purple-500 bg-neutral-950 text-purple-400"
                  }[evt.category] || "border-neutral-500 bg-neutral-950 text-neutral-400";

                  const tagLabel = {
                    milestone: "Milestone",
                    outreach: "Correspondence",
                    note: "Internal Note"
                  }[evt.category] || "General";

                  return (
                    <div key={idx} className="relative group transition-all">
                      {/* Interactive bullet icon node */}
                      <span className={`absolute -left-6 top-1.5 w-3 h-3 rounded-full border-2 ${indicatorColors} flex items-center justify-center`} />

                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="text-[10px] font-bold text-neutral-250 font-mono">{evt.date}</span>
                          <span className="text-[9px] font-mono tracking-wider uppercase bg-neutral-900 border border-neutral-800/80 px-1.5 py-0.2 rounded-md font-bold text-neutral-400">
                            {tagLabel}
                          </span>
                          {evt.state && evt.state !== "Global" && (
                            <Badge variant="outline" className="h-4 text-[9px] font-mono border-neutral-850 text-orange-300 bg-orange-950/5">
                              {evt.state}
                            </Badge>
                          )}
                        </div>
                        <h4 className="text-[12px] font-bold text-neutral-200 mt-0.5 tracking-tight leading-snug">
                          {evt.stage}
                        </h4>
                        <p className="text-[11px] text-neutral-450 leading-relaxed font-sans font-normal whitespace-pre-wrap">
                          {evt.desc}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* New Event Form Logger Area */}
          <form onSubmit={handleAddEvent} className="border-t border-neutral-900 pt-5 space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-xs font-bold uppercase tracking-wider text-orange-400 flex items-center gap-1.5">
                <PlusCircle className="w-3.5 h-3.5 text-orange-400" /> Log Chronological Event / outreach entry
              </h3>
              {formSuccess && (
                <span className="text-[10px] font-mono text-emerald-400 font-bold bg-emerald-950/20 px-2 py-0.5 rounded border border-emerald-500/10">
                  ✔ Log Added Successfully
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3.5 text-xs text-neutral-300">
              
              {/* Title / Summary */}
              <div className="sm:col-span-7 space-y-1">
                <label className="text-[10px] uppercase font-mono tracking-widest text-neutral-500">Event Title / Milestone Name</label>
                <Input
                  required
                  placeholder="e.g. Certified Heir Packets Dispatched"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="h-8.5 text-xs text-neutral-200 bg-neutral-950 border-neutral-800 focus:border-orange-500 focus:ring-0"
                />
              </div>

              {/* Event Date selection */}
              <div className="sm:col-span-5 space-y-1">
                <label className="text-[10px] uppercase font-mono tracking-widest text-neutral-500">Capture Date / Log Date</label>
                <Input
                  required
                  type="date"
                  value={newDate}
                  onChange={(e) => setNewDate(e.target.value)}
                  className="h-8.5 text-xs text-neutral-200 bg-neutral-950 border-neutral-800 focus:border-orange-500 focus:ring-0"
                />
              </div>

              {/* Event Category Selector */}
              <div className="sm:col-span-4 space-y-1">
                <label className="text-[10px] uppercase font-mono tracking-widest text-neutral-500">Record Categorization</label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value as any)}
                  className="w-full h-8.5 rounded-md border border-neutral-800 bg-neutral-950 px-2 text-xs text-neutral-300"
                >
                  <option value="milestone">Process Milestone</option>
                  <option value="outreach">Correspondence Contact</option>
                  <option value="note">Internal Ledger Note</option>
                </select>
              </div>

              {/* State Binder Selector */}
              <div className="sm:col-span-4 space-y-1">
                <label className="text-[10px] uppercase font-mono tracking-widest text-neutral-500">Bind State Jurisdiction</label>
                <select
                  value={newEventState}
                  onChange={(e) => setNewEventState(e.target.value)}
                  className="w-full h-8.5 rounded-md border border-neutral-800 bg-neutral-950 px-2 text-xs text-neutral-400"
                >
                  <option value="">Global / Consolidated</option>
                  {statesInCase.map(st => (
                    <option key={st} value={st}>{st} Claims</option>
                  ))}
                </select>
              </div>

              {/* Correspondence Channel Selector */}
              <div className="sm:col-span-4 space-y-1">
                <label className="text-[10px] uppercase font-mono tracking-widest text-neutral-500">Outreach Channel Type</label>
                <select
                  disabled={newCategory !== "outreach"}
                  value={newChannel}
                  onChange={(e) => setNewChannel(e.target.value)}
                  className="w-full h-8.5 rounded-md border border-neutral-800 bg-neutral-950 px-2 text-xs text-neutral-400 disabled:opacity-40"
                >
                  <option value="Email">Email Dispatch</option>
                  <option value="Phone Call">Phone Call / Voice</option>
                  <option value="Certified Mail">Certified Mail Package</option>
                  <option value="Physical Letter">Standard USPS Letter</option>
                  <option value="State Portal">Official State Portal Ingest</option>
                  <option value="In-person">Face-to-face Client Meeting</option>
                </select>
              </div>

              {/* Detailed Description */}
              <div className="sm:col-span-12 space-y-1">
                <label className="text-[10px] uppercase font-mono tracking-widest text-neutral-500">Timeline event details / Correspondence note description</label>
                <textarea
                  required
                  placeholder="Record full message summary, claimant comments, executor validation notes, or state responses..."
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  rows={3}
                  className="w-full bg-neutral-950 border border-neutral-800 focus:border-orange-500 focus:ring-0 rounded-md font-sans text-xs text-neutral-200 p-2.5 leading-relaxed"
                />
              </div>
            </div>

            <div className="flex justify-end pt-1">
              <Button 
                type="submit"
                className="bg-orange-500 hover:bg-orange-600 text-black text-xs font-bold px-4 h-8.5 flex items-center gap-1.5"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                Commit Activity Log
              </Button>
            </div>
          </form>

        </div>

        {/* RIGHT COLUMN: Multi-State Estates Progress Matrix */}
        <div className="lg:col-span-5 p-6 space-y-6 bg-neutral-950/20">
          
          {/* Section title */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-400 flex items-center gap-1.5 border-b border-neutral-900 pb-2">
              <Landmark className="w-3.5 h-3.5 text-orange-400" /> Multi-State Estates Portfolio Matrix
            </h3>
            <p className="text-[10px] text-neutral-500 mt-1 leading-relaxed">
              Consolidated wealth coordinates representing multiple jurisdictions. Ensure compliance with state-specific regulations.
            </p>
          </div>

          {/* Capital value distribution list */}
          <div className="space-y-3">
            <span className="text-[10px] uppercase tracking-wider font-mono text-neutral-500 font-bold block">
              Claims Distribution & Weightings
            </span>

            <div className="space-y-2 max-h-44 overflow-y-auto pr-1">
              {stateSummary.map((st, i) => {
                const percentage = grandTotal > 0 ? (st.totalAmount / grandTotal) * 100 : 0;
                return (
                  <div key={i} className="bg-neutral-950/60 p-3 rounded-lg border border-neutral-900 flex flex-col space-y-2">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-1.5">
                        <Badge className="bg-orange-500/15 hover:bg-orange-500/15 border border-orange-500/30 text-orange-400 font-mono text-xs px-2 py-0.5 rounded">
                          {st.state} Registry
                        </Badge>
                        <span className="text-[10px] text-neutral-500">{st.claimsCount} Claim{st.claimsCount > 1 ? "s" : ""}</span>
                      </div>
                      <div className="text-right font-mono text-xs">
                        <span className="text-emerald-400 font-bold font-mono">${st.totalAmount.toLocaleString()}</span>
                        <span className="text-neutral-500 text-[10px] ml-1.5">({percentage.toFixed(0)}%)</span>
                      </div>
                    </div>
                    {/* Visual Bar Indicator */}
                    <div className="w-full bg-neutral-900 h-1.5 rounded-full overflow-hidden">
                      <div 
                        className="bg-orange-500 h-full rounded-full transition-all duration-500" 
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
            {/* Aggregate footer summary */}
            <div className="pt-2 border-t border-neutral-900 flex justify-between items-center text-xs font-mono">
              <span className="text-neutral-550 font-bold">CONSOLIDATED ESTATE TOTAL:</span>
              <span className="text-emerald-400 font-extrabold text-sm font-mono">${grandTotal.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
            </div>
          </div>

          {/* Multi-State Regulation & Deadlines Checklist */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase tracking-wider font-mono text-neutral-500 font-bold flex items-center gap-1">
                <Scale className="w-3.5 h-3.5 text-neutral-500" /> State Rules & Filing Ceilings
              </span>
              <Badge variant="outline" className="text-[9px] border-neutral-800 text-neutral-400 font-mono">
                Regulations sync
              </Badge>
            </div>

            <div className="space-y-3.5 max-h-56 overflow-y-auto pr-1">
              {stateSummary.map((st, i) => {
                if (!st.rule) {
                  return (
                    <div key={i} className="p-3 bg-[#0c0c0e] rounded-lg border border-neutral-900 text-[11px] font-sans leading-relaxed text-neutral-400">
                      <div className="flex items-center gap-1 text-orange-400 font-bold mb-1 font-mono text-[10px]">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                        NO CONFIG FOR {st.state}
                      </div>
                      Apply general multi-state probate policies. Notarized claimant affidavits and death certificates will be requested. Max commission averages 10%.
                    </div>
                  );
                }

                return (
                  <div key={i} className="p-3.5 bg-neutral-950/60 rounded-xl border border-neutral-900/80 space-y-2 text-[11px] leading-relaxed">
                    <div className="flex items-center justify-between border-b border-neutral-900 pb-1.5">
                      <span className="font-bold text-neutral-200 font-mono text-xs flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-orange-400" />
                        {st.state} - {st.rule.name}
                      </span>
                      {st.rule.website !== "#" && (
                        <a 
                          href={st.rule.website} 
                          target="_blank" 
                          rel="noreferrer" 
                          className="text-[10px] text-orange-500 hover:text-orange-450 hover:underline flex items-center shrink-0"
                        >
                          Treasury Website <ChevronRight className="w-3 h-3 ml-0.5" />
                        </a>
                      )}
                    </div>

                    <div className="space-y-1.5 text-[11px] text-neutral-400 font-sans">
                      <div>
                        <strong className="text-[10px] uppercase tracking-wider font-mono text-neutral-450">Filing Deadline / Timeline Speed:</strong>
                        <p className="text-neutral-300 text-xs">{st.rule.timeline}</p>
                      </div>

                      <div>
                        <strong className="text-[10px] uppercase tracking-wider font-mono text-neutral-450">Maximum Allowable Commission Rate:</strong>
                        <p className="text-orange-300 font-mono text-xs font-semibold">{st.rule.maxCommission} locator statutory cap limit</p>
                      </div>

                      <div>
                        <strong className="text-[10px] uppercase tracking-wider font-mono text-neutral-450 block mb-0.5">Physical Filing / Authentication Docs:</strong>
                        <ul className="list-disc list-inside space-y-0.5 text-neutral-300">
                          {st.rule.documentationRequired.map((doc, idx) => (
                            <li key={idx} className="truncate" title={doc}>{doc}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            
            {/* Extra Guidance warning for multistate */}
            {statesInCase.length > 1 && (
              <div className="p-3 bg-cyan-950/5 border border-cyan-500/10 rounded-lg flex items-start gap-2 text-cyan-400/90 text-[10.5px] leading-relaxed">
                <Info className="w-4 h-4 shrink-0 mt-0.5 text-cyan-400 font-bold" />
                <div>
                  <span className="font-bold block text-neutral-200">CROSS-JURISDICTIONAL RECOMMENDATION</span>
                  To process estate claims in multi-state portfolios, construct a unified heir packet that lists different executors or heirs with specific county-certified death authorizations for each sovereign jurisdiction.
                </div>
              </div>
            )}
          </div>

        </div>

      </div>
    </DialogContent>
  );
}
