import { useState, useEffect } from "react";
import { Search, MapPin, DollarSign, Users, Mail, Loader2, FileText, AlertCircle, Copy, Check, Filter, Database, BookOpen, ChevronRight, Save, ChevronUp, ChevronDown, AlertTriangle, CheckCircle, Network, Radar, Terminal, UserSearch, Zap, Upload, FileSignature, Sparkles, Layers, Globe, Bot, User, Send, Key } from "lucide-react";
import { cn } from "./lib/utils";
import { Button, buttonVariants } from "./components/ui/button";
import { Input } from "./components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./components/ui/table";
import { Badge } from "./components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./components/ui/tabs";
import { Separator } from "./components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "./components/ui/alert";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "./components/ui/dialog";
import { Label } from "./components/ui/label";
import { Textarea } from "./components/ui/textarea";
import { RichTextEditor } from "./components/RichTextEditor";
import { TraceConsole } from "./components/TraceConsole";

import { AssetsPage } from "./components/AssetsPage";
import { RegulationsPage } from "./components/RegulationsPage";
import { CampaignsPage } from "./components/CampaignsPage";
import { HermesAgentPage } from "./components/HermesAgentPage";
import { UploadCSV } from "./components/UploadCSV";
import { ClientContractDashboard } from "./components/ClientContractDashboard";
import { BundledWorkbench } from "./components/BundledWorkbench";
import { AssetCombiner } from "./components/AssetCombiner";
import { CAInvestigatorCenter } from "./components/CAInvestigatorCenter";
import { CAProbateSmallEstate } from "./components/CAProbateSmallEstate";
import MultiStateSearch from "./components/MultiStateSearch";

import { AssetRecord, CaseStatus, Relative, SavedCase, SearchQuery } from "./types";
import { searchLostAssets, trackRelatives, AVAILABLE_STATES, ASSET_TYPES } from "./services/mockDataService";
import { generateOutreachEmail } from "./services/geminiService";
import { saveCase, getSavedCases, deleteCase, updateCaseRescan, updateCaseStatus, updateCaseNotes } from "./services/dataStore";
import { STATE_RULES, StateRule } from "./services/stateRulesService";
import { autoLeadAndCampaign } from "./services/apiClient";

const CASE_STATUSES: { value: CaseStatus; label: string }[] = [
  { value: "new_lead", label: "New Lead" },
  { value: "verified", label: "Verified" },
  { value: "contact_found", label: "Contact Found" },
  { value: "outreach_sent", label: "Outreach Sent" },
  { value: "follow_up_needed", label: "Follow-Up Needed" },
  { value: "claimed", label: "Claimed" },
  { value: "rejected", label: "Rejected" },
];

const apiRecordToAsset = (rec: any): AssetRecord => ({
  id: `api-ast-${rec.id || rec.stateId || Math.random().toString(36).slice(2)}`,
  name: (rec.owner_name || rec.ownerName || `${rec.first_name || rec.firstName || "Unknown"} ${rec.last_name || rec.lastName || ""}`).trim().toUpperCase(),
  type: (rec.property_type || rec.type || "Uncashed Check") as AssetRecord["type"],
  amount: Number(rec.amount) || 0,
  holderCompany: rec.company || "Unknown holder",
  state: rec.state,
  address: rec.location || "Unknown location",
  stateId: rec.state_id || rec.stateId,
  sourceUrl: rec.source_url || rec.sourceUrl,
  confidence: rec.confidence,
});

export function detectClaimantType(name: string): "individual" | "business" | "estate" {
  const upper = name.toUpperCase();
  if (
    upper.includes("ESTATE") ||
    upper.includes("EST OF") ||
    upper.includes("DECEASED") ||
    /\bDEC\b/.test(upper)
  ) {
    return "estate";
  }
  if (
    upper.includes(" INC") ||
    upper.includes(" LLC") ||
    upper.includes(" CORP") ||
    upper.includes(" LTD") ||
    upper.includes(" CO ") ||
    upper.endsWith(" CO") ||
    upper.includes("COMPANY") ||
    upper.includes("ASSOCIATION") ||
    upper.includes("PARTNERS") ||
    upper.includes("TRUST") ||
    upper.includes("FOUNDATION") ||
    upper.includes("BANK") ||
    upper.includes("UNIVERSITY") ||
    upper.includes("SCHOOL") ||
    upper.includes("CHURCH")
  ) {
    return "business";
  }
  return "individual";
}

export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);
  return debouncedValue;
}

