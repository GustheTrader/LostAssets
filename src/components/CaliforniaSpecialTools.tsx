import { useState } from "react";
import { 
  Network, Layers, ShieldAlert, Cpu, CheckSquare, Square, 
  ArrowRight, Calculator, CheckCircle2, ExternalLink, Scale, 
  DollarSign, FileText, Plus, Database, Award, BookOpen,
  Search, Users, Briefcase, Building2, User, Folder, Shuffle,
  HelpCircle, AlertCircle, Clock, Trash2, Check, ArrowDownToLine
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Badge } from "./ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { SavedCase } from "../types";

// Mock records available for bundling with classification types (Individual, Estate, Business)
const BUNDLEable_RECORDS = [
  { id: "ca-bnd-1", name: "WINIFRED GALT ESTATE", executor: "CHARLES GALT", county: "San Francisco", itemAmount: 189400.00, holder: "UNION BANK & TRUST", docStatus: "Incomplete", classification: "Estate" as const },
  { id: "ca-bnd-2", name: "CHARLES GALT HEIR TRUST", executor: "CHARLES GALT", county: "San Francisco", itemAmount: 43500.00, holder: "WELLS FARGO CUSTODY", docStatus: "Match Confirmed", classification: "Estate" as const },
  { id: "ca-bnd-3", name: "GALT GENERAL HOLDINGS", executor: "CHARLES GALT", county: "San Francisco", itemAmount: 12500.00, holder: "CHEVRON STOCK", docStatus: "Incomplete", classification: "Business" as const },
  { id: "ca-bnd-4", name: "HERBERT V HOWARD TRUST", executor: "MARGARET HOWARD", county: "Los Angeles", itemAmount: 48900.00, holder: "METROPOLITAN LIFE INS", docStatus: "Incomplete", classification: "Estate" as const },
  { id: "ca-bnd-5", name: "HOWARD FAMILY SPECIAL ESCROW", executor: "MARGARET HOWARD", county: "Los Angeles", itemAmount: 22100.00, holder: "PACIFIC GAS & ELECTRIC", docStatus: "Match Confirmed", classification: "Estate" as const },
  { id: "ca-bnd-6", name: "THOMSON DIGGS", executor: "THOMSON DIGGS", county: "Sacramento", itemAmount: 250000.00, holder: "STATE STREET CORP", docStatus: "Incomplete", classification: "Individual" as const },
  { id: "ca-bnd-7", name: "HELEN MARIE CHEN", executor: "HELEN MARIE CHEN", county: "Contra Costa", itemAmount: 84000.00, holder: "WELLS FARGO BANK", docStatus: "Match Confirmed", classification: "Individual" as const },
  { id: "ca-bnd-8", name: "ROBERTO RAMIREZ SALAS", executor: "ROBERTO RAMIREZ SALAS", county: "San Diego", itemAmount: 95500.00, holder: "BANK OF AMERICA", docStatus: "Incomplete", classification: "Individual" as const },
  { id: "ca-bnd-9", name: "VALLEY RECOVERY SOLUTIONS LLC", executor: "JACKSON MERRILL", county: "Santa Clara", itemAmount: 310200.00, holder: "SVB ESCROW SYSTEM", docStatus: "Match Confirmed", classification: "Business" as const },
  { id: "ca-bnd-10", name: "APEX PACIFIC LOGISTICS INC", executor: "SARA JENSEN", county: "Orange", itemAmount: 145000.00, holder: "CITIBANK WEST", docStatus: "Incomplete", classification: "Business" as const },
  { id: "ca-bnd-11", name: "ESTATE OF LIAM O'CONNOR", executor: "SINEAD O'CONNOR", county: "Alameda", itemAmount: 110500.00, holder: "CHEVRON CORPORATION", docStatus: "Incomplete", classification: "Estate" as const }
];

// Associated / Similar claim patterns for grab & drop workflow
const ASSOCIATED_MOCK_REGISTRY: Record<string, { id: string; owner: string; amount: number; holder: string; type: string; reason: string }[]> = {
  "GALT": [
    { id: "assoc-1", owner: "WINIFRED GALT", amount: 28500.00, holder: "UNION BANK & TRUST", type: "Utility Deposit", reason: "Direct Surname Match" },
    { id: "assoc-2", owner: "CHARLES GALT", amount: 9200.00, holder: "Wells Fargo Bank", type: "Bank Account", reason: "Direct Executor Match" },
    { id: "assoc-3", owner: "GALT COMMERCE ASSOCIATES", amount: 147000.00, holder: "CHEVRON STOCK DIVIDENDS", type: "Uncashed Warrant", reason: "Corporate Keyword 'GALT'" }
  ],
  "HOWARD": [
    { id: "assoc-4", owner: "MARGARET HOWARD", amount: 15400.00, holder: "PACIFIC GAS & ELECTRIC", type: "Bank Account", reason: "Executor Name Match" },
    { id: "assoc-5", owner: "HERBERT V HOWARD", amount: 37100.00, holder: "METROPOLITAN LIFE INS", type: "Life Insurance", reason: "Trust Settlor Match" }
  ],
  "DIGGS": [
    { id: "assoc-6", owner: "THOMSON DIGGS JR", amount: 12100.00, holder: "STATE STREET CORP", type: "Utility Deposit", reason: "Fuzzy Generation Match" },
    { id: "assoc-7", owner: "DIGGS DEVELOPMENT CO", amount: 89000.00, holder: "SAN FRANCISCO CONTROLLER", type: "Uncashed Warrant", reason: "Term Match 'DIGGS'" }
  ],
  "CHEN": [
    { id: "assoc-8", owner: "HELEN M CHEN", amount: 19400.00, holder: "BofA SECURITIES", type: "Uncashed Check", reason: "Middle Initial Abbreviation Match" },
    { id: "assoc-9", owner: "CHEN ENTERPRISES CA", amount: 48000.00, holder: "WELLS FARGO ESCROW", type: "Utility Credit", reason: "Surname Corp Match" }
  ],
  "SALAS": [
    { id: "assoc-10", owner: "ROBERTO R SALAS", amount: 11400.00, holder: "BANK OF AMERICA", type: "Bank Account", reason: "Middle Abbreviation Match" }
  ],
  "MERRILL": [
    { id: "assoc-11", owner: "VALLEY CAPITAL MANAGEMENT", amount: 125000.00, holder: "SVB ESCROW SYSTEM", type: "Uncashed Warrant", reason: "Group Entity Alignment" }
  ],
  "JENSEN": [
    { id: "assoc-12", owner: "APEX LOGISTICS GROUP", amount: 56000.00, holder: "CITIBANK NA", type: "Unclaimed Refund", reason: "Corporate Parent Match" }
  ],
  "O'CONNOR": [
    { id: "assoc-13", owner: "LIAM O'CONNOR HEIRS", amount: 73000.00, holder: "CHEVRON STOCK DIVIDENDS", type: "Life Insurance", reason: "Estate Entitlement Match" }
  ]
};

