import { useState, useEffect } from "react";
import { 
  Briefcase, User, Folder, Coins, TrendingUp, CheckSquare, Square, 
  PhoneCall, Send, Clock, Plus, Trash2, Edit3, Save, BookOpen, 
  ExternalLink, Award, Building2, ShieldAlert, CheckCircle2, Search,
  ChevronRight, Calendar, AlertTriangle, FileText, Share2, DollarSign,
  UserCheck, AlertCircle, Sparkles, MapPin
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Badge } from "./ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { cn } from "../lib/utils";

// Persistent CRM Storage Key
const CA_CRM_STORAGE_KEY = "lost_asset_locator_ca_crm";

export interface CACRMLead {
  id: string;
  caseIID: string;
  name: string;
  type: "Individual" | "Estate" | "Business";
  amount: number;
  rank: "Rank S" | "Rank A" | "Rank B" | "Rank C";
  holderCompany: string;
  address: string;
  county: string;
  claimantContact?: {
    phone?: string;
    email?: string;
    address?: string;
  };
  notes: string;
  status: "Lead" | "Contacted" | "Claim Signed" | "Under State Review" | "Assets Recovered";
  communications: {
    id: string;
    timestamp: number;
    method: "Email" | "Phone" | "In Person" | "Mail";
    details: string;
  }[];
  updatedAt: number;
}

// Extensive California Mock Unclaimed properties dataset with different searches
const CALIFORNIA_MOCK_DATA = {
  individual: [
    { id: "ca-ind-101", name: "ESTHER MARIE CHEVRON", amount: 62450.00, holder: "CHEVRON CORPORATION", type: "Stock Dividend Shares", address: "444 MARKET ST, SAN FRANCISCO", county: "San Francisco", sourceId: "CA-MM-772911" },
    { id: "ca-ind-102", name: "LAWRENCE H PINEDA", amount: 12450.00, holder: "WELLS FARGO ADVISORS", type: "Mutual Fund Custody", address: "812 FIGUEROA ST, LOS ANGELES", county: "Los Angeles", sourceId: "CA-MM-899120" },
    { id: "ca-ind-103", name: "ARTHUR J DELGADO", amount: 4250.00, holder: "KAISER FOUNDATION HOSPITALS", type: "Refund Account", address: "1900 FRANKLIN ST, OAKLAND", county: "Alameda", sourceId: "CA-MM-122934" },
    { id: "ca-ind-104", name: "BEATRICE R SHAPIRO", amount: 940.00, holder: "PACIFIC GAS & ELECTRIC CO", type: "Utility Customer Credit", address: "77 BEALE ST, SAN FRANCISCO", county: "San Francisco", sourceId: "CA-MM-223450" },
    { id: "ca-ind-105", name: "VICTORIA G CHEN", amount: 105000.00, holder: "APPLE INC RETIREMENT TRUST", type: "Pension Benefit Plan Fund", address: "1 INFINITE LOOP, CUPERTINO", county: "Santa Clara", sourceId: "CA-MM-999318" },
    { id: "ca-ind-106", name: "MARCUS T FLORES", amount: 15300.00, holder: "AMERIPRISE FINANCIAL SERVICES", type: "Escheated Balance", address: "1200 BROADWAY, SAN DIEGO", county: "San Diego", sourceId: "CA-MM-411295" }
  ],
  estate: [
    { id: "ca-est-201", name: "ESTATE OF WINIFRED GALT", executor: "CHARLES GALT", amount: 189400.00, holder: "UNION BANK & TRUST", type: "Estate Cash Reserve", address: "300 MONTGOMERY ST, SAN FRANCISCO", county: "San Francisco", probateCase: "PRO-SF-2024-99831", sourceId: "CA-ES-382910" },
    { id: "ca-est-202", name: "ESTATE OF HERBERT V HOWARD", executor: "MARGARET HOWARD", amount: 48900.00, holder: "METROPOLITAN LIFE INS", type: "Death Claim Benefit", address: "710 SUNSET BLVD, LOS ANGELES", county: "Los Angeles", probateCase: "PRO-LA-2025-11029", sourceId: "CA-ES-841129" },
    { id: "ca-est-203", name: "ESTATE OF RAMON SOLIS ORTEGA", executor: "SOFIA SOLIS", amount: 28240.00, holder: "STATE FARM MUTUAL AUTO", type: "Policy Escrow Payout", address: "220 CAPITOL MALL, SACRAMENTO", county: "Sacramento", probateCase: "PRO-SAC-2023-456", sourceId: "CA-ES-513410" },
    { id: "ca-est-204", name: "ESTATE OF EVELYN WOODS", executor: "DANIEL WOODS", amount: 3500.00, holder: "WELLS FARGO CHIEF TRUSTEE", type: "Safe Deposit Box Balance", address: "400 CAPITOL MALL, SACRAMENTO", county: "Sacramento", probateCase: "PRO-SAC-2024-8891", sourceId: "CA-ES-002103" }
  ],
  business: [
    { id: "ca-bus-301", name: "ALAMEDA ENERGY PARTNERS LLC", taxId: "XX-XXX4912", amount: 245000.00, holder: "BANK OF AMERICA CORP", type: "Commercial Checking", address: "2250 BROADWAY, OAKLAND", county: "Alameda", secretaryStateId: "C3901192", sourceId: "CA-BS-951110" },
    { id: "ca-bus-302", name: "REDWOOD HORIZONS INC", taxId: "XX-XXX5819", amount: 38700.00, holder: "SILICON VALLEY BANK (FDIC)", type: "Corporate Asset Account", address: "3000 SAND HILL RD, MENLO PARK", county: "San Mateo", secretaryStateId: "C4012294", sourceId: "CA-BS-331901" },
    { id: "ca-bus-303", name: "PACIFIC COAST LOGISTICS CO", taxId: "XX-XXX9283", amount: 91500.00, holder: "CHEVRON MARINE LOGISTICS", type: "Uncashed Warrant / Vendor PMT", address: "1300 HARBOR BLVD, RICHMOND", county: "Contra Costa", secretaryStateId: "C2901129", sourceId: "CA-BS-440212" },
    { id: "ca-bus-304", name: "BAY AREA MEDICAL SUPPLIES", taxId: "XX-XXX2183", amount: 7420.00, holder: "SUTTER HEALTH PACIFIC", type: "Supplier Overpayment", address: "2350 SUTTER ST, SAN FRANCISCO", county: "San Francisco", secretaryStateId: "C1129482", sourceId: "CA-BS-880911" }
  ]
};

