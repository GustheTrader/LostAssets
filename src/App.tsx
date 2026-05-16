import { useState, useEffect } from "react";
import { Search, MapPin, DollarSign, Users, Mail, Loader2, FileText, AlertCircle, Copy, Check, Filter, Database, BookOpen, ChevronRight, Save, ChevronUp, ChevronDown, AlertTriangle, CheckCircle, Network, Radar, Terminal, UserSearch } from "lucide-react";
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

import { AssetRecord, Relative, SavedCase, SearchQuery } from "./types";
import { searchLostAssets, trackRelatives, AVAILABLE_STATES, ASSET_TYPES } from "./services/mockDataService";
import { generateOutreachEmail } from "./services/geminiService";
import { saveCase, getSavedCases, deleteCase } from "./services/dataStore";
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

export default function App() {
  const [activeTab, setActiveTab] = useState<"search" | "database" | "rules" | "scraper" | "trace">("search");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  
  const [searchMode, setSearchMode] = useState<"identity" | "highValue">("identity");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [emailAddress, setEmailAddress] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [targetState, setTargetState] = useState("");
  const [assetType, setAssetType] = useState("");
  
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [assets, setAssets] = useState<AssetRecord[]>([]);
  const [relatives, setRelatives] = useState<Relative[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Scraper State
  const [scrapeFirstName, setScrapeFirstName] = useState("");
  const [scrapeLastName, setScrapeLastName] = useState("");
  const [scrapeState, setScrapeState] = useState("");
  const [isScraping, setIsScraping] = useState(false);
  const [scrapedRecords, setScrapedRecords] = useState<any[]>([]);
  const [scrapeMessage, setScrapeMessage] = useState<{ text: string, type: "success" | "warning" | "error" } | null>(null);

  useEffect(() => {
    if (activeTab === "scraper") {
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
  
  useEffect(() => {
    setSavedCases(getSavedCases());
  }, []);

  // Email Drafting State
  const [selectedRelative, setSelectedRelative] = useState<Relative | null>(null);
  const [isDraftingEmail, setIsDraftingEmail] = useState(false);
  const [draftedEmail, setDraftedEmail] = useState<string>("");
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const debouncedFirstName = useDebounce(firstName, 500);
  const debouncedLastName = useDebounce(lastName, 500);
  const debouncedEmail = useDebounce(emailAddress, 500);

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
        ? { generalHighValue: true, targetState, assetType }
        : { 
            firstName: firstName.trim(), 
            lastName: lastName.trim(), 
            email: emailAddress.trim(), 
            phone: phoneNumber.trim(),
            targetState,
            assetType
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

  useEffect(() => {
    // Determine if we should run an auto-search
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
        ? { generalHighValue: true, targetState: targetState || undefined, assetType: assetType || undefined }
        : { firstName: firstName.trim(), lastName: lastName.trim(), email: emailAddress.trim(), phone: phoneNumber.trim(), targetState: targetState || undefined, assetType: assetType || undefined };
        
    const newCase = saveCase(saveCategoryName, query, assets, relatives);
    setSavedCases([newCase, ...savedCases]);
    setSaveDialogOpen(false);
    setSaveCategoryName("");
    setActiveTab("database");
  };

  const handleDeleteCase = (id: string) => {
    deleteCase(id);
    setSavedCases(savedCases.filter(c => c.id !== id));
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
    <div className="min-h-screen bg-neutral-950 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-900/20 via-neutral-950 to-neutral-950 text-neutral-100 font-sans">
      {/* Header */}
      <header className="bg-neutral-950/80 backdrop-blur-md border-b border-neutral-800 sticky top-0 z-10 px-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between h-16">
          <div className="flex items-center space-x-2">
            <FileText className="w-6 h-6 text-orange-500" />
            <h1 className="text-xl font-semibold tracking-tight mr-8 text-neutral-50">Lost Asset Locator</h1>
            
            <nav className="hidden md:flex space-x-1">
               <button 
                  onClick={() => setActiveTab("search")}
                  className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === "search" ? "bg-orange-500/100/10 text-orange-400" : "text-neutral-400 hover:bg-neutral-900"}`}
               >
                  <Search className="w-4 h-4 inline-block mr-2" />
                  Search Workbench
               </button>
               <button 
                  onClick={() => setActiveTab("database")}
                  className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === "database" ? "bg-orange-500/100/10 text-orange-400" : "text-neutral-400 hover:bg-neutral-900"}`}
               >
                  <Database className="w-4 h-4 inline-block mr-2" />
                  Saved Categories
               </button>
               <button 
                  onClick={() => setActiveTab("rules")}
                  className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === "rules" ? "bg-orange-500/100/10 text-orange-400" : "text-neutral-400 hover:bg-neutral-900"}`}
               >
                  <BookOpen className="w-4 h-4 inline-block mr-2" />
                  State Rules
               </button>
               <button 
                  onClick={() => setActiveTab("trace")}
                  className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === "trace" ? "bg-orange-500/100/10 text-orange-400" : "text-neutral-400 hover:bg-neutral-900"}`}
               >
                  <Radar className="w-4 h-4 inline-block mr-2" />
                  Trace & OSINT
               </button>
            </nav>
          </div>
          <Badge variant="outline" className="text-xs uppercase tracking-wider font-mono text-neutral-400 border-neutral-800">
            Multi-State Region
          </Badge>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-6">
        
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
                          <TableHead className="font-mono text-xs uppercase text-neutral-400 tracking-wider">Property Name</TableHead>
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
                          <TableRow key={asset.id} className="hover:bg-orange-500/100/200/10 transition-colors">
                            <TableCell className="font-medium">{asset.name}</TableCell>
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
                           className="w-full flex items-center justify-center group-hover:bg-orange-500/100/20 group-hover:text-orange-400 group-hover:border-orange-200 transition-colors"
                         >
                           <Mail className="w-4 h-4 mr-2" />
                           Draft Outreach Email
                         </Button>
                       </CardContent>
                     </Card>
                   ))}
                   {relatives.length === 0 && (
                      <div className="col-span-full p-8 text-center text-neutral-400 border border-neutral-800 rounded-xl bg-neutral-900/40 backdrop-blur-md border-neutral-800">
                         No relatives found.
                      </div>
                   )}
                 </div>
              </TabsContent>
            </Tabs>
          )}

          {/* Action Bar for Results */}
          {!isSearching && hasSearched && assets.length > 0 && (
            <div className="mt-6 flex justify-end">
               <Button onClick={() => setSaveDialogOpen(true)} className="bg-neutral-100 hover:bg-neutral-300 text-white shadow-sm">
                  <Save className="w-4 h-4 mr-2" />
                  Save to Category
               </Button>
            </div>
          )}
        </div>
          </div>
        )}
        {activeTab === "rules" && (
          <div className="space-y-6">
            <h2 className="text-2xl font-light tracking-tight text-neutral-100 mb-6">State Claim Requirements</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
               {Object.values(STATE_RULES).map(rule => (
                  <Card key={rule.state} className="border-neutral-800">
                     <CardHeader>
                        <CardTitle className="flex justify-between items-center">
                           <span>{rule.state}</span>
                           <a href={rule.website} target="_blank" rel="noreferrer" className="text-orange-500 hover:text-orange-300 text-sm font-normal flex items-center">
                              Official Site <ChevronRight className="w-3 h-3 ml-1" />
                           </a>
                        </CardTitle>
                        <CardDescription>{rule.name}</CardDescription>
                     </CardHeader>
                     <CardContent className="space-y-4">
                        <div>
                           <div className="text-xs uppercase tracking-wider text-neutral-400 mb-1">Process</div>
                           <p className="text-sm text-neutral-300">{rule.claimProcess}</p>
                        </div>
                        <Separator />
                        <div>
                           <div className="text-xs uppercase tracking-wider text-neutral-400 mb-2">Required Documents</div>
                           <ul className="text-sm text-neutral-300 space-y-1 list-disc list-inside">
                              {rule.documentationRequired.map((doc, i) => (
                                 <li key={i}>{doc}</li>
                              ))}
                           </ul>
                        </div>
                        <Separator />
                        <div>
                           <div className="text-xs uppercase tracking-wider text-neutral-400 mb-1">Estimated Timeline</div>
                           <p className="text-sm font-medium text-neutral-300">{rule.timeline}</p>
                        </div>
                        <Separator />
                        <div>
                           <div className="text-xs uppercase tracking-wider text-neutral-400 mb-1">Max Finder/Locator Fee</div>
                           <p className="text-sm font-medium text-neutral-100 bg-orange-500/10 inline-block px-2 py-0.5 rounded border border-orange-500/20">{rule.maxCommission}</p>
                        </div>
                     </CardContent>
                  </Card>
               ))}
            </div>
          </div>
        )}

        {activeTab === "database" && (() => {
           const filteredCases = savedCases.filter(c => dbStateFilter === "" || c.assets.some(a => a.state === dbStateFilter));
           return (
           <div className="space-y-6">
             <h2 className="text-2xl font-light tracking-tight text-neutral-100 mb-6 flex justify-between items-center">
                Saved Investigations
                <div className="flex items-center space-x-4">
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
                            <CardHeader className="bg-neutral-900/50/50 border-b border-neutral-800 flex flex-row items-center justify-between py-4">
                               <div>
                                 <CardTitle className="text-lg text-orange-300">{savedCase.categoryName}</CardTitle>
                                 <CardDescription className="font-mono text-xs mt-1">
                                    ID: {savedCase.id} | Saved on {new Date(savedCase.createdAt).toLocaleDateString()}
                                 </CardDescription>
                               </div>
                               <Button variant="ghost" className="text-red-600 hover:bg-red-50 hover:text-red-700" onClick={() => handleDeleteCase(savedCase.id)}>Delete</Button>
                            </CardHeader>
                            <CardContent className="p-0">
                               <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-gray-100">
                                  <div className="p-6">
                                     <div className="text-xs uppercase tracking-wider text-neutral-400 mb-1">Total Value Found</div>
                                     <div className="text-2xl font-light text-green-700">${totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
                                     <div className="text-sm text-neutral-400 mt-1">{savedCase.assets.length} identified assets</div>
                                  </div>
                                  <div className="p-6 md:col-span-2 space-y-4">
                                     <div className="font-medium text-neutral-100 text-sm uppercase tracking-wide">Assets by State</div>
                                     <div className="flex flex-wrap gap-2">
                                        {Array.from(new Set(savedCase.assets.map(a => a.state))).map(state => {
                                           const stateAssets = savedCase.assets.filter(a => a.state === state);
                                           const stateTotal = stateAssets.reduce((s, a) => s + a.amount, 0);
                                           return (
                                              <Dialog key={state}>
                                                 <DialogTrigger className={cn(buttonVariants({ variant: "outline" }), "h-auto py-2 px-3 flex flex-col items-start gap-1")}>
                                                       <span className="font-bold text-neutral-100">{state}</span>
                                                       <span className="text-xs text-neutral-400">{stateAssets.length} claims</span>
                                                       <span className="text-xs font-mono text-green-700">${stateTotal.toLocaleString('en-US')}</span>
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
                                                                <TableHead>Target Name</TableHead>
                                                                <TableHead>Type</TableHead>
                                                                <TableHead className="text-right">Amount</TableHead>
                                                             </TableRow>
                                                          </TableHeader>
                                                          <TableBody>
                                                             {stateAssets.map(asset => (
                                                                <TableRow key={asset.id}>
                                                                   <TableCell>{asset.holderCompany}</TableCell>
                                                                   <TableCell className="font-medium">{asset.name}</TableCell>
                                                                   <TableCell>{asset.type}</TableCell>
                                                                   <TableCell className="text-right font-mono">${asset.amount.toLocaleString()}</TableCell>
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
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-neutral-900/50/50 rounded-md border border-neutral-800">
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
    </div>
  );
}

