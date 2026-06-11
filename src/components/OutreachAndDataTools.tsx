import { useState, useEffect } from "react";
import { 
  Megaphone, Mail, Send, Database, FileText, Upload, Globe, 
  CheckCircle2, Sparkles, Copy, Check, Info, Library, Loader2, ArrowRight,
  FileCheck, RefreshCw, AlertCircle, Sparkle
} from "lucide-react";
import { cn } from "../lib/utils";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Badge } from "./ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";

// Full multi-state registers
const REGISTRY_STATISTICS = [
  { state: "California (CA)", activeEscheat: "11.2 Billion", difficulty: "Moderate", notaryLimit: "Over $1,000", maxCommission: "10% max limit", timeline: "90 - 180 Days" },
  { state: "Texas (TX)", activeEscheat: "4.8 Billion", difficulty: "Low (Easy)", notaryLimit: "NA - Online ID", maxCommission: "10% limit", timeline: "30 - 60 Days" },
  { state: "Florida (FL)", activeEscheat: "3.2 Billion", difficulty: "Low (Easy)", notaryLimit: "Over $5,000", maxCommission: "20% limit", timeline: "45 - 90 Days" },
  { state: "New York (NY)", activeEscheat: "17.4 Billion", difficulty: "High (Hard)", notaryLimit: "Required-All", maxCommission: "15% max limit", timeline: "120 - 240 Days" },
  { state: "Delaware (DE)", activeEscheat: "3.1 Billion", difficulty: "Moderate", notaryLimit: "Required", maxCommission: "10% limit", timeline: "90 - 150 Days" }
];

const RAW_ASSET_CATALOG = [
  { id: "ast-01", owner: "THOMSON DIGGS COMPANY", amount: 245000.00, holder: "BANK OF AMERICA CORP", type: "Commercial Checking", state: "CA" },
  { id: "ast-02", owner: "ESTHER MARIE CHEVRON", amount: 62450.00, holder: "CHEVRON CORPORATION", type: "Stock Dividend", state: "CA" },
  { id: "ast-03", owner: "LAWRENCE H PINEDA", amount: 12450.00, holder: "WELLS FARGO ADVISORS", type: "Mutual Fund", state: "CA" },
  { id: "ast-04", owner: "RAND ALLOY CORP", amount: 95300.00, holder: "EXXON MOBIL CORP", type: "Corporate Dividends", state: "TX" },
  { id: "ast-05", owner: "ESTATE OF WINIFRED GALT", amount: 189400.00, holder: "UNION BANK TRUST", type: "Estate Custody Account", state: "CA" },
  { id: "ast-06", owner: "PATRICK MCKEE ESTATE", amount: 33400.00, holder: "JP MORGAN CHASE", type: "Saving Account Balance", state: "FL" },
  { id: "ast-07", owner: "HELLEN COOPER", amount: 1540.00, holder: "FLORIDA POWER & LIGHT", type: "Utility Refund", state: "FL" },
  { id: "ast-08", owner: "REDWOOD HORIZONS INC", amount: 38700.00, holder: "SILICON VALLEY BANK", type: "Corporate Escrow", state: "CA" },
  { id: "ast-09", owner: "VANDERBILT TRUSTS", amount: 771200.00, holder: "NY DEPT OF REVENUE", type: "State Bond Yields", state: "NY" }
];

interface OutreachAndDataToolsProps {
  toolType: "campaigns" | "multistate_search" | "hermes" | "asset_db" | "import_csv";
  savedCases?: any[];
  onImportRecords?: (newRecords: any[]) => void;
}

