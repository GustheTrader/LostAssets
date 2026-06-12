import { useState, useEffect } from "react";
import { 
  Search, MapPin, DollarSign, Users, Mail, Loader2, FileText, 
  AlertCircle, Copy, Check, Filter, Database, BookOpen, ChevronRight, 
  Save, ChevronUp, ChevronDown, AlertTriangle, CheckCircle, Network, 
  Radar, Terminal, UserSearch, Award, Shield, UserCheck, Layers, 
  Megaphone, Send, Upload, Scale, Folder, Coins, ShieldAlert, CheckCircle2, Globe,
  CheckSquare, Square, History, Printer
} from "lucide-react";
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
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

import { ClientIntake } from "./components/ClientIntake";
import { CaliforniaSpecialTools } from "./components/CaliforniaSpecialTools";
import { OutreachAndDataTools } from "./components/OutreachAndDataTools";
import { LeadHistoryModal } from "./components/LeadHistoryModal";
import { PrintCaseModal } from "./components/PrintCaseModal";

import { AssetRecord, Relative, SavedCase, SearchQuery, RecentSearch } from "./types";
import { searchLostAssets, trackRelatives, AVAILABLE_STATES, ASSET_TYPES } from "./services/mockDataService";
import { generateOutreachEmail } from "./services/geminiService";
import { saveCase, getSavedCases, deleteCase, saveAllCases } from "./services/dataStore";
import { STATE_RULES, StateRule } from "./services/stateRulesService";

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

// Category Name automated suggestion helper function
export function recommendCategoryName(fName: string, lName: string, state: string, mode: "identity" | "highValue"): string {
  const stateLabel = state ? state : "All States";
  if (mode === "highValue" || (!fName.trim() && !lName.trim())) {
    return `High-Value Claims (${stateLabel})`;
  }
  const fullName = [fName.trim(), lName.trim()].filter(Boolean).join(" ");
  return `${fullName} Claims (${stateLabel})`;
}