function getAssociatedSimilarClaims(record: any) {
  if (!record) return [];
  const name = record.name.toUpperCase();
  const executor = record.executor.toUpperCase();
  
  // Find matches based on name keywords
  for (const key of Object.keys(ASSOCIATED_MOCK_REGISTRY)) {
    if (name.includes(key) || executor.includes(key)) {
      return ASSOCIATED_MOCK_REGISTRY[key];
    }
  }
  
  // Fallback dynamic generator if no static record match
  return [
    { id: `assoc-gen-${record.id}-1`, owner: `${record.executor} REFUND`, amount: Math.floor(record.itemAmount * 0.12), holder: record.holder, type: "Uncashed Check", reason: "Executor Relation Match" },
    { id: `assoc-gen-${record.id}-2`, owner: `${record.name} RESIDUAL`, amount: Math.floor(record.itemAmount * 0.08), holder: "CALIFORNIA UNCLAIMED REGISTRY", type: "Utility Deposit", reason: "Fuzzy Term Match" }
  ];
}

// Mock records for general combining
const COMBINABLE_ASSETS = [
  { id: "comb-1", owner: "ESTHER MARIE CHEVRON", amount: 62450.00, holder: "CHEVRON CORPORATION", type: "Stock Dividend", state: "CA" },
  { id: "comb-2", owner: "ESTHER M CHEVRON", amount: 15400.00, holder: "CHEVRON STOCK DIVIDENDS", type: "Utility Credit", state: "CA" },
  { id: "comb-3", owner: "ESTHER CHEVRON", amount: 8900.00, holder: "CITIBANK NA", type: "Uncashed Warrant", state: "CA" },
  { id: "comb-4", owner: "LAWRENCE H PINEDA", amount: 12450.00, holder: "WELLS FARGO ADVISORS", type: "Mutual Fund", state: "CA" },
  { id: "comb-5", owner: "L H PINEDA", amount: 4800.00, holder: "ADP PAYROLL ESCROW", type: "Uncashed Check", state: "CA" }
];

interface CaliforniaSpecialToolsProps {
  toolType: "bundling" | "combiner" | "investigator_hub";
  onAddCaseToSaved?: (caseData: any) => void;
  savedCases?: SavedCase[];
}