export function CaliforniaRecovery() {
  const [caTab, setCaTab] = useState<"search" | "crm">("search");
  const [searchSubtype, setSearchSubtype] = useState<"individual" | "estate" | "business">("individual");
  
  // Form Inputs
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [countyFilter, setCountyFilter] = useState("");
  const [estateName, setEstateName] = useState("");
  const [probateCase, setProbateCase] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [taxId, setTaxId] = useState("");

  // Results State
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [activeIID, setActiveIID] = useState<string>("");
  const [hasSearched, setHasSearched] = useState(false);

  // CRM Leads List State
  const [crmLeads, setCrmLeads] = useState<CACRMLead[]>([]);
  const [selectedLead, setSelectedLead] = useState<CACRMLead | null>(null);

  // Lead Modal / Edit Forms
  const [newNote, setNewNote] = useState("");
  const [commMethod, setCommMethod] = useState<"Email" | "Phone" | "Mail" | "In Person">("Email");
  const [commDetails, setCommDetails] = useState("");

  // Load CRM leads from LocalStorage on mount
  useEffect(() => {
    const cachedLeads = localStorage.getItem(CA_CRM_STORAGE_KEY);
    if (cachedLeads) {
      try {
        setCrmLeads(JSON.parse(cachedLeads));
      } catch (e) {
        console.error("Failed to parse CA CRM leads:", e);
      }
    }
  }, []);

  // Save CRM leads to LocalStorage
  const saveLeadsToStorage = (updatedLeads: CACRMLead[]) => {
    setCrmLeads(updatedLeads);
    localStorage.setItem(CA_CRM_STORAGE_KEY, JSON.stringify(updatedLeads));
  };

  const calculateAssetRank = (amount: number): "Rank S" | "Rank A" | "Rank B" | "Rank C" => {
    if (amount >= 50000) return "Rank S";
    if (amount >= 10000) return "Rank A";
    if (amount >= 1000) return "Rank B";
    return "Rank C";
  };

  const handleCASearch = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSearching(true);
    setSearchResults([]);
    setHasSearched(false);

    // Generate a unique Case Investigation ID (I-ID) for this search
    const randomIIDNum = Math.floor(Math.random() * 90000) + 10000;
    const generatedIID = `CA-2026-IID-${randomIIDNum}`;
    setActiveIID(generatedIID);

    setTimeout(() => {
      let filtered: any[] = [];
      const queryCounty = countyFilter.trim().toLowerCase();

      if (searchSubtype === "individual") {
        const queryFirst = firstName.trim().toLowerCase();
        const queryLast = lastName.trim().toLowerCase();

        filtered = CALIFORNIA_MOCK_DATA.individual.filter(item => {
          const matchesFirst = !queryFirst || item.name.toLowerCase().includes(queryFirst);
          const matchesLast = !queryLast || item.name.toLowerCase().includes(queryLast);
          const matchesCounty = !queryCounty || item.county.toLowerCase().includes(queryCounty);
          return (matchesFirst || matchesLast) && matchesCounty;
        });

        // Default: If no custom search keyword is provided, show high value ones
        if (!firstName && !lastName && !countyFilter) {
          filtered = CALIFORNIA_MOCK_DATA.individual;
        }

      } else if (searchSubtype === "estate") {
        const queryEst = estateName.trim().toLowerCase();
        const queryProb = probateCase.trim().toLowerCase();

        filtered = CALIFORNIA_MOCK_DATA.estate.filter(item => {
          const matchesEstName = !queryEst || item.name.toLowerCase().includes(queryEst) || item.executor.toLowerCase().includes(queryEst);
          const matchesProb = !queryProb || item.probateCase.toLowerCase().includes(queryProb);
          const matchesCounty = !queryCounty || item.county.toLowerCase().includes(queryCounty);
          return (matchesEstName || matchesProb) && matchesCounty;
        });

        if (!estateName && !probateCase && !countyFilter) {
          filtered = CALIFORNIA_MOCK_DATA.estate;
        }

      } else {
        const queryBus = businessName.trim().toLowerCase();
        const queryTax = taxId.trim().toLowerCase();

        filtered = CALIFORNIA_MOCK_DATA.business.filter(item => {
          const matchesBus = !queryBus || item.name.toLowerCase().includes(queryBus) || item.holder.toLowerCase().includes(queryBus);
          const matchesTax = !queryTax || item.taxId.toLowerCase().includes(queryTax);
          const matchesCounty = !queryCounty || item.county.toLowerCase().includes(queryCounty);
          return (matchesBus || matchesTax) && matchesCounty;
        });

        if (!businessName && !taxId && !countyFilter) {
          filtered = CALIFORNIA_MOCK_DATA.business;
        }
      }

      setSearchResults(filtered);
      setIsSearching(false);
      setHasSearched(true);
    }, 1200);
  };

  // Checkbox Action to Toggle CRM Lead
  const handleToggleCRMLead = (item: any) => {
    const existing = crmLeads.find(l => l.id === item.id);
    if (existing) {
      // Remove
      const updated = crmLeads.filter(l => l.id !== item.id);
      saveLeadsToStorage(updated);
      if (selectedLead?.id === item.id) {
        setSelectedLead(null);
      }
    } else {
      // Add as active account to recover
      const newLead: CACRMLead = {
        id: item.id,
        caseIID: activeIID,
        name: item.name,
        type: searchSubtype === "individual" ? "Individual" : searchSubtype === "estate" ? "Estate" : "Business",
        amount: item.amount,
        rank: calculateAssetRank(item.amount),
        holderCompany: item.holder,
        address: item.address,
        county: item.county,
        notes: `Record identified via investigation case file ${activeIID}. Target assets located state-side under California State Controller record reference: ${item.sourceId || "N/A"}.`,
        status: "Lead",
        communications: [
          {
            id: `comm-${Math.random().toString(36).substr(2, 9)}`,
            timestamp: Date.now(),
            method: "Mail",
            details: `Investigation folder initialized under California CRM with Case ID: ${activeIID}. Ready for state outreach.`,
          }
        ],
        updatedAt: Date.now()
      };
      const updated = [newLead, ...crmLeads];
      saveLeadsToStorage(updated);
    }
  };

  const handleUpdateStatus = (leadId: string, status: CACRMLead["status"]) => {
    const updated = crmLeads.map(l => {
      if (l.id === leadId) {
        return {
          ...l,
          status,
          updatedAt: Date.now()
        };
      }
      return l;
    });
    saveLeadsToStorage(updated);
    if (selectedLead && selectedLead.id === leadId) {
      setSelectedLead({ ...selectedLead, status, updatedAt: Date.now() });
    }
  };

  const handleAddNote = (leadId: string) => {
    if (!newNote.trim()) return;
    const updated = crmLeads.map(l => {
      if (l.id === leadId) {
        return {
          ...l,
          notes: l.notes ? `${l.notes}\n\n[${new Date().toLocaleDateString()}] ${newNote.trim()}` : newNote.trim(),
          updatedAt: Date.now()
        };
      }
      return l;
    });
    saveLeadsToStorage(updated);
    if (selectedLead && selectedLead.id === leadId) {
      setSelectedLead({
        ...selectedLead,
        notes: selectedLead.notes ? `${selectedLead.notes}\n\n[${new Date().toLocaleDateString()}] ${newNote.trim()}` : newNote.trim(),
        updatedAt: Date.now()
      });
    }
    setNewNote("");
  };

  const handleAddCommunication = (leadId: string) => {
    if (!commDetails.trim()) return;
    const newComm = {
      id: `comm-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      method: commMethod,
      details: commDetails.trim()
    };

    const updated = crmLeads.map(l => {
      if (l.id === leadId) {
        return {
          ...l,
          communications: [newComm, ...l.communications],
          updatedAt: Date.now()
        };
      }
      return l;
    });
    saveLeadsToStorage(updated);
    if (selectedLead && selectedLead.id === leadId) {
      setSelectedLead({
        ...selectedLead,
        communications: [newComm, ...selectedLead.communications],
        updatedAt: Date.now()
      });
    }
    setCommDetails("");
  };

  const handleDeleteLead = (leadId: string) => {
    const updated = crmLeads.filter(l => l.id !== leadId);
    saveLeadsToStorage(updated);
    setSelectedLead(null);
  };

  // Sum active CRM metrics
  const totalCRMValue = crmLeads.reduce((sum, l) => sum + l.amount, 0);
  const activeRecoveries = crmLeads.filter(l => l.status !== "Assets Recovered").length;

  return (
    <div className="space-y-6">
      {/* California Navigation Tab Subbar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-neutral-800 pb-4 gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <Badge className="bg-orange-500/15 text-orange-400 border border-orange-500/30 font-medium">State Focus: California</Badge>
            <Sparkles className="w-4 h-4 text-orange-400 animate-pulse" />
          </div>
          <h2 className="text-2xl font-semibold tracking-tight text-neutral-100 mt-1">California Bureau Claims Recovery</h2>
          <p className="text-neutral-400 text-sm">Official Controller asset extraction registry & CRM suite</p>
        </div>

        <div className="flex bg-neutral-900 rounded-lg p-1 border border-neutral-800 self-stretch sm:self-auto">
          <button 
            onClick={() => setCaTab("search")}
            className={cn(
              "px-4 py-2 text-sm font-medium rounded-md transition-all flex items-center space-x-2",
              caTab === "search" ? "bg-orange-500 text-black font-semibold shadow-md" : "text-neutral-400 hover:text-neutral-200"
            )}
          >
            <Search className="w-4 h-4" />
            <span>Claim Search</span>
          </button>
          <button 
            onClick={() => setCaTab("crm")}
            className={cn(
              "px-4 py-2 text-sm font-medium rounded-md transition-all flex items-center space-x-2 relative",
              caTab === "crm" ? "bg-orange-500 text-black font-semibold shadow-md" : "text-neutral-400 hover:text-neutral-200"
            )}
          >
            <Briefcase className="w-4 h-4" />
            <span>Recovery CRM</span>
            {crmLeads.length > 0 && (
              <Badge className="bg-orange-950 text-orange-300 border border-orange-500/30 text-[10px] px-1.5 py-0.5 ml-1 animate-pulse">
                {crmLeads.length}
              </Badge>
            )}
          </button>
        </div>
      </div>

      {caTab === "search" ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Query Inputs Sidebar / Search Form */}
          <div className="lg:col-span-4 space-y-6">
            <Card className="border-neutral-800 bg-neutral-900/40 backdrop-blur-md rounded-xl overflow-hidden shadow-xl">
              <div className="bg-neutral-900 px-4 py-4 border-b border-neutral-800 flex justify-between items-center">
                <span className="text-xs uppercase font-semibold tracking-wider text-orange-400 font-mono">Registry Filters</span>
                <Coins className="w-4 h-4 text-orange-500" />
              </div>
              <CardContent className="p-4 pt-6 space-y-4">
                {/* Search Mode sub-tabs */}
                <div className="grid grid-cols-3 bg-neutral-950 p-1 rounded-lg border border-neutral-800">
                  <button 
                    type="button"
                    onClick={() => setSearchSubtype("individual")}
                    className={cn(
                      "text-xs py-2 rounded-md font-medium transition-all flex flex-col items-center justify-center gap-1",
                      searchSubtype === "individual" ? "bg-neutral-900 text-orange-400 border border-neutral-800" : "text-neutral-400 hover:text-neutral-200"
                    )}
                  >
                    <User className="w-3.5 h-3.5" />
                    <span>Individual</span>
                  </button>
                  <button 
                    type="button"
                    onClick={() => setSearchSubtype("estate")}
                    className={cn(
                      "text-xs py-2 rounded-md font-medium transition-all flex flex-col items-center justify-center gap-1",
                      searchSubtype === "estate" ? "bg-neutral-900 text-orange-400 border border-neutral-800" : "text-neutral-400 hover:text-neutral-200"
                    )}
                  >
                    <Folder className="w-3.5 h-3.5" />
                    <span>Estate</span>
                  </button>
                  <button 
                    type="button"
                    onClick={() => setSearchSubtype("business")}
                    className={cn(
                      "text-xs py-2 rounded-md font-medium transition-all flex flex-col items-center justify-center gap-1",
                      searchSubtype === "business" ? "bg-neutral-900 text-orange-400 border border-neutral-800" : "text-neutral-400 hover:text-neutral-200"
                    )}
                  >
                    <Briefcase className="w-3.5 h-3.5" />
                    <span>Business</span>
                  </button>
                </div>

                <form onSubmit={handleCASearch} className="space-y-4">
                  {searchSubtype === "individual" && (
                    <div className="space-y-3">
                      <div>
                        <label className="text-[10px] uppercase font-semibold tracking-wider text-neutral-400 block mb-1">First Name (e.g. Esther)</label>
                        <Input 
                          placeholder="First Name keyword"
                          value={firstName}
                          onChange={e => setFirstName(e.target.value)}
                          className="bg-neutral-950 border-neutral-800 focus:border-orange-500 font-mono text-sm h-10"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] uppercase font-semibold tracking-wider text-neutral-400 block mb-1">Last Name / Surname</label>
                        <Input 
                          placeholder="Last Name keyword"
                          value={lastName}
                          onChange={e => setLastName(e.target.value)}
                          className="bg-neutral-950 border-neutral-800 focus:border-orange-500 font-mono text-sm h-10"
                        />
                      </div>
                    </div>
                  )}

                  {searchSubtype === "estate" && (
                    <div className="space-y-3">
                      <div>
                        <label className="text-[10px] uppercase font-semibold tracking-wider text-neutral-400 block mb-1">Deceased Name / Executor</label>
                        <Input 
                          placeholder="Estate or family name"
                          value={estateName}
                          onChange={e => setEstateName(e.target.value)}
                          className="bg-neutral-950 border-neutral-800 focus:border-orange-500 font-mono text-sm h-10"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] uppercase font-semibold tracking-wider text-neutral-400 block mb-1">Probate / Court Case File No.</label>
                        <Input 
                          placeholder="e.g. PRO-SF-2024"
                          value={probateCase}
                          onChange={e => setProbateCase(e.target.value)}
                          className="bg-neutral-950 border-neutral-800 focus:border-orange-500 font-mono text-sm h-10"
                        />
                      </div>
                    </div>
                  )}

                  {searchSubtype === "business" && (
                    <div className="space-y-3">
                      <div>
                        <label className="text-[10px] uppercase font-semibold tracking-wider text-neutral-400 block mb-1">Business / Entity Legal Name</label>
                        <Input 
                          placeholder="e.g. Alameda Energy"
                          value={businessName}
                          onChange={e => setBusinessName(e.target.value)}
                          className="bg-neutral-950 border-neutral-800 focus:border-orange-500 font-mono text-sm h-10"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] uppercase font-semibold tracking-wider text-neutral-400 block mb-1">Federal Tax FEIN or Filing ID</label>
                        <Input 
                          placeholder="XX-XXXXXXX"
                          value={taxId}
                          onChange={e => setTaxId(e.target.value)}
                          className="bg-neutral-950 border-neutral-800 focus:border-orange-500 font-mono text-sm h-10"
                        />
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="text-[10px] uppercase font-semibold tracking-wider text-neutral-400 block mb-1">California County Location</label>
                    <select 
                      value={countyFilter}
                      onChange={e => setCountyFilter(e.target.value)}
                      className="flex h-10 w-full rounded-md border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm text-neutral-300 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-orange-500"
                    >
                      <option value="">All CA Counties</option>
                      <option value="Los Angeles">Los Angeles County</option>
                      <option value="San Francisco">San Francisco County</option>
                      <option value="Alameda">Alameda County</option>
                      <option value="Sacramento">Sacramento County</option>
                      <option value="Santa Clara">Santa Clara County</option>
                      <option value="San Diego">San Diego County</option>
                    </select>
                  </div>

                  <Button 
                    type="submit"
                    disabled={isSearching}
                    className="w-full bg-orange-500 hover:bg-orange-600 text-black font-semibold h-11 transition-colors"
                  >
                    {isSearching ? (
                      <span className="flex items-center space-x-2">
                        <Clock className="w-5 h-5 animate-spin" />
                        <span>Querying CA Bureau...</span>
                      </span>
                    ) : (
                      <span className="flex items-center space-x-2">
                        <Search className="w-4 h-4" />
                        <span>Search California Registry</span>
                      </span>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>

            <div className="bg-orange-500/5 border border-orange-500/10 p-4 rounded-xl text-neutral-400 text-xs leading-relaxed space-y-2">
              <div className="font-semibold text-neutral-300 flex items-center space-x-1">
                <AlertCircle className="w-3.5 h-3.5 text-orange-400" />
                <span>California Claim Statutes</span>
              </div>
              <p>Under CA Property Law, unclaimed warrants, stock residuals, insurance benefits, and inactive corporate bank registers auto-escheat to the state Controller. Claimants have unlimited time for cash, but prompt filings avoid bureaucratic delays.</p>
            </div>
          </div>

          {/* Results Main Screen */}
          <div className="lg:col-span-8 space-y-6">
            {isSearching ? (
              <div className="h-64 flex flex-col items-center justify-center text-neutral-500 space-y-4">
                <Clock className="h-8 w-8 animate-spin text-orange-500" />
                <div className="font-mono text-xs uppercase tracking-widest animate-pulse">Establishing handshake with state Controller API...</div>
              </div>
            ) : !hasSearched ? (
              <div className="h-80 flex flex-col items-center justify-center text-center p-8 border-2 border-dashed border-neutral-800 rounded-xl bg-neutral-900/15 backdrop-blur-md">
                <div className="bg-orange-500/10 p-4 rounded-full mb-4 border border-orange-500/20">
                  <Coins className="h-10 w-10 text-orange-500" />
                </div>
                <h3 className="text-xl font-medium text-neutral-200 mb-1">State Registry Inquiry</h3>
                <p className="text-neutral-400 max-w-md text-sm mb-4">Click "Search California Registry" to fetch active real-estate warrants, holding company credits, and public record probate files.</p>
                <div className="flex flex-wrap justify-center gap-2 max-w-sm">
                  <Badge variant="outline" className="border-neutral-800">Rank S (+$50K)</Badge>
                  <Badge variant="outline" className="border-neutral-800">Estates & Trust reserves</Badge>
                  <Badge variant="outline" className="border-neutral-800">FEIN Business claims</Badge>
                </div>
              </div>
            ) : searchResults.length === 0 ? (
              <div className="h-64 flex flex-col items-center justify-center text-neutral-400 bg-neutral-900/20 border-neutral-800 border-2 border-dashed rounded-xl p-8">
                <ShieldAlert className="h-8 w-8 mb-4 text-orange-500/50" />
                <p className="text-sm font-semibold">No direct matches found in California registry.</p>
                <p className="text-xs text-neutral-500 mt-1">Try broadening your search term or selecting "All CA Counties".</p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Search Meta Status with Top Master Case ID */}
                <div className="bg-neutral-900/80 border border-neutral-800 p-4 rounded-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div>
                    <div className="text-[10px] text-neutral-500 uppercase font-mono font-bold tracking-widest">Master Audit Reference</div>
                    <div className="flex items-center space-x-2 mt-1">
                      <span className="text-lg font-mono font-semibold text-orange-400">{activeIID}</span>
                      <Badge className="bg-orange-500/10 text-orange-400 border border-orange-500/20 text-xs">Active Registry Scan</Badge>
                    </div>
                  </div>
                  <div className="bg-neutral-950 p-2.5 rounded-lg border border-neutral-800 self-stretch md:self-auto flex gap-4 md:gap-8 justify-between">
                    <div>
                      <span className="text-[9px] text-neutral-500 uppercase block font-mono">Matched assets</span>
                      <span className="text-sm font-semibold text-neutral-200 font-mono">{searchResults.length} Records</span>
                    </div>
                    <div>
                      <span className="text-[9px] text-neutral-500 uppercase block font-mono">Recoverable Capital</span>
                      <span className="text-sm font-semibold text-emerald-400 font-mono">
                        ${searchResults.reduce((sum, item) => sum + item.amount, 0).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Main Asset Results Card Table */}
                <Card className="border-neutral-800 bg-neutral-950 overflow-hidden rounded-xl shadow-md">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader className="bg-neutral-900/50">
                        <TableRow className="border-neutral-800 hover:bg-transparent">
                          <TableHead className="w-10 font-mono text-[10px] uppercase text-neutral-400 tracking-wider">CRM</TableHead>
                          <TableHead className="font-mono text-[10px] uppercase text-neutral-400 tracking-wider">Claimant / Owner</TableHead>
                          <TableHead className="font-mono text-[10px] uppercase text-neutral-400 tracking-wider">Asset Rank</TableHead>
                          <TableHead className="font-mono text-[10px] uppercase text-neutral-400 tracking-wider">Asset Type & Source</TableHead>
                          <TableHead className="font-mono text-[10px] uppercase text-neutral-400 tracking-wider">Losing Custodian</TableHead>
                          <TableHead className="font-mono text-[10px] uppercase text-neutral-400 tracking-wider text-right">Value Amount</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {searchResults.map((item) => {
                          const isLeadInCRM = crmLeads.some(l => l.id === item.id);
                          const rank = calculateAssetRank(item.amount);
                          return (
                            <TableRow key={item.id} className="border-neutral-800 hover:bg-neutral-900/40">
                              <TableCell className="py-4">
                                <button
                                  type="button"
                                  onClick={() => handleToggleCRMLead(item)}
                                  className="focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 rounded"
                                >
                                  {isLeadInCRM ? (
                                    <CheckSquare className="w-5 h-5 text-orange-500 fill-orange-500/10" />
                                  ) : (
                                    <Square className="w-5 h-5 text-neutral-700 hover:text-orange-400" />
                                  )}
                                </button>
                              </TableCell>
                              <TableCell>
                                <div>
                                  <div className="text-neutral-100 font-semibold font-mono text-[13px]">{item.name}</div>
                                  <div className="text-[10px] text-neutral-500 flex items-center mt-0.5">
                                    <MapPin className="w-3 h-3 mr-0.5" />
                                    {item.address} | {item.county} County
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge 
                                  className={cn(
                                    "text-[10px] font-semibold tracking-wider font-mono px-2 py-0.5 rounded",
                                    rank === "Rank S" ? "bg-rose-500/10 text-rose-400 border border-rose-500/20" :
                                    rank === "Rank A" ? "bg-orange-500/10 text-orange-400 border border-orange-500/20" :
                                    rank === "Rank B" ? "bg-blue-500/10 text-blue-400 border border-blue-500/20" :
                                    "bg-neutral-800 text-neutral-400 border border-neutral-700"
                                  )}
                                >
                                  {rank}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <div>
                                  <div className="text-xs text-neutral-300 font-medium">{item.type}</div>
                                  <div className="text-[9px] text-neutral-500 font-mono mt-0.5">State Ref: {item.sourceId}</div>
                                </div>
                              </TableCell>
                              <TableCell className="text-xs text-neutral-400">{item.holder}</TableCell>
                              <TableCell className="text-right font-mono text-sm font-semibold text-emerald-400">
                                ${item.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </Card>

                <div className="flex items-center space-x-2 text-xs text-neutral-500 justify-end">
                  <CheckSquare className="w-4 h-4 text-orange-500" />
                  <span>Checkmark the leading box to save/track records instantly in your persistent Recovery CRM portfolio.</span>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* CRM Section Content */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Main List of Active Recovery Cases */}
          <div className="lg:col-span-4 space-y-4">
            
            {/* Quick CRM Metrics Card */}
            <div className="grid grid-cols-2 gap-4 bg-neutral-900/60 border border-neutral-800 p-4 rounded-xl">
              <div>
                <span className="text-[10px] uppercase font-mono text-neutral-500">Active recovering</span>
                <div className="text-2xl font-light text-orange-400 font-mono mt-0.5">{activeRecoveries} Accounts</div>
              </div>
              <div>
                <span className="text-[10px] uppercase font-mono text-neutral-500">Pipeline cash</span>
                <div className="text-2xl font-light text-emerald-400 font-mono mt-0.5">${totalCRMValue.toLocaleString()}</div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="text-neutral-400 uppercase font-mono text-xs tracking-wider flex justify-between items-center px-1">
                <span>Leads Under Recovery</span>
                <Badge variant="outline" className="border-neutral-800 font-mono text-[10px]">{crmLeads.length}</Badge>
              </div>

              {crmLeads.length === 0 ? (
                <div className="text-center p-8 border border-dashed border-neutral-800 rounded-xl bg-neutral-900/10">
                  <Briefcase className="w-8 h-8 text-neutral-700 mx-auto mb-2" />
                  <p className="text-sm text-neutral-400">Your recovery pipeline is empty.</p>
                  <p className="text-xs text-neutral-500 mt-1">Checkmark search files in the California search tab to pipeline them instantly.</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                  {crmLeads.map(lead => (
                    <div 
                      key={lead.id}
                      onClick={() => setSelectedLead(lead)}
                      className={cn(
                        "p-4 rounded-xl border transition-all cursor-pointer text-left relative overflow-hidden",
                        selectedLead?.id === lead.id 
                          ? "bg-orange-500/10 border-orange-500/50 shadow-inner" 
                          : "bg-neutral-900/50 border-neutral-800 hover:bg-neutral-900/90"
                      )}
                    >
                      {/* Top Rank indicator bar */}
                      <div className={cn(
                        "absolute top-0 left-0 w-1 h-full",
                        lead.rank === "Rank S" ? "bg-rose-500" :
                        lead.rank === "Rank A" ? "bg-orange-500" :
                        lead.rank === "Rank B" ? "bg-blue-500" : "bg-neutral-500"
                      )} />
                      
                      <div className="flex justify-between items-start">
                        <div className="pl-1.5 skeleton-content">
                          <span className="text-[10px] uppercase font-mono text-neutral-500">{lead.caseIID}</span>
                          <h4 className="font-semibold text-neutral-150 text-[13.5px] truncate max-w-[200px] font-mono">{lead.name}</h4>
                          <span className="text-[11px] text-neutral-400 mt-1 block truncate max-w-[200px]">{lead.holderCompany}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-[13.5px] font-semibold text-emerald-400 font-mono block">${lead.amount.toLocaleString()}</span>
                          <Badge 
                            className={cn(
                              "text-[9px] font-normal px-2 py-0.5 rounded mt-1.5",
                              lead.status === "Lead" ? "bg-neutral-800 text-neutral-400 border border-neutral-700" :
                              lead.status === "Contacted" ? "bg-blue-950 text-blue-300 border border-blue-800/45" :
                              lead.status === "Claim Signed" ? "bg-purple-950 text-purple-300 border border-purple-800/40" :
                              lead.status === "Under State Review" ? "bg-orange-950 text-orange-400 border border-orange-850" :
                              "bg-emerald-950 text-emerald-400 border border-emerald-900" /* Recovered */
                            )}
                          >
                            {lead.status}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* CRM Case File Page View (Right Side detailed dashboard) */}
          <div className="lg:col-span-8">
            {selectedLead ? (
              <div className="border border-neutral-800 rounded-xl bg-neutral-950 p-6 space-y-6 shadow-2xl">
                {/* Master Case File Header */}
                <div className="flex flex-col sm:flex-row justify-between items-start gap-4 border-b border-neutral-800 pb-5">
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-mono text-neutral-500 uppercase tracking-widest">Lead Account Reference</span>
                      <ChevronRight className="w-3.5 h-3.5 text-neutral-600" />
                      <span className="text-xs font-mono text-orange-400">{selectedLead.caseIID}</span>
                    </div>
                    <h3 className="text-2xl font-semibold text-neutral-100 mt-1 mb-1 font-mono">{selectedLead.name}</h3>
                    <p className="text-neutral-400 text-sm">{selectedLead.type} Claim filed via California State Controller office</p>
                  </div>
                  
                  <div className="flex space-x-2">
                    <Button 
                      variant="outline" 
                      onClick={() => handleDeleteLead(selectedLead.id)} 
                      className="border-neutral-800 text-red-400 hover:bg-red-950/20 hover:text-red-300 h-9 px-3"
                    >
                      <Trash2 className="w-4 h-4 mr-1" />
                      Archive
                    </Button>
                  </div>
                </div>

                {/* Account details & Status picker */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Property Assets Metadata */}
                  <div className="space-y-4 bg-neutral-900/30 p-4 rounded-xl border border-neutral-800">
                    <h4 className="font-semibold text-xs uppercase tracking-wider text-neutral-400 flex items-center">
                      <Coins className="w-3.5 h-3.5 mr-1.5 text-orange-400" /> Unclaimed Property details
                    </h4>
                    <div className="grid grid-cols-2 gap-4 text-xs font-mono">
                      <div>
                        <span className="text-neutral-500 uppercase block text-[9px]">Losing Entity</span>
                        <span className="text-neutral-200 block truncate">{selectedLead.holderCompany}</span>
                      </div>
                      <div>
                        <span className="text-neutral-500 uppercase block text-[9px]">Claimable Cash</span>
                        <span className="text-emerald-400 font-semibold block">${selectedLead.amount.toLocaleString()}</span>
                      </div>
                      <div>
                        <span className="text-neutral-500 uppercase block text-[9px]">County Region</span>
                        <span className="text-neutral-200 block">{selectedLead.county} County</span>
                      </div>
                      <div>
                        <span className="text-neutral-500 uppercase block text-[9px]">Asset Priority</span>
                        <span className="text-neutral-100 block font-semibold">{selectedLead.rank}</span>
                      </div>
                    </div>
                    <div>
                      <span className="text-neutral-500 uppercase block text-[9px] font-mono">Last Known Address</span>
                      <span className="text-neutral-300 text-xs block">{selectedLead.address}</span>
                    </div>
                  </div>

                  {/* Status Picker & Outreach progress controls */}
                  <div className="space-y-4 bg-neutral-900/30 p-4 rounded-xl border border-neutral-800">
                    <h4 className="font-semibold text-xs uppercase tracking-wider text-neutral-400 flex items-center">
                      <TrendingUp className="w-3.5 h-3.5 mr-1.5 text-orange-400" /> Active Recovery State
                    </h4>
                    
                    <div className="space-y-2">
                      <label className="text-[10px] uppercase font-mono text-neutral-500">Current Filing Progress</label>
                      <select 
                        value={selectedLead.status}
                        onChange={e => handleUpdateStatus(selectedLead.id, e.target.value as any)}
                        className="flex h-10 w-full rounded-md border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm text-neutral-100"
                      >
                        <option value="Lead">Filing Account Initialized</option>
                        <option value="Contacted">Claimant Outreach Initiated</option>
                        <option value="Claim Signed">Recovery Power of Atty Signed</option>
                        <option value="Under State Review">Filing submitted to state Controller</option>
                        <option value="Assets Recovered">Fund disbursed successfully</option>
                      </select>
                    </div>

                    <div className="text-[11px] text-neutral-400 leading-relaxed border-t border-neutral-800 pt-3">
                      {selectedLead.status === "Lead" && "Lead secured. Initialize claimant skip-tracing to connect with the heir or stakeholder."}
                      {selectedLead.status === "Contacted" && "Outreach campaign dispatched. Follow up with case letters and secure physical IDs."}
                      {selectedLead.status === "Claim Signed" && "Agreement executed! Generate claimant authorization pack and file immediately."}
                      {selectedLead.status === "Under State Review" && "Documents received by CA State Controller Board. Processing estimated at 90 days."}
                      {selectedLead.status === "Assets Recovered" && "State claim finalized. Disbursed recovery and collected executor commission."}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                  {/* Tracking Notes area */}
                  <div className="space-y-4">
                    <h4 className="font-semibold text-xs uppercase tracking-wider text-neutral-400 flex items-center">
                      <FileText className="w-3.5 h-3.5 mr-1.5 text-orange-400" /> Internal Investigation Notes
                    </h4>
                    
                    <div className="relative">
                      <textarea
                        rows={4}
                        placeholder="Append private audit notes, verified address clues, heir phone listings..."
                        value={newNote}
                        onChange={e => setNewNote(e.target.value)}
                        className="w-full rounded-lg border border-neutral-800 bg-neutral-900/50 p-3 text-sm text-neutral-100 focus:outline-none focus:ring-1 focus:ring-orange-500 placeholder:text-neutral-600"
                      />
                      <Button
                        size="sm"
                        onClick={() => handleAddNote(selectedLead.id)}
                        className="bg-neutral-100 hover:bg-neutral-300 text-black mt-2 w-full font-medium"
                      >
                        <Save className="w-3.5 h-3.5 mr-1.5" />
                        Append Notes
                      </Button>
                    </div>

                    <div className="bg-neutral-900/20 border border-neutral-850 p-4 rounded-xl max-h-[220px] overflow-y-auto whitespace-pre-wrap text-sm leading-relaxed text-neutral-300 font-sans">
                      {selectedLead.notes || "No extra tracking notes recorded yet."}
                    </div>
                  </div>

                  {/* Communication Logs & Outreach Register */}
                  <div className="space-y-4">
                    <h4 className="font-semibold text-xs uppercase tracking-wider text-neutral-400 flex items-center">
                      <PhoneCall className="w-3.5 h-3.5 mr-1.5 text-orange-400" /> Communications Outreach Register
                    </h4>

                    <div className="space-y-3 bg-neutral-950 p-4 rounded-xl border border-neutral-850">
                      <div className="flex gap-2">
                        <select 
                          value={commMethod} 
                          onChange={e => setCommMethod(e.target.value as any)}
                          className="h-9 rounded-md border border-neutral-850 bg-neutral-900 text-xs px-2 text-neutral-300"
                        >
                          <option value="Email">Email</option>
                          <option value="Phone">Phone</option>
                          <option value="Mail">Postcard</option>
                          <option value="In Person">Interview</option>
                        </select>
                        <Input 
                          placeholder="Log contact outcome..." 
                          value={commDetails}
                          onChange={e => setCommDetails(e.target.value)}
                          className="bg-neutral-900 border-neutral-850 h-9 text-xs"
                          onKeyDown={e => e.key === 'Enter' && handleAddCommunication(selectedLead.id)}
                        />
                        <Button 
                          size="sm" 
                          onClick={() => handleAddCommunication(selectedLead.id)}
                          className="h-9 bg-orange-500 hover:bg-orange-600 text-black font-semibold"
                        >
                          <Send className="w-3 h-3" />
                        </Button>
                      </div>

                      <div className="space-y-2.5 max-h-[240px] overflow-y-auto pr-1">
                        {selectedLead.communications.map(item => (
                          <div key={item.id} className="text-xs bg-neutral-900/60 p-2.5 rounded border border-neutral-850">
                            <div className="flex justify-between text-neutral-500 mb-1">
                              <Badge variant="outline" className="text-[9px] px-1 py-0 border-neutral-800 leading-none">{item.method}</Badge>
                              <span className="text-[10px] font-mono">{new Date(item.timestamp).toLocaleString()}</span>
                            </div>
                            <p className="text-neutral-350 leading-relaxed font-sans">{item.details}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

              </div>
            ) : (
              <div className="h-[430px] flex flex-col items-center justify-center border-2 border-dashed border-neutral-800 rounded-xl bg-neutral-900/10 text-center p-8">
                <Building2 className="w-12 h-12 text-neutral-700 mb-3" />
                <h4 className="text-lg font-medium text-neutral-300">Case Investigation Portal</h4>
                <p className="text-neutral-400 max-w-sm text-xs mt-1">Select an active unclaimed asset from the recovery list on the left to review state Controller documents, append notes, or record communication outreach attempts.</p>
              </div>
            )}
          </div>

        </div>
      )}
    </div>
  );
}