export default function App() {
  const [activeTab, setActiveTab] = useState<
    "client_intake" | "search_workbench" | "saved_cases" | "ca_bundling" | 
    "asset_combiner" | "ca_investigator_hub" | "campaigns" | "trace_osint" | 
    "multistate_search" | "hermes" | "asset_db" | "regulations" | "import_csv"
  >("client_intake");

  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  
  const [searchMode, setSearchMode] = useState<"identity" | "highValue">("identity");
  const [firstName, setFirstName] = useState("Thomson Diggs");
  const [lastName, setLastName] = useState("Company");
  const [emailAddress, setEmailAddress] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [targetState, setTargetState] = useState("");
  const [assetType, setAssetType] = useState("");
  
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [assets, setAssets] = useState<AssetRecord[]>([]);
  const [selectedAssetIds, setSelectedAssetIds] = useState<string[]>([]);
  const [isSavingSelectedOnly, setIsSavingSelectedOnly] = useState(false);
  const [relatives, setRelatives] = useState<Relative[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setSelectedAssetIds([]);
  }, [assets]);

  // Dynamic Custom Imported CSV Records state
  const [customImportedRecords, setCustomImportedRecords] = useState<any[]>([]);

  // Recent Searches state
  const [recentSearches, setRecentSearches] = useState<RecentSearch[]>([]);

  useEffect(() => {
    const stored = localStorage.getItem("recentSearches");
    if (stored) {
      try {
        setRecentSearches(JSON.parse(stored));
      } catch (e) {
        console.error("Error loading recent searches:", e);
      }
    }
  }, []);

  // Mobile navigation drawer toggle
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Database / Saved Cases
  const [savedCases, setSavedCases] = useState<SavedCase[]>([]);
  const [saveCategoryName, setSaveCategoryName] = useState("");
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [dbStateFilter, setDbStateFilter] = useState("");
  
  // Interactive CRM notes and claim number edit state mapping
  const [caseNotesEditing, setCaseNotesEditing] = useState<Record<string, string>>({});
  const [caseClaimNumbersEditing, setCaseClaimNumbersEditing] = useState<Record<string, string>>({});
  
  // Auto-save tracker states
  const [autoSaveStatus, setAutoSaveStatus] = useState<Record<string, "idle" | "saving" | "saved">>({});

  const saveNoteDirectly = (caseId: string, val: string) => {
    setAutoSaveStatus(prev => ({ ...prev, [caseId]: "saving" }));
    setSavedCases(prevCases => {
      const updated = prevCases.map(c => c.id === caseId ? { ...c, notes: val } : c);
      saveAllCases(updated);
      return updated;
    });
    setTimeout(() => {
      setAutoSaveStatus(prev => ({ ...prev, [caseId]: "saved" }));
      setTimeout(() => {
        setAutoSaveStatus(prev => ({ ...prev, [caseId]: "idle" }));
      }, 2000);
    }, 500);
  };

  const handleNotesBlur = (caseId: string) => {
    const val = caseNotesEditing[caseId];
    if (val !== undefined) {
      const currentCase = savedCases.find(c => c.id === caseId);
      if (currentCase && val !== (currentCase.notes || "")) {
        saveNoteDirectly(caseId, val);
      }
    }
  };

  // Every 5 seconds auto-save effect
  useEffect(() => {
    const timer = setInterval(() => {
      Object.entries(caseNotesEditing).forEach(([caseId, editedVal]) => {
        const currentCase = savedCases.find(c => c.id === caseId);
        if (currentCase && editedVal !== (currentCase.notes || "")) {
          saveNoteDirectly(caseId, editedVal);
        }
      });
    }, 5000);

    return () => clearInterval(timer);
  }, [caseNotesEditing, savedCases]);

  useEffect(() => {
    setSavedCases(getSavedCases());
  }, []);

  // Set suggested name dynamically when open save case dialog
  useEffect(() => {
    if (saveDialogOpen) {
      const suggestion = recommendCategoryName(firstName, lastName, targetState, searchMode);
      setSaveCategoryName(suggestion);
    }
  }, [saveDialogOpen]);

  // Email Drafting State
  const [selectedRelative, setSelectedRelative] = useState<Relative | null>(null);
  const [isDraftingEmail, setIsDraftingEmail] = useState(false);
  const [draftedEmail, setDraftedEmail] = useState<string>("");
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const debouncedFirstName = useDebounce(firstName, 500);
  const debouncedLastName = useDebounce(lastName, 500);
  const debouncedEmail = useDebounce(emailAddress, 500);

  const runSearch = async (isManual = false, overrideParams?: Partial<RecentSearch>) => {
    const activeSearchMode = overrideParams?.searchMode ?? searchMode;
    const activeFirstName = overrideParams ? (overrideParams.firstName ?? "") : firstName;
    const activeLastName = overrideParams ? (overrideParams.lastName ?? "") : lastName;
    const activeEmail = overrideParams ? (overrideParams.emailAddress ?? "") : emailAddress;
    const activePhone = overrideParams ? (overrideParams.phoneNumber ?? "") : phoneNumber;
    const activeState = overrideParams ? (overrideParams.targetState ?? "") : targetState;
    const activeAssetType = overrideParams ? (overrideParams.assetType ?? "") : assetType;

    if (activeSearchMode === "identity" && (!activeFirstName.trim() && !activeLastName.trim() && !activeEmail.trim())) {
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
      const query = activeSearchMode === "highValue" 
        ? { generalHighValue: true, targetState: activeState, assetType: activeAssetType }
        : { 
            firstName: activeFirstName.trim(), 
            lastName: activeLastName.trim(), 
            email: activeEmail.trim(), 
            phone: activePhone.trim(),
            targetState: activeState,
            assetType: activeAssetType
          };

      // 1. Search for assets
      let foundAssets = await searchLostAssets(query);

      // Intercept with our parsed CSV custom uploaded records!
      if (customImportedRecords.length > 0) {
        const queryFirst = activeFirstName.trim().toLowerCase();
        const queryLast = activeLastName.trim().toLowerCase();
        const queryState = activeState || "";

        const matches = customImportedRecords.filter(rec => {
          const matchesFirst = !queryFirst || rec.name.toLowerCase().includes(queryFirst);
          const matchesLast = !queryLast || rec.name.toLowerCase().includes(queryLast);
          const matchesState = !queryState || rec.state === queryState;
          return (matchesFirst || matchesLast) && matchesState;
        });

        foundAssets = [...matches, ...foundAssets];
      }

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

      // Save to recent searches if manual and NOT a direct re-run
      if (isManual && !overrideParams) {
        const newSearch: RecentSearch = {
          id: Date.now().toString(),
          searchMode: activeSearchMode,
          firstName: activeFirstName,
          lastName: activeLastName,
          emailAddress: activeEmail,
          phoneNumber: activePhone,
          targetState: activeState,
          assetType: activeAssetType,
          timestamp: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', second: '2-digit' })
        };

        setRecentSearches(prev => {
          const filtered = prev.filter(s => !(
            s.searchMode === newSearch.searchMode &&
            s.firstName === newSearch.firstName &&
            s.lastName === newSearch.lastName &&
            s.emailAddress === newSearch.emailAddress &&
            s.phoneNumber === newSearch.phoneNumber &&
            s.targetState === newSearch.targetState &&
            s.assetType === newSearch.assetType
          ));
          const updated = [newSearch, ...filtered].slice(0, 5);
          localStorage.setItem("recentSearches", JSON.stringify(updated));
          return updated;
        });
      }
    } catch (err: any) {
      if (isManual) setError(err.message || "An error occurred during the search.");
    } finally {
      setIsSearching(false);
    }
  };

  useEffect(() => {
    if (searchMode === "identity") {
      if (debouncedFirstName.trim() || debouncedLastName.trim() || debouncedEmail.trim()) {
        runSearch(false);
      }
    }
  }, [debouncedFirstName, debouncedLastName, debouncedEmail, searchMode]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    await runSearch(true);
  };

  const handleReRunSearch = async (recent: RecentSearch) => {
    setSearchMode(recent.searchMode);
    setFirstName(recent.firstName);
    setLastName(recent.lastName);
    setEmailAddress(recent.emailAddress);
    setPhoneNumber(recent.phoneNumber);
    setTargetState(recent.targetState);
    setAssetType(recent.assetType);

    // Update timestamp and relocate to top of list
    const updatedRecent = {
      ...recent,
      timestamp: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', second: '2-digit' })
    };

    setRecentSearches(prev => {
      const filtered = prev.filter(s => s.id !== recent.id);
      const updated = [updatedRecent, ...filtered].slice(0, 5);
      localStorage.setItem("recentSearches", JSON.stringify(updated));
      return updated;
    });

    await runSearch(true, recent);
  };

  const handleClearRecentSearches = () => {
    setRecentSearches([]);
    localStorage.removeItem("recentSearches");
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

    const assetsToDraft = selectedAssetIds.length > 0 
      ? assets.filter(a => selectedAssetIds.includes(a.id))
      : assets;

    try {
      const emailText = await generateOutreachEmail(
        { firstName: searchMode === "identity" && firstName ? firstName.trim() : "Unknown", 
          lastName: searchMode === "identity" && lastName ? lastName.trim() : "Owner" },
        assetsToDraft,
        relative
      );
      setDraftedEmail(emailText);
    } catch (err: any) {
      setDraftedEmail("Error generating email: " + err.message);
    } finally {
      setIsDraftingEmail(false);
    }
  };

  const handleDraftMassEmail = () => {
    if (relatives.length > 0) {
      handleDraftEmail(relatives[0]);
    } else {
      handleDraftEmail({
        id: "generic-heir",
        name: "[Relative/Heir Name]",
        relation: "Relative",
        age: 0,
        location: "",
        email: "[Email Address]",
        phone: "[Phone Number]",
        matchConfidence: 105
      });
    }
  };

  const handleSaveCase = () => {
    let finalCategoryName = saveCategoryName.trim();
    if (!finalCategoryName) {
      finalCategoryName = recommendCategoryName(firstName, lastName, targetState, searchMode);
    }

    const query = searchMode === "highValue" 
        ? { generalHighValue: true, targetState: targetState || undefined, assetType: assetType || undefined }
        : { firstName: firstName.trim(), lastName: lastName.trim(), email: emailAddress.trim(), phone: phoneNumber.trim(), targetState: targetState || undefined, assetType: assetType || undefined };
        
    const assetsToSave = isSavingSelectedOnly 
        ? assets.filter(a => selectedAssetIds.includes(a.id))
        : assets;

    const newCase = saveCase(finalCategoryName, query, assetsToSave, relatives);
    setSavedCases([newCase, ...savedCases]);
    setSaveDialogOpen(false);
    setSaveCategoryName("");
    setActiveTab("saved_cases");
  };

  const handleSaveConsolidatedCase = (caseObj: any) => {
    setSavedCases(prev => {
      const exists = prev.some(c => c.id === caseObj.id);
      let nextCases: SavedCase[];
      if (exists) {
        nextCases = prev.map(c => c.id === caseObj.id ? caseObj : c);
      } else {
        nextCases = [caseObj, ...prev];
      }
      saveAllCases(nextCases);
      return nextCases;
    });
  };

  const handleDeleteCase = (id: string) => {
    deleteCase(id);
    setSavedCases(savedCases.filter(c => c.id !== id));
  };

  const copyToClipboard = async () => {
    try {
      const htmlBlob = new Blob([draftedEmail], { type: "text/html" });
      const textBlob = new Blob([draftedEmail.replace(/<[^>]+>/g, '')], { type: "text/plain" });
      const data = [new ClipboardItem({ "text/html": htmlBlob, "text/plain": textBlob })];
      await navigator.clipboard.write(data);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      const tempEl = document.createElement("div");
      tempEl.innerHTML = draftedEmail;
      navigator.clipboard.writeText(tempEl.innerText || tempEl.textContent || "");
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 font-sans">
      
      {/* 1. LEFT SIDEBAR (Desktop layout) */}
      <aside className="hidden md:flex flex-col w-64 fixed inset-y-0 left-0 bg-[#09090b] border-r border-neutral-900 z-20">
        
        {/* Sidebar Header Title lockup */}
        <div className="p-5 border-b border-neutral-900 flex items-center space-x-3 bg-neutral-950/40">
          <div className="bg-orange-500/15 p-2 rounded-lg border border-orange-500/30">
            <Award className="w-5 h-5 text-orange-400 animate-pulse" />
          </div>
          <div>
            <div className="text-sm font-bold tracking-wider text-neutral-100 font-sans">SOVEREIGN ASSET</div>
            <div className="text-[9px] uppercase tracking-widest text-neutral-400 font-bold font-mono">RECOVERY AGENCY</div>
          </div>
        </div>

        {/* Sidebar Navigation */}
        <div className="flex-1 overflow-y-auto py-5 px-3 space-y-6 scrollbar-thin">
          
          {/* Section A: INVESTIGATIONS */}
          <div className="space-y-1">
            <div className="text-[10px] uppercase tracking-widest text-neutral-500 font-bold px-3 mb-2.5 font-mono">
              INVESTIGATIONS
            </div>
            
            <button
              onClick={() => setActiveTab("client_intake")}
              className={cn(
                "w-full flex items-center space-x-2.5 px-3 py-2 text-xs font-semibold rounded-lg transition-all text-left",
                activeTab === "client_intake" 
                  ? "bg-orange-500/10 text-orange-400 border border-orange-500/20 shadow-sm" 
                  : "text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900/40"
              )}
            >
              <UserCheck className={cn("w-4 h-4", activeTab === "client_intake" ? "text-orange-500" : "text-neutral-500")} />
              <span>CLIENT INTAKE</span>
            </button>

            <button
              onClick={() => setActiveTab("search_workbench")}
              className={cn(
                "w-full flex items-center space-x-2.5 px-3 py-2 text-xs font-semibold rounded-lg transition-all text-left",
                activeTab === "search_workbench" 
                  ? "bg-orange-500/10 text-orange-400 border border-orange-500/20 shadow-sm" 
                  : "text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900/40"
              )}
            >
              <Search className={cn("w-4 h-4", activeTab === "search_workbench" ? "text-orange-500" : "text-neutral-500")} />
              <span>SEARCH WORKBENCH</span>
            </button>

            <button
              onClick={() => setActiveTab("saved_cases")}
              className={cn(
                "w-full flex items-center space-x-2.5 px-3 py-2 text-xs font-semibold rounded-lg transition-all text-left",
                activeTab === "saved_cases" 
                  ? "bg-orange-500/10 text-orange-400 border border-orange-500/20 shadow-sm" 
                  : "text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900/40"
              )}
            >
              <Folder className={cn("w-4 h-4", activeTab === "saved_cases" ? "text-orange-500" : "text-neutral-500")} />
              <span>SAVED CASES</span>
            </button>
          </div>

          {/* Section B: CALIFORNIA TOOLS */}
          <div className="space-y-1">
            <div className="text-[10px] uppercase tracking-widest text-neutral-500 font-bold px-3 mb-2.5 font-mono">
              CALIFORNIA TOOLS
            </div>

            <button
              onClick={() => setActiveTab("ca_bundling")}
              className={cn(
                "w-full flex items-center space-x-2.5 px-3 py-2 text-xs font-semibold rounded-lg transition-all text-left",
                activeTab === "ca_bundling" 
                  ? "bg-orange-500/10 text-orange-400 border border-orange-500/20 shadow-sm" 
                  : "text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900/40"
              )}
            >
              <Network className={cn("w-4 h-4", activeTab === "ca_bundling" ? "text-orange-500" : "text-neutral-500")} />
              <span>CA BUNDLING</span>
            </button>

            <button
              onClick={() => setActiveTab("asset_combiner")}
              className={cn(
                "w-full flex items-center space-x-2.5 px-3 py-2 text-xs font-semibold rounded-lg transition-all text-left",
                activeTab === "asset_combiner" 
                  ? "bg-orange-500/10 text-orange-400 border border-orange-500/20 shadow-sm" 
                  : "text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900/40"
              )}
            >
              <Layers className={cn("w-4 h-4", activeTab === "asset_combiner" ? "text-orange-500" : "text-neutral-500")} />
              <span>ASSET COMBINER</span>
            </button>

            <button
              onClick={() => setActiveTab("ca_investigator_hub")}
              className={cn(
                "w-full flex items-center space-x-2.5 px-3 py-2 text-xs font-semibold rounded-lg transition-all text-left",
                activeTab === "ca_investigator_hub" 
                  ? "bg-orange-500/10 text-orange-400 border border-orange-500/20 shadow-sm" 
                  : "text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900/40"
              )}
            >
              <UserSearch className={cn("w-4 h-4", activeTab === "ca_investigator_hub" ? "text-orange-500" : "text-neutral-500")} />
              <span>CA INVESTIGATOR HUB</span>
            </button>
          </div>

          {/* Section C: OUTREACH & DATA */}
          <div className="space-y-1">
            <div className="text-[10px] uppercase tracking-widest text-neutral-500 font-bold px-3 mb-2.5 font-mono">
              OUTREACH & DATA
            </div>

            <button
              onClick={() => setActiveTab("campaigns")}
              className={cn(
                "w-full flex items-center space-x-2.5 px-3 py-2 text-xs font-semibold rounded-lg transition-all text-left",
                activeTab === "campaigns" 
                  ? "bg-orange-500/10 text-orange-400 border border-orange-500/20 shadow-sm" 
                  : "text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900/40"
              )}
            >
              <Megaphone className={cn("w-4 h-4", activeTab === "campaigns" ? "text-orange-500" : "text-neutral-500")} />
              <span>CAMPAIGNS</span>
            </button>

            <button
              onClick={() => setActiveTab("trace_osint")}
              className={cn(
                "w-full flex items-center space-x-2.5 px-3 py-2 text-xs font-semibold rounded-lg transition-all text-left",
                activeTab === "trace_osint" 
                  ? "bg-orange-500/10 text-orange-400 border border-orange-500/20 shadow-sm" 
                  : "text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900/40"
              )}
            >
              <Radar className={cn("w-4 h-4", activeTab === "trace_osint" ? "text-orange-500" : "text-neutral-500")} />
              <span>TRACE & OSINT</span>
            </button>

            <button
              onClick={() => setActiveTab("multistate_search")}
              className={cn(
                "w-full flex items-center space-x-2.5 px-3 py-2 text-xs font-semibold rounded-lg transition-all text-left",
                activeTab === "multistate_search" 
                  ? "bg-orange-500/10 text-orange-400 border border-orange-500/20 shadow-sm" 
                  : "text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900/40"
              )}
            >
              <Globe className={cn("w-4 h-4", activeTab === "multistate_search" ? "text-orange-500" : "text-neutral-500")} />
              <span>MULTI-STATE SEARCH</span>
            </button>

            <button
              onClick={() => setActiveTab("hermes")}
              className={cn(
                "w-full flex items-center space-x-2.5 px-3 py-2 text-xs font-semibold rounded-lg transition-all text-left",
                activeTab === "hermes" 
                  ? "bg-orange-500/10 text-orange-400 border border-orange-500/20 shadow-sm" 
                  : "text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900/40"
              )}
            >
              <Send className={cn("w-4 h-4", activeTab === "hermes" ? "text-orange-500" : "text-neutral-500")} />
              <span>HERMES</span>
            </button>

            <button
              onClick={() => setActiveTab("asset_db")}
              className={cn(
                "w-full flex items-center space-x-2.5 px-3 py-2 text-xs font-semibold rounded-lg transition-all text-left",
                activeTab === "asset_db" 
                  ? "bg-orange-500/10 text-orange-400 border border-orange-500/20 shadow-sm" 
                  : "text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900/40"
              )}
            >
              <Database className={cn("w-4 h-4", activeTab === "asset_db" ? "text-orange-500" : "text-neutral-500")} />
              <span>ASSET DB</span>
            </button>

            <button
              onClick={() => setActiveTab("regulations")}
              className={cn(
                "w-full flex items-center space-x-2.5 px-3 py-2 text-xs font-semibold rounded-lg transition-all text-left",
                activeTab === "regulations" 
                  ? "bg-orange-500/10 text-orange-400 border border-orange-500/20 shadow-sm" 
                  : "text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900/40"
              )}
            >
              <Scale className={cn("w-4 h-4", activeTab === "regulations" ? "text-orange-500" : "text-neutral-500")} />
              <span>REGULATIONS</span>
            </button>

            <button
              onClick={() => setActiveTab("import_csv")}
              className={cn(
                "w-full flex items-center space-x-2.5 px-3 py-2 text-xs font-semibold rounded-lg transition-all text-left",
                activeTab === "import_csv" 
                  ? "bg-orange-500/10 text-orange-400 border border-orange-500/20 shadow-sm" 
                  : "text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900/40"
              )}
            >
              <Upload className={cn("w-4 h-4", activeTab === "import_csv" ? "text-orange-500" : "text-neutral-500")} />
              <span>IMPORT CSV</span>
            </button>
          </div>
        </div>

        {/* Region panel at bottom-left */}
        <div className="p-4 border-t border-neutral-900 bg-[#070708] space-y-1.5 font-mono select-none">
          <div className="text-[9px] uppercase tracking-wider text-neutral-500 font-bold">REGION</div>
          <div className="flex items-center space-x-2">
            <span className="text-[10px] bg-orange-500/10 border border-orange-500/30 text-orange-400 px-2 py-0.5 rounded font-bold">
              CA-ACTIVE
            </span>
            <span className="text-[10px] text-neutral-400 font-mono">Multi-State Enabled</span>
          </div>
        </div>
      </aside>

      {/* MOBILE HEADER BAR */}
      <header className="md:hidden flex items-center justify-between h-14 px-4 border-b border-neutral-900 bg-[#09090b] sticky top-0 z-30">
        <div className="flex items-center space-x-2">
          <Award className="w-5 h-5 text-orange-450" />
          <span className="text-xs font-bold tracking-wider">SOVEREIGN RECOVERY</span>
        </div>
        
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="border-neutral-800 h-8 px-2 text-xs"
        >
          Menu
        </Button>
      </header>

      {/* MOBILE NAVIGATION OVERLAY DRAWER */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-40 bg-neutral-950/95 flex flex-col pt-16 px-4 animate-fade-in overflow-y-auto">
          <h3 className="text-[10px] tracking-wider text-neutral-500 font-bold mb-4 uppercase">INVESTIGATIONS</h3>
          <div className="flex flex-col gap-1 pb-6 border-b border-neutral-900">
            {["client_intake", "search_workbench", "saved_cases"].map((t) => (
              <button
                key={t}
                onClick={() => { setActiveTab(t as any); setMobileMenuOpen(false); }}
                className="text-left font-mono py-2 text-sm text-neutral-300 hover:text-orange-400 uppercase font-semibold"
              >
                {t.replace("_", " ")}
              </button>
            ))}
          </div>

          <h3 className="text-[10px] tracking-wider text-neutral-500 font-bold my-4 uppercase">CALIFORNIA ACTIONS</h3>
          <div className="flex flex-col gap-1 pb-6 border-b border-neutral-900">
            {["ca_bundling", "asset_combiner", "ca_investigator_hub"].map((t) => (
              <button
                key={t}
                onClick={() => { setActiveTab(t as any); setMobileMenuOpen(false); }}
                className="text-left font-mono py-2 text-sm text-neutral-300 hover:text-orange-400 uppercase font-semibold"
              >
                {t.replace("_", " ")}
              </button>
            ))}
          </div>

          <h3 className="text-[10px] tracking-wider text-neutral-500 font-bold my-4 uppercase font-mono">OUTREACH & DATA</h3>
          <div className="flex flex-col gap-1 pb-8">
            {["campaigns", "trace_osint", "multistate_search", "hermes", "asset_db", "regulations", "import_csv"].map((t) => (
              <button
                key={t}
                onClick={() => { setActiveTab(t as any); setMobileMenuOpen(false); }}
                className="text-left font-mono py-2 text-sm text-neutral-300 hover:text-orange-400 uppercase font-semibold"
              >
                {t.replace("_", " ")}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 2. MAIN BODY CONTENT AREA */}
      <main className="md:pl-64 min-h-screen flex flex-col pt-0 md:pt-4">
        <div className="p-4 md:p-8 max-w-7xl w-full mx-auto space-y-6">
          
          {/* A) ACTIVE SUBAREA RENDER ROUTER */}

          {/* 1) CLIENT INTAKE PANEL */}
          {activeTab === "client_intake" && (
            <ClientIntake 
              onWorkflowComplete={(newLead) => {
                // Swapping dynamically or notifying
                setSavedCases(getSavedCases());
              }} 
            />
          )}

          {/* 2) SEARCH WORKBENCH */}
          {activeTab === "search_workbench" && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-fade-in">
              
              {/* Left filters layout */}
              <div className="lg:col-span-4 space-y-6">
                <Card className="border-neutral-900 bg-[#0e0e11] overflow-hidden">
                   <div className="bg-neutral-905 px-4 py-3 border-b border-neutral-900">
                      <h2 className="text-xs font-bold uppercase tracking-widest text-neutral-350 flex items-center">
                        <Search className="w-4 h-4 mr-2 text-orange-500" />
                        Inquiry filters
                      </h2>
                   </div>
                  <CardContent className="p-4 pt-6">
                    <Tabs value={searchMode} onValueChange={(val) => setSearchMode(val as any)} className="w-full mb-6">
                      <TabsList className="w-full grid grid-cols-2 bg-neutral-950 border border-neutral-900 p-1">
                        <TabsTrigger value="identity">Identity</TabsTrigger>
                        <TabsTrigger value="highValue">High-Value</TabsTrigger>
                      </TabsList>
                    </Tabs>
                    <form onSubmit={handleSearch} className="space-y-4">
                      {searchMode === "identity" && (
                        <>
                          <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-2">
                              <Label htmlFor="firstName" className="text-[10px] uppercase tracking-wide text-neutral-400 font-bold">First Name</Label>
                              <Input 
                                id="firstName" 
                                placeholder="John" 
                                value={firstName}
                                onChange={(e) => setFirstName(e.target.value)}
                                className="font-mono text-sm bg-neutral-950 border-neutral-850 focus:border-orange-500"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="lastName" className="text-[10px] uppercase tracking-wide text-neutral-400 font-bold">Last Name</Label>
                              <Input 
                                id="lastName" 
                                placeholder="Doe" 
                                value={lastName}
                                onChange={(e) => setLastName(e.target.value)}
                                className="font-mono text-sm bg-neutral-950 border-neutral-850 focus:border-orange-500"
                              />
                            </div>
                          </div>
                          <div className="space-y-1.5">
                            <Label htmlFor="emailAddress" className="text-[10px] uppercase tracking-wide text-neutral-400 font-bold">Email Address</Label>
                            <Input 
                              id="emailAddress" 
                              type="email"
                              placeholder="john@example.com" 
                              value={emailAddress}
                              onChange={(e) => setEmailAddress(e.target.value)}
                              className="font-mono text-sm bg-neutral-950 border-neutral-850 focus:border-orange-500"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <Label htmlFor="phoneNumber" className="text-[10px] uppercase tracking-wide text-neutral-400 font-bold">Phone (Optional)</Label>
                            <Input 
                              id="phoneNumber" 
                              type="tel"
                              placeholder="(555) 555-5555" 
                              value={phoneNumber}
                              onChange={(e) => setPhoneNumber(e.target.value)}
                              className="font-mono text-sm bg-neutral-950 border-neutral-850 focus:border-orange-500"
                            />
                          </div>
                        </>
                      )}
                      {searchMode === "highValue" && (
                        <div className="text-xs text-neutral-400 mb-4 bg-orange-500/5 p-3 rounded-lg border border-orange-500/10 leading-relaxed">
                          <Filter className="w-4 h-4 mb-2 text-orange-500" />
                          General search scan for multi-state high-value claims (&gt;$10,000) across state Controller registers. Names not compulsory.
                        </div>
                      )}
                      
                      <div className="grid grid-cols-2 gap-2 pb-2">
                        <div className="space-y-1.5">
                          <Label htmlFor="targetState" className="text-[10px] uppercase tracking-wide text-neutral-400 font-bold">State</Label>
                          <select 
                            id="targetState"
                            value={targetState}
                            onChange={e => setTargetState(e.target.value)}
                            className="flex h-10 w-full rounded-md border border-neutral-850 bg-neutral-950 px-3 py-2 text-sm text-neutral-350 focus:border-orange-500 focus-visible:outline-none"
                          >
                            <option value="">All States</option>
                            {AVAILABLE_STATES.map(st => (
                              <option key={st} value={st}>{st}</option>
                            ))}
                          </select>
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="assetType" className="text-[10px] uppercase tracking-wide text-neutral-400 font-bold">Property Type</Label>
                          <select 
                            id="assetType"
                            value={assetType}
                            onChange={e => setAssetType(e.target.value)}
                            className="flex h-10 w-full rounded-md border border-neutral-850 bg-neutral-950 px-3 py-2 text-sm text-neutral-350 focus:border-orange-500 focus-visible:outline-none"
                          >
                            <option value="">All Types</option>
                            {ASSET_TYPES.map(type => (
                              <option key={type} value={type}>{type}</option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <Button 
                        type="submit" 
                        disabled={isSearching} 
                        className="w-full bg-orange-600 hover:bg-orange-700 text-neutral-50 shadow-md font-mono text-xs font-bold h-11"
                      >
                        {isSearching ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
                        EXECUTE REGISTRY SCAN
                      </Button>
                    </form>
                  </CardContent>
                </Card>

                {/* Recent Searches Side Panel */}
                <Card className="border border-neutral-900 bg-[#0e0e11] overflow-hidden">
                  <div className="bg-neutral-905 px-4 py-3 border-b border-neutral-900 flex items-center justify-between">
                    <h2 className="text-xs font-bold uppercase tracking-widest text-neutral-350 flex items-center">
                      <History className="w-4 h-4 mr-2 text-orange-500" />
                      Recent Investigations
                    </h2>
                    {recentSearches.length > 0 && (
                      <button 
                        onClick={handleClearRecentSearches}
                        className="text-[10px] font-mono text-neutral-500 hover:text-rose-450 transition-colors uppercase font-semibold"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                  <CardContent className="p-3">
                    {recentSearches.length === 0 ? (
                      <div className="py-8 px-4 text-center border border-dashed border-neutral-850/60 rounded-lg bg-neutral-950/20">
                        <History className="w-5 h-5 mx-auto mb-2 text-neutral-650 animate-pulse" />
                        <p className="text-[11px] text-neutral-500 font-mono">No recent run histories yet.</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {recentSearches.map((run) => {
                          const title = run.searchMode === "highValue" 
                            ? "High-Value Claims Scan" 
                            : [run.firstName, run.lastName].filter(Boolean).join(" ") || "Unnamed Inquiry";
                          
                          return (
                            <button 
                              key={run.id}
                              onClick={() => handleReRunSearch(run)}
                              className="w-full group text-left p-3 rounded-lg border border-neutral-900 bg-neutral-950/40 hover:bg-neutral-900/40 hover:border-orange-500/30 transition-all duration-200 block"
                            >
                              <div className="flex items-center justify-between gap-2.5">
                                <span className="font-mono text-xs font-semibold text-neutral-200 group-hover:text-orange-400 transition-colors truncate max-w-[170px]" title={title}>
                                  {title}
                                </span>
                                <Badge className={cn(
                                  "text-[8px] font-mono leading-none tracking-normal py-0.5 px-1.5 uppercase shrink-0 border",
                                  run.searchMode === "highValue"
                                    ? "bg-amber-500/10 text-amber-400 border-amber-500/20 hover:bg-amber-500/10"
                                    : "bg-blue-500/10 text-blue-400 border-blue-500/20 hover:bg-blue-500/10"
                                )}>
                                  {run.searchMode === "highValue" ? "High Value" : "Identity"}
                                </Badge>
                              </div>

                              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                                {run.targetState ? (
                                  <span className="text-[9px] font-mono bg-neutral-900 border border-neutral-800 text-neutral-400 px-1.5 py-0.5 rounded">
                                    {run.targetState}
                                  </span>
                                ) : (
                                  <span className="text-[9px] font-mono bg-neutral-900 border border-neutral-800 text-neutral-500 px-1.5 py-0.5 rounded">
                                    All States
                                  </span>
                                )}

                                {run.assetType && (
                                  <span className="text-[9px] font-mono bg-neutral-900 border border-neutral-800 text-neutral-400 px-1.5 py-0.5 rounded truncate max-w-[90px]" title={run.assetType}>
                                    {run.assetType}
                                  </span>
                                )}

                                {run.emailAddress && (
                                  <span className="text-[9px] font-mono bg-neutral-900 border border-neutral-800 text-neutral-500 px-1.5 py-0.5 rounded truncate max-w-[80px]" title={run.emailAddress}>
                                    {run.emailAddress}
                                  </span>
                                )}
                              </div>

                              <div className="mt-2.5 pt-1.5 border-t border-neutral-900/60 flex items-center justify-between text-[9px] text-neutral-500 font-mono">
                                <span>Checked at {run.timestamp}</span>
                                <span className="text-[9px] text-orange-500/40 opacity-0 group-hover:opacity-100 transition-all flex items-center gap-0.5 uppercase font-bold tracking-wider">
                                  Run Query <ChevronRight className="w-2.5 h-2.5" />
                                </span>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Left quick metrics panel */}
                {hasSearched && !isSearching && (
                  <div className="space-y-4 animate-fade-in font-mono">
                    <div className="bg-neutral-900/40 border border-neutral-850 p-4 rounded-xl shadow-lg">
                       <div className="text-[10px] uppercase tracking-wider text-neutral-500 font-bold">Consolidated Recoveries Value</div>
                       <div className="text-2xl font-semibold tracking-tight text-emerald-400 mt-1">
                          ${totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                       </div>
                       <div className="text-[11px] text-neutral-450 mt-1">{assets.length} Claims located state-wide</div>
                    </div>
                    <div className="bg-neutral-900/40 border border-neutral-850 p-4 rounded-xl shadow-lg">
                       <div className="text-[10px] uppercase tracking-wider text-neutral-500 font-bold">Matched Family Relatives</div>
                       <div className="text-2xl font-semibold tracking-tight text-orange-400 mt-1">
                          {relatives.length} Matches
                       </div>
                       <div className="text-[11px] text-neutral-450 mt-1">Eligible heirs pipeline ready</div>
                    </div>
                  </div>
                )}
              </div>

              {/* Central workbench results columns */}
              <div className="lg:col-span-8 space-y-6">
                {error && (
                  <Alert variant="destructive" className="bg-red-950/20 border-red-900/50 text-red-100">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Alert</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                {isSearching && (
                   <div className="h-64 flex flex-col items-center justify-center text-neutral-500 space-y-4">
                      <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
                      <div className="font-mono text-xs uppercase tracking-widest animate-pulse">Scanning state Controller databases...</div>
                   </div>
                )}

                {!isSearching && !hasSearched && (
                  <div className="h-80 flex flex-col items-center justify-center text-center p-8 border-2 border-dashed border-neutral-850 rounded-xl bg-neutral-900/10">
                     <div className="bg-orange-500/10 p-4 rounded-full mb-3 border border-orange-500/20">
                        <Search className="h-6 w-6 text-orange-500" />
                     </div>
                     <h3 className="text-base font-semibold text-neutral-200">Start Lead Search Workbench</h3>
                     <p className="text-neutral-450 text-sm mt-1 max-w-sm">Enter a name keyword to automatically query live databases, or toggle High-Value general mode.</p>
                  </div>
                )}

                {!isSearching && hasSearched && assets.length === 0 && (
                  <div className="h-64 flex flex-col items-center justify-center text-center text-neutral-400 bg-neutral-900/20 border border-neutral-850 rounded-xl">
                    <AlertTriangle className="h-7 w-7 text-orange-500/50 mb-2" />
                    <p className="text-sm">No matches located in Controller registries.</p>
                  </div>
                )}

                {!isSearching && hasSearched && assets.length > 0 && (
                  <Tabs defaultValue="claims" className="w-full">
                    <TabsList className="grid grid-cols-2 bg-neutral-950 p-1 border border-neutral-900 rounded-lg max-w-md">
                      <TabsTrigger value="claims">Located Assets ({assets.length})</TabsTrigger>
                      <TabsTrigger value="family">Skip Trace Heirs ({relatives.length})</TabsTrigger>
                    </TabsList>

                    <TabsContent value="claims" className="space-y-4 mt-4">
                      {(() => {
                        const selectedTotalAmount = assets.filter(a => selectedAssetIds.includes(a.id)).reduce((sum, a) => sum + a.amount, 0);
                        const totalSumOfAllAssets = assets.reduce((sum, a) => sum + a.amount, 0);
                        const coveragePercentage = assets.length > 0 ? (selectedAssetIds.length / assets.length) * 100 : 0;
                        const valuationPercentage = totalSumOfAllAssets > 0 ? (selectedTotalAmount / totalSumOfAllAssets) * 100 : 0;

                        return (
                          <Card className="border border-neutral-850 bg-neutral-900/40 shadow-lg p-5">
                            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
                              <div className="space-y-1.5 min-w-[200px]">
                                <div className="flex items-center gap-2">
                                  <div className={cn(
                                    "p-2 rounded-lg border transition-all duration-300",
                                    selectedAssetIds.length > 0 
                                      ? "bg-orange-500/10 border-orange-500/30 text-orange-400" 
                                      : "bg-neutral-950 border-neutral-900 text-neutral-500"
                                  )}>
                                    <Coins className="h-4.5 w-4.5" />
                                  </div>
                                  <div>
                                    <h4 className="text-xs font-semibold text-neutral-200 uppercase tracking-wider font-mono">Live Selection Summary</h4>
                                    <p className="text-[10px] text-neutral-450 font-mono">Real-time statistics monitor</p>
                                  </div>
                                </div>
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 flex-grow lg:max-w-2xl">
                                {/* Claims Selected Count Stat */}
                                <div className="bg-neutral-950/60 border border-neutral-850 rounded-lg p-3.5 space-y-2">
                                  <div className="flex items-center justify-between">
                                    <span className="text-[10px] uppercase font-mono tracking-wider text-neutral-400">Claims Selected</span>
                                    <span className="text-[10px] font-mono font-bold text-orange-400">
                                      {Math.round(coveragePercentage)}% Coverage
                                    </span>
                                  </div>
                                  <div className="flex items-baseline gap-1.5">
                                    <span className={cn(
                                      "text-2xl font-bold tracking-tight font-mono transition-colors duration-300",
                                      selectedAssetIds.length > 0 ? "text-orange-400" : "text-neutral-500"
                                    )}>
                                      {selectedAssetIds.length}
                                    </span>
                                    <span className="text-xs text-neutral-500">/ {assets.length} claims</span>
                                  </div>
                                  <div className="w-full h-1 bg-neutral-900 rounded-full overflow-hidden">
                                    <div 
                                      className="h-full bg-orange-500 rounded-full transition-all duration-500 ease-out"
                                      style={{ width: `${coveragePercentage}%` }}
                                    />
                                  </div>
                                </div>

                                {/* Cumulative Valuation Stat */}
                                <div className="bg-neutral-950/60 border border-neutral-850 rounded-lg p-3.5 space-y-2">
                                  <div className="flex items-center justify-between">
                                    <span className="text-[10px] uppercase font-mono tracking-wider text-neutral-400">Cumulative Selected Value</span>
                                    <span className="text-[10px] font-mono font-bold text-emerald-400">
                                      {Math.round(valuationPercentage)}% Valuation
                                    </span>
                                  </div>
                                  <div className="flex items-baseline gap-1 text-neutral-100">
                                    <span className={cn(
                                      "text-2xl font-bold tracking-tight font-mono transition-colors duration-300",
                                      selectedAssetIds.length > 0 ? "text-emerald-400" : "text-neutral-500"
                                    )}>
                                      ${selectedTotalAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </span>
                                    <span className="text-[10px] text-neutral-500 font-mono truncate max-w-[120px] sm:max-w-none">
                                      &nbsp;/ ${totalSumOfAllAssets.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </span>
                                  </div>
                                  <div className="w-full h-1 bg-neutral-900 rounded-full overflow-hidden">
                                    <div 
                                      className="h-full bg-emerald-500 rounded-full transition-all duration-500 ease-out"
                                      style={{ width: `${valuationPercentage}%` }}
                                    />
                                  </div>
                                </div>
                              </div>
                            </div>
                          </Card>
                        );
                      })()}

                      {selectedAssetIds.length > 0 && (
                        <div className="bg-orange-500/10 border border-orange-500/25 px-4 py-3 rounded-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-fade-in animate-duration-300">
                          <div className="flex items-center gap-2">
                            <div className="h-2 w-2 rounded-full bg-orange-500 animate-pulse" />
                            <span className="font-mono text-xs text-neutral-300">
                              <strong className="text-orange-400">{selectedAssetIds.length}</strong> of {assets.length} Claims Selected 
                              <span className="text-neutral-500 mx-1.5">|</span>
                              Est. Value: <strong className="text-emerald-400 font-bold">${
                                assets.filter(a => selectedAssetIds.includes(a.id))
                                      .reduce((sum, a) => sum + a.amount, 0)
                                      .toLocaleString('en-US', { minimumFractionDigits: 2 })
                              }</strong>
                            </span>
                          </div>
                          <div className="flex items-center gap-2 w-full sm:w-auto">
                            <Button 
                              onClick={() => {
                                setIsSavingSelectedOnly(true);
                                setSaveDialogOpen(true);
                              }} 
                              size="sm" 
                              className="flex-1 sm:flex-initial bg-neutral-900 border border-neutral-800 text-neutral-200 hover:bg-neutral-800 font-mono text-[10px] h-8 px-3"
                            >
                              <Save className="w-3.5 h-3.5 mr-1" />
                              Save Selected
                            </Button>
                            <Button 
                              onClick={handleDraftMassEmail} 
                              size="sm" 
                              className="flex-1 sm:flex-initial bg-orange-600 hover:bg-orange-700 text-neutral-50 font-mono text-[10px] h-8 px-3"
                            >
                              <Mail className="w-3.5 h-3.5 mr-1" />
                              Draft Mass Email
                            </Button>
                          </div>
                        </div>
                      )}

                      <Card className="border-neutral-900 bg-neutral-950 overflow-hidden">
                        <div className="overflow-x-auto">
                          <Table>
                            <TableHeader className="bg-neutral-900/40">
                              <TableRow className="border-neutral-900 hover:bg-transparent">
                                <TableHead className="w-[45px] pl-4">
                                  <input 
                                    type="checkbox" 
                                    checked={selectedAssetIds.length === sortedAssets.length && sortedAssets.length > 0}
                                    onChange={(e) => {
                                      if (e.target.checked) {
                                        setSelectedAssetIds(sortedAssets.map(a => a.id));
                                      } else {
                                        setSelectedAssetIds([]);
                                      }
                                    }}
                                    className="cursor-pointer rounded border-neutral-800 bg-neutral-900 text-orange-500 focus:ring-orange-500 focus:ring-offset-neutral-950 h-3.5 w-3.5 accent-orange-600"
                                  />
                                </TableHead>
                                <TableHead className="font-mono text-[10px] uppercase tracking-wider text-neutral-400">Claimant Name</TableHead>
                                <TableHead className="font-mono text-[10px] uppercase tracking-wider text-neutral-400">Property Type</TableHead>
                                <TableHead className="font-mono text-[10px] uppercase tracking-wider text-neutral-400 font-bold">Losing Custodian</TableHead>
                                <TableHead className="font-mono text-[10px] uppercase tracking-wider text-neutral-400">State</TableHead>
                                <TableHead className="font-mono text-[10px] uppercase tracking-wider text-neutral-400 text-right">Value</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {sortedAssets.map((asset) => (
                                <TableRow 
                                  key={asset.id} 
                                  className={cn(
                                    "border-neutral-900 hover:bg-neutral-900/40 transition-colors",
                                    selectedAssetIds.includes(asset.id) && "bg-neutral-900/60"
                                  )}
                                >
                                  <TableCell className="w-[45px] pl-4">
                                    <input 
                                      type="checkbox" 
                                      checked={selectedAssetIds.includes(asset.id)}
                                      onChange={() => {
                                        setSelectedAssetIds(prev => 
                                          prev.includes(asset.id) 
                                            ? prev.filter(id => id !== asset.id)
                                            : [...prev, asset.id]
                                        );
                                      }}
                                      className="cursor-pointer rounded border-neutral-800 bg-neutral-900 text-orange-500 focus:ring-orange-500 focus:ring-offset-neutral-950 h-3.5 w-3.5 accent-orange-600"
                                    />
                                  </TableCell>
                                  <TableCell className="font-mono text-xs font-semibold text-neutral-100">{asset.name}</TableCell>
                                  <TableCell className="text-xs text-neutral-400">{asset.type}</TableCell>
                                  <TableCell className="text-xs text-neutral-450">{asset.holderCompany}</TableCell>
                                  <TableCell className="font-mono text-xs text-orange-450 font-semibold">{asset.state}</TableCell>
                                  <TableCell className="text-right font-mono text-xs font-bold text-emerald-450">
                                    ${asset.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      </Card>
                    </TabsContent>

                    <TabsContent value="family" className="space-y-4 mt-4">
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                         {relatives.map((relative) => (
                           <Card key={relative.id} className="border-neutral-900 bg-neutral-950 shadow-sm hover:border-neutral-800 transition-all rounded-xl">
                             <CardHeader className="pb-2">
                               <div className="flex justify-between items-start">
                                 <div>
                                   <CardTitle className="text-sm font-bold flex items-center font-mono">
                                     {relative.name}
                                   </CardTitle>
                                   <CardDescription className="flex items-center mt-1 flex-wrap gap-2">
                                     <Badge className="bg-neutral-900 text-neutral-400 border border-neutral-800 text-[10px] px-1.5 py-0.5">{relative.relation}</Badge>
                                     <span className="text-[11px] text-neutral-500 font-mono">Match: {relative.matchConfidence}%</span>
                                   </CardDescription>
                                 </div>
                               </div>
                             </CardHeader>
                             <CardContent className="text-xs space-y-3 font-mono">
                                <div className="space-y-1.5 bg-neutral-900/40 p-2.5 rounded border border-neutral-900">
                                   <div className="flex justify-between">
                                      <span className="text-neutral-500">Phone:</span>
                                      <span className="text-neutral-300">{relative.phone}</span>
                                   </div>
                                   <div className="flex justify-between">
                                      <span className="text-neutral-500">Email:</span>
                                      <span className="text-neutral-300 truncate max-w-[150px]">{relative.email}</span>
                                   </div>
                                </div>
                                <Button 
                                  onClick={() => handleDraftEmail(relative)}
                                  className="w-full bg-orange-600 hover:bg-orange-700 text-neutral-50 font-mono text-[10px] h-8"
                                >
                                  <Mail className="w-3.5 h-3.5 mr-1.5" />
                                  Draft Outreach Letter
                                </Button>
                             </CardContent>
                           </Card>
                         ))}
                       </div>
                    </TabsContent>
                  </Tabs>
                )}

                {/* Save to Category Button */}
                {!isSearching && hasSearched && assets.length > 0 && (
                  <div className="mt-6 flex justify-end">
                     <Button 
                        onClick={() => {
                          setIsSavingSelectedOnly(false);
                          setSaveDialogOpen(true);
                        }} 
                        className="bg-neutral-100 hover:bg-neutral-300 text-neutral-950 font-mono font-bold text-xs h-10 px-5"
                     >
                        <Save className="w-4 h-4 mr-2 text-neutral-900" />
                        Save leads folder ({assets.length} claims)
                     </Button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 3) SAVED CASES PAGE */}
          {activeTab === "saved_cases" && (() => {
             const filteredCases = savedCases.filter(c => dbStateFilter === "" || c.assets.some(a => a.state === dbStateFilter));
             
             // Compute total recoverable assets by state
             const chartDataMap: Record<string, number> = {};
             filteredCases.forEach(c => {
                c.assets.forEach(a => {
                   chartDataMap[a.state] = (chartDataMap[a.state] || 0) + a.amount;
                });
             });
             const chartData = Object.entries(chartDataMap).map(([state, total]) => ({
                state: state.toUpperCase(),
                amount: parseFloat(total.toFixed(2))
             })).sort((a, b) => b.amount - a.amount);

             const totalSum = chartData.reduce((sum, item) => sum + item.amount, 0);

             return (
             <div className="space-y-6 animate-fade-in">
               <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-neutral-900 pb-4">
                  <div>
                    <h2 className="text-2xl font-bold tracking-tight text-neutral-100">Saved Lead Folders</h2>
                    <p className="text-neutral-450 text-xs text-orange-400">A unified active recovery CRM tracking leads, documents, and executor communications.</p>
                  </div>
                  <div className="flex items-center space-x-4">
                     <select 
                        value={dbStateFilter}
                        onChange={e => setDbStateFilter(e.target.value)}
                        className="flex h-9 rounded-md border border-neutral-850 bg-neutral-950 px-3 py-1 text-xs text-neutral-300"
                     >
                        <option value="">All States</option>
                        {AVAILABLE_STATES.map(st => (
                          <option key={st} value={st}>{st}</option>
                        ))}
                     </select>
                     <Badge className="bg-neutral-900 text-neutral-400 border border-neutral-850 font-mono">{filteredCases.length} Total</Badge>
                  </div>
               </div>

               {/* RECHARTS DATA VISUALIZATION SECTION */}
               {filteredCases.length > 0 && chartData.length > 0 && (
                  <Card className="border-neutral-900 bg-neutral-950/40 rounded-xl overflow-hidden shadow-xl">
                     <CardHeader className="border-b border-neutral-900 bg-neutral-900/10 py-4 px-6">
                        <div className="flex items-center space-x-3">
                           <div className="p-2 rounded-lg bg-orange-500/10 text-orange-400 border border-orange-500/10">
                              <Layers className="w-4 h-4" />
                           </div>
                           <div>
                              <CardTitle className="text-xs font-mono uppercase tracking-wider text-neutral-300">Recoverable Capital Portfolio Analytics</CardTitle>
                              <CardDescription className="text-[11px] text-neutral-500">Distribution of total recoverable asset values aggregated by state jurisdiction</CardDescription>
                           </div>
                        </div>
                     </CardHeader>
                     <CardContent className="p-6">
                        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                           {/* Highlight metrics panel */}
                           <div className="space-y-4 flex flex-col justify-center bg-[#070709] border border-neutral-900 p-5 rounded-xl">
                              <div className="space-y-1">
                                 <span className="text-[10px] font-mono tracking-wider text-neutral-500 uppercase block">Total Portfolio Value</span>
                                 <span className="text-2xl font-bold font-mono text-emerald-400 block">
                                    ${totalSum.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                 </span>
                              </div>
                              <div className="border-t border-neutral-900/50 my-1"></div>
                              <div className="space-y-1">
                                 <span className="text-[10px] font-mono tracking-wider text-neutral-500 uppercase block">Active States Representation</span>
                                 <span className="text-sm font-semibold font-mono text-neutral-300 block">
                                    {chartData.length} unique state registry indexes
                                 </span>
                              </div>
                              <div className="border-t border-neutral-900/50 my-1"></div>
                              <div className="space-y-1">
                                 <span className="text-[10px] font-mono tracking-wider text-neutral-500 uppercase block">Max Concentration</span>
                                 <span className="text-xs font-semibold font-mono text-orange-300 block truncate">
                                    {chartData[0] ? `${chartData[0].state} ($${chartData[0].amount.toLocaleString()})` : "N/A"}
                                 </span>
                              </div>
                           </div>

                           {/* Bar chart canvas */}
                           <div className="lg:col-span-3 h-64 w-full bg-[#070709] border border-neutral-900 rounded-xl p-4 flex flex-col justify-end">
                              <div className="w-full h-full min-h-[220px]">
                                 <ResponsiveContainer width="100%" height="100%">
                                    <BarChart
                                       data={chartData}
                                       margin={{ top: 15, right: 10, left: 10, bottom: 5 }}
                                    >
                                       <CartesianGrid strokeDasharray="3 3" stroke="#121215" vertical={false} />
                                       <XAxis 
                                          dataKey="state" 
                                          stroke="#52525b" 
                                          fontSize={10} 
                                          tickLine={false} 
                                          axisLine={false}
                                          fontFamily="monospace"
                                       />
                                       <YAxis 
                                          stroke="#52525b" 
                                          fontSize={10} 
                                          tickLine={false} 
                                          axisLine={false}
                                          fontFamily="monospace"
                                          tickFormatter={(value) => `$${value >= 1e6 ? (value / 1e6).toFixed(1) + 'M' : value >= 1e3 ? (value / 1e3).toFixed(0) + 'K' : value}`}
                                       />
                                       <Tooltip 
                                          cursor={{ fill: 'rgba(249, 115, 22, 0.03)' }}
                                          contentStyle={{ 
                                             backgroundColor: '#070709', 
                                             borderColor: '#1f1f23', 
                                             borderRadius: '0.5rem',
                                             fontSize: '11px',
                                             color: '#d4d4d4',
                                             fontFamily: 'monospace'
                                          }}
                                          formatter={(value: any) => [`$${parseFloat(value).toLocaleString()}`, 'Total Capital']}
                                          labelFormatter={(label) => `State Jurisdiction: ${label}`}
                                       />
                                       <Bar 
                                          dataKey="amount" 
                                          fill="#f97316" 
                                          radius={[4, 4, 0, 0]}
                                          maxBarSize={45}
                                       />
                                    </BarChart>
                                 </ResponsiveContainer>
                              </div>
                           </div>
                        </div>
                     </CardContent>
                  </Card>
               )}

               {filteredCases.length === 0 ? (
                  <div className="text-center py-12 px-4 border border-dashed border-neutral-850 rounded-xl bg-neutral-900/10">
                     <Database className="w-12 h-12 text-neutral-700 mx-auto mb-3" />
                     <h3 className="text-sm font-semibold text-neutral-300">{savedCases.length === 0 ? "No saved lead categories" : "No folders match filters"}</h3>
                     <p className="text-neutral-500 mt-1 max-w-sm mx-auto text-xs">
                       {savedCases.length === 0 ? "Run a workbench search or use the California Bundler tool to compile and drop cases directly into CRM." : "Broaden state select filter coordinates."}
                     </p>
                  </div>
               ) : (
                  <div className="grid grid-cols-1 gap-6">
                     {filteredCases.map((savedCase) => {
                        const totalAmount = savedCase.assets.reduce((sum, a) => sum + a.amount, 0);
                        return (
                           <Card key={savedCase.id} className="border-neutral-900 bg-neutral-950 overflow-hidden rounded-xl">
                              <CardHeader className="bg-neutral-900/40 border-b border-neutral-900 flex flex-row items-center justify-between py-4 px-6">
                                 <div>
                                   <CardTitle className="text-sm font-semibold text-orange-400 font-mono">{savedCase.categoryName}</CardTitle>
                                   <CardDescription className="font-mono text-[10px] mt-1 text-neutral-500">
                                      Folder Reference: {savedCase.id} | Opened: {new Date(savedCase.createdAt).toLocaleDateString()}
                                   </CardDescription>
                                 </div>
                                 <div className="flex items-center gap-2">
                                    <Dialog>
                                       <DialogTrigger className="h-8 px-3 border border-neutral-800 bg-neutral-950 hover:bg-neutral-900 text-neutral-300 font-mono text-xs flex items-center gap-1.5 rounded-lg cursor-pointer">
                                             <Printer className="w-3.5 h-3.5 text-orange-400" />
                                             Print Dossier
                                       </DialogTrigger>
                                       <PrintCaseModal savedCase={savedCase} />
                                    </Dialog>
                                    <Dialog>
                                       <DialogTrigger className="h-8 px-3 border border-orange-500/25 bg-neutral-950 hover:bg-orange-500/10 text-orange-400 font-mono text-xs flex items-center gap-1.5 rounded-lg cursor-pointer">

                                             <History className="w-3.5 h-3.5" />
                                             Full History Ledger

                                       </DialogTrigger>
                                       <LeadHistoryModal 
                                          savedCase={savedCase} 
                                          onUpdateCase={(updatedCase) => {
                                             const updatedCases = savedCases.map(c => c.id === savedCase.id ? updatedCase : c);
                                             setSavedCases(updatedCases);
                                             saveAllCases(updatedCases);
                                          }}
                                       />
                                    </Dialog>
                                    <Button variant="ghost" className="text-red-500 hover:bg-neutral-900/50 hover:text-red-400 font-mono text-xs h-8" onClick={() => handleDeleteCase(savedCase.id)}>Delete Folder</Button>
                                 </div>
                              </CardHeader>
                              <CardContent className="p-0">
                                 <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-neutral-900">
                                    <div className="p-6">
                                       <div className="text-[10px] uppercase tracking-wider text-neutral-500 font-mono">Consolidated Capital Value</div>
                                       <div className="text-2xl font-semibold text-emerald-400 font-mono mt-1">${totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
                                       <div className="text-xs text-neutral-400 mt-1">{savedCase.assets.length} identified claims located</div>
                                    </div>
                                    <div className="p-6 md:col-span-2 space-y-3">
                                       <div className="font-semibold text-neutral-300 text-[10px] uppercase tracking-wider font-mono">Registry Indexes Summary</div>
                                       <div className="flex flex-wrap gap-2">
                                          {Array.from(new Set(savedCase.assets.map(a => a.state))).map(state => {
                                             const stateAssets = savedCase.assets.filter(a => a.state === state);
                                             const stateTotal = stateAssets.reduce((s, a) => s + a.amount, 0);
                                             return (
                                                <Dialog key={state}>
                                                   <DialogTrigger className={cn(buttonVariants({ variant: "outline" }), "h-auto py-2 px-3 border-neutral-850 bg-neutral-900/20 hover:bg-neutral-900 flex flex-col items-start gap-1")}>
                                                         <span className="font-bold text-neutral-200 text-xs font-mono">{state} Code</span>
                                                         <span className="text-[10px] text-neutral-500">{stateAssets.length} Claims | ${stateTotal.toLocaleString()}</span>
                                                   </DialogTrigger>
                                                   <DialogContent className="max-w-2xl bg-neutral-950 text-neutral-200 border-neutral-850">
                                                      <DialogHeader>
                                                         <DialogTitle className="font-mono text-orange-400">{state} Claims Summary Matrix</DialogTitle>
                                                         <DialogDescription className="text-neutral-450">{savedCase.categoryName}</DialogDescription>
                                                      </DialogHeader>
                                                      <div className="my-4 overflow-x-auto border border-neutral-900 rounded">
                                                         <Table>
                                                            <TableHeader className="bg-neutral-900/60">
                                                               <TableRow className="border-neutral-900">
                                                                  <TableHead className="font-mono text-[9px] uppercase px-3 py-2">Holder Custodian</TableHead>
                                                                  <TableHead className="font-mono text-[9px] uppercase px-3 py-2">Claimant Name</TableHead>
                                                                  <TableHead className="font-mono text-[9px] uppercase px-3 py-2">Type</TableHead>
                                                                  <TableHead className="font-mono text-[9px] uppercase px-3 py-2 text-right">Amount</TableHead>
                                                               </TableRow>
                                                            </TableHeader>
                                                            <TableBody>
                                                               {stateAssets.map(asset => (
                                                                  <TableRow key={asset.id} className="border-neutral-900">
                                                                     <TableCell className="text-xs px-3 py-2">{asset.holderCompany}</TableCell>
                                                                     <TableCell className="font-medium text-xs px-3 py-2">{asset.name}</TableCell>
                                                                     <TableCell className="text-xs px-3 py-2">{asset.type || "Cash Asset"}</TableCell>
                                                                     <TableCell className="text-right font-mono text-emerald-450 font-bold px-3 py-2">${asset.amount.toLocaleString()}</TableCell>
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
                                 </div>

                                 {/* EXPANDED CRM WORKSPACE */}
                                 <div className="border-t border-neutral-900 bg-[#070709] p-6 space-y-6">
                                    <div className="flex flex-wrap items-center gap-2 border-b border-neutral-900/50 pb-3">
                                       <span className="px-2 py-0.5 text-[10px] font-mono rounded bg-orange-500/10 text-orange-400 font-semibold border border-orange-500/20">CRM RECOVERY WORKSPACE</span>
                                       <span className="text-xs font-mono text-neutral-450">Track claim recovery stages, checklists, and communication history logs.</span>
                                    </div>

                                    {/* PROGRESS TRACKER */}
                                    <div className="space-y-2">
                                       <span className="text-[10px] font-mono uppercase tracking-wider text-neutral-400 block">Claim Recovery Stage Pipeline</span>
                                       <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                                          {["Lead", "Intake", "Evidence", "Submitted", "Review", "Paid"].map((stage) => {
                                             const activeStage = savedCase.status || "Lead";
                                             const isCurrent = activeStage === stage;
                                             const stageColors: Record<string, string> = {
                                                Lead: "bg-blue-500/20 text-blue-300 border-blue-500/40",
                                                Intake: "bg-purple-500/20 text-purple-300 border-purple-500/40",
                                                Evidence: "bg-yellow-500/15 text-yellow-250 border-yellow-500/30",
                                                Submitted: "bg-indigo-500/20 text-indigo-300 border-indigo-500/40",
                                                Review: "bg-orange-500/20 text-orange-300 border-orange-500/35",
                                                Paid: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                                             };
                                             return (
                                                <button
                                                   key={stage}
                                                   onClick={() => {
                                                      const oldStage = savedCase.status || "Lead";
                                                      const updatedCases = savedCases.map(c => {
                                                         if (c.id === savedCase.id) {
                                                            return {
                                                               ...c,
                                                               status: stage as any,
                                                               timeline: [
                                                                  ...(c.timeline || []),
                                                                  { date: new Date().toLocaleDateString(), stage: `${stage} Stage`, desc: `Case status manually changed from ${oldStage} to ${stage}.` }
                                                               ]
                                                            };
                                                         }
                                                         return c;
                                                      });
                                                      setSavedCases(updatedCases);
                                                      saveAllCases(updatedCases);
                                                   }}
                                                   className={`py-2 px-1 text-center rounded-lg text-[11px] font-bold border transition-all ${
                                                      isCurrent 
                                                         ? `${stageColors[stage] || "bg-orange-500/20 text-orange-350 border-orange-500"} scale-102 ring-1 ring-orange-500/20`
                                                         : "bg-neutral-900/50 text-neutral-450 border-neutral-900 hover:bg-neutral-850 hover:text-neutral-200"
                                                   }`}
                                                >
                                                   {isCurrent && "● "} {stage}
                                                </button>
                                             )
                                          })}
                                       </div>
                                    </div>

                                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-2">
                                       {/* LEFT OUTREACH WORKSPACE */}
                                       <div className="lg:col-span-6 space-y-4">
                                          <div className="bg-neutral-900/40 p-4 rounded-xl border border-neutral-900 space-y-3">
                                             <span className="text-[10px] uppercase font-mono tracking-wider text-neutral-450 block">State Claim Reference Details</span>
                                             <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                <div className="space-y-1">
                                                   <span className="text-[10px] text-neutral-500 font-mono tracking-wider uppercase block">Claim Number ID</span>
                                                   <Input
                                                      type="text"
                                                      placeholder="e.g. CA-4927-10%"
                                                      value={caseClaimNumbersEditing[savedCase.id] !== undefined ? caseClaimNumbersEditing[savedCase.id] : (savedCase.claimNumber || "")}
                                                      onChange={(e) => setCaseClaimNumbersEditing({
                                                         ...caseClaimNumbersEditing,
                                                         [savedCase.id]: e.target.value
                                                      })}
                                                      onBlur={() => {
                                                         const val = caseClaimNumbersEditing[savedCase.id];
                                                         if (val !== undefined) {
                                                            const updatedCases = savedCases.map(c => c.id === savedCase.id ? { ...c, claimNumber: val } : c);
                                                            setSavedCases(updatedCases);
                                                            saveAllCases(updatedCases);
                                                         }
                                                      }}
                                                      className="h-8 text-xs font-mono bg-neutral-950 border-neutral-850 text-neutral-300"
                                                   />
                                                </div>
                                                <div className="space-y-1">
                                                   <span className="text-[10px] text-neutral-500 font-mono tracking-wider uppercase block">Claimant Classification</span>
                                                   <div className="h-8 flex items-center px-3 bg-neutral-950 border border-neutral-850 rounded-md text-xs text-orange-300 font-mono select-none">
                                                      {savedCase.claimantType || "Estate Portfolio"}
                                                   </div>
                                                </div>
                                             </div>
                                          </div>

                                          {/* CHECKLIST */}
                                          <div className="bg-neutral-900/40 p-4 rounded-xl border border-neutral-900 space-y-3">
                                             <span className="text-[10px] uppercase font-mono tracking-wider text-neutral-450 block flex justify-between items-center">
                                                Active Recovery Checklist
                                                <span className="text-[9px] text-emerald-400 lowercase font-normal font-mono">Process Steps</span>
                                             </span>
                                             <div className="space-y-2">
                                                {(savedCase.tasks || [
                                                   { id: "t1", text: "Confirm living claimant status or obtain certified power of attorney", done: false },
                                                   { id: "t2", text: "Obtain certified copy of probate authorization or testamentary archives", done: false },
                                                   { id: "t3", text: "Acquire signed notarized contract limit agreement (max 10% rate)", done: false },
                                                   { id: "t4", text: "Formally submit physical claims bundle to state controller bureau", done: false }
                                                ]).map((task) => (
                                                   <div 
                                                      key={task.id} 
                                                      onClick={() => {
                                                         const currentTasks = savedCase.tasks || [
                                                            { id: "t1", text: "Confirm living claimant status or obtain certified power of attorney", done: false },
                                                            { id: "t2", text: "Obtain certified copy of probate authorization or testamentary archives", done: false },
                                                            { id: "t3", text: "Acquire signed notarized contract limit agreement (max 10% rate)", done: false },
                                                            { id: "t4", text: "Formally submit physical claims bundle to state controller bureau", done: false }
                                                         ];
                                                         const updatedTasks = currentTasks.map(t => t.id === task.id ? { ...t, done: !t.done } : t);
                                                         const updatedCases = savedCases.map(c => c.id === savedCase.id ? { ...c, tasks: updatedTasks } : c);
                                                         setSavedCases(updatedCases);
                                                         saveAllCases(updatedCases);
                                                      }}
                                                      className={`flex items-start gap-2.5 p-2 rounded-lg cursor-pointer text-xs select-none transition-all ${
                                                         task.done 
                                                            ? "bg-emerald-950/20 text-neutral-400 line-through border border-emerald-950/30" 
                                                            : "bg-neutral-950/50 hover:bg-neutral-900 text-neutral-200 border border-neutral-850/30"
                                                     }`}
                                                   >
                                                      <div className="mt-0.5 shrink-0">
                                                         {task.done ? (
                                                            <CheckSquare className="w-3.5 h-3.5 text-emerald-500 fill-emerald-500/10" />
                                                         ) : (
                                                            <Square className="w-3.5 h-3.5 text-neutral-600" />
                                                         )}
                                                      </div>
                                                      <span>{task.text}</span>
                                                   </div>
                                                ))}
                                             </div>
                                          </div>
                                       </div>

                                       {/* RIGHT NOTES LOGS + TIMELINE TRACKER */}
                                       <div className="lg:col-span-6 space-y-4 flex flex-col">
                                          <div className="bg-neutral-900/40 p-4 rounded-xl border border-neutral-900 space-y-2 flex-grow flex flex-col">
                                             <div className="flex justify-between items-center">
                                                <span className="text-[10px] uppercase font-mono tracking-wider text-neutral-450 flex items-center gap-2"><span>Correspondence Logs & Notes</span>{autoSaveStatus[savedCase.id] === "saving" && (<span className="text-[9px] font-mono text-amber-500 flex items-center gap-1 normal-case font-normal animate-pulse"><Loader2 className="w-2.5 h-2.5 animate-spin" /> saving...</span>)}{autoSaveStatus[savedCase.id] === "saved" && (<span className="text-[9px] font-mono text-emerald-400 flex items-center gap-1 normal-case font-normal"><CheckCircle2 className="w-2.5 h-2.5" /> auto-saved</span>)}</span>
                                                <Button 
                                                   size="xs"
                                                   onClick={() => {
                                                      const val = caseNotesEditing[savedCase.id] !== undefined ? caseNotesEditing[savedCase.id] : (savedCase.notes || "");
                                                      const updatedCases = savedCases.map(c => c.id === savedCase.id ? { ...c, notes: val } : c);
                                                      setSavedCases(updatedCases);
                                                      saveAllCases(updatedCases);
                                                      alert("Case correspondence logs updated successfully!");
                                                   }}
                                                   className="bg-orange-500 hover:bg-orange-600 text-black font-extrabold text-[10px] px-2 py-0.5 h-6 rounded"
                                                >
                                                   Save Note Block</Button>
     
                                             </div>
                                             <textarea
                                                placeholder="Record internal outreach attempts, calls to county registrars, emails to heirs, or deceased estate research progress logs..."
                                                value={caseNotesEditing[savedCase.id] !== undefined ? caseNotesEditing[savedCase.id] : (savedCase.notes || "")}
                                                onChange={(e) => setCaseNotesEditing({
                                                   ...caseNotesEditing,
                                                   [savedCase.id]: e.target.value
                                                })}
                                                onBlur={() => handleNotesBlur(savedCase.id)}
                                                className="w-full flex-grow h-28 bg-neutral-950 text-xs border border-neutral-850 rounded-lg p-2.5 text-neutral-300 focus:outline-none focus:ring-1 focus:ring-orange-500 font-mono leading-relaxed"
                                             />
                                          </div>

                                          <div className="bg-neutral-900/40 p-4 rounded-xl border border-neutral-900 space-y-2">
                                             <span className="text-[10px] uppercase font-mono tracking-wider text-neutral-450 block">Chronological milestones tracker Log</span>
                                             <div className="space-y-2 max-h-32 overflow-y-auto pr-1">
                                                {(savedCase.timeline || [
                                                   { date: new Date(savedCase.createdAt).toLocaleDateString(), stage: "Lead Initialized", desc: "Outreach card opened and database files indexed." }
                                                ]).map((t, index) => (
                                                   <div key={index} className="flex gap-2.5 text-[11px] font-mono leading-relaxed pb-2 border-b border-neutral-900/40 last:border-0 pl-1">
                                                      <span className="text-orange-400 font-bold shrink-0">{t.date}</span>
                                                      <div className="space-y-0.5">
                                                         <span className="text-neutral-300 font-semibold uppercase text-[10px] bg-neutral-950 px-1.5 py-0.5 rounded border border-neutral-850/50 mr-1.5">{t.stage}</span>
                                                         <span className="text-neutral-450 text-[10px]">{t.desc}</span>
                                                      </div>
                                                   </div>
                                                ))}
                                             </div>
                                          </div>
                                       </div>
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

          {/* 4) CALIFORNIA BUNDLING tools page */}
          {activeTab === "ca_bundling" && (
            <CaliforniaSpecialTools 
              toolType="bundling" 
              onAddCaseToSaved={handleSaveConsolidatedCase} 
              savedCases={savedCases}
            />
          )}

          {/* 5) CALIFORNIA ASSET COMBINER page */}
          {activeTab === "asset_combiner" && (
            <CaliforniaSpecialTools 
              toolType="combiner" 
              onAddCaseToSaved={handleSaveConsolidatedCase} 
              savedCases={savedCases}
            />
          )}

          {/* 6) CALIFORNIA investigator hub page */}
          {activeTab === "ca_investigator_hub" && (
            <CaliforniaSpecialTools 
              toolType="investigator_hub" 
            />
          )}

          {/* 7) CAMPAIGNS outreach list page */}
          {activeTab === "campaigns" && (
            <OutreachAndDataTools 
              toolType="campaigns" 
              savedCases={savedCases} 
            />
          )}

          {/* 8) TRACE & OSINT skip tracing console */}
          {activeTab === "trace_osint" && (
            <TraceConsole />
          )}

          {/* 9) MULTI-STATE STATS page */}
          {activeTab === "multistate_search" && (
            <OutreachAndDataTools toolType="multistate_search" />
          )}

          {/* 10) HERMES formal communication page */}
          {activeTab === "hermes" && (
            <OutreachAndDataTools toolType="hermes" />
          )}

          {/* 11) ASSET MASTER DB list page */}
          {activeTab === "asset_db" && (
            <OutreachAndDataTools toolType="asset_db" />
          )}

          {/* 12) REGULATIONS rules list page */}
          {activeTab === "regulations" && (
            <div className="space-y-6 animate-fade-in text-neutral-100">
              <div className="border-b border-neutral-900 pb-4">
                <h2 className="text-2xl font-bold tracking-tight">National Regulations Directory</h2>
                <p className="text-neutral-450 text-xs mt-1">Official locator commission ceilings, filing timelines, and necessary claims proof documents state-by-state.</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                 {Object.values(STATE_RULES).map(rule => (
                    <Card key={rule.state} className="border-neutral-900 bg-[#0e0e11] text-neutral-105 rounded-xl">
                       <CardHeader className="bg-neutral-900/30 border-b border-neutral-900 py-3.5 px-5">
                          <CardTitle className="flex justify-between items-center text-sm font-semibold">
                             <span>State code: {rule.state}</span>
                             <a href={rule.website} target="_blank" rel="noreferrer" className="text-orange-500 hover:text-orange-300 text-xs font-normal flex items-center">
                                Official Site <ChevronRight className="w-3.5 h-3.5 ml-1" />
                             </a>
                          </CardTitle>
                          <CardDescription className="text-neutral-500 text-xs pt-0.5">{rule.name}</CardDescription>
                       </CardHeader>
                       <CardContent className="space-y-4 pt-4 text-xs font-mono">
                          <div>
                             <div className="text-[9px] uppercase tracking-wider text-neutral-500 font-bold mb-1">Process Standard</div>
                             <p className="text-[11.5px] text-neutral-300 font-sans leading-relaxed">{rule.claimProcess}</p>
                          </div>
                          <Separator className="bg-neutral-900" />
                          <div>
                             <div className="text-[9px] uppercase tracking-wider text-neutral-500 font-bold mb-1.5">Required claims documents</div>
                             <ul className="text-[11.5px] text-neutral-300 space-y-1 list-disc list-inside font-sans">
                                {rule.documentationRequired.map((doc, i) => (
                                   <li key={i}>{doc}</li>
                                ))}
                             </ul>
                          </div>
                          <Separator className="bg-neutral-900" />
                          <div className="grid grid-cols-2 gap-2">
                             <div>
                                <div className="text-[9px] uppercase tracking-wider text-neutral-500 font-bold mb-0.5">Timeline</div>
                                <p className="text-[11.5px] font-semibold text-neutral-200">{rule.timeline}</p>
                             </div>
                             <div>
                                <div className="text-[9px] uppercase tracking-wider text-neutral-500 font-bold mb-0.5">Locator Fee limit</div>
                                <p className="text-[11.5px] font-semibold text-orange-400">{rule.maxCommission}</p>
                             </div>
                          </div>
                       </CardContent>
                    </Card>
                 ))}
              </div>
            </div>
          )}

          {/* 13) IMPORT CSV parsing subpage */}
          {activeTab === "import_csv" && (
            <OutreachAndDataTools 
              toolType="import_csv" 
              onImportRecords={(parsedRows) => {
                setCustomImportedRecords(prev => [...parsedRows, ...prev]);
                // Transition user back to Search Workbench where imported rows are merged
                setActiveTab("search_workbench");
              }} 
            />
          )}

        </div>
      </main>

      {/* Save Leads dialog */}
      <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
        <DialogContent className="bg-neutral-950 text-neutral-200 border-neutral-900">
          <DialogHeader>
             <DialogTitle className="font-mono text-orange-400">Save leads to category</DialogTitle>
             <DialogDescription className="text-neutral-450">Create a tracking leads folder to automatically consolidate the workbench query results into client accounts.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 my-2">
             <div className="space-y-2">
                <Label htmlFor="categoryName" className="text-xs uppercase text-neutral-400 font-mono tracking-wider font-semibold">Account / Category Name</Label>
                <Input 
                   id="categoryName" 
                   autoFocus
                   placeholder={`e.g. ${recommendCategoryName(firstName, lastName, targetState, searchMode)}`} 
                   value={saveCategoryName} 
                   onChange={e => setSaveCategoryName(e.target.value)} 
                   className="bg-neutral-950 border-neutral-850 focus:border-orange-500"
                />
                <p className="text-[10px] text-neutral-500 leading-normal italic mt-1">
                  Leave blank to automatically suggest a name based on current claimant credentials ("{recommendCategoryName(firstName, lastName, targetState, searchMode)}").
                </p>
             </div>
          </div>
          <DialogFooter className="gap-2">
             <Button variant="outline" onClick={() => setSaveDialogOpen(false)} className="border-neutral-850 text-neutral-400">Cancel</Button>
             <Button onClick={handleSaveCase} className="bg-orange-600 hover:bg-orange-700 text-neutral-50">Save Leads Portfolio</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Email Generation modal frame */}
      <Dialog open={emailDialogOpen} onOpenChange={setEmailDialogOpen}>
        <DialogContent className="sm:max-w-[700px] h-[80vh] flex flex-col bg-neutral-950 border-neutral-900 text-neutral-200">
          <DialogHeader>
            <DialogTitle className="flex items-center text-orange-400 font-mono">
              <Mail className="w-5 h-5 mr-2 text-orange-500 animate-pulse" />
              Professional Skip Outreach
            </DialogTitle>
            <DialogDescription className="text-neutral-450">
              Drafted for {selectedRelative?.name} ({selectedRelative?.relation}) regarding unclaimed property.
            </DialogDescription>
            {relatives.length > 1 && (
              <div className="mt-2.5 flex items-center gap-2 bg-neutral-900/60 p-2 rounded-lg border border-neutral-900 max-w-md">
                <span className="text-[11px] text-neutral-400 font-mono">Recipient:</span>
                <select
                  value={selectedRelative?.id || ""}
                  onChange={(e) => {
                    const rel = relatives.find(r => r.id === e.target.value);
                    if (rel) {
                      handleDraftEmail(rel);
                    }
                  }}
                  className="bg-neutral-950 border border-neutral-850 text-xs text-neutral-200 rounded px-2.5 py-1 font-mono focus:outline-none focus:border-orange-500 cursor-pointer flex-grow"
                >
                  {relatives.map(r => (
                    <option key={r.id} value={r.id}>
                      {r.name} ({r.relation} - {r.matchConfidence}% Match)
                    </option>
                  ))}
                </select>
              </div>
            )}
          </DialogHeader>
          <div className="relative flex-grow flex flex-col mt-4">
            {isDraftingEmail ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-neutral-950 rounded-md border border-neutral-900">
                 <Loader2 className="h-8 w-8 animate-spin text-orange-400 mb-4" />
                 <p className="text-xs font-semibold text-neutral-400 uppercase tracking-widest animate-pulse">Gemini preparing letter...</p>
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
          <DialogFooter className="mt-4 sm:justify-between flex-row items-center border-t border-neutral-900 pt-4">
             <div className="text-[10px] text-neutral-500 flex items-center pr-3">
                <AlertCircle className="w-3.5 h-3.5 mr-1" />
                Inspect proof contents before dispatching
             </div>
             <div className="space-x-2 flex">
                <Button variant="outline" onClick={() => setEmailDialogOpen(false)} className="border-neutral-850 text-neutral-400">Close</Button>
                <Button 
                   onClick={copyToClipboard} 
                   disabled={isDraftingEmail || !draftedEmail}
                   className="bg-orange-600 hover:bg-orange-700 text-neutral-50 font-semibold"
                >
                   {copied ? <Check className="w-4 h-4 mr-1.5" /> : <Copy className="w-4 h-4 mr-1.5" />}
                   {copied ? "Copied!" : "Copy Output"}
                </Button>
             </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