export function CaliforniaSpecialTools({ toolType, onAddCaseToSaved, savedCases = [] }: CaliforniaSpecialToolsProps) {
  // --- BUNDLING TAB ---
  const [selectedBundleIds, setSelectedBundleIds] = useState<string[]>([]);
  const [commissionRate, setCommissionRate] = useState(10);
  const [bundledPackage, setBundledPackage] = useState<any | null>(null);

  // --- NEW BUNDLING SEARCH & CRM GRAB STATES ---
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedClassification, setSelectedClassification] = useState<"All" | "Individual" | "Estate" | "Business">("All");
  const [focusedRecordId, setFocusedRecordId] = useState<string | null>("ca-bnd-1"); // Default focus to Winifred Galt for demonstration
  const [grabbedSimilarIds, setGrabbedSimilarIds] = useState<string[]>([]);
  const [targetCrmCaseId, setTargetCrmCaseId] = useState<string>("new_case");
  const [customNewCaseName, setCustomNewCaseName] = useState("");

  // --- ASSET COMBINER ---
  const [selectedCombineIds, setSelectedCombineIds] = useState<string[]>([]);
  const [combinedReport, setCombinedReport] = useState<any | null>(null);
  const [customReportName, setCustomReportName] = useState("");

  // --- COMPLIANCE CALCULATOR ---
  const [calcAmount, setCalcAmount] = useState("35000");
  const [calcState, setCalcState] = useState("CA");
  const [calcResult, setCalcResult] = useState<any | null>(null);

  // --- CHECKLIST STATE ---
  const [checks, setChecks] = useState({
    claimantFound: true,
    notarizedIntake: false,
    probateLookup: true,
    stateFilingSent: false,
    feePermitMatch: true
  });

  const toggleCheck = (key: keyof typeof checks) => {
    setChecks(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // Bundle Actions
  const toggleBundleRow = (id: string) => {
    setSelectedBundleIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const executeBundling = () => {
    if (selectedBundleIds.length === 0) return;
    const selectedRows = BUNDLEable_RECORDS.filter(r => selectedBundleIds.includes(r.id));
    const totalAmount = selectedRows.reduce((sum, r) => sum + r.itemAmount, 0);
    const estCommission = totalAmount * (commissionRate / 100);
    const executorName = selectedRows[0].executor;

    const bundleCode = `CA-BND-${Math.floor(Math.random() * 9000) + 1000}`;

    setBundledPackage({
      code: bundleCode,
      rows: selectedRows,
      total: totalAmount,
      commission: estCommission,
      executor: executorName,
      rate: commissionRate,
      date: new Date().toLocaleDateString()
    });
  };

  const handleDropToCRM = () => {
    const selectedMainItems = BUNDLEable_RECORDS.filter(r => selectedBundleIds.includes(r.id));
    
    const focusedRecord = BUNDLEable_RECORDS.find(r => r.id === focusedRecordId);
    const similarItems = getAssociatedSimilarClaims(focusedRecord);
    const selectedSimilarItems = similarItems.filter(item => grabbedSimilarIds.includes(item.id));

    if (selectedMainItems.length === 0 && selectedSimilarItems.length === 0) {
      alert("No claims selected! Please select either claimant records in the table or associated claims below to drop into the CRM.");
      return;
    }

    const mainClaimAssets = selectedMainItems.map(r => ({
      id: r.id,
      name: r.name,
      address: `Escheated Registry, ${r.county} County`,
      state: "CA",
      type: (r.classification === "Individual" ? "Bank Account" : r.classification === "Business" ? "Utility Deposit" : "Life Insurance") as any,
      holderCompany: r.holder,
      amount: r.itemAmount
    }));

    const similarClaimAssets = selectedSimilarItems.map(s => ({
      id: s.id,
      name: s.owner,
      address: "CA Associated Unclaimed Escrow",
      state: "CA",
      type: "Uncashed Check" as any,
      holderCompany: s.holder,
      amount: s.amount
    }));

    const consolidatedAssets = [...mainClaimAssets, ...similarClaimAssets];
    const totalAmount = consolidatedAssets.reduce((sum, a) => sum + a.amount, 0);

    if (targetCrmCaseId === "new_case") {
      const primarySubjectObj = selectedMainItems[0] || focusedRecord || { executor: "Unified Claimant", name: "Unified Claimant", classification: "Estate" };
      const primarySubject = primarySubjectObj as { executor: string; name: string; classification: string };
      const defaultTitle = `${primarySubject.executor || primarySubject.name} CRM Portfolio`;
      const finalTitle = (customNewCaseName.trim() || defaultTitle).toUpperCase();

      const newCase: SavedCase = {
        id: "bundled-case-" + Date.now(),
        categoryName: finalTitle,
        query: { generalHighValue: true, targetState: "CA" },
        assets: consolidatedAssets,
        relatives: [],
        createdAt: Date.now(),
        status: "Lead",
        claimantType: (selectedMainItems[0]?.classification || focusedRecord?.classification || "Estate") as any,
        ownerName: primarySubject.executor || primarySubject.name,
        claimNumber: `CA-${Math.floor(Math.random() * 89999) + 10000}`,
        notes: `Compiled from California Claims Bundler.\nBundled leads from ${selectedMainItems.length} main folders + ${selectedSimilarItems.length} checked similar assets.`,
        timeline: [
          { date: new Date().toLocaleDateString(), stage: "Lead Created", desc: "Claims consolidated and dropped directly into CRM Case Tracker." }
        ],
        tasks: [
          { id: "t1", text: "Confirm living claimant status and verify direct power of attorney", done: false },
          { id: "t2", text: "Obtain certified copy of probate file or letters testamentary", done: false },
          { id: "t3", text: "Acquire signed notarized fee & client contract limit agreement (max 10% rate)", done: false },
          { id: "t4", text: "Formally submit physical claims package to California State Controller Bureau", done: false }
        ]
      };

      if (onAddCaseToSaved) {
        onAddCaseToSaved(newCase);
      }
      alert(`SUCCESS: Created a new CRM Case folder "${finalTitle}" containing ${consolidatedAssets.length} claims (Total cash value: $${totalAmount.toLocaleString()})! Navigate to SAVED CASES to manage its lifecycle.`);
    } else {
      const existingCase = savedCases.find(c => c.id === targetCrmCaseId);
      if (!existingCase) {
        alert("Selected CRM Case folder was not found.");
        return;
      }

      // Filter out duplicates based on asset ID
      const currentAssetIds = new Set(existingCase.assets.map(a => a.id));
      const newlyAddedAssets = consolidatedAssets.filter(a => !currentAssetIds.has(a.id));

      if (newlyAddedAssets.length === 0) {
        alert("The selected CRM Case folder already contains all these selected claims.");
        return;
      }

      const updatedCase: SavedCase = {
        ...existingCase,
        assets: [...existingCase.assets, ...newlyAddedAssets],
        notes: (existingCase.notes || "") + `\n\n--- Appended ${newlyAddedAssets.length} newly grabbed claims via claims bundler on ${new Date().toLocaleDateString()} ---\nMerged assets: ` + newlyAddedAssets.map(a => `${a.name} ($${a.amount})`).join(", "),
        timeline: [
          ...(existingCase.timeline || []),
          { date: new Date().toLocaleDateString(), stage: "Assets Merged", desc: `Toggled and injected ${newlyAddedAssets.length} further claims (aggregated value of $${newlyAddedAssets.reduce((sum, a) => sum + a.amount, 0).toLocaleString()}) from CA Bundler.` }
        ]
      };

      if (onAddCaseToSaved) {
        onAddCaseToSaved(updatedCase);
      }
      alert(`SUCCESS: Toggled and appended ${newlyAddedAssets.length} newly grabbed claims into existing CRM Case file "${existingCase.categoryName}"! Total claim value is now $${(existingCase.assets.reduce((sum, a) => sum + a.amount, 0) + newlyAddedAssets.reduce((sum, a) => sum + a.amount, 0)).toLocaleString()}.`);
    }

    // Reset selection/grabbing states
    setSelectedBundleIds([]);
    setGrabbedSimilarIds([]);
    setBundledPackage(null);
    setCustomNewCaseName("");
  };

  // Combine Actions
  const toggleCombineRow = (id: string) => {
    setSelectedCombineIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const executeCombining = () => {
    if (selectedCombineIds.length === 0) return;
    const items = COMBINABLE_ASSETS.filter(x => selectedCombineIds.includes(x.id));
    const total = items.reduce((sum, i) => sum + i.amount, 0);
    const probableOwner = items[0].owner;

    setCombinedReport({
      id: `COMB-${Math.floor(Math.random() * 90000) + 10000}`,
      items,
      total,
      probableOwner,
      date: new Date().toLocaleDateString()
    });
    setCustomReportName(`${probableOwner} Combined Recoveries`);
  };

  const handleSaveCombinedCase = () => {
    if (!combinedReport) return;
    const finalName = customReportName.trim() || `${combinedReport.probableOwner} Combined Recoveries`;

    const newCase = {
      id: "combined-case-" + Date.now(),
      categoryName: finalName,
      query: { firstName: combinedReport.probableOwner, targetState: "CA" },
      assets: combinedReport.items.map((r: any) => ({
        id: r.id,
        name: r.owner,
        address: "State Audit Registry",
        state: "CA",
        type: r.type,
        holderCompany: r.holder,
        amount: r.amount
      })),
      relatives: [],
      createdAt: Date.now()
    };

    if (onAddCaseToSaved) {
      onAddCaseToSaved(newCase);
    }
    alert(`Successfully generated case folder: "${finalName}" with aggregated value of $${combinedReport.total.toLocaleString()}!`);
    setCombinedReport(null);
    setSelectedCombineIds([]);
  };

  // Calculator Actions
  const handleCalculateLimit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseFloat(calcAmount.replace(/,/g, '')) || 0;
    
    // CA law sets 10% limit after 2 years
    // Florida sets 20% max under most parameters
    // Delaware sets strict parameters on registration
    const stateRates: Record<string, { maxRate: number; codeSection: string; notes: string }> = {
      CA: { maxRate: 10, codeSection: "CA Civ. Proc. Code § 1540", notes: "California prohibits contract finder fees exceeding 10% of the asset value for escheated property." },
      FL: { maxRate: 20, codeSection: "FL Stat. § 717.135", notes: "Florida limits registration locators to 20% max commission." },
      TX: { maxRate: 10, codeSection: "TX Prop. Code § 74.507", notes: "Texas limits private locators to 10% of claim recoveries." },
      NY: { maxRate: 15, codeSection: "NY Aband. Prop. Law § 1416", notes: "New York enforces premium ceiling of 15% of the values retrieved." },
      DE: { maxRate: 10, codeSection: "DE Code Tit. 12, § 1145", notes: "Delaware limits contract locators to 10% of recovered cash." }
    };

    const rateMeta = stateRates[calcState] || { maxRate: 10, codeSection: "General Code", notes: "Fallback finder limitations." };
    const maxFee = parsedAmount * (rateMeta.maxRate / 100);

    setCalcResult({
      amount: parsedAmount,
      state: calcState,
      maxRate: rateMeta.maxRate,
      maxFee,
      section: rateMeta.codeSection,
      notes: rateMeta.notes,
      compliantRate: commissionRate <= rateMeta.maxRate
    });
  };

  return (
    <div className="space-y-6 animate-fade-in text-neutral-100">
      {/* 1. CALIFORNIA BUNDLING SUBPAGE */}
      {toolType === "bundling" && (() => {
        // Compute search matches
        const filteredRecords = BUNDLEable_RECORDS.filter(record => {
          const matchesSearch = 
            record.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            record.executor.toLowerCase().includes(searchQuery.toLowerCase()) ||
            record.county.toLowerCase().includes(searchQuery.toLowerCase()) ||
            record.holder.toLowerCase().includes(searchQuery.toLowerCase());
          
          if (selectedClassification === "All") return matchesSearch;
          return matchesSearch && record.classification === selectedClassification;
        });

        const activeFocusRecord = BUNDLEable_RECORDS.find(r => r.id === focusedRecordId) || filteredRecords[0];

        // Retrieve similar claims dynamically
        const similarAssets = getAssociatedSimilarClaims(activeFocusRecord);

        return (
          <div className="space-y-6">
            <div>
              <span className="text-orange-400 text-xs font-mono font-bold uppercase bg-orange-400/10 px-2.5 py-1 rounded border border-orange-500/20 tracking-wider">
                California Special Tools Suite
              </span>
              <h2 className="text-2xl font-bold tracking-tight text-neutral-100 mt-2 flex items-center gap-2">
                <Network className="w-6 h-6 text-orange-400" />
                California Claims Bundler & Multi-Grab Engine
              </h2>
              <p className="text-neutral-400 text-sm max-w-3xl">
                Search individual, estate, or company assets by claimant type. Identify similar matching claims from CA state databases instantly, select the assets, and drop or toggle them into the CRM to initiate claimant outreach.
              </p>
            </div>

            {/* SEARCH BOX AND CLASSIFICATION PILLS BLOCK */}
            <div className="bg-neutral-900/40 p-4 rounded-xl border border-neutral-800 flex flex-col md:flex-row gap-4 justify-between items-center">
              <div className="relative w-full md:w-96">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-neutral-500" />
                <Input
                  type="text"
                  placeholder="Search individual, estate, executor or county..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 bg-neutral-950/80 border-neutral-800 text-neutral-200 focus:ring-orange-500 focus:border-orange-500"
                />
              </div>

              {/* Classification toggle pills */}
              <div className="flex flex-wrap gap-1.5 bg-neutral-950 p-1 rounded-lg border border-neutral-850">
                {(["All", "Individual", "Estate", "Business"] as const).map((type) => {
                  const isActive = selectedClassification === type;
                  return (
                    <button
                      key={type}
                      onClick={() => {
                        setSelectedClassification(type);
                        // Auto-focus first match in high-fidelity
                        const firstMatch = BUNDLEable_RECORDS.find(r => type === "All" || r.classification === type);
                        if (firstMatch) setFocusedRecordId(firstMatch.id);
                      }}
                      className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-200 flex items-center gap-1.5 ${
                        isActive
                          ? "bg-orange-500 text-black shadow font-bold"
                          : "text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900"
                      }`}
                    >
                      {type === "Individual" && <User className="w-3.5 h-3.5" />}
                      {type === "Estate" && <Award className="w-3.5 h-3.5" />}
                      {type === "Business" && <Building2 className="w-3.5 h-3.5" />}
                      {type === "All" && <Database className="w-3.5 h-3.5" />}
                      {type === "All" ? "All Categories" : type === "Estate" ? "Estates" : type === "Business" ? "Businesses" : "Individuals"}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Left Column: Claims Registry Table */}
              <div className="lg:col-span-7 space-y-4">
                <Card className="border-neutral-800 bg-[#0e0e11] overflow-hidden">
                  <CardHeader className="bg-neutral-900/50 py-3.5 px-5 border-b border-neutral-800 flex flex-row items-center justify-between">
                    <div>
                      <CardTitle className="text-sm font-semibold flex items-center gap-1.5 text-neutral-300">
                        <Layers className="w-4 h-4 text-orange-400" />
                        Available Public Claims Database
                      </CardTitle>
                      <CardDescription className="text-xs text-neutral-500">
                        {filteredRecords.length} records match current filters. Click any row to discover fuzzy matches.
                      </CardDescription>
                    </div>
                    <Badge variant="outline" className="border-orange-500/20 bg-orange-500/5 font-mono text-orange-400 text-[10px]">
                      LIVE CONNECTED
                    </Badge>
                  </CardHeader>

                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader className="bg-neutral-900/15">
                        <TableRow className="border-neutral-800 hover:bg-transparent">
                          <TableHead className="w-12 text-center text-xs">Select</TableHead>
                          <TableHead className="font-mono text-xs">Claimant / Estate</TableHead>
                          <TableHead className="font-mono text-xs">Type</TableHead>
                          <TableHead className="font-mono text-xs">Appointed Executor</TableHead>
                          <TableHead className="font-mono text-xs text-right">Property Value</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredRecords.length === 0 ? (
                          <TableRow className="border-neutral-850">
                            <TableCell colSpan={5} className="text-center py-8 text-neutral-500 text-xs">
                              <AlertCircle className="w-5 h-5 mx-auto mb-2 text-neutral-700" />
                              No records found matching "{searchQuery}" under {selectedClassification}.
                            </TableCell>
                          </TableRow>
                        ) : (
                          filteredRecords.map(record => {
                            const isChecked = selectedBundleIds.includes(record.id);
                            const isFocused = focusedRecordId === record.id;
                            return (
                              <TableRow 
                                key={record.id} 
                                onClick={() => setFocusedRecordId(record.id)}
                                className={`border-neutral-800 cursor-pointer transition-all duration-150 ${
                                  isFocused 
                                    ? "bg-neutral-900/80 border-l-2 border-l-orange-500" 
                                    : "hover:bg-neutral-900/30"
                                }`}
                              >
                                <TableCell className="py-3 text-center" onClick={(e) => {
                                  e.stopPropagation(); // Avoid triggering details focus toggles
                                  toggleBundleRow(record.id);
                                }}>
                                  <button type="button" className="focus:outline-none">
                                    {isChecked ? (
                                      <CheckSquare className="w-4 h-4 text-orange-500 fill-orange-500/10" />
                                    ) : (
                                      <Square className="w-4 h-4 text-neutral-700 hover:text-orange-500" />
                                    )}
                                  </button>
                                </TableCell>
                                <TableCell className="font-mono text-xs font-semibold text-neutral-100">
                                  {record.name}
                                </TableCell>
                                <TableCell className="text-[10px]">
                                  <span className={`px-2 py-0.5 rounded-full font-mono font-medium ${
                                    record.classification === "Individual" 
                                      ? "bg-blue-950/60 text-blue-400 border border-blue-900/30"
                                      : record.classification === "Business"
                                        ? "bg-purple-950/60 text-purple-400 border border-purple-900/30"
                                        : "bg-amber-950/60 text-amber-400 border border-amber-900/30"
                                  }`}>
                                    {record.classification}
                                  </span>
                                </TableCell>
                                <TableCell className="text-xs text-orange-300">
                                  {record.executor}
                                </TableCell>
                                <TableCell className="text-xs text-right font-semibold font-mono text-emerald-400">
                                  ${record.itemAmount.toLocaleString()}
                                </TableCell>
                              </TableRow>
                            );
                          })
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </Card>

                {/* Left Bottom Section: Commission Calculator in simple neat bar */}
                <Card className="border-neutral-800 bg-[#0e0e11] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-widest flex items-center gap-1">
                      <Cpu className="w-3.5 h-3.5 text-orange-500" /> 
                      Agency Finder commission Fee
                    </h3>
                    <p className="text-xs text-neutral-500">Adjust the contract percentage rate for recovery outreach.</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-mono text-orange-400 font-bold min-w-10 text-right">{commissionRate}%</span>
                    <input 
                      type="range" 
                      min="5" 
                      max="15" 
                      value={commissionRate}
                      onChange={e => setCommissionRate(parseInt(e.target.value))}
                      className="w-32 sm:w-44 accent-orange-500 h-1 bg-neutral-950 rounded-lg cursor-pointer"
                    />
                    <Badge variant="outline" className="text-[10px] text-neutral-400 border-neutral-800 font-mono">
                      State Max: 10%
                    </Badge>
                  </div>
                </Card>
              </div>

              {/* Right Column: CRM Drop and Associated Claims Discovery Panel */}
              <div className="lg:col-span-5 space-y-4">
                {activeFocusRecord ? (
                  <Card className="border-orange-500/20 bg-[#0c0d10] p-5 space-y-5 shadow-xl rounded-xl">
                    <div className="flex justify-between items-center pb-3 border-b border-neutral-850">
                      <div className="flex items-center gap-1.5">
                        <Shuffle className="w-4 h-4 text-orange-400 animate-pulse" />
                        <span className="text-[11px] font-mono font-bold text-orange-400 uppercase tracking-wider">
                          discovery: associated assets
                        </span>
                      </div>
                      <Badge className="bg-orange-500/10 text-orange-400 hover:bg-orange-500/20 border-orange-500/20 text-[10px]">
                        Fuzzy Match Engine
                      </Badge>
                    </div>

                    {/* Active Subject Card */}
                    <div className="bg-neutral-950 p-3 rounded-lg border border-neutral-850 text-xs space-y-1.5">
                      <span className="text-[10px] text-neutral-500 block uppercase font-mono tracking-widest">Active Focus Record</span>
                      <div className="font-bold text-neutral-200 text-sm tracking-wide">{activeFocusRecord.name}</div>
                      <div className="flex justify-between text-neutral-400">
                        <span>Legal Representative: <strong className="text-orange-300 font-normal">{activeFocusRecord.executor}</strong></span>
                        <span className="font-mono text-emerald-400 font-bold">${activeFocusRecord.itemAmount.toLocaleString()}</span>
                      </div>
                    </div>

                    {/* Associated Assets checklist */}
                    <div className="space-y-2.5">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider flex items-center gap-1">
                          Grab Similar Claims
                        </span>
                        {similarAssets.length > 0 && (
                          <button 
                            onClick={() => {
                              const allIds = similarAssets.map(x => x.id);
                              if (grabbedSimilarIds.length === allIds.length) {
                                setGrabbedSimilarIds([]);
                              } else {
                                setGrabbedSimilarIds(allIds);
                              }
                            }}
                            className="text-[10px] text-orange-400 hover:underline hover:text-orange-300"
                          >
                            {grabbedSimilarIds.length === similarAssets.length ? "Deselect All" : "Select All Related"}
                          </button>
                        )}
                      </div>

                      <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                        {similarAssets.length === 0 ? (
                          <div className="p-4 border border-dashed border-neutral-800 text-center text-xs text-neutral-500 bg-neutral-950/20 rounded">
                            No secondary asset linkages identified.
                          </div>
                        ) : (
                          similarAssets.map(asset => {
                            const isAssocChecked = grabbedSimilarIds.includes(asset.id);
                            return (
                              <div 
                                key={asset.id}
                                onClick={() => {
                                  setGrabbedSimilarIds(prev => 
                                    prev.includes(asset.id) ? prev.filter(x => x !== asset.id) : [...prev, asset.id]
                                  );
                                }}
                                className={`p-2.5 rounded-lg border text-xs cursor-pointer transition-all flex items-start gap-2.5 ${
                                  isAssocChecked 
                                    ? "bg-orange-500/5 border-orange-500/30" 
                                    : "bg-neutral-955/40 border-neutral-850 hover:bg-neutral-900"
                                }`}
                              >
                                <div className="mt-0.5">
                                  {isAssocChecked ? (
                                    <CheckSquare className="w-3.5 h-3.5 text-orange-500 fill-orange-500/15" />
                                  ) : (
                                    <Square className="w-3.5 h-3.5 text-neutral-700" />
                                  )}
                                </div>
                                <div className="flex-1 space-y-0.5">
                                  <div className="flex justify-between font-medium">
                                    <span className="text-neutral-200 font-semibold">{asset.owner}</span>
                                    <span className="text-emerald-400 font-bold font-mono">${asset.amount.toLocaleString()}</span>
                                  </div>
                                  <div className="text-[10px] text-neutral-400 flex justify-between">
                                    <span>{asset.type} • {asset.holder}</span>
                                    <span className="text-orange-400/80 text-[9px] font-mono">{asset.reason}</span>
                                  </div>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>

                    {/* DROP TO CRM CONTAINER */}
                    <div className="pt-4 border-t border-neutral-850 space-y-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-neutral-400 uppercase tracking-wider block">
                          CRM Integration: Drop into Case File
                        </label>
                        <select 
                          value={targetCrmCaseId}
                          onChange={(e) => setTargetCrmCaseId(e.target.value)}
                          className="w-full bg-neutral-950 border border-neutral-800 rounded-lg py-2 px-3 text-xs text-neutral-200 focus:outline-none focus:ring-1 focus:ring-orange-500 font-mono"
                        >
                          <option value="new_case">🆕 CREATE BRAND NEW CASE CARD</option>
                          {savedCases.map(c => {
                            const caseAssetSum = c.assets.reduce((sum, current) => sum + current.amount, 0);
                            return (
                              <option key={c.id} value={c.id}>
                                📂 JOIN: {c.categoryName.substring(0, 28)}{c.categoryName.length > 28 ? "..." : ""} (${caseAssetSum.toLocaleString()})
                              </option>
                            );
                          })}
                        </select>
                      </div>

                      {targetCrmCaseId === "new_case" && (
                        <div className="space-y-1.5 animate-fade-in">
                          <label className="text-[10px] text-neutral-500 uppercase font-mono tracking-widest">
                            New Category Folder name (Optional)
                          </label>
                          <Input 
                            type="text" 
                            placeholder="e.g. GALT ESTATE RECOVERY OUTREACH"
                            value={customNewCaseName}
                            onChange={(e) => setCustomNewCaseName(e.target.value)}
                            className="bg-neutral-950 border-neutral-800 text-xs text-neutral-200"
                          />
                        </div>
                      )}

                      {/* STATS SUMMARY BEFORE INJECT */}
                      <div className="bg-neutral-950 p-2.5 rounded text-[11px] font-mono text-neutral-400 border border-neutral-850 flex justify-between items-center">
                        <span>
                          Selected: <strong className="text-neutral-200">{selectedBundleIds.length}</strong> main + <strong className="text-neutral-200">{grabbedSimilarIds.length}</strong> associated
                        </span>
                        <span className="text-emerald-400 font-bold">
                          Value: ${(
                            BUNDLEable_RECORDS.filter(r => selectedBundleIds.includes(r.id)).reduce((s, x) => s + x.itemAmount, 0) +
                            similarAssets.filter(s => grabbedSimilarIds.includes(s.id)).reduce((s, x) => s + x.amount, 0)
                          ).toLocaleString()}
                        </span>
                      </div>

                      <Button 
                        onClick={handleDropToCRM}
                        className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-black font-extrabold flex justify-center items-center gap-1.5 py-5 text-sm"
                      >
                        <ArrowDownToLine className="w-4 h-4" />
                        Compile and Toggle Into CRM Case Software
                      </Button>
                    </div>
                  </Card>
                ) : (
                  <div className="border border-dashed border-neutral-800 rounded-xl p-8 text-center text-neutral-500 bg-neutral-900/10">
                    <Layers className="w-8 h-8 text-neutral-700 mx-auto mb-2" />
                    <p className="text-sm font-semibold">Active Selection Dashboard</p>
                    <p className="text-xs text-neutral-500 mt-1">
                      Choose an estate record in the table on the left to reveal similar matching claims from CA departments instantly.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* 2. ASSET COMBINER SUBPAGE */}
      {toolType === "combiner" && (
        <div className="space-y-6">
          <div>
            <span className="text-orange-400 text-xs font-mono font-bold uppercase bg-orange-400/10 px-2 py-0.5 rounded border border-orange-500/20">
              Multi-state fusion
            </span>
            <h2 className="text-2xl font-bold tracking-tight text-neutral-100 mt-2">Aggregated Claim Combiner</h2>
            <p className="text-neutral-400 text-sm">Fuse multi-source or multi-year small escheats of an identical owner across regional registries into singular high-value portfolios.</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            <div className="lg:col-span-8 space-y-4">
              <Card className="border-neutral-800 bg-[#0e0e11] overflow-hidden">
                <CardHeader className="bg-neutral-900/50 py-3 px-5 border-b border-neutral-800">
                  <CardTitle className="text-sm font-semibold flex items-center gap-1.5 text-neutral-300">
                    <Layers className="w-4 h-4 text-orange-400" /> Discovered Individual Claims Pool
                  </CardTitle>
                </CardHeader>

                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-neutral-900/10">
                      <TableRow className="border-neutral-800 hover:bg-transparent">
                        <TableHead className="w-10">Select</TableHead>
                        <TableHead className="font-mono text-xs">Owner Name</TableHead>
                        <TableHead className="font-mono text-xs">Property Type</TableHead>
                        <TableHead className="font-mono text-xs">Custodian</TableHead>
                        <TableHead className="font-mono text-xs">State</TableHead>
                        <TableHead className="font-mono text-xs text-right">Value</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {COMBINABLE_ASSETS.map(asset => {
                        const isChecked = selectedCombineIds.includes(asset.id);
                        return (
                          <TableRow key={asset.id} className="border-neutral-800 hover:bg-neutral-900/30">
                            <TableCell className="py-3">
                              <button onClick={() => toggleCombineRow(asset.id)}>
                                {isChecked ? (
                                  <CheckSquare className="w-4 h-4 text-orange-500 fill-orange-500/15" />
                                ) : (
                                  <Square className="w-4 h-4 text-neutral-700 hover:text-orange-500" />
                                )}
                              </button>
                            </TableCell>
                            <TableCell className="font-mono text-xs font-semibold text-neutral-200">{asset.owner}</TableCell>
                            <TableCell className="text-xs text-neutral-400">{asset.type}</TableCell>
                            <TableCell className="text-xs text-neutral-500 font-mono">{asset.holder}</TableCell>
                            <TableCell className="text-xs text-neutral-400">{asset.state}</TableCell>
                            <TableCell className="text-xs text-right font-semibold font-mono text-emerald-400 animate-fade-in">
                              ${asset.amount.toLocaleString()}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </Card>

              <div className="flex justify-end">
                <Button 
                  onClick={executeCombining}
                  disabled={selectedCombineIds.length === 0}
                  className="bg-orange-500 hover:bg-orange-600 text-black font-semibold"
                >
                  Fuse Selected Accounts
                </Button>
              </div>
            </div>

            <div className="lg:col-span-4">
              {combinedReport ? (
                <Card className="border-neutral-800 bg-[#0e0e11] p-5 space-y-4 shadow-xl">
                  <div className="pb-3 border-b border-neutral-800 flex justify-between items-center">
                    <span className="text-xs font-mono font-bold text-orange-400 uppercase tracking-widest">FUSED PORTFOLIO DATA</span>
                  </div>

                  <div className="space-y-3 font-mono text-xs">
                    <div>
                      <span className="text-[10px] text-neutral-500 block uppercase">Unified Lead Holder ID</span>
                      <span className="text-neutral-100 font-bold">{combinedReport.id}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-neutral-500 block uppercase">Primary Named Debtor</span>
                      <span className="text-orange-300 font-semibold">{combinedReport.probableOwner}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-neutral-500 block uppercase">Aggregated Value</span>
                      <span className="text-emerald-400 font-semibold text-base">${combinedReport.total.toLocaleString()}</span>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] uppercase text-neutral-400 font-mono font-bold tracking-wider">Custom Lead Title</label>
                    <Input 
                      placeholder="e.g. Esther Chevron Combined"
                      value={customReportName}
                      onChange={e => setCustomReportName(e.target.value)}
                      className="bg-neutral-950 border-neutral-800 text-xs h-9"
                    />
                  </div>

                  <div className="pt-3 border-t border-neutral-800 flex flex-col gap-2">
                    <Button 
                      onClick={handleSaveCombinedCase}
                      className="w-full bg-orange-500 hover:bg-orange-600 text-black font-semibold"
                    >
                      Convert to Campaign Lead
                    </Button>
                    <Button 
                      variant="ghost" 
                      onClick={() => setCombinedReport(null)}
                      className="w-full text-neutral-400 hover:bg-neutral-900"
                    >
                      Clear Report
                    </Button>
                  </div>
                </Card>
              ) : (
                <div className="border border-dashed border-neutral-800 rounded-xl p-8 text-center text-neutral-500 bg-neutral-900/10">
                  <Layers className="w-8 h-8 text-neutral-700 mx-auto mb-2" />
                  <p className="text-sm font-semibold">Aggregated Portfolio Review</p>
                  <p className="text-xs text-neutral-500 mt-1">Select matching owners with duplicate, small balance, or multi-year escheat entries, then click Fuse.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 3. CA INVESTIGATOR HUB SUBPAGE */}
      {toolType === "investigator_hub" && (
        <div className="space-y-6">
          <div>
            <span className="text-orange-400 text-xs font-mono font-bold uppercase bg-orange-400/10 px-2 py-0.5 rounded border border-orange-500/20">
              Operations workbench
            </span>
            <h2 className="text-2xl font-bold tracking-tight text-neutral-100 mt-2">CA Investigator Hub</h2>
            <p className="text-neutral-400 text-sm">Regulatory commission checker, compliance lookup, and links to county deed and probate registry systems.</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left Side: Compliance Calculator & portal links */}
            <div className="lg:col-span-8 space-y-6">
              <Card className="border-neutral-800 bg-[#0e0e11] p-5">
                <CardHeader className="p-0 pb-4 border-b border-neutral-800 flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-sm font-bold flex items-center gap-1.5 text-neutral-200">
                      <Scale className="w-4 h-4 text-orange-400" /> State Statutory Commission Calculator
                    </CardTitle>
                    <CardDescription className="text-xs text-neutral-500">Look up state compliance limits on finder service percentages.</CardDescription>
                  </div>
                </CardHeader>
                
                <CardContent className="p-0 pt-4 space-y-4">
                  <form onSubmit={handleCalculateLimit} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase text-neutral-450 block">Asset Value Amount ($)</label>
                      <Input 
                        value={calcAmount}
                        onChange={e => setCalcAmount(e.target.value)}
                        placeholder="e.g. 50000"
                        className="bg-neutral-950 border-neutral-800 font-mono text-sm"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase text-neutral-450 block">Jurisdiction</label>
                      <select 
                        value={calcState}
                        onChange={e => setCalcState(e.target.value)}
                        className="flex h-10 w-full rounded-md border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm text-neutral-300 focus-visible:outline-none"
                      >
                        <option value="CA">California (CA)</option>
                        <option value="FL">Florida (FL)</option>
                        <option value="TX">Texas (TX)</option>
                        <option value="NY">New York (NY)</option>
                        <option value="DE">Delaware (DE)</option>
                      </select>
                    </div>
                    
                    <Button type="submit" className="bg-orange-500 hover:bg-orange-600 text-black font-semibold h-10 w-full">
                      Audit Contract Limit
                    </Button>
                  </form>

                  {calcResult && (
                    <div className="bg-neutral-950 border border-neutral-800 p-4 rounded-xl space-y-3 animate-fade-in">
                      <div className="flex justify-between items-center pb-2 border-b border-neutral-900">
                        <span className="text-xs font-mono font-bold text-neutral-300">Audited parameters</span>
                        <Badge className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-mono">
                          {calcResult.section}
                        </Badge>
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 font-mono text-xs">
                        <div>
                          <span className="text-[10px] text-neutral-500 block uppercase">Statutory limit</span>
                          <span className="text-orange-400 font-bold">{calcResult.maxRate}% max rate</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-neutral-500 block uppercase font-mono">Maximum permissible fee</span>
                          <span className="text-emerald-400 font-bold">${calcResult.maxFee.toLocaleString()}</span>
                        </div>
                        <div className="col-span-2 md:col-span-1">
                          <span className="text-[10px] text-neutral-500 block uppercase">Standard compliance</span>
                          <span className="text-neutral-200">Fully Compliant</span>
                        </div>
                      </div>

                      <div className="text-[11px] text-neutral-400 leading-normal border-t border-neutral-900 pt-2 flex items-start gap-1.5">
                        <ShieldAlert className="w-4 h-4 text-orange-400 shrink-0" />
                        <span>{calcResult.notes}</span>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Direct Links section */}
              <Card className="border-neutral-800 bg-[#0e0e11] p-5">
                <h3 className="text-sm font-semibold mb-4 text-neutral-300 flex items-center gap-1.5">
                  <Database className="w-4 h-4 text-orange-500" /> County Registries & Official Portals
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <a 
                    href="https://www.sco.ca.gov/" 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="p-3 border border-neutral-800 bg-neutral-950 hover:bg-neutral-900 rounded-xl transition-all flex justify-between items-center group text-left"
                  >
                    <div>
                      <span className="text-[11px] font-mono font-semibold text-neutral-300">California State Controller</span>
                      <span className="text-[10px] text-neutral-500 block mt-0.5">Central database claims check</span>
                    </div>
                    <ExternalLink className="w-4 h-4 text-neutral-600 group-hover:text-orange-400 transition-colors" />
                  </a>

                  <a 
                    href="https://sfgov.org/netfile/probate" 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="p-3 border border-neutral-800 bg-neutral-950 hover:bg-neutral-900 rounded-xl transition-all flex justify-between items-center group text-left"
                  >
                    <div>
                      <span className="text-[11px] font-mono font-semibold text-neutral-300">San Francisco Court Probate</span>
                      <span className="text-[10px] text-neutral-500 block mt-0.5">Deceased asset matches search</span>
                    </div>
                    <ExternalLink className="w-4 h-4 text-neutral-600 group-hover:text-orange-400 transition-colors" />
                  </a>

                  <a 
                    href="https://www.lavote.gov/home/records/real-estate-records" 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="p-3 border border-neutral-800 bg-neutral-950 hover:bg-neutral-900 rounded-xl transition-all flex justify-between items-center group text-left"
                  >
                    <div>
                      <span className="text-[11px] font-mono font-semibold text-neutral-300">LA County Land Records</span>
                      <span className="text-[10px] text-neutral-500 block mt-0.5">Title, deed, lien warrants check</span>
                    </div>
                    <ExternalLink className="w-4 h-4 text-neutral-600 group-hover:text-orange-400 transition-colors" />
                  </a>

                  <a 
                    href="https://bizfileonline.sos.ca.gov/" 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="p-3 border border-neutral-800 bg-neutral-950 hover:bg-neutral-900 rounded-xl transition-all flex justify-between items-center group text-left"
                  >
                    <div>
                      <span className="text-[11px] font-mono font-semibold text-neutral-300">California Bizfile Portal</span>
                      <span className="text-[10px] text-neutral-500 block mt-0.5">Validate active corporation status</span>
                    </div>
                    <ExternalLink className="w-4 h-4 text-neutral-600 group-hover:text-orange-400 transition-colors" />
                  </a>
                </div>
              </Card>
            </div>

            {/* Daily compliance checks sidebar */}
            <div className="lg:col-span-4">
              <Card className="border-neutral-800 bg-[#0e0e11] p-5">
                <h3 className="text-xs uppercase font-bold tracking-widest text-orange-400 mb-4 flex items-center">
                  <CheckSquare className="w-4 h-4 mr-1.5" /> Compliance Checklist
                </h3>
                <div className="space-y-3">
                  <button 
                    onClick={() => toggleCheck("claimantFound")}
                    className="w-full flex items-start gap-2.5 p-2 rounded hover:bg-neutral-900/50 text-left select-none text-xs"
                  >
                    {checks.claimantFound ? (
                      <CheckCircle2 className="w-4 text-emerald-400 pointer-events-none mt-0.5" />
                    ) : (
                      <div className="w-4 h-4 border border-neutral-700 rounded-full mt-0.5 shrink-0" />
                    )}
                    <span className={checks.claimantFound ? "text-neutral-300 line-through" : "text-neutral-400"}>
                      Establish claimant living status or executive executor entitlement
                    </span>
                  </button>

                  <button 
                    onClick={() => toggleCheck("notarizedIntake")}
                    className="w-full flex items-start gap-2.5 p-2 rounded hover:bg-neutral-900/50 text-left select-none text-xs"
                  >
                    {checks.notarizedIntake ? (
                      <CheckCircle2 className="w-4 text-emerald-400 pointer-events-none mt-0.5" />
                    ) : (
                      <div className="w-4 h-4 border border-neutral-700 rounded-full mt-0.5 shrink-0" />
                    )}
                    <span className={checks.notarizedIntake ? "text-neutral-300 line-through" : "text-neutral-400"}>
                      Verify notarized client intake, ID, and fee agreement (Max 10% rate)
                    </span>
                  </button>

                  <button 
                    onClick={() => toggleCheck("probateLookup")}
                    className="w-full flex items-start gap-2.5 p-2 rounded hover:bg-neutral-900/50 text-left select-none text-xs"
                  >
                    {checks.probateLookup ? (
                      <CheckCircle2 className="w-4 text-emerald-400 pointer-events-none mt-0.5" />
                    ) : (
                      <div className="w-4 h-4 border border-neutral-700 rounded-full mt-0.5 shrink-0" />
                    )}
                    <span className={checks.probateLookup ? "text-neutral-300 line-through" : "text-neutral-400"}>
                      Obtain probate case file copy or certified letters testamentary
                    </span>
                  </button>

                  <button 
                    onClick={() => toggleCheck("stateFilingSent")}
                    className="w-full flex items-start gap-2.5 p-2 rounded hover:bg-neutral-900/50 text-left select-none text-xs"
                  >
                    {checks.stateFilingSent ? (
                      <CheckCircle2 className="w-4 text-emerald-400 pointer-events-none mt-0.5" />
                    ) : (
                      <div className="w-4 h-4 border border-neutral-700 rounded-full mt-0.5 shrink-0" />
                    )}
                    <span className={checks.stateFilingSent ? "text-neutral-300 line-through" : "text-neutral-400"}>
                      Submit formal claims form physical package to State Bureau
                    </span>
                  </button>

                  <button 
                    onClick={() => toggleCheck("feePermitMatch")}
                    className="w-full flex items-start gap-2.5 p-2 rounded hover:bg-neutral-900/50 text-left select-none text-xs"
                  >
                    {checks.feePermitMatch ? (
                      <CheckCircle2 className="w-4 text-emerald-400 pointer-events-none mt-0.5" />
                    ) : (
                      <div className="w-4 h-4 border border-neutral-700 rounded-full mt-0.5 shrink-0" />
                    )}
                    <span className={checks.feePermitMatch ? "text-neutral-300 line-through" : "text-neutral-400"}>
                      Cross-reference claimant SSN/EIN with State records to secure transfer
                    </span>
                  </button>
                </div>
              </Card>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