export default function App() {
  const [activeTab, setActiveTab] = useState<"intake" | "search" | "bundling" | "combiner" | "caInvestigator" | "caProbate" | "multiState" | "assets" | "database" | "regulations" | "campaigns" | "trace" | "hermes" | "import">("intake");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  
  const [searchMode, setSearchMode] = useState<"identity" | "highValue">("identity");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [emailAddress, setEmailAddress] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [targetState, setTargetState] = useState("");
  const [assetType, setAssetType] = useState("");
  const [recordLimit, setRecordLimit] = useState(10);
  
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [assets, setAssets] = useState<AssetRecord[]>([]);
  const [relatives, setRelatives] = useState<Relative[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [batchInput, setBatchInput] = useState("");
  const [isBatchSearching, setIsBatchSearching] = useState(false);
  const [batchMessage, setBatchMessage] = useState<string | null>(null);
  const [rescanningCaseId, setRescanningCaseId] = useState<string | null>(null);

  // Scraper State
  const [scrapeFirstName, setScrapeFirstName] = useState("");
  const [scrapeLastName, setScrapeLastName] = useState("");
  const [scrapeState, setScrapeState] = useState("");
  const [isScraping, setIsScraping] = useState(false);
  const [scrapedRecords, setScrapedRecords] = useState<any[]>([]);
  const [scrapeMessage, setScrapeMessage] = useState<{ text: string, type: "success" | "warning" | "error" } | null>(null);

  useEffect(() => {
    if (activeTab === "database") {
      setSavedCases(getSavedCases());
      fetch("/api/records")
        .then((res) => res.json())
        .then((data) => {
          if (Array.isArray(data)) setScrapedRecords(data);
        })
        .catch((err) => console.error("Failed to load records", err));
    }
  }, [activeTab]);


  // Database / Saved Cases
  const [savedCases, setSavedCases] = useState<SavedCase[]>([]);
  const [saveCategoryName, setSaveCategoryName] = useState("");
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [dbStateFilter, setDbStateFilter] = useState("");
  const [prepopulatedIntake, setPrepopulatedIntake] = useState<any | null>(null);
  const [proceedToIntake, setProceedToIntake] = useState<boolean>(false);
  
  // Hermes Case Agent Dialog State
  const [hermesDialogOpen, setHermesDialogOpen] = useState(false);
  const [hermesCase, setHermesCase] = useState<SavedCase | null>(null);
  const [hermesMessages, setHermesMessages] = useState<any[]>([]);
  const [hermesLoading, setHermesLoading] = useState(false);
  const [hermesInput, setHermesInput] = useState("");
  const [hermesLeads, setHermesLeads] = useState<any[]>([]);
  const [hermesRelatives, setHermesRelatives] = useState<any[]>([]);
  const [openaiKey, setOpenaiKey] = useState<string>(() => localStorage.getItem("lostassets:openai_api_key") || "");

  const handleOpenHermesAgent = (savedCase: SavedCase) => {
    setHermesDialogOpen(true);
    setHermesCase(savedCase);
    setHermesMessages([
      {
        role: "agent",
        text: `Initializing Hermes orchestrator for case: "${savedCase.categoryName}"...\n\nI will scan our state registries, verify contacts using TruePeopleSearch/FastBackgroundCheck, and run public OSINT checks.`,
        timestamp: new Date().toLocaleTimeString(),
      }
    ]);
    setHermesLeads([]);
    setHermesRelatives([]);
    setHermesInput("");
    runHermesCaseCommand(`enrich case ${savedCase.categoryName}`, savedCase.categoryName);
  };

  const runHermesCaseCommand = async (commandText: string, ownerName: string) => {
    setHermesLoading(true);
    try {
      const res = await fetch("/api/agent/command", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          command: commandText,
          ownerName: ownerName,
          openaiKey: openaiKey,
          chatHistory: hermesMessages
        }),
      });
      const data = await res.json();
      
      const agentMsg = {
        role: "agent",
        text: data.error
          ? `Error: ${data.error}`
          : data.text || (`Enrichment completed for owner: ${ownerName}.\n\n` + 
            (data.result?.leads?.length > 0 
              ? `Found ${data.result.leads.length} leads in database.` 
              : "No direct leads found in database.") +
            (data.result?.relatives?.length > 0 
              ? ` Found ${data.result.relatives.length} relatives/heirs matches.` 
              : "")),
        log: data.log || [],
        action: data.action,
        error: data.error,
        timestamp: new Date().toLocaleTimeString(),
      };
      setHermesMessages((prev) => [...prev, agentMsg]);
      
      if (data.result?.leads) {
        setHermesLeads(data.result.leads);
      }
      if (data.result?.relatives) {
        setHermesRelatives(data.result.relatives);
      }
    } catch (e: any) {
      setHermesMessages((prev) => [
        ...prev,
        { role: "agent", text: `Network error: ${e.message}`, timestamp: new Date().toLocaleTimeString() }
      ]);
    } finally {
      setHermesLoading(false);
    }
  };

  const handleHermesSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!hermesInput.trim() || !hermesCase) return;
    const text = hermesInput;
    setHermesInput("");
    setHermesMessages((prev) => [...prev, { role: "user", text, timestamp: new Date().toLocaleTimeString() }]);
    runHermesCaseCommand(text, hermesCase.categoryName);
  };
  
  useEffect(() => {
    setSavedCases(getSavedCases());
  }, []);

  const [casesEnrichment, setCasesEnrichment] = useState<Record<string, { leads: any[]; relatives: any[] }>>({});

  const fetchCasesEnrichment = async (casesList: SavedCase[]) => {
    try {
      const enrichmentData: Record<string, { leads: any[]; relatives: any[] }> = {};
      await Promise.all(
        casesList.map(async (c) => {
          try {
            const res = await fetch(`/api/cases/enrichment?ownerName=${encodeURIComponent(c.categoryName)}`);
            if (res.ok) {
              const data = await res.json();
              enrichmentData[c.categoryName] = {
                leads: data.leads || [],
                relatives: data.relatives || [],
              };
            }
          } catch (err) {
            console.error("Error fetching enrichment for case", c.categoryName, err);
          }
        })
      );
      setCasesEnrichment(enrichmentData);
    } catch (e) {
      console.error("Error loading cases enrichment", e);
    }
  };

  useEffect(() => {
    if (activeTab === "database" && savedCases.length > 0) {
      fetchCasesEnrichment(savedCases);
    }
  }, [activeTab, savedCases]);

  // Email Drafting State
  const [selectedRelative, setSelectedRelative] = useState<Relative | null>(null);
  const [isDraftingEmail, setIsDraftingEmail] = useState(false);
  const [draftedEmail, setDraftedEmail] = useState<string>("");
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const runSearch = async (isManual = false) => {
    if (searchMode === "identity" && (!firstName.trim() && !lastName.trim() && !emailAddress.trim())) {
      if (isManual) setError("Please provide at least a name or email address.");
      return;
    }

    setIsSearching(true);
    if (isManual) {
      setError(null);
      setHasSearched(false);
      setAssets([]);
      setRelatives([]);
    }

    try {
      const query = searchMode === "highValue" 
        ? { generalHighValue: true, targetState, assetType, recordLimit }
        : { 
            firstName: firstName.trim(), 
            lastName: lastName.trim(), 
            email: emailAddress.trim(), 
            phone: phoneNumber.trim(),
            targetState,
            assetType,
            recordLimit,
          };

      // 1. Search for assets
      const foundAssets = await searchLostAssets(query);
      setAssets(foundAssets);

      // 2. If assets found, run skip trace for relatives
      if (foundAssets.length > 0) {
        const states = foundAssets.map(a => a.state);
        const baseState = states.sort((a,b) =>
            states.filter(v => v===a).length - states.filter(v => v===b).length
        ).pop() || "CA";
        
        const foundRelatives = await trackRelatives(query, baseState, foundAssets);
        setRelatives(foundRelatives);
      } else {
        setRelatives([]);
      }
      setHasSearched(true);
      if (!isManual) setError(null);
    } catch (err: any) {
      if (isManual) setError(err.message || "An error occurred during the search.");
    } finally {
      setIsSearching(false);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    await runSearch(true);
  };

  const parseBatchLeads = () => batchInput
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [firstName = "", lastName = "", state = ""] = line.split(",").map((part) => part.trim());
      return { firstName, lastName, state: state.toUpperCase(), assetType, recordLimit };
    })
    .filter((lead) => lead.state && (lead.firstName || lead.lastName));

  const handleBatchSearch = async () => {
    const leads = parseBatchLeads();
    if (leads.length === 0) {
      setBatchMessage("Add one lead per line as First, Last, State.");
      return;
    }

    setIsBatchSearching(true);
    setBatchMessage(null);
    setError(null);
    try {
      const res = await fetch("/api/batch-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leads, recordLimit }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Batch search failed.");

      const foundAssets = data.results.flatMap((batch: any) => batch.records.map(apiRecordToAsset));
      setAssets(foundAssets);
      setRelatives([]);
      setHasSearched(true);
      setBatchMessage(`Batch searched ${data.searched} leads and found ${data.recordCount} records.`);
    } catch (err: any) {
      setError(err.message || "Batch search failed.");
    } finally {
      setIsBatchSearching(false);
    }
  };

  const totalAmount = assets.reduce((sum, asset) => sum + asset.amount, 0);

  const sortedAssets = [...assets].sort((a, b) => {
    return sortOrder === "asc" ? a.amount - b.amount : b.amount - a.amount;
  });

  const handleDraftEmail = async (relative: Relative) => {
    setSelectedRelative(relative);
    setIsDraftingEmail(true);
    setEmailDialogOpen(true);
    setDraftedEmail("");
    setError(null);

    const targetName = searchMode === "highValue" ? "the unclaimed property owner" : `${firstName.trim()} ${lastName.trim()}`;

    try {
      const emailText = await generateOutreachEmail(
        { firstName: searchMode === "identity" && firstName ? firstName.trim() : "Unknown", 
          lastName: searchMode === "identity" && lastName ? lastName.trim() : "Owner" },
        assets,
        relative
      );
      setDraftedEmail(emailText);
    } catch (err: any) {
      setDraftedEmail("Error generating email: " + err.message);
    } finally {
      setIsDraftingEmail(false);
    }
  };

  const handleSaveCase = () => {
    if (!saveCategoryName.trim()) return;
    const query = searchMode === "highValue" 
        ? { generalHighValue: true, targetState: targetState || undefined, assetType: assetType || undefined, recordLimit }
        : { firstName: firstName.trim(), lastName: lastName.trim(), email: emailAddress.trim(), phone: phoneNumber.trim(), targetState: targetState || undefined, assetType: assetType || undefined, recordLimit };
        
    const newCase = saveCase(saveCategoryName, query, assets, relatives);
    setSavedCases([newCase, ...savedCases]);
    setSaveDialogOpen(false);
    setSaveCategoryName("");
    
    if (proceedToIntake && assets.length > 0) {
      const firstAsset = assets[0];
      const type = detectClaimantType(firstAsset.name);
      const parts = firstAsset.name.trim().split(/\s+/).filter(Boolean);
      const fName = type === "business" ? "" : (parts.slice(0, -1).join(" ") || firstAsset.name);
      const lName = type === "business" ? "" : (parts.at(-1) || "");
      const bName = type === "business" ? firstAsset.name : "";
      
      setPrepopulatedIntake({
        claimantType: type,
        firstName: fName,
        lastName: lName,
        businessName: bName,
        assetOwner: firstAsset.name,
        holderCompany: firstAsset.holderCompany,
        claimState: firstAsset.state,
        propertyId: firstAsset.stateId || firstAsset.id,
        estimatedValue: String(firstAsset.amount),
        feePercent: "10",
      });
      setActiveTab("intake");
    } else {
      setActiveTab("database");
    }
  };

  const handleBeginCRMIntake = (asset: any) => {
    const type = detectClaimantType(asset.name);
    const parts = asset.name.trim().split(/\s+/).filter(Boolean);
    const fName = type === "business" ? "" : (parts.slice(0, -1).join(" ") || asset.name);
    const lName = type === "business" ? "" : (parts.at(-1) || "");
    const bName = type === "business" ? asset.name : "";
    
    setPrepopulatedIntake({
      claimantType: type,
      firstName: fName,
      lastName: lName,
      businessName: bName,
      assetOwner: asset.name,
      holderCompany: asset.holderCompany,
      claimState: asset.state,
      propertyId: asset.stateId || asset.id,
      estimatedValue: String(asset.amount),
      feePercent: "10",
    });
    setActiveTab("intake");
  };

  const handleDeleteCase = (id: string) => {
    deleteCase(id);
    setSavedCases(savedCases.filter(c => c.id !== id));
  };

  const handleStatusChange = (id: string, status: CaseStatus) => {
    setSavedCases(updateCaseStatus(id, status));
  };

  const handleSaveNotes = (id: string, notes: string) => {
    setSavedCases(updateCaseNotes(id, notes));
  };

  const handleUploadNotesFile = (id: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (text) {
        const targetCase = savedCases.find((c) => c.id === id);
        const existingNotes = targetCase?.notes || "";
        const divider = existingNotes ? "\n\n---\n\n" : "";
        const newNotes = `${existingNotes}${divider}# Note Uploaded: ${file.name}\n\n${text}`;
        setSavedCases(updateCaseNotes(id, newNotes));
      }
    };
    reader.readAsText(file);
  };

  const handleRescanCase = async (savedCase: SavedCase) => {
    setRescanningCaseId(savedCase.id);
    setError(null);
    try {
      const res = await fetch("/api/rescan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cases: [savedCase] }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Rescan failed.");

      const rescan = data.rescans?.[0];
      if (rescan) {
        const rescannedAssets = rescan.records.map(apiRecordToAsset);
        setSavedCases(updateCaseRescan(savedCase.id, rescannedAssets, rescan.rescannedAt, rescan.nextRescanAt));
      }
    } catch (err: any) {
      setError(err.message || "Rescan failed.");
    } finally {
      setRescanningCaseId(null);
    }
  };

  const handleRescanDueCases = async () => {
    const dueCases = savedCases.filter((savedCase) => !savedCase.nextRescanAt || savedCase.nextRescanAt <= Date.now());
    for (const savedCase of dueCases) {
      await handleRescanCase(savedCase);
    }
  };

  const handleAddLeadFromAsset = async (asset: AssetRecord) => {
    try {
      const { createLeadFromAsset } = await import("./services/apiClient");
      const leadId = await createLeadFromAsset(asset);
      setError(null);
      alert(`Lead created: #${leadId} for ${asset.name}`);
    } catch (e: any) {
      setError(`Lead creation failed: ${e.message}`);
    }
  };

  const handleQuickCampaign = async (asset: AssetRecord) => {
    try {
      setIsSearching(true);
      const { autoLeadAndCampaign } = await import("./services/apiClient");
      const result = await autoLeadAndCampaign(asset, { channel: "mixed", execute: true });
      setError(null);
      setActiveTab("campaigns");
      alert(`Campaign created: #${result.campaign.id}. Queued ${result.queued.queued || 0}. Sent ${result.executed?.sent || 0}.`);
    } catch (e: any) {
      setError(`Campaign creation failed: ${e.message}`);
    } finally {
      setIsSearching(false);
    }
  };

  const copyToClipboard = async () => {
    try {
      const htmlBlob = new Blob([draftedEmail], { type: "text/html" });
      const textBlob = new Blob([draftedEmail.replace(/<[^>]+>/g, '')], { type: "text/plain" }); // Simple fallback text
      const data = [new ClipboardItem({ "text/html": htmlBlob, "text/plain": textBlob })];
      await navigator.clipboard.write(data);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      // Fallback
      const tempEl = document.createElement("div");
      tempEl.innerHTML = draftedEmail;
      navigator.clipboard.writeText(tempEl.innerText || tempEl.textContent || "");
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="min-h-screen flex bg-neutral-950 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-900/20 via-neutral-950 to-neutral-950 text-neutral-100 font-sans">
      
      {/* Left Navigation Sidebar */}
      <aside className="w-64 border-r border-neutral-800 bg-neutral-950/60 backdrop-blur-md sticky top-0 h-screen flex flex-col flex-shrink-0 z-20">
        
        {/* Sidebar Brand Header */}
        <div className="p-5 border-b border-neutral-800 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-amber-500 via-orange-500 to-emerald-500 p-0.5 shadow-md flex items-center justify-center shrink-0">
            <div className="w-full h-full rounded-[6px] bg-neutral-950 flex items-center justify-center font-mono font-black text-xs text-orange-400">
              S
            </div>
          </div>
          <div>
            <h1 className="text-xs font-bold tracking-wider text-neutral-50 uppercase leading-none">Sovereign Asset</h1>
            <span className="text-[10px] text-neutral-400 font-semibold tracking-wider uppercase block mt-0.5">Recovery Agency</span>
          </div>
        </div>

        {/* Sidebar Navigation Items */}
        <nav className="flex-grow p-4 space-y-1 overflow-y-auto custom-scrollbar">
          <div className="text-[10px] uppercase font-bold text-neutral-500 tracking-widest px-3 mb-2">Investigations</div>
          
          <button 
             onClick={() => setActiveTab("intake")}
             className={`w-full flex items-center gap-3 px-3 py-2 text-xs font-semibold font-mono uppercase rounded-md transition-all ${activeTab === "intake" ? "bg-orange-500/10 text-orange-400 border border-orange-500/20 shadow-[0_0_15px_rgba(249,115,22,0.05)]" : "text-neutral-400 hover:bg-neutral-900 border border-transparent"}`}
          >
             <FileSignature className="w-4 h-4 shrink-0" />
             Client Intake
          </button>
          
          <button 
             onClick={() => setActiveTab("search")}
             className={`w-full flex items-center gap-3 px-3 py-2 text-xs font-semibold font-mono uppercase rounded-md transition-all ${activeTab === "search" ? "bg-orange-500/10 text-orange-400 border border-orange-500/20 shadow-[0_0_15px_rgba(249,115,22,0.05)]" : "text-neutral-400 hover:bg-neutral-900 border border-transparent"}`}
          >
             <Search className="w-4 h-4 shrink-0" />
             Search Workbench
          </button>
          
          <button 
             onClick={() => setActiveTab("database")}
             className={`w-full flex items-center gap-3 px-3 py-2 text-xs font-semibold font-mono uppercase rounded-md transition-all ${activeTab === "database" ? "bg-orange-500/10 text-orange-400 border border-orange-500/20 shadow-[0_0_15px_rgba(249,115,22,0.05)]" : "text-neutral-400 hover:bg-neutral-900 border border-transparent"}`}
          >
             <Database className="w-4 h-4 shrink-0" />
             Saved Cases
          </button>

          <div className="text-[10px] uppercase font-bold text-neutral-500 tracking-widest px-3 pt-4 mb-2">California Tools</div>

          <button 
             onClick={() => setActiveTab("bundling")}
             className={`w-full flex items-center gap-3 px-3 py-2 text-xs font-semibold font-mono uppercase rounded-md transition-all ${activeTab === "bundling" ? "bg-orange-500/10 text-orange-400 border border-orange-500/20 shadow-[0_0_15px_rgba(249,115,22,0.05)]" : "text-neutral-400 hover:bg-neutral-900 border border-transparent"}`}
          >
             <Sparkles className="w-4 h-4 shrink-0" />
             CA Bundling
          </button>

          <button 
             onClick={() => setActiveTab("combiner")}
             className={`w-full flex items-center gap-3 px-3 py-2 text-xs font-semibold font-mono uppercase rounded-md transition-all ${activeTab === "combiner" ? "bg-orange-500/10 text-orange-400 border border-orange-500/20 shadow-[0_0_15px_rgba(249,115,22,0.05)]" : "text-neutral-400 hover:bg-neutral-900 border border-transparent"}`}
          >
             <Layers className="w-4 h-4 shrink-0" />
             Asset Combiner
          </button>

          <button 
             onClick={() => setActiveTab("caInvestigator")}
             className={`w-full flex items-center gap-3 px-3 py-2 text-xs font-semibold font-mono uppercase rounded-md transition-all ${activeTab === "caInvestigator" ? "bg-orange-500/10 text-orange-400 border border-orange-500/20 shadow-[0_0_15px_rgba(249,115,22,0.05)]" : "text-neutral-400 hover:bg-neutral-900 border border-transparent"}`}
          >
             <BookOpen className="w-4 h-4 shrink-0" />
             CA Investigator Hub
          </button>
          <button 
             onClick={() => setActiveTab("caProbate")}
             className={`w-full flex items-center gap-3 px-3 py-2 text-xs font-semibold font-mono uppercase rounded-md transition-all ${activeTab === "caProbate" ? "bg-orange-500/10 text-orange-400 border border-orange-500/20 shadow-[0_0_15px_rgba(249,115,22,0.05)]" : "text-neutral-400 hover:bg-neutral-900 border border-transparent"}`}
          >
             <BookOpen className="w-4 h-4 shrink-0" />
             CA Probate
          </button>


          <div className="text-[10px] uppercase font-bold text-neutral-500 tracking-widest px-3 pt-4 mb-2">Outreach & Data</div>

          <button 
             onClick={() => setActiveTab("campaigns")}
             className={`w-full flex items-center gap-3 px-3 py-2 text-xs font-semibold font-mono uppercase rounded-md transition-all ${activeTab === "campaigns" ? "bg-orange-500/10 text-orange-400 border border-orange-500/20 shadow-[0_0_15px_rgba(249,115,22,0.05)]" : "text-neutral-400 hover:bg-neutral-900 border border-transparent"}`}
          >
             <Mail className="w-4 h-4 shrink-0" />
             Campaigns
          </button>

          <button 
             onClick={() => setActiveTab("trace")}
             className={`w-full flex items-center gap-3 px-3 py-2 text-xs font-semibold font-mono uppercase rounded-md transition-all ${activeTab === "trace" ? "bg-orange-500/10 text-orange-400 border border-orange-500/20 shadow-[0_0_15px_rgba(249,115,22,0.05)]" : "text-neutral-400 hover:bg-neutral-900 border border-transparent"}`}
          >
             <Radar className="w-4 h-4 shrink-0" />
             Trace & OSINT
          </button>

          <button 
             onClick={() => setActiveTab("multiState")}
             className={`w-full flex items-center gap-3 px-3 py-2 text-xs font-semibold font-mono uppercase rounded-md transition-all ${activeTab === "multiState" ? "bg-orange-500/10 text-orange-400 border border-orange-500/20 shadow-[0_0_15px_rgba(249,115,22,0.05)]" : "text-neutral-400 hover:bg-neutral-900 border border-transparent"}`}
          >
             <Globe className="w-4 h-4 shrink-0" />
             Multi-State Search
          </button>

          <button 
             onClick={() => setActiveTab("hermes")}
             className={`w-full flex items-center gap-3 px-3 py-2 text-xs font-semibold font-mono uppercase rounded-md transition-all ${activeTab === "hermes" ? "bg-orange-500/10 text-orange-400 border border-orange-500/20 shadow-[0_0_15px_rgba(249,115,22,0.05)]" : "text-neutral-400 hover:bg-neutral-900 border border-transparent"}`}
          >
             <Zap className="w-4 h-4 shrink-0" />
             Hermes
          </button>

          <button 
             onClick={() => setActiveTab("assets")}
             className={`w-full flex items-center gap-3 px-3 py-2 text-xs font-semibold font-mono uppercase rounded-md transition-all ${activeTab === "assets" ? "bg-orange-500/10 text-orange-400 border border-orange-500/20 shadow-[0_0_15px_rgba(249,115,22,0.05)]" : "text-neutral-400 hover:bg-neutral-900 border border-transparent"}`}
          >
             <FileText className="w-4 h-4 shrink-0" />
             Asset DB
          </button>

          <button 
             onClick={() => setActiveTab("regulations")}
             className={`w-full flex items-center gap-3 px-3 py-2 text-xs font-semibold font-mono uppercase rounded-md transition-all ${activeTab === "regulations" ? "bg-orange-500/10 text-orange-400 border border-orange-500/20 shadow-[0_0_15px_rgba(249,115,22,0.05)]" : "text-neutral-400 hover:bg-neutral-900 border border-transparent"}`}
          >
             <BookOpen className="w-4 h-4 shrink-0" />
             Regulations
          </button>

          <button 
             onClick={() => setActiveTab("import")}
             className={`w-full flex items-center gap-3 px-3 py-2 text-xs font-semibold font-mono uppercase rounded-md transition-all ${activeTab === "import" ? "bg-orange-500/10 text-orange-400 border border-orange-500/20 shadow-[0_0_15px_rgba(249,115,22,0.05)]" : "text-neutral-400 hover:bg-neutral-900 border border-transparent"}`}
          >
             <Upload className="w-4 h-4 shrink-0" />
             Import CSV
          </button>
        </nav>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-neutral-800 space-y-2 bg-neutral-950/40 shrink-0">
          <div className="flex justify-between items-center text-[10px] text-neutral-500">
             <span>REGION</span>
             <Badge variant="outline" className="text-[8px] uppercase tracking-wider font-mono border-neutral-800 text-orange-400">CA-ACTIVE</Badge>
          </div>
          <div className="text-[9px] text-neutral-500 text-center font-mono">
             Multi-State Region Enabled
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-grow p-8 overflow-y-auto w-full max-w-none">
        {activeTab === "intake" && (
          <ClientContractDashboard 
            prepopulatedIntake={prepopulatedIntake} 
            onClearPrepopulated={() => setPrepopulatedIntake(null)} 
          />
        )}
        
        {activeTab === "search" && (
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
        
        {/* Left Sidebar / Search Control */}
        <div className="md:col-span-4 lg:col-span-3 space-y-6">
          <Card className="border-neutral-800 shadow-sm rounded-xl overflow-hidden">
             <div className="bg-neutral-900 px-4 py-3 border-b border-neutral-800">
                <h2 className="text-sm font-semibold uppercase tracking-wider text-neutral-400 flex items-center">
                  <Search className="w-4 h-4 mr-2" />
                  New Investigation
                </h2>
             </div>
            <CardContent className="p-4 pt-6">
              <Tabs value={searchMode} onValueChange={(val) => setSearchMode(val as any)} className="w-full mb-6">
                <TabsList className="w-full grid grid-cols-2">
                  <TabsTrigger value="identity">Identity</TabsTrigger>
                  <TabsTrigger value="highValue">High-Value</TabsTrigger>
                </TabsList>
              </Tabs>
              <form onSubmit={handleSearch} className="space-y-4">
                {searchMode === "identity" && (
                  <>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-2">
                        <Label htmlFor="firstName" className="text-xs uppercase tracking-wide text-neutral-400">First Name</Label>
                        <Input 
                          id="firstName" 
                          placeholder="John" 
                          value={firstName}
                          onChange={(e) => setFirstName(e.target.value)}
                          className="font-mono text-sm"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="lastName" className="text-xs uppercase tracking-wide text-neutral-400">Last Name</Label>
                        <Input 
                          id="lastName" 
                          placeholder="Doe" 
                          value={lastName}
                          onChange={(e) => setLastName(e.target.value)}
                          className="font-mono text-sm"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="emailAddress" className="text-xs uppercase tracking-wide text-neutral-400">Email Address (Optional)</Label>
                      <Input 
                        id="emailAddress" 
                        type="email"
                        placeholder="john@example.com" 
                        value={emailAddress}
                        onChange={(e) => setEmailAddress(e.target.value)}
                        className="font-mono text-sm"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phoneNumber" className="text-xs uppercase tracking-wide text-neutral-400">Phone (Optional)</Label>
                      <Input 
                        id="phoneNumber" 
                        type="tel"
                        placeholder="(555) 555-5555" 
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                        className="font-mono text-sm"
                      />
                    </div>
                  </>
                )}
                {searchMode === "highValue" && (
                  <div className="text-sm text-neutral-400 mb-4 bg-orange-500/10 p-3 rounded-md border border-orange-500/20">
                    <Filter className="w-4 h-4 mb-2 text-orange-500" />
                    General search for high-value claims (&gt;$10,000) across state registries. Name details are not required.
                  </div>
                )}
                
                <div className="grid grid-cols-2 gap-2 pb-2">
                  <div className="space-y-2">
                    <Label htmlFor="targetState" className="text-xs uppercase tracking-wide text-neutral-400">State Filter</Label>
                    <select 
                      id="targetState"
                      value={targetState}
                      onChange={e => setTargetState(e.target.value)}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <option value="">All States</option>
                      {AVAILABLE_STATES.map(st => (
                        <option key={st} value={st}>{st}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="assetType" className="text-xs uppercase tracking-wide text-neutral-400">Asset Type</Label>
                    <select 
                      id="assetType"
                      value={assetType}
                      onChange={e => setAssetType(e.target.value)}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <option value="">All Types</option>
                      {ASSET_TYPES.map(type => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-2 pb-2">
                  <Label htmlFor="recordLimit" className="text-xs uppercase tracking-wide text-neutral-400">Records Returned</Label>
                  <Input
                    id="recordLimit"
                    type="number"
                    min={1}
                    max={100}
                    value={recordLimit}
                    onChange={(e) => setRecordLimit(Math.max(1, Math.min(100, Number(e.target.value) || 1)))}
                    className="font-mono text-sm"
                  />
                </div>

                <Button 
                  type="submit" 
                  disabled={isSearching} 
                  className="w-full bg-orange-600 hover:bg-orange-700 text-white shadow-sm transition-colors"
                >
                  {isSearching ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
                  Execute Search
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card className="border-neutral-800 shadow-sm rounded-xl overflow-hidden">
            <div className="bg-neutral-900 px-4 py-3 border-b border-neutral-800">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-neutral-400 flex items-center">
                <Database className="w-4 h-4 mr-2" />
                Batch Search
              </h2>
            </div>
            <CardContent className="p-4 pt-5 space-y-3">
              <Textarea
                value={batchInput}
                onChange={(e) => setBatchInput(e.target.value)}
                placeholder={"Jane,Doe,CA\nJohn,Smith,TX"}
                className="min-h-28 font-mono text-xs"
              />
              <div className="text-xs text-neutral-500">Batch uses the Records Returned value as the total cap.</div>
              {batchMessage && <div className="text-xs text-neutral-400">{batchMessage}</div>}
              <Button
                type="button"
                variant="outline"
                onClick={handleBatchSearch}
                disabled={isBatchSearching}
                className="w-full"
              >
                {isBatchSearching ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Network className="mr-2 h-4 w-4" />}
                Run Batch
              </Button>
            </CardContent>
          </Card>

          {/* Quick Stats Panel */}
          {hasSearched && !isSearching && (
            <div className="space-y-4">
              <div className="bg-neutral-900/40 backdrop-blur-md border-neutral-800 p-4 rounded-xl shadow-sm border border-neutral-800">
                 <div className="text-xs uppercase tracking-wider text-neutral-400 mb-1">Total Assets Found</div>
                 <div className="text-3xl font-light tracking-tight text-neutral-100">
                    ${totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                 </div>
                 <div className="text-sm text-neutral-400 mt-1">{assets.length} claims across selected states</div>
              </div>
              <div className="bg-neutral-900/40 backdrop-blur-md border-neutral-800 p-4 rounded-xl shadow-sm border border-neutral-800">
                 <div className="text-xs uppercase tracking-wider text-neutral-400 mb-1">Skip Trace Results</div>
                 <div className="text-2xl font-light tracking-tight text-neutral-100">
                    {relatives.length}
                 </div>
                 <div className="text-sm text-neutral-400 mt-1">potential family matches</div>
              </div>
            </div>
          )}
        </div>

        {/* Main Content Area */}
        <div className="md:col-span-8 lg:col-span-9">
          {error && (
            <Alert variant="destructive" className="mb-6">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {isSearching && (
             <div className="h-64 flex flex-col items-center justify-center text-neutral-500 space-y-4">
                <Loader2 className="h-8 w-8 animate-spin" />
                <div className="font-mono text-sm uppercase tracking-widest animate-pulse">Querying State Databases...</div>
             </div>
          )}

          {!isSearching && !hasSearched && (
            <div className="h-[60vh] flex flex-col items-center justify-center text-center p-8 border-2 border-dashed border-neutral-800 rounded-xl bg-neutral-900/40 backdrop-blur-md border-neutral-800">
               <div className="bg-orange-500/10 p-4 rounded-full mb-4">
                  <Search className="h-8 w-8 text-orange-500" />
               </div>
               <h3 className="text-xl font-medium text-neutral-200 mb-2">Initiate Asset Search</h3>
               <p className="text-neutral-400 max-w-sm">Enter a name to scan available state databases for unclaimed property, or switch to High-Value general mode.</p>
            </div>
          )}

          {!isSearching && hasSearched && assets.length === 0 && (
            <div className="h-64 flex flex-col items-center justify-center text-neutral-400 bg-neutral-900/40 backdrop-blur-md border-neutral-800 border border-neutral-800 rounded-xl">
               <Search className="h-8 w-8 mb-4 opacity-50" />
               <p className="text-lg">No assets found for your search criteria in the selected states.</p>
            </div>
          )}

          {!isSearching && hasSearched && assets.length > 0 && (
            <Tabs defaultValue="assets" className="w-full">
              <TabsList className="mb-6 bg-neutral-900/40 backdrop-blur-md border-neutral-800 border border-neutral-800 p-1">
                <TabsTrigger value="assets" className="data-[state=active]:bg-orange-500/10 data-[state=active]:text-orange-400 rounded-md">
                   <DollarSign className="w-4 h-4 mr-2" />
                   Unclaimed Assets
                   <Badge variant="secondary" className="ml-2 bg-orange-500/20 text-orange-400">{assets.length}</Badge>
                </TabsTrigger>
                <TabsTrigger value="family" className="data-[state=active]:bg-orange-500/10 data-[state=active]:text-orange-400 rounded-md">
                   <Users className="w-4 h-4 mr-2" />
                   Skip Tracing
                   <Badge variant="secondary" className="ml-2 bg-orange-500/20 text-orange-400">{relatives.length}</Badge>
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="assets" className="space-y-4">
                <Card className="border-neutral-800 shadow-sm overflow-hidden">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader className="bg-neutral-900/50">
                        <TableRow className="border-neutral-800">
                          <TableHead className="font-mono text-xs uppercase text-neutral-400 tracking-wider">Claim Owner</TableHead>
                          <TableHead className="font-mono text-xs uppercase text-neutral-400 tracking-wider">ID Tag</TableHead>
                          <TableHead className="font-mono text-xs uppercase text-neutral-400 tracking-wider">Type</TableHead>
                          <TableHead className="font-mono text-xs uppercase text-neutral-400 tracking-wider">Holder</TableHead>
                          <TableHead className="font-mono text-xs uppercase text-neutral-400 tracking-wider">Location</TableHead>
                          <TableHead 
                            className="font-mono text-xs uppercase text-neutral-400 tracking-wider text-right cursor-pointer hover:text-neutral-100 group"
                            onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
                          >
                            <div className="flex items-center justify-end">
                              Amount
                              {sortOrder === "asc" ? <ChevronUp className="w-3 h-3 ml-1" /> : <ChevronDown className="w-3 h-3 ml-1" />}
                            </div>
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {sortedAssets.map((asset) => (
                          <TableRow key={asset.id} className="hover:bg-orange-500/10 transition-colors group">
                            <TableCell className="font-medium">
                              {asset.name}
                              <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 mt-1">
                                <button onClick={() => handleBeginCRMIntake(asset)} className="text-[10px] bg-emerald-600 text-white px-2 py-0.5 rounded hover:bg-emerald-700">Begin CRM Intake</button>
                                <button onClick={() => handleAddLeadFromAsset(asset)} className="text-[10px] bg-orange-600 text-white px-2 py-0.5 rounded hover:bg-orange-700">Add Lead</button>
                                <button onClick={() => handleQuickCampaign(asset)} className="text-[10px] bg-indigo-600 text-white px-2 py-0.5 rounded hover:bg-indigo-700">Campaign</button>
                              </div>
                            </TableCell>
                            <TableCell className="font-mono text-xs text-orange-300">
                              {asset.stateId || asset.id}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="font-normal text-neutral-400 bg-neutral-900/40 backdrop-blur-md border-neutral-800">
                                {asset.type}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-neutral-400">{asset.holderCompany}</TableCell>
                            <TableCell>
                              <div className="flex items-center text-neutral-400">
                                <MapPin className="w-3 h-3 mr-1 opacity-50" />
                                {asset.state}
                              </div>
                              {asset.sourceUrl && (
                                <a href={asset.sourceUrl} target="_blank" rel="noreferrer" className="text-[11px] text-orange-400 hover:text-orange-300">
                                  Source
                                </a>
                              )}
                            </TableCell>
                            <TableCell className="text-right font-mono font-medium text-green-700">
                              ${asset.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </Card>
              </TabsContent>

              <TabsContent value="family" className="space-y-4">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                   {relatives.map((relative) => (
                     <Card key={relative.id} className="border-neutral-800 shadow-sm hover:border-orange-300 transition-all group">
                       <CardHeader className="pb-2">
                         <div className="flex justify-between items-start">
                           <div>
                             <CardTitle className="text-lg flex items-center">
                               {relative.name}
                             </CardTitle>
                             <CardDescription className="flex items-center mt-1 flex-wrap gap-2">
                               <Badge variant="secondary" className="font-normal text-xs">{relative.relation}</Badge>
                               <span className="text-xs text-neutral-500">Match: {relative.matchConfidence}%</span>
                               {relative.relatedTo && (
                                 <span className="text-xs text-neutral-400 w-full mt-1">Related to: <span className="font-medium text-neutral-300">{relative.relatedTo}</span></span>
                               )}
                             </CardDescription>
                           </div>
                           <div className="text-xs text-neutral-500 flex items-center">
                              <MapPin className="w-3 h-3 mr-1" />
                              {relative.location}
                           </div>
                         </div>
                       </CardHeader>
                       <CardContent>
                         <div className="space-y-2 mt-2">
                            <div className="flex justify-between text-sm">
                               <span className="text-neutral-400">Phone:</span>
                               <span className="font-mono text-neutral-300">{relative.phone}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                               <span className="text-neutral-400">Email:</span>
                               <span className="text-neutral-300 truncate ml-4">{relative.email}</span>
                            </div>
                         </div>
                         <Separator className="my-4" />
                         <Button 
                           variant="outline" 
                           onClick={() => handleDraftEmail(relative)}
                           className="w-full flex items-center justify-center group-hover:bg-orange-500/20 group-hover:text-orange-400 group-hover:border-orange-200 transition-colors"
                         >
                           <Mail className="w-4 h-4 mr-2" />
                           Draft Outreach Email
                         </Button>
                       </CardContent>
                     </Card>
                   ))}
                   {relatives.length === 0 && (
                      <div className="col-span-full p-8 text-center text-neutral-400 border border-neutral-800 rounded-xl bg-neutral-900/40 backdrop-blur-md border-neutral-800">
                         No real skip-trace provider is connected yet.
                      </div>
                   )}
                 </div>
              </TabsContent>
            </Tabs>
          )}

          {/* Action Bar for Results */}
          {!isSearching && hasSearched && assets.length > 0 && (
            <div className="mt-6 flex justify-end">
               <Button onClick={() => setSaveDialogOpen(true)} className="bg-orange-600 hover:bg-orange-700 text-white shadow-sm">
                  <Save className="w-4 h-4 mr-2" />
                  Save to Category
               </Button>
            </div>
          )}
        </div>
          </div>
        )}
        {activeTab === "regulations" && <RegulationsPage />}

        {activeTab === "caInvestigator" && <CAInvestigatorCenter onSwitchTab={(tab) => setActiveTab(tab as any)} />}
        {activeTab === "caProbate" && <CAProbateSmallEstate />}

        {activeTab === "bundling" && <BundledWorkbench onSwitchTab={(tab) => setActiveTab(tab as any)} />}

        {activeTab === "combiner" && <AssetCombiner onSwitchTab={(tab) => setActiveTab(tab as any)} />}

        {activeTab === "assets" && <AssetsPage />}

        {activeTab === "campaigns" && <CampaignsPage />}

        {activeTab === "database" && (() => {
           const filteredCases = savedCases.filter(c => dbStateFilter === "" || c.assets.some(a => a.state === dbStateFilter));
           const dueCount = savedCases.filter(c => !c.nextRescanAt || c.nextRescanAt <= Date.now()).length;
           return (
           <div className="space-y-6">
             <h2 className="text-2xl font-light tracking-tight text-neutral-100 mb-6 flex justify-between items-center">
                Saved Investigations
                <div className="flex items-center space-x-4">
                   <Button
                     variant="outline"
                     size="sm"
                     disabled={dueCount === 0 || Boolean(rescanningCaseId)}
                     onClick={handleRescanDueCases}
                   >
                     {rescanningCaseId ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Radar className="w-4 h-4 mr-2" />}
                     Rescan Due ({dueCount})
                   </Button>
                   <select 
                      value={dbStateFilter}
                      onChange={e => setDbStateFilter(e.target.value)}
                      className="flex h-9 rounded-md border border-input bg-neutral-900/40 backdrop-blur-md border-neutral-800 px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                   >
                      <option value="">All States</option>
                      {AVAILABLE_STATES.map(st => (
                        <option key={st} value={st}>{st}</option>
                      ))}
                   </select>
                   <Badge variant="secondary" className="font-normal">{filteredCases.length} Total</Badge>
                </div>
             </h2>
             {filteredCases.length === 0 ? (
                <div className="text-center py-12 px-4 border border-dashed border-neutral-700 rounded-xl bg-neutral-900/40 backdrop-blur-md border-neutral-800">
                   <Database className="w-12 h-12 text-neutral-600 mx-auto mb-4" />
                   <h3 className="text-lg font-medium text-neutral-100">{savedCases.length === 0 ? "No saved cases yet" : "No cases match filter"}</h3>
                   <p className="text-neutral-400 mt-1 max-w-sm mx-auto">
                     {savedCases.length === 0 ? "Run a search and click \"Save to Category\" to build your database of leads." : "Try clearing the state filter to see more saved investigations."}
                   </p>
                   <Button onClick={() => {
                     if (savedCases.length === 0) setActiveTab("search");
                     else setDbStateFilter("");
                   }} className="mt-4" variant="outline">
                     {savedCases.length === 0 ? "Start Searching" : "Clear Filter"}
                   </Button>
                </div>
             ) : (
                <div className="grid grid-cols-1 gap-6">
                   {filteredCases.map((savedCase) => {
                      const totalAmount = savedCase.assets.reduce((sum, a) => sum + a.amount, 0);
                      return (
                         <Card key={savedCase.id} className="border-neutral-800">
                            <CardHeader className="bg-neutral-900/50 border-b border-neutral-800 flex flex-row items-center justify-between py-4">
                               <div>
                                 <CardTitle className="text-lg text-orange-300">{savedCase.categoryName}</CardTitle>
                                 <CardDescription className="font-mono text-xs mt-1">
                                    ID: {savedCase.id} | Saved on {new Date(savedCase.createdAt).toLocaleDateString()}
                                 </CardDescription>
                               </div>
                               <div className="flex items-center gap-2">
                                 <select
                                   value={savedCase.status}
                                   onChange={(e) => handleStatusChange(savedCase.id, e.target.value as CaseStatus)}
                                   className="flex h-9 rounded-md border border-input bg-neutral-900/40 backdrop-blur-md border-neutral-800 px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                 >
                                   {CASE_STATUSES.map(status => (
                                     <option key={status.value} value={status.value}>{status.label}</option>
                                   ))}
                                 </select>
                                 <Button
                                   variant="outline"
                                   size="sm"
                                   onClick={() => handleOpenHermesAgent(savedCase)}
                                   className="bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 border border-orange-500/20 shadow-[0_0_15px_rgba(249,115,22,0.05)] transition-all font-semibold"
                                 >
                                   <Zap className="w-3.5 h-3.5 mr-1 text-orange-500 animate-pulse" />
                                   Hermes Agent
                                 </Button>
                                 <Button
                                   variant="outline"
                                   size="sm"
                                   onClick={() => handleRescanCase(savedCase)}
                                   disabled={rescanningCaseId === savedCase.id}
                                 >
                                   {rescanningCaseId === savedCase.id ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Radar className="w-4 h-4 mr-2" />}
                                   Rescan
                                 </Button>
                                 <Button variant="ghost" className="text-red-400 hover:bg-red-500/10 hover:text-red-300" onClick={() => handleDeleteCase(savedCase.id)}>Delete</Button>
                               </div>
                            </CardHeader>
                             <CardContent className="p-0">
                                <div className="grid grid-cols-1 lg:grid-cols-5 divide-y lg:divide-y-0 lg:divide-x divide-neutral-800">
                                   <div className="p-6 lg:col-span-1">
                                      <div className="text-xs uppercase tracking-wider text-neutral-400 mb-1">Total Value Found</div>
                                      <div className="text-2xl font-light text-emerald-400">${totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
                                      <div className="text-sm text-neutral-400 mt-1">{savedCase.assets.length} identified assets</div>
                                      <div className="text-xs text-neutral-500 mt-3">
                                        Last rescan: {savedCase.lastRescannedAt ? new Date(savedCase.lastRescannedAt).toLocaleDateString() : "Not yet"}
                                      </div>
                                      <div className="text-xs text-neutral-500">
                                        Next rescan: {savedCase.nextRescanAt ? new Date(savedCase.nextRescanAt).toLocaleDateString() : "Due now"}
                                      </div>
                                   </div>
                                   <div className="p-6 lg:col-span-1 space-y-4">
                                      <div className="font-medium text-neutral-100 text-sm uppercase tracking-wide">Assets by State</div>
                                      <div className="flex flex-col gap-2">
                                         {Array.from(new Set(savedCase.assets.map(a => a.state))).map(state => {
                                            const stateAssets = savedCase.assets.filter(a => a.state === state);
                                            const stateTotal = stateAssets.reduce((s, a) => s + a.amount, 0);
                                            return (
                                               <Dialog key={state}>
                                                  <DialogTrigger className={cn(buttonVariants({ variant: "outline" }), "w-full h-auto py-2 px-3 flex flex-col items-start gap-1 text-left")}>
                                                        <span className="font-bold text-neutral-100">{state}</span>
                                                        <span className="text-[10px] text-neutral-400">{stateAssets.length} claims</span>
                                                        <span className="text-[10px] font-mono text-emerald-400">${stateTotal.toLocaleString('en-US')}</span>
                                                  </DialogTrigger>
                                                  <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                                                     <DialogHeader>
                                                        <DialogTitle>Claims in {state}</DialogTitle>
                                                        <DialogDescription>{savedCase.categoryName} - {STATE_RULES[state]?.name}</DialogDescription>
                                                     </DialogHeader>
                                                     <div className="my-4">
                                                         <Table>
                                                            <TableHeader>
                                                               <TableRow>
                                                                  <TableHead>Holder</TableHead>
                                                                  <TableHead>Claim Owner</TableHead>
                                                                  <TableHead>ID Tag</TableHead>
                                                                  <TableHead>Type</TableHead>
                                                                  <TableHead className="text-right">Amount</TableHead>
                                                                  <TableHead className="text-center">Pipeline Actions</TableHead>
                                                               </TableRow>
                                                            </TableHeader>
                                                            <TableBody>
                                                               {stateAssets.map(asset => (
                                                                  <TableRow key={asset.id} className="hover:bg-neutral-900 transition-colors">
                                                                     <TableCell>{asset.holderCompany}</TableCell>
                                                                     <TableCell className="font-medium">{asset.name}</TableCell>
                                                                     <TableCell className="font-mono text-xs text-orange-300">{asset.stateId || asset.id}</TableCell>
                                                                     <TableCell>{asset.type}</TableCell>
                                                                     <TableCell className="text-right font-mono">${asset.amount.toLocaleString()}</TableCell>
                                                                     <TableCell className="text-center">
                                                                        <div className="flex justify-center gap-1.5">
                                                                           <button onClick={() => handleBeginCRMIntake(asset)} className="text-[10px] bg-emerald-600 text-white px-2 py-1 rounded hover:bg-emerald-700 font-semibold transition-colors">Intake</button>
                                                                           <button onClick={() => handleAddLeadFromAsset(asset)} className="text-[10px] bg-orange-600 text-white px-2 py-1 rounded hover:bg-orange-700 font-semibold transition-colors">Add Lead</button>
                                                                           <button onClick={() => handleQuickCampaign(asset)} className="text-[10px] bg-indigo-600 text-white px-2 py-1 rounded hover:bg-indigo-700 font-semibold transition-colors">Campaign</button>
                                                                        </div>
                                                                     </TableCell>
                                                                  </TableRow>
                                                               ))}
                                                            </TableBody>
                                                         </Table>
                                                     </div>
                                                  </DialogContent>
                                               </Dialog>
                                            );
                                         })}
                                      </div>
                                   </div>

                                   {/* Column 3: Enriched Leads & Heirs */}
                                   <div className="p-6 lg:col-span-2 space-y-4">
                                      <div className="font-medium text-neutral-100 text-sm uppercase tracking-wide flex items-center gap-1.5">
                                         <Users className="w-4 h-4 text-orange-400" />
                                         Enriched Leads & Heirs ({
                                           (casesEnrichment[savedCase.categoryName]?.leads?.length || 0) +
                                           (casesEnrichment[savedCase.categoryName]?.relatives?.length || 0)
                                         })
                                      </div>
                                      <div className="space-y-3 max-h-40 overflow-y-auto pr-1 custom-scrollbar">
                                         {/* Render Leads */}
                                         {casesEnrichment[savedCase.categoryName]?.leads?.map((lead) => (
                                            <div key={lead.id} className="p-3 bg-neutral-950 rounded border border-neutral-800 text-xs space-y-1.5">
                                               <div className="flex justify-between items-start">
                                                  <div>
                                                     <span className="font-semibold text-neutral-200 uppercase font-mono">{lead.full_name}</span>
                                                     <span className="text-[10px] text-neutral-500 block capitalize">{lead.relation || "Owner"}</span>
                                                  </div>
                                                  <Badge variant="outline" className="text-[9px] border-emerald-500/30 text-emerald-400 bg-emerald-500/5 font-mono">
                                                     {Math.round((lead.confidence || 0) * 100)}% Match
                                                  </Badge>
                                               </div>
                                               <div className="text-[11px] text-neutral-400 space-y-0.5">
                                                  {lead.phone && <div className="font-mono text-[10px]">📞 {lead.phone}</div>}
                                                  {lead.email && <div className="font-mono text-[10px]">✉️ {lead.email}</div>}
                                                  {lead.address && <div className="truncate" title={lead.address}>📍 {lead.address}</div>}
                                               </div>
                                               <div className="flex gap-1.5 pt-1 border-t border-neutral-900/60">
                                                  <button
                                                     onClick={() => {
                                                        const type = detectClaimantType(lead.full_name);
                                                        const parts = lead.full_name.trim().split(/\s+/).filter(Boolean);
                                                        const fName = type === "business" ? "" : (parts.slice(0, -1).join(" ") || lead.full_name);
                                                        const lName = type === "business" ? "" : (parts.at(-1) || "");
                                                        const bName = type === "business" ? lead.full_name : "";
                                                        setPrepopulatedIntake({
                                                           claimantType: type,
                                                           firstName: fName,
                                                           lastName: lName,
                                                           businessName: bName,
                                                           assetOwner: lead.full_name,
                                                           holderCompany: "California SCO",
                                                           claimState: lead.state || "CA",
                                                           propertyId: lead.asset_id ? `api-ast-${lead.asset_id}` : "Unknown",
                                                           estimatedValue: "Unknown",
                                                           feePercent: "10"
                                                        });
                                                        setActiveTab("intake");
                                                     }}
                                                     className="text-[9px] bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-2 py-0.5 rounded transition-colors"
                                                  >
                                                     Intake
                                                  </button>
                                                  <button
                                                     onClick={async () => {
                                                        try {
                                                           const mappedAsset = {
                                                              id: lead.asset_id ? `api-ast-${lead.asset_id}` : `api-ast-${Math.random().toString(36).slice(2)}`,
                                                              name: lead.full_name,
                                                              address: lead.address || "",
                                                              state: lead.state || "CA",
                                                              type: "Bank Account" as any,
                                                              holderCompany: "California SCO",
                                                              amount: 0,
                                                           };
                                                           const result = await autoLeadAndCampaign(mappedAsset, { channel: "mixed", execute: true });
                                                           alert(`Campaign outreach initiated! Queued ${result.queued.queued || 0}.`);
                                                           setActiveTab("campaigns");
                                                        } catch (err: any) {
                                                           alert(`Campaign trigger failed: ${err.message}`);
                                                        }
                                                     }}
                                                     className="text-[9px] bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-2 py-0.5 rounded transition-colors"
                                                  >
                                                     Campaign
                                                  </button>
                                               </div>
                                            </div>
                                         ))}
                                         
                                         {/* Render Relatives */}
                                         {casesEnrichment[savedCase.categoryName]?.relatives?.map((rel) => (
                                            <div key={rel.id} className="p-3 bg-neutral-950 rounded border border-neutral-900 text-xs space-y-1 hover:border-orange-500/25 transition-all">
                                               <div className="flex justify-between items-start">
                                                  <div>
                                                     <span className="font-semibold text-neutral-300 uppercase font-mono">{rel.full_name}</span>
                                                     <span className="text-[9px] text-neutral-500 block capitalize">{rel.relation_type?.replace(/_/g, " ") || "Relative"}</span>
                                                  </div>
                                                  <Badge variant="outline" className="text-[9px] font-mono border-neutral-800 text-neutral-400">
                                                     {Math.round((rel.confidence || 0) * 100)}% match
                                                  </Badge>
                                               </div>
                                               <div className="text-[10px] text-neutral-500">
                                                  Source: {rel.source}
                                               </div>
                                               <div className="flex gap-1.5 pt-1 border-t border-neutral-900/60">
                                                  <button
                                                     onClick={async () => {
                                                        try {
                                                           const mappedAsset = {
                                                              id: rel.asset_id ? `api-ast-${rel.asset_id}` : `api-ast-${Math.random().toString(36).slice(2)}`,
                                                              name: rel.full_name,
                                                              address: "",
                                                              state: "CA",
                                                              type: "Bank Account" as any,
                                                              holderCompany: "California SCO",
                                                              amount: 0,
                                                           };
                                                           const { createLeadFromAsset } = await import("./services/apiClient");
                                                           const lId = await createLeadFromAsset(mappedAsset, { full_name: rel.full_name, relation: "relative" });
                                                           alert(`Lead created for relative: ${rel.full_name} (#${lId})`);
                                                           fetchCasesEnrichment(savedCases);
                                                        } catch (err: any) {
                                                           alert(`Lead creation failed: ${err.message}`);
                                                        }
                                                     }}
                                                     className="text-[9px] bg-orange-600 hover:bg-orange-700 text-white px-2.5 py-0.5 rounded transition-colors font-semibold"
                                                  >
                                                     Add Lead
                                                  </button>
                                               </div>
                                            </div>
                                         ))}
                                         
                                         {(!casesEnrichment[savedCase.categoryName]?.leads?.length && !casesEnrichment[savedCase.categoryName]?.relatives?.length) && (
                                            <div className="py-8 text-center text-xs text-neutral-500 border border-dashed border-neutral-800 rounded">
                                               No enriched leads or heirs skip-traced yet.
                                               <div className="mt-1 text-[10px] text-neutral-600">Click "Hermes Agent" to locate contacts.</div>
                                            </div>
                                         )}
                                      </div>
                                   </div>

                                   {/* Column 4: Notes & Research Logs */}
                                   <div className="p-6 lg:col-span-1 space-y-4">
                                      <div className="flex items-center justify-between">
                                         <div className="font-medium text-neutral-100 text-sm uppercase tracking-wide flex items-center gap-1.5">
                                            <FileText className="w-4 h-4 text-orange-400" />
                                            Research Notes
                                         </div>
                                         <div className="flex items-center gap-2">
                                            <label className="cursor-pointer bg-neutral-900 border border-neutral-800 hover:bg-neutral-800 text-[10px] font-semibold text-neutral-300 hover:text-neutral-100 h-6 px-1.5 rounded flex items-center gap-1 transition-colors">
                                               <Upload className="w-3 h-3 text-orange-400" />
                                               Upload Note
                                               <input
                                                  type="file"
                                                  accept=".md,.txt"
                                                  className="hidden"
                                                  onChange={(e) => handleUploadNotesFile(savedCase.id, e)}
                                               />
                                            </label>
                                         </div>
                                      </div>

                                      <textarea
                                         value={savedCase.notes || ""}
                                         onChange={(e) => handleSaveNotes(savedCase.id, e.target.value)}
                                         placeholder="Type research notes..."
                                         className="w-full h-36 text-xs rounded border border-neutral-800 bg-neutral-950 p-2 text-neutral-200 placeholder-neutral-700 focus:ring-orange-500 font-sans resize-y"
                                      />

                                      {savedCase.notes && (
                                         <div className="text-[9px] text-neutral-500 flex items-center gap-1">
                                            <BookOpen className="w-3 h-3" /> Auto-saved.
                                         </div>
                                      )}
                                   </div>
                                </div>
                             </CardContent>
                          </Card>
                      )
                   })}
                </div>
               )}
             </div>
            );
         })()}

        {activeTab === "trace" && <TraceConsole />}

        {activeTab === "multiState" && <MultiStateSearch />}

        {activeTab === "hermes" && <HermesAgentPage />}
        {activeTab === "import" && <UploadCSV />}

      </main>

      {/* Save Dialog */}
      <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
        <DialogContent>
          <DialogHeader>
             <DialogTitle>Save to Category</DialogTitle>
             <DialogDescription>Create a tracking category to save this database query result.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 my-2">
             <div className="space-y-2">
                <Label htmlFor="categoryName">Account / Category Name</Label>
                <Input 
                   id="categoryName" 
                   autoFocus
                   placeholder="e.g. John Doe Estate" 
                   value={saveCategoryName} 
                   onChange={e => setSaveCategoryName(e.target.value)} 
                />
             </div>
             <div className="flex items-center space-x-2 pt-2">
                <input 
                   type="checkbox" 
                   id="proceedToIntake" 
                   checked={proceedToIntake}
                   onChange={e => setProceedToIntake(e.target.checked)}
                   className="h-4 w-4 rounded border-neutral-700 bg-neutral-950 accent-orange-500"
                />
                <Label htmlFor="proceedToIntake" className="text-sm font-normal text-neutral-300 cursor-pointer">
                   Proceed to CRM Intake immediately after saving
                </Label>
             </div>
          </div>
          <DialogFooter>
             <Button variant="outline" onClick={() => setSaveDialogOpen(false)}>Cancel</Button>
             <Button onClick={handleSaveCase} className="bg-orange-600 hover:bg-orange-700">Save Investigation</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Email Generation Dialog */}
      <Dialog open={emailDialogOpen} onOpenChange={setEmailDialogOpen}>
        <DialogContent className="sm:max-w-[700px] h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <Mail className="w-5 h-5 mr-2 text-orange-500" />
              Generated Outreach Email
            </DialogTitle>
            <DialogDescription>
              Drafted for {selectedRelative?.name} ({selectedRelative?.relation}) regarding {searchMode === "highValue" ? "the unclaimed property owner" : `${firstName} ${lastName}`}.
            </DialogDescription>
          </DialogHeader>
          <div className="relative flex-grow flex flex-col mt-4">
            {isDraftingEmail ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-neutral-900/50 rounded-md border border-neutral-800">
                 <Loader2 className="h-8 w-8 animate-spin text-orange-500 mb-4" />
                 <p className="text-sm font-medium text-neutral-400">AI is crafting a professional email...</p>
                 <p className="text-xs text-neutral-500 mt-2">Analyzing asset details and relationship.</p>
              </div>
            ) : (
              <div className="h-full">
                <RichTextEditor 
                   content={draftedEmail}
                   onChange={(content) => setDraftedEmail(content)}
                />
              </div>
            )}
          </div>
          <DialogFooter className="mt-4 sm:justify-between flex-row items-center border-t border-neutral-800 pt-4">
             <div className="text-xs text-neutral-400 flex items-center">
                <AlertCircle className="w-3 h-3 mr-1" />
                Review and edit carefully before sending
             </div>
             <div className="space-x-2">
                <Button variant="outline" onClick={() => setEmailDialogOpen(false)}>Close</Button>
                <Button 
                   onClick={copyToClipboard} 
                   disabled={isDraftingEmail || !draftedEmail}
                   className="bg-orange-600 hover:bg-orange-700 text-white"
                >
                   {copied ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
                   {copied ? "Copied!" : "Copy to Clipboard"}
                </Button>
             </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Hermes Case Agent Dialog */}
      <Dialog open={hermesDialogOpen} onOpenChange={setHermesDialogOpen}>
        <DialogContent className="max-w-[98vw] w-[98vw] h-[95vh] flex flex-col border-neutral-800 bg-neutral-950/95 backdrop-blur-md text-neutral-100 p-0 overflow-hidden">
          <DialogHeader className="p-5 border-b border-neutral-800 flex flex-row items-center justify-between">
            <div>
              <DialogTitle className="text-lg font-light tracking-tight text-neutral-100 flex items-center gap-2">
                <Zap className="w-5 h-5 text-orange-500 animate-pulse" />
                Hermes Case Agent: <span className="text-orange-400 uppercase font-mono font-bold">{hermesCase?.categoryName}</span>
              </DialogTitle>
              <DialogDescription className="text-xs text-neutral-400 mt-1">
                Real-time browser skip tracing & relative research for heirs and contacts.
              </DialogDescription>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 bg-neutral-900 border border-neutral-800 rounded px-2.5 py-1 text-xs">
                <Key className="w-3.5 h-3.5 text-neutral-400" />
                <input
                  type="password"
                  placeholder="OpenAI API Key (sk-...)"
                  value={openaiKey}
                  onChange={(e) => {
                    setOpenaiKey(e.target.value);
                    localStorage.setItem("lostassets:openai_api_key", e.target.value);
                  }}
                  className="bg-transparent border-none text-xs text-neutral-200 focus:outline-none w-48 font-mono placeholder:text-neutral-600"
                />
              </div>
              <Badge variant="outline" className="mr-6 font-mono text-[10px] border-orange-500/20 text-orange-400 bg-orange-500/5 shrink-0">
                CA-ENRICHMENT-SESSION
              </Badge>
            </div>
          </DialogHeader>

          <div className="flex-1 grid grid-cols-1 md:grid-cols-5 divide-y md:divide-y-0 md:divide-x divide-neutral-800 overflow-hidden">
            {/* Left Panel: Chat Log (3 columns) */}
            <div className="md:col-span-3 flex flex-col h-full overflow-hidden bg-neutral-950/40">
              <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                {hermesMessages.map((m, i) => (
                  <div key={i} className={`flex gap-3 ${m.role === "user" ? "flex-row-reverse" : ""}`}>
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-xs font-bold ${m.role === "user" ? "bg-orange-600 text-white" : "bg-indigo-600 text-white"}`}>
                      {m.role === "user" ? "U" : "H"}
                    </div>
                    <div className={`max-w-[85%] rounded-lg px-3 py-2 text-xs whitespace-pre-line ${m.role === "user" ? "bg-orange-500/10 text-orange-200 border border-orange-500/20" : "bg-neutral-900/60 text-neutral-200 border border-neutral-800"}`}>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[9px] font-mono uppercase opacity-50">{m.role}</span>
                        <span className="text-[9px] font-mono opacity-40">{m.timestamp}</span>
                      </div>
                      {m.text}
                      {m.log && m.log.length > 0 && (
                        <div className="mt-2 pt-2 border-t border-neutral-800/80 space-y-1">
                          {m.log.map((l, j) => (
                            <div key={j} className="text-[10px] font-mono text-neutral-400 flex items-start gap-1">
                              <ChevronRight className="w-3 h-3 mt-0.5 text-orange-500 shrink-0" />
                              {l}
                            </div>
                          ))}
                        </div>
                      )}
                      {m.error && (
                        <div className="mt-2 text-[10px] text-red-400 font-mono">{m.error}</div>
                      )}
                    </div>
                  </div>
                ))}
                {hermesLoading && (
                  <div className="flex gap-3">
                    <div className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center shrink-0 text-xs font-bold">
                      H
                    </div>
                    <div className="bg-neutral-900/60 border border-neutral-800 rounded-lg px-3 py-2 flex items-center gap-2">
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-orange-500" />
                      <span className="text-xs text-neutral-400 font-mono animate-pulse">Running Playwright Solvers & Cheerio Scrapers...</span>
                    </div>
                  </div>
                )}
              </div>

              <Separator className="bg-neutral-800" />

              {/* Chat Input */}
              <form onSubmit={handleHermesSubmit} className="p-3 flex gap-2 bg-neutral-950">
                <Input
                  placeholder="Command Hermes: enrich case, draft outreach, maigret..."
                  value={hermesInput}
                  onChange={(e) => setHermesInput(e.target.value)}
                  className="flex-1 bg-neutral-900 border-neutral-800 text-neutral-200 placeholder:text-neutral-500 font-mono text-xs"
                />
                <Button type="submit" disabled={hermesLoading} className="bg-orange-600 hover:bg-orange-700 text-white text-xs px-3">
                  Send
                </Button>
              </form>
            </div>

            {/* Right Panel: Discovered Leads / Heirs Summary (2 columns) */}
            <div className="md:col-span-2 flex flex-col h-full overflow-hidden bg-neutral-900/10">
              <div className="p-4 border-b border-neutral-800 bg-neutral-950/40">
                <h4 className="text-xs uppercase font-bold tracking-wider text-neutral-400 flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-orange-400" />
                  Discovered Contact Leads ({hermesLeads.length + hermesRelatives.length})
                </h4>
                <p className="text-[10px] text-neutral-500 mt-0.5">Enriched via public registers search & OSINT.</p>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                {/* Owners / Leads list */}
                {hermesLeads.length > 0 && (
                  <div className="space-y-3">
                    <div className="text-[10px] uppercase font-bold text-neutral-500 tracking-wider">Primary Target (Owner)</div>
                    {hermesLeads.map((lead) => (
                      <Card key={lead.id} className="border-neutral-800 bg-neutral-950 p-3 space-y-2">
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="font-semibold text-neutral-200 text-xs font-mono uppercase">{lead.full_name}</div>
                            <span className="text-[10px] text-neutral-500 capitalize">{lead.relation || "Owner"}</span>
                          </div>
                          <Badge variant="outline" className="text-[9px] border-emerald-500/30 text-emerald-400 bg-emerald-500/5 font-mono">
                            {Math.round(lead.confidence * 100)}% Match
                          </Badge>
                        </div>
                        <div className="text-xs text-neutral-400 space-y-1">
                          {lead.phone && <div className="font-mono">📞 {lead.phone}</div>}
                          {lead.email && <div className="font-mono">✉️ {lead.email}</div>}
                          {lead.address && <div className="text-[11px] leading-snug">📍 {lead.address}</div>}
                        </div>
                        {lead.notes && (
                          <div className="text-[10px] text-neutral-500 italic bg-neutral-900/50 p-1.5 rounded border border-neutral-900 leading-normal">
                            {lead.notes}
                          </div>
                        )}
                        <div className="flex gap-1.5 pt-1.5">
                          <button
                            onClick={() => {
                              const type = detectClaimantType(lead.full_name);
                              const parts = lead.full_name.trim().split(/\s+/).filter(Boolean);
                              const fName = type === "business" ? "" : (parts.slice(0, -1).join(" ") || lead.full_name);
                              const lName = type === "business" ? "" : (parts.at(-1) || "");
                              const bName = type === "business" ? lead.full_name : "";
                              setPrepopulatedIntake({
                                claimantType: type,
                                firstName: fName,
                                lastName: lName,
                                businessName: bName,
                                assetOwner: lead.full_name,
                                holderCompany: "California SCO",
                                claimState: lead.state || "CA",
                                propertyId: lead.asset_id ? `api-ast-${lead.asset_id}` : "Unknown",
                                estimatedValue: "Unknown",
                                feePercent: "10"
                              });
                              setHermesDialogOpen(false);
                              setActiveTab("intake");
                            }}
                            className="text-[9px] bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-2 py-1 rounded transition-colors"
                          >
                            Intake
                          </button>
                          <button
                            onClick={async () => {
                              try {
                                const { autoLeadAndCampaign } = await import("./services/apiClient");
                                const mappedAsset = {
                                  id: lead.asset_id ? `api-ast-${lead.asset_id}` : `api-ast-${Math.random().toString(36).slice(2)}`,
                                  name: lead.full_name,
                                  address: lead.address || "",
                                  state: lead.state || "CA",
                                  type: "Bank Account" as any,
                                  holderCompany: "California SCO",
                                  amount: 0,
                                };
                                const result = await autoLeadAndCampaign(mappedAsset, { channel: "mixed", execute: true });
                                alert(`Campaign outreach initiated! Queued ${result.queued.queued || 0}.`);
                                setHermesDialogOpen(false);
                                setActiveTab("campaigns");
                              } catch (err: any) {
                                alert(`Campaign trigger failed: ${err.message}`);
                              }
                            }}
                            className="text-[9px] bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-2 py-1 rounded transition-colors"
                          >
                            Campaign
                          </button>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}

                {/* Relatives list */}
                {hermesRelatives.length > 0 && (
                  <div className="space-y-3 pt-2">
                    <div className="text-[10px] uppercase font-bold text-neutral-500 tracking-wider">Possible Heirs / Relatives</div>
                    {hermesRelatives.map((rel) => (
                      <Card key={rel.id} className="border-neutral-800 bg-neutral-950 p-3 space-y-2 hover:border-orange-500/25 transition-all">
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="font-semibold text-neutral-200 text-xs font-mono uppercase">{rel.full_name}</div>
                            <span className="text-[9px] text-neutral-500 capitalize">{rel.relation_type?.replace(/_/g, " ") || "Relative"}</span>
                          </div>
                          <Badge variant="outline" className="text-[9px] font-mono border-neutral-800 text-neutral-400">
                            {Math.round(rel.confidence * 100)}% match
                          </Badge>
                        </div>
                        <div className="text-[10px] text-neutral-500">
                          Source: {rel.source}
                        </div>
                        <div className="flex gap-1.5 pt-1.5 border-t border-neutral-900 mt-1">
                          <button
                            onClick={async () => {
                              try {
                                const mappedAsset = {
                                  id: rel.asset_id ? `api-ast-${rel.asset_id}` : `api-ast-${Math.random().toString(36).slice(2)}`,
                                  name: rel.full_name,
                                  address: "",
                                  state: "CA",
                                  type: "Bank Account" as any,
                                  holderCompany: "California SCO",
                                  amount: 0,
                                };
                                const { createLeadFromAsset } = await import("./services/apiClient");
                                const lId = await createLeadFromAsset(mappedAsset, { full_name: rel.full_name, relation: "relative" });
                                alert(`Lead created for relative: ${rel.full_name} (#${lId})`);
                              } catch (err: any) {
                                alert(`Lead creation failed: ${err.message}`);
                              }
                            }}
                            className="text-[9px] bg-orange-600 hover:bg-orange-700 text-white px-2.5 py-1 rounded transition-colors font-semibold"
                          >
                            Add Lead
                          </button>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}

                {hermesLeads.length === 0 && hermesRelatives.length === 0 && !hermesLoading && (
                  <div className="h-48 flex flex-col items-center justify-center text-center p-4 border border-dashed border-neutral-800 rounded-lg bg-neutral-950/40">
                    <UserSearch className="w-8 h-8 text-neutral-600 mb-2" />
                    <div className="text-xs font-semibold text-neutral-400">No leads retrieved yet</div>
                    <p className="text-[10px] text-neutral-500 mt-1">Run the case enrichment search command to locate owner contacts.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