export function OutreachAndDataTools({ toolType, savedCases = [], onImportRecords }: OutreachAndDataToolsProps) {
  
  // --- CAMPAIGNS STATE ---
  const [selectedCaseId, setSelectedCaseId] = useState("");
  const [campaignTemplate, setCampaignTemplate] = useState("Individual high-value postal outreach");
  const [campaignProgress, setCampaignProgress] = useState<number | null>(null);
  const [launchedReport, setLaunchedReport] = useState<any | null>(null);

  // --- HERMES STATE ---
  const [hermesOwner, setHermesOwner] = useState("THOMSON DIGGS COMPANY");
  const [hermesAmount, setHermesAmount] = useState("245000");
  const [hermesCustodian, setHermesCustodian] = useState("BANK OF AMERICA CORP");
  const [hermesStateRef, setHermesStateRef] = useState("CA-BS-951110");
  const [hermesCopied, setHermesCopied] = useState(false);

  // --- ASSET DB STATE ---
  const [dbSearch, setDbSearch] = useState("");
  const [minAmount, setMinAmount] = useState(1000);

  // --- IMPORT CSV STATE ---
  const [rawCSVInput, setRawCSVInput] = useState("");
  const [importedRows, setImportedRows] = useState<any[]>([]);
  const [csvPreviewError, setCsvPreviewError] = useState("");

  // --- SQLITE DB RECORDS STATE ---
  const [sqliteRecords, setSqliteRecords] = useState<any[]>([]);
  const [isLoadingRecords, setIsLoadingRecords] = useState(false);

  // --- ZIP DRAG-AND-DROP STATE ---
  const [importTab, setImportTab] = useState<"zip" | "pasted">("zip");
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<any | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const clearUploadStats = () => {
    setUploadResult(null);
    setUploadError(null);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (!file.name.toLowerCase().endsWith(".zip")) {
        setUploadError("Invalid file type. Please upload a valid zipped (.zip) file.");
        return;
      }
      await uploadZipFile(file);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (!file.name.toLowerCase().endsWith(".zip")) {
        setUploadError("Invalid file type. Please upload a valid zipped (.zip) file.");
        return;
      }
      await uploadZipFile(file);
    }
  };

  const uploadZipFile = async (file: File) => {
    setIsUploading(true);
    setUploadError(null);
    setUploadResult(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch("/api/upload-zip", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({ error: "Server sync failed" }));
        throw new Error(errData.error || `Upload failed with status ${response.status}`);
      }

      const result = await response.json();
      setUploadResult(result);
      fetchRecordsFromSQLite();
    } catch (err: any) {
      console.error("ZIP Upload error:", err);
      setUploadError(err.message || "Failed to process and sync uploaded ZIP onto local SQLite.");
    } finally {
      setIsUploading(false);
    }
  };

  const fetchRecordsFromSQLite = async () => {
    setIsLoadingRecords(true);
    try {
      const res = await fetch("/api/records");
      if (res.ok) {
        const data = await res.json();
        setSqliteRecords(data);
      }
    } catch (err) {
      console.error("Failed to load SQLite records:", err);
    } finally {
      setIsLoadingRecords(false);
    }
  };

  useEffect(() => {
    fetchRecordsFromSQLite();
  }, [toolType]);

  // Campaign Simulation
  const handleLaunchCampaign = () => {
    if (!selectedCaseId) {
      alert("Please select a target Lead Case folder, or create one in the Saved Cases Workbench.");
      return;
    }
    const targetCase = savedCases.find(c => c.id === selectedCaseId);
    const caseName = targetCase ? targetCase.categoryName : "Selected Case Portfolio";

    setCampaignProgress(0);
    setLaunchedReport(null);

    const interval = setInterval(() => {
      setCampaignProgress(prev => {
        if (prev === null) return 0;
        if (prev >= 100) {
          clearInterval(interval);
          setLaunchedReport({
            id: `CAMP-${Math.floor(Math.random() * 90000) + 10000}`,
            dispatchedCount: targetCase ? targetCase.assets.length : 3,
            recipientCase: caseName,
            channel: campaignTemplate.includes("postal") ? "Postal Letter" : "Professional Email",
            date: new Date().toLocaleDateString()
          });
          return 100;
        }
        return prev + 25;
      });
    }, 400);
  };

  // CSV Parsing
  const handleLoadSampleCSV = () => {
    const sample = `John Doe, 12500, CA, Bank Account, Wells Fargo
Robert Smith Estate, 68000, TX, Uncashed Check, Alliance Corp
Silverado Inc, 142000, CA, Uncashed Check, Chevron Corp
Pineda Family Trust, 84300, FL, Life Insurance, Prudential`;
    setRawCSVInput(sample);
    setCsvPreviewError("");
  };

  const handleParseCSV = () => {
    setCsvPreviewError("");
    setImportedRows([]);
    
    if (!rawCSVInput.trim()) {
      setCsvPreviewError("Please paste some valid CSV rows or click and load sample file.");
      return;
    }

    try {
      const lines = rawCSVInput.split("\n");
      const tempRows: any[] = [];
      
      lines.forEach((line, idx) => {
        if (!line.trim()) return;
        const cols = line.split(",").map(c => c.trim());
        if (cols.length < 5) {
          throw new Error(`Row ${idx + 1} has insufficient columns. Need format: Name, Amount, State, AssetType, Custodian`);
        }
        
        const floatAmount = parseFloat(cols[1]);
        if (isNaN(floatAmount)) {
          throw new Error(`Row ${idx + 1} has incorrect value: "${cols[1]}" is not a number.`);
        }

        tempRows.push({
          id: `imp-${Date.now()}-${idx}`,
          name: cols[0],
          amount: floatAmount,
          state: cols[2].toUpperCase(),
          type: cols[3],
          holderCompany: cols[4]
        });
      });

      setImportedRows(tempRows);
    } catch (e: any) {
      setCsvPreviewError(e.message || "Ecountered syntax formatting error parsing records.");
    }
  };

  const handleCommitImport = () => {
    if (importedRows.length === 0) return;
    if (onImportRecords) {
      onImportRecords(importedRows);
    }
    alert(`Successfully loaded ${importedRows.length} active records directly into Search Workbench registry queries!`);
    setImportedRows([]);
    setRawCSVInput("");
  };

  const handleCopyHermesLetter = () => {
    const textEl = document.getElementById("hermes-letter-body");
    if (textEl) {
      navigator.clipboard.writeText(textEl.innerText || "");
      setHermesCopied(true);
      setTimeout(() => setHermesCopied(false), 2000);
    }
  };

  const combinedCatalog = [
    ...sqliteRecords.map(r => ({
      id: `sqlite-${r.id}`,
      owner: `${r.first_name || ""} ${r.last_name || ""}`.trim().toUpperCase() || "UNKNOWN CLAIMANT",
      amount: Number(r.amount) || 0,
      holder: r.company || "Unknown Custodian",
      type: r.property_type || "Uncashed Check",
      state: String(r.state || "CA").toUpperCase(),
      location: r.location || "",
      state_id: r.state_id || ""
    })),
    ...RAW_ASSET_CATALOG
  ];

  const filteredAssetsCatalog = combinedCatalog.filter(a => {
    const matchesSearch = !dbSearch || a.owner.toLowerCase().includes(dbSearch.toLowerCase()) || a.holder.toLowerCase().includes(dbSearch.toLowerCase());
    return matchesSearch && a.amount >= minAmount;
  });

  return (
    <div className="space-y-6">
      {/* 1. CAMPAIGNS SUBPAGE */}
      {toolType === "campaigns" && (
        <div className="space-y-6">
          <div>
            <span className="text-orange-400 text-xs font-mono font-bold uppercase bg-orange-400/10 px-2 py-0.5 rounded border border-orange-500/20">
              Outreach Pipelines
            </span>
            <h2 className="text-2xl font-bold tracking-tight text-neutral-100 mt-2">Dispatched Campaigns</h2>
            <p className="text-neutral-400 text-sm">Automated mass correspondence queues for emailing or printing postal letters to qualified leads portfolios.</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            <div className="lg:col-span-8 space-y-4">
              <Card className="border-neutral-800 bg-[#0e0e11] p-5 space-y-4">
                <h3 className="text-sm font-semibold text-neutral-300 flex items-center gap-1.5 border-b border-neutral-900 pb-3">
                  <Megaphone className="w-4 h-4 text-orange-500" /> New Mass Campaign Launch
                </h3>

                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase text-neutral-450 block">1. Select Target Case Portfolio</label>
                      <select 
                        value={selectedCaseId}
                        onChange={e => setSelectedCaseId(e.target.value)}
                        className="flex h-10 w-full rounded-md border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm text-neutral-300 focus-visible:outline-none"
                      >
                        <option value="">-- Choose Case Folder --</option>
                        {savedCases.map(c => (
                          <option key={c.id} value={c.id}>{c.categoryName} ({c.assets.length} Claims)</option>
                        ))}
                      </select>
                      {savedCases.length === 0 && (
                        <p className="text-[10px] text-orange-400 mt-1">Please search and create a "Saved Case Category" first to use campaigns.</p>
                      )}
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] uppercase text-neutral-450 block">2. Campaign Outreach Template</label>
                      <select 
                        value={campaignTemplate}
                        onChange={e => setCampaignTemplate(e.target.value)}
                        className="flex h-10 w-full rounded-md border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm text-neutral-300 focus-visible:outline-none"
                      >
                        <option value="Individual high-value postal outreach">Individual High-Value Postal Notice</option>
                        <option value="Corporate overpayment resolution">Corporate Overpayment Recovery Email</option>
                        <option value="Probate family estates warning">Probate/Executor Estate Notification</option>
                      </select>
                    </div>
                  </div>

                  <div className="pt-2">
                    <Button 
                      onClick={handleLaunchCampaign}
                      disabled={campaignProgress !== null && campaignProgress < 100}
                      className="bg-orange-500 hover:bg-orange-600 text-black font-semibold h-11 px-6 min-w-[200px]"
                    >
                      Launch Outreach Campaign
                    </Button>
                  </div>
                </div>

                {campaignProgress !== null && (
                  <div className="pt-4 border-t border-neutral-800 space-y-2">
                    <div className="flex justify-between text-xs font-mono">
                      <span className="text-neutral-400">Campaign Dispatching Sequence...</span>
                      <span>{campaignProgress}%</span>
                    </div>
                    <div className="h-2 w-full bg-neutral-900 rounded-full overflow-hidden border border-neutral-800">
                      <div className="h-full bg-orange-500 rounded-full transition-all duration-300" style={{ width: `${campaignProgress}%` }} />
                    </div>
                  </div>
                )}
              </Card>
            </div>

            <div className="lg:col-span-4">
              {launchedReport ? (
                <Card className="border-emerald-500/30 bg-[#0c120f] p-5 space-y-4 shadow-xl animate-fade-in text-xs font-mono">
                  <div className="flex justify-between items-center pb-2 border-b border-emerald-500/10">
                    <span className="font-bold text-emerald-400">DISPATCHING REPORT COMPLETE</span>
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  </div>
                  <div className="space-y-2.5">
                    <div>
                      <span className="text-[10px] text-neutral-500 block uppercase">Campaign Index Code</span>
                      <span className="text-neutral-100 font-bold">{launchedReport.id}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-neutral-500 block uppercase">Target Lead Folder</span>
                      <span className="text-orange-300">{launchedReport.recipientCase}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-neutral-500 block uppercase">Dispatched Letters Code</span>
                      <span className="text-neutral-200">{launchedReport.dispatchedCount} Dispatches issued</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-neutral-500 block uppercase">Medium Channel</span>
                      <span className="text-emerald-400">{launchedReport.channel}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-neutral-500 block uppercase">Displacement Date</span>
                      <span className="text-neutral-300">{launchedReport.date}</span>
                    </div>
                  </div>
                </Card>
              ) : (
                <div className="border border-dashed border-neutral-800 rounded-xl p-8 text-center text-neutral-500 bg-neutral-900/10">
                  <Megaphone className="w-8 h-8 text-neutral-700 mx-auto mb-2" />
                  <p className="text-sm font-semibold">Campaign Dispatch Status</p>
                  <p className="text-xs text-neutral-500 mt-1">Ready to queue campaigns. Link a case folder on the left, then trigger automated letters sequence.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 2. MULTI-STATE SEARCH SUBPAGE */}
      {toolType === "multistate_search" && (
        <div className="space-y-6">
          <div>
            <span className="text-orange-400 text-xs font-mono font-bold uppercase bg-orange-400/10 px-2 py-0.5 rounded border border-orange-500/20">
              National registries matrix
            </span>
            <h2 className="text-2xl font-bold tracking-tight text-neutral-100 mt-2">Combined State Registry Rules</h2>
            <p className="text-neutral-400 text-sm">Review of administrative complexity, limits, and timelines of principal state controllers.</p>
          </div>

          <Card className="border-neutral-800 bg-[#0e0e11] overflow-hidden">
            <Table>
              <TableHeader className="bg-neutral-900/50">
                <TableRow className="border-neutral-800">
                  <TableHead className="font-mono text-xs">Jurisdiction</TableHead>
                  <TableHead className="font-mono text-xs">Total Escheated Capital</TableHead>
                  <TableHead className="font-mono text-xs">Filing Complexity</TableHead>
                  <TableHead className="font-mono text-xs">Notary Threshholds</TableHead>
                  <TableHead className="font-mono text-xs">Maximum Permissible Commission</TableHead>
                  <TableHead className="font-mono text-xs">Average Claim Timeline</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {REGISTRY_STATISTICS.map((reg, idx) => (
                  <TableRow key={idx} className="border-neutral-800 hover:bg-neutral-900/30">
                    <TableCell className="font-mono font-bold text-neutral-200">{reg.state}</TableCell>
                    <TableCell className="text-emerald-400 font-mono font-semibold">${reg.activeEscheat}</TableCell>
                    <TableCell>
                      <Badge 
                        variant="outline"
                        className={
                          reg.difficulty.includes("Easy") ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" :
                          reg.difficulty.includes("Moderate") ? "bg-blue-500/10 text-blue-400 border-blue-500/20" :
                          "bg-rose-500/10 text-rose-400 border-rose-500/20"
                        }
                      >
                        {reg.difficulty}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-neutral-400 font-mono">{reg.notaryLimit}</TableCell>
                    <TableCell className="text-xs text-orange-400 font-mono font-semibold">{reg.maxCommission}</TableCell>
                    <TableCell className="text-xs text-neutral-450 font-mono">{reg.timeline}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </div>
      )}

      {/* 3. HERMES SUBPAGE */}
      {toolType === "hermes" && (
        <div className="space-y-6">
          <div>
            <span className="text-orange-400 text-xs font-mono font-bold uppercase bg-orange-400/10 px-2 py-0.5 rounded border border-orange-500/20">
              Automated Messenger
            </span>
            <h2 className="text-2xl font-bold tracking-tight text-neutral-100 mt-2">Hermes Outreach Letter Engine</h2>
            <p className="text-neutral-400 text-sm">Dynamical formal notices formatter with real-time variables injection. Print or paste to target files instantly.</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Variables Left Card */}
            <div className="lg:col-span-4">
              <Card className="border-neutral-800 bg-[#0e0e11] p-5 space-y-4">
                <h3 className="text-xs uppercase font-bold tracking-widest text-orange-400">Letter Parameters</h3>
                
                <div className="space-y-3 text-xs">
                  <div className="space-y-1">
                    <label className="text-neutral-450">Claimant Name</label>
                    <Input 
                      value={hermesOwner}
                      onChange={e => setHermesOwner(e.target.value)}
                      className="bg-neutral-950 border-neutral-800 text-xs text-neutral-200"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-neutral-450">Escheat Value ($)</label>
                    <Input 
                      value={hermesAmount}
                      onChange={e => setHermesAmount(e.target.value)}
                      className="bg-neutral-950 border-neutral-800 text-xs text-neutral-200 font-mono"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-neutral-450">Losing Custodian</label>
                    <Input 
                      value={hermesCustodian}
                      onChange={e => setHermesCustodian(e.target.value)}
                      className="bg-neutral-950 border-neutral-800 text-xs text-neutral-200"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-neutral-450">Controller Record Ref ID</label>
                    <Input 
                      value={hermesStateRef}
                      onChange={e => setHermesStateRef(e.target.value)}
                      className="bg-neutral-950 border-neutral-800 text-xs text-neutral-200 font-mono"
                    />
                  </div>
                </div>

                <div className="pt-2">
                  <Button 
                    onClick={handleCopyHermesLetter} 
                    className="w-full bg-orange-500 hover:bg-orange-600 text-black font-semibold text-xs"
                  >
                    {hermesCopied ? <Check className="w-4 h-4 mr-1.5" /> : <Copy className="w-4 h-4 mr-1.5" />}
                    {hermesCopied ? "Copied!" : "Copy Formatted Notice"}
                  </Button>
                </div>
              </Card>
            </div>

            {/* Letter Frame Right Card */}
            <div className="lg:col-span-8">
              <Card className="border-neutral-800 bg-[#0e0e11] overflow-hidden">
                <div className="bg-neutral-900/60 p-3.5 border-b border-neutral-800 flex justify-between items-center text-xs font-mono">
                  <span className="text-neutral-400">Notice Preview frame (HTML printable)</span>
                  <span className="text-orange-400 animate-pulse font-bold flex items-center gap-1">
                    <Sparkles className="w-3 h-3" /> Draft Live
                  </span>
                </div>
                
                <CardContent className="p-6 bg-neutral-950 text-neutral-200 font-sans text-xs leading-relaxed space-y-4">
                  <div id="hermes-letter-body" className="space-y-4 max-h-[500px] overflow-y-auto pr-1">
                    <div className="text-center font-bold text-sm tracking-wider uppercase underline">
                      OFFICIAL NOTICE OF OUTSTANDING DISCOVERED PROPERTY LIENS & CASH
                    </div>
                    <div className="text-right text-[10px] text-neutral-400 font-mono">
                      Ref File: {hermesStateRef || "CA-REF-99"} <br />
                      Date Notice Issue: {new Date().toLocaleDateString()}
                    </div>

                    <div className="space-y-1">
                      <p className="font-semibold text-xs">ATTENTION OF INTENDED DEBTOR:</p>
                      <p className="font-mono text-orange-300 font-bold uppercase">{hermesOwner}</p>
                    </div>

                    <p>
                      This communications serves to inform you that our audit bureau has uncovered a sum of 
                      <strong className="text-emerald-400 font-mono text-sm ml-1">
                        ${(parseFloat(hermesAmount) || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </strong> in unclaimed, inactive capital assets transferred from custodian <span className="font-semibold">{hermesCustodian}</span> to safe state escrow custody.
                    </p>

                    <p>
                      Pursuant to statutory administrative rules, you are authorized to recover this balance. Our agency manages the entire documentation pipeline for a standard finder rate of 10% payable purely upon success disbursement.
                    </p>

                    <div className="p-3 bg-neutral-900 rounded-xl space-y-1 text-[11px] font-mono border border-neutral-850">
                      <p className="font-bold border-b border-neutral-800 pb-1 text-orange-400">SUMMARY DATA LIENS:</p>
                      <p>Unified Record Ref: {hermesStateRef}</p>
                      <p>Unclaimed Funds Val: ${parseFloat(hermesAmount).toLocaleString()}</p>
                      <p>State Legal Custody: California Controller Bureau</p>
                    </div>

                    <p>
                      To proceed with filing, please sign and return the enclosed agency contract authorization sheet at your earliest convenience to avoid regulatory holding fees.
                    </p>

                    <div className="pt-4 border-t border-neutral-900 flex justify-between">
                      <div>
                        <p className="font-bold">Sovereign Recovery Desk</p>
                        <p className="text-[10px] text-neutral-500">Authorized Skip Trace Locator</p>
                      </div>
                      <div className="border-b border-neutral-700 w-32 h-8 text-center text-[9px] text-neutral-600 self-end font-sans">
                        Authorized Signature
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      )}

      {/* 4. ASSET DATABASE CATALOG SUBPAGE */}
      {toolType === "asset_db" && (
        <div className="space-y-6">
          <div>
            <span className="text-orange-400 text-xs font-mono font-bold uppercase bg-orange-400/10 px-2 py-0.5 rounded border border-orange-500/20">
              National repositories
            </span>
            <h2 className="text-2xl font-bold tracking-tight text-neutral-100 mt-2">Combined State Records Registry</h2>
            <p className="text-neutral-400 text-sm">Full catalog master record rows compiled from California, Texas, and Florida state databases.</p>
          </div>

          <div className="flex flex-col md:flex-row gap-4 items-center justify-between border-b border-neutral-800 pb-4">
            <div className="font-mono text-xs text-neutral-400">
              Total cache capacity: <strong className="text-orange-400">{filteredAssetsCatalog.length} records</strong>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
              <Input 
                placeholder="Search owner or custodian..."
                value={dbSearch}
                onChange={e => setDbSearch(e.target.value)}
                className="bg-[#0e0e11] border-neutral-850 text-xs w-full sm:w-64"
              />
              
              <div className="flex items-center gap-2 whitespace-nowrap text-xs font-mono">
                <span className="text-neutral-500 select-none">Min val:</span>
                <span className="text-emerald-400 font-bold">${minAmount.toLocaleString()}</span>
                <input 
                  type="range"
                  min="500"
                  max="100000"
                  step="500"
                  value={minAmount}
                  onChange={e => setMinAmount(parseInt(e.target.value))}
                  className="accent-orange-500 w-32"
                />
              </div>
            </div>
          </div>

          <Card className="border-neutral-800 bg-[#0e0e11] overflow-hidden">
            <Table>
              <TableHeader className="bg-neutral-900/50">
                <TableRow className="border-neutral-800">
                  <TableHead className="font-mono text-xs">Record Owner</TableHead>
                  <TableHead className="font-mono text-xs">Escheated Amount</TableHead>
                  <TableHead className="font-mono text-xs">Custodian</TableHead>
                  <TableHead className="font-mono text-xs">Property Type</TableHead>
                  <TableHead className="font-mono text-xs">Origin State</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAssetsCatalog.map((row, idx) => (
                  <TableRow key={idx} className="border-neutral-800 hover:bg-neutral-900/30">
                    <TableCell className="font-mono font-bold text-xs text-neutral-100">{row.owner}</TableCell>
                    <TableCell className="text-emerald-400 font-mono font-semibold text-xs">${row.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</TableCell>
                    <TableCell className="text-xs text-neutral-400">{row.holder}</TableCell>
                    <TableCell className="text-xs text-neutral-450">{row.type}</TableCell>
                    <TableCell className="text-xs text-orange-400 font-mono font-semibold">{row.state}</TableCell>
                  </TableRow>
                ))}
                {filteredAssetsCatalog.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-6 text-neutral-500 animate-pulse">
                      No assets found matching sliders parameters filter.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Card>
        </div>
      )}

      {/* 5. IMPORT CSV SUBPAGE */}
      {toolType === "import_csv" && (
        <div className="space-y-6 animate-fade-in">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <span className="text-orange-400 text-xs font-mono font-bold uppercase bg-orange-400/10 px-2 py-0.5 rounded border border-orange-500/20">
                Bulk ingestion
              </span>
              <h2 className="text-2xl font-bold tracking-tight text-neutral-100 mt-2">Dynamic Data Ingestion Registry</h2>
              <p className="text-neutral-400 text-sm">Synchronize unclaimed properties bulk files into the local server SQLite system database.</p>
            </div>

            {/* Ingestion Mode Tab Switcher */}
            <div className="flex space-x-1 p-1 bg-neutral-900/60 border border-neutral-850 rounded-lg self-start md:self-auto">
              <button
                type="button"
                onClick={() => { setImportTab("zip"); clearUploadStats(); }}
                className={cn(
                  "px-4 py-1.5 text-xs font-mono font-medium rounded-md transition-all",
                  importTab === "zip" ? "bg-orange-500 text-black font-semibold shadow-md" : "text-neutral-400 hover:text-neutral-200"
                )}
              >
                SQLite ZIP Sync (Drag & Drop)
              </button>
              <button
                type="button"
                onClick={() => { setImportTab("pasted"); }}
                className={cn(
                  "px-4 py-1.5 text-xs font-mono font-medium rounded-md transition-all",
                  importTab === "pasted" ? "bg-orange-500 text-black font-semibold shadow-md" : "text-neutral-400 hover:text-neutral-200"
                )}
              >
                Client CSV Paste
              </button>
            </div>
          </div>

          {importTab === "zip" ? (
            <div className="space-y-6">
              {/* ZIP upload drag zone */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                <div className="lg:col-span-7 space-y-4">
                  <Card className="border-neutral-850 bg-[#0e0e11] p-6 space-y-5">
                    <div className="flex justify-between items-center border-b border-neutral-900 pb-3">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-orange-400 flex items-center gap-2">
                        <Database className="w-4 h-4" /> SQLite Database Sync
                      </h3>
                      <Badge variant="outline" className="border-neutral-800 text-neutral-400 font-mono text-[10px]">
                        Target table: scraped_records
                      </Badge>
                    </div>

                    <div 
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                      className={cn(
                        "relative border-2 border-dashed rounded-xl p-10 text-center transition-all duration-200 flex flex-col items-center justify-center min-h-[220px]",
                        isDragging ? "border-orange-500 bg-orange-500/5 animate-pulse" : "border-neutral-800 bg-neutral-950/40 hover:border-neutral-700",
                        isUploading ? "pointer-events-none opacity-60" : "cursor-pointer"
                      )}
                    >
                      <input 
                        type="file" 
                        accept=".zip" 
                        onChange={handleFileSelect}
                        disabled={isUploading}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                        title=""
                      />
                      
                      {isUploading ? (
                        <div className="space-y-4 animate-pulse">
                          <Loader2 className="w-12 h-12 text-orange-500 mx-auto animate-spin" />
                          <div>
                            <p className="text-sm font-semibold text-neutral-200 font-mono">EXTRACTING & UPLOADING ZIP ARCHIVE...</p>
                            <p className="text-xs text-neutral-500 mt-1">Sieving data schemas and validating database constraints</p>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-4 pointer-events-none">
                          <div className="mx-auto w-12 h-12 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-400">
                            <Upload className="w-5 h-5" />
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-neutral-200">Drag and drop your ZIP archive here</p>
                            <p className="text-xs text-neutral-500 mt-1">or click this workspace box to select from system file tree</p>
                          </div>
                          <p className="text-[10px] text-neutral-600 font-mono max-w-sm mx-auto leading-relaxed">
                            Compress .csv and .json data sheets together. Duplicate entries are cross-referenced with SQLite state_id / checksum tables and discarded automatically.
                          </p>
                        </div>
                      )}
                    </div>

                    {uploadError && (
                      <div className="p-3.5 bg-rose-950/10 border border-rose-500/20 rounded-xl flex items-start gap-2 text-rose-400 text-xs font-mono">
                        <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                        <div>
                          <p className="font-bold">DEDUPLICATION OR UPLOAD ERROR</p>
                          <p className="text-[11px] text-rose-500/90 mt-1">{uploadError}</p>
                        </div>
                      </div>
                    )}
                  </Card>
                </div>

                {/* Duplication & holding information stats block */}
                <div className="lg:col-span-5">
                  {uploadResult ? (
                    <Card className="border-emerald-500/20 bg-[#0c120f] p-5 space-y-4 shadow-2xl animate-fade-in font-mono text-xs text-neutral-300">
                      <div className="pb-2 border-b border-emerald-500/20 flex justify-between items-center text-emerald-400">
                        <span className="font-bold text-xs uppercase tracking-wider">SQLite SYNCHRONIZATION COMPLETE</span>
                        <CheckCircle2 className="w-5 h-5" />
                      </div>

                      <div className="grid grid-cols-2 gap-3.5 pt-1">
                        <div className="bg-[#050907] border border-emerald-500/10 p-3 rounded-lg">
                          <span className="text-[10px] text-neutral-500 uppercase block">Files Extracted</span>
                          <span className="text-lg font-bold text-neutral-200">{uploadResult.totalFilesProcessed}</span>
                        </div>
                        <div className="bg-[#050907] border border-emerald-500/10 p-3 rounded-lg">
                          <span className="text-[10px] text-neutral-500 uppercase block">Total Rows Read</span>
                          <span className="text-lg font-bold text-neutral-200">{uploadResult.recordsParsed}</span>
                        </div>
                        <div className="bg-[#050907] border border-emerald-500/10 p-3 rounded-lg">
                          <span className="text-[10px] text-neutral-500 uppercase block text-emerald-400">Synced (New)</span>
                          <span className="text-lg font-bold text-emerald-400">+{uploadResult.recordsInserted}</span>
                        </div>
                        <div className="bg-[#050907] border border-emerald-500/10 p-3 rounded-lg">
                          <span className="text-[10px] text-neutral-500 uppercase block text-amber-400">Duplicates Skipped</span>
                          <span className="text-lg font-bold text-amber-400">{uploadResult.duplicateCount}</span>
                        </div>
                      </div>

                      {uploadResult.fileNames && uploadResult.fileNames.length > 0 && (
                        <div className="space-y-1 pt-2 border-t border-emerald-500/10">
                          <span className="text-[10px] text-neutral-500 uppercase block">Extracted Package Manifest</span>
                          <div className="flex flex-wrap gap-1.5 mt-1">
                            {uploadResult.fileNames.map((name: string, i: number) => (
                              <Badge key={i} className="bg-emerald-500/10 hover:bg-emerald-500/10 text-emerald-300 border-emerald-500/20 px-2 py-0.5 text-[10px] rounded-md">
                                {name}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="text-[10px] text-neutral-500 leading-relaxed pt-2 border-t border-emerald-500/10 bg-emerald-950/5 p-2 rounded border border-emerald-500/5">
                        <span className="text-emerald-400 font-bold block mb-0.5">DEDUPLICATION POLICY ACTIVE</span>
                        Checks unique state identifiers (e.g. state_id values) and matches (first_name, last_name, state, company, amount) combinations to ensure SQLite database is 100% clean and free of redundancies.
                      </div>

                      <div className="pt-2">
                        <Button 
                          onClick={clearUploadStats}
                          className="w-full bg-emerald-900/30 hover:bg-emerald-900/50 border border-emerald-500/20 text-emerald-200 text-xs font-mono h-9"
                        >
                          Clear Sync Report
                        </Button>
                      </div>
                    </Card>
                  ) : (
                    <Card className="border-neutral-850 bg-[#0e0e11] p-5 space-y-4">
                      <h4 className="text-xs uppercase font-bold text-neutral-400 tracking-wider">Ingestion Operations Manual</h4>
                      
                      <div className="space-y-3.5 text-xs text-neutral-400">
                        <div className="flex items-start gap-3">
                          <div className="w-5 h-5 rounded-full bg-neutral-900 border border-neutral-800 text-[10px] font-mono flex items-center justify-center text-orange-400 shrink-0 mt-0.5">
                            1
                          </div>
                          <p className="leading-relaxed">Create a ZIP containing individual <strong>JSON</strong> or <strong>CSV</strong> sheets representing unclaimed state records.</p>
                        </div>
                        
                        <div className="flex items-start gap-3">
                          <div className="w-5 h-5 rounded-full bg-neutral-900 border border-neutral-800 text-[10px] font-mono flex items-center justify-center text-orange-400 shrink-0 mt-0.5">
                            2
                          </div>
                          <p className="leading-relaxed">Drag or upload the ZIP file. The backend decompresses it, parses matching indexes, and parses columns.</p>
                        </div>

                        <div className="flex items-start gap-3">
                          <div className="w-5 h-5 rounded-full bg-neutral-900 border border-neutral-800 text-[10px] font-mono flex items-center justify-center text-orange-400 shrink-0 mt-0.5">
                            3
                          </div>
                          <p className="leading-relaxed">Records are added to <strong>SQLite</strong>. When executing name checks in the <strong>Search Workbench</strong>, matched database entries are resolved instantly!</p>
                        </div>
                      </div>

                      <div className="pt-3.5 border-t border-neutral-900 flex justify-between items-center text-[11px] font-mono text-neutral-500">
                        <span>Local SQLite Capacity:</span>
                        <span className="text-orange-400 font-bold">{sqliteRecords.length} Active Records cached</span>
                      </div>
                    </Card>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              <div className="lg:col-span-6 space-y-4">
                <Card className="border-neutral-805 bg-[#0e0e11] p-5 space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-orange-400">CSV Input Terminal</h3>
                    <Button 
                      variant="outline" 
                      onClick={handleLoadSampleCSV}
                      className="border-neutral-800 hover:bg-neutral-900 text-[10px] h-7 px-2 font-mono text-neutral-400"
                    >
                      Load Sample CSV
                    </Button>
                  </div>

                  <div className="text-[10px] text-neutral-500 font-mono leading-relaxed bg-neutral-950 p-2.5 rounded border border-neutral-850">
                    Expected column format: <br />
                    <span className="text-orange-400">Name, Amount, State, AssetType, Custodian</span>
                  </div>

                  <textarea
                    value={rawCSVInput}
                    onChange={e => setRawCSVInput(e.target.value)}
                    placeholder="Paste CSV records here..."
                    rows={8}
                    className="w-full bg-neutral-950 border border-neutral-800 focus:border-orange-500 focus:ring-0 rounded-md font-mono text-xs text-neutral-200 p-3 leading-relaxed"
                  />

                  {csvPreviewError && (
                    <p className="text-[11px] text-rose-500 font-mono bg-rose-500/10 border border-rose-500/20 p-2 rounded">
                      {csvPreviewError}
                    </p>
                  )}

                  <div className="flex justify-end gap-2">
                    <Button 
                      type="button"
                      onClick={handleParseCSV} 
                      className="bg-neutral-900 hover:bg-neutral-850 border border-neutral-800 text-xs"
                    >
                      Parse & Validate
                    </Button>
                  </div>
                </Card>
              </div>

              <div className="lg:col-span-6">
                {importedRows.length > 0 ? (
                  <Card className="border-neutral-800 bg-[#0e0e11] p-5 space-y-4 shadow-xl animate-fade-in">
                    <div className="pb-3 border-b border-neutral-800 flex justify-between items-center">
                      <span className="text-xs font-mono font-bold text-emerald-400">PARSED SPREADSHEET PREVIEW</span>
                      <Badge className="bg-emerald-500/10 text-emerald-400 font-mono text-xs">{importedRows.length} Records</Badge>
                    </div>

                    <div className="overflow-x-auto max-h-64 border border-neutral-850 rounded">
                      <Table>
                        <TableHeader className="bg-neutral-950">
                          <TableRow className="border-neutral-850 hover:bg-transparent">
                            <TableHead className="font-mono text-[9px] uppercase px-2 py-1">Owner Name</TableHead>
                            <TableHead className="font-mono text-[9px] uppercase px-2 py-1 text-right">Amount</TableHead>
                            <TableHead className="font-mono text-[9px] uppercase px-2 py-1">State</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {importedRows.map((row, idx) => (
                            <TableRow key={idx} className="border-neutral-850 hover:bg-neutral-950/20 text-[11px]">
                              <TableCell className="px-2 py-1">{row.name}</TableCell>
                              <TableCell className="text-right px-2 py-1 font-mono text-emerald-400">${row.amount.toLocaleString()}</TableCell>
                              <TableCell className="px-2 py-1 font-mono text-orange-400">{row.state}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>

                    <div className="pt-3 border-t border-neutral-800 flex justify-end gap-2">
                      <Button 
                        variant="ghost" 
                        onClick={() => setImportedRows([])}
                        className="text-neutral-400"
                      >
                        Cancel
                      </Button>
                      <Button 
                        type="button"
                        onClick={handleCommitImport} 
                        className="bg-emerald-600 hover:bg-emerald-700 text-neutral-100 text-xs"
                      >
                        Append into Search workbench
                      </Button>
                    </div>
                  </Card>
                ) : (
                  <div className="border border-dashed border-neutral-800 rounded-xl p-8 text-center text-neutral-500 bg-neutral-900/10">
                    <Upload className="w-8 h-8 text-neutral-700 mx-auto mb-2" />
                    <p className="text-sm font-semibold">Parsed Spreadsheet Rows</p>
                    <p className="text-xs text-neutral-500 mt-1">Paste CSV data and initiate Parse to review formatted rows before adding them to live inquiry list.</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
