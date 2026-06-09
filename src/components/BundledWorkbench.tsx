import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Separator } from "./ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { Search, MapPin, DollarSign, Users, ChevronDown, ChevronUp, FileText, UserPlus, Mail, ShieldAlert, Sparkles, Filter, ChevronLeft, ChevronRight, AlertCircle, Save, FolderPlus } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "./ui/dialog";
import { Label } from "./ui/label";
import { saveCase, getSavedCases } from "../services/dataStore";

interface Asset {
  id: number;
  owner_name: string;
  first_name: string | null;
  last_name: string | null;
  state: string;
  property_type: string | null;
  amount: number;
  company: string | null;
  location: string | null;
  state_id: string | null;
  source_url: string | null;
  confidence: string | null;
  claim_status: string;
  created_at: string;
}

interface Bundle {
  ownerName: string;
  totalAmount: number;
  assetCount: number;
  assets: Asset[];
}

interface BundledWorkbenchProps {
  onSwitchTab?: (tab: string) => void;
}

export function BundledWorkbench({ onSwitchTab }: BundledWorkbenchProps) {
  const [nameQuery, setNameQuery] = useState("");
  const [ownerType, setOwnerType] = useState<"all" | "individual" | "business" | "estate">("all");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [bundles, setBundles] = useState<Bundle[]>([]);
  const [total, setTotal] = useState(0);
  const [limit, setLimit] = useState(100);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(false);
  const [expandedOwners, setExpandedOwners] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [leadIds, setLeadIds] = useState<number[]>([]);

  // Campaign builder states
  const [createCampaignOpen, setCreateCampaignOpen] = useState(false);
  const [campaignName, setCampaignName] = useState("");
  const [campaignType, setCampaignType] = useState("mixed");
  const [campaignLoading, setCampaignLoading] = useState(false);

  // Bulk save states
  const [selectedOwners, setSelectedOwners] = useState<Set<string>>(new Set());

  useEffect(() => {
    setSelectedOwners(new Set());
  }, [bundles]);

  const handleSelectOwner = (ownerName: string) => {
    setSelectedOwners((prev) => {
      const next = new Set(prev);
      if (next.has(ownerName)) {
        next.delete(ownerName);
      } else {
        next.add(ownerName);
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    if (selectedOwners.size === bundles.length) {
      setSelectedOwners(new Set());
    } else {
      setSelectedOwners(new Set(bundles.map((b) => b.ownerName)));
    }
  };

  const handleBulkSave = () => {
    try {
      let savedCount = 0;
      let duplicateCount = 0;
      const existingCases = getSavedCases();
      const existingNames = new Set(existingCases.map((c) => c.categoryName.toUpperCase()));

      bundles.forEach((bundle) => {
        if (selectedOwners.has(bundle.ownerName)) {
          if (existingNames.has(bundle.ownerName.toUpperCase())) {
            duplicateCount++;
            return;
          }

          const assetsList = bundle.assets.map((asset) => ({
            id: `api-ast-${asset.id}`,
            name: asset.owner_name,
            address: asset.location || "",
            state: asset.state || "CA",
            type: (asset.property_type || "Bank Account") as any,
            holderCompany: asset.company || "",
            amount: asset.amount,
            stateId: asset.state_id || undefined,
            sourceUrl: asset.source_url || undefined,
            confidence: (asset.confidence || "official_bulk_csv") as any,
          }));

          const nameParts = parseOwnerName(bundle.ownerName);
          const query = {
            firstName: nameParts.firstName,
            lastName: nameParts.lastName,
            generalHighValue: bundle.totalAmount >= 50000,
            targetState: "CA",
          };

          saveCase(bundle.ownerName, query, assetsList, []);
          savedCount++;
        }
      });

      setSelectedOwners(new Set());

      let msg = `Successfully saved ${savedCount} cases to Saved Investigations!`;
      if (duplicateCount > 0) {
        msg += ` (${duplicateCount} already existed and were skipped)`;
      }
      alert(msg);
    } catch (err: any) {
      alert(`Error bulk saving cases: ${err.message}`);
    }
  };

  const parseOwnerName = (name: string) => {
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return { firstName: "", lastName: name };
    return {
      firstName: parts.slice(1).join(" "),
      lastName: parts[0]
    };
  };

  const handleSaveCase = (bundle: Bundle) => {
    try {
      const assetsList = bundle.assets.map((asset) => ({
        id: `api-ast-${asset.id}`,
        name: asset.owner_name,
        address: asset.location || "",
        state: asset.state || "CA",
        type: (asset.property_type || "Bank Account") as any,
        holderCompany: asset.company || "",
        amount: asset.amount,
        stateId: asset.state_id || undefined,
        sourceUrl: asset.source_url || undefined,
        confidence: (asset.confidence || "official_bulk_csv") as any,
      }));

      const nameParts = parseOwnerName(bundle.ownerName);
      const query = {
        firstName: nameParts.firstName,
        lastName: nameParts.lastName,
        generalHighValue: bundle.totalAmount >= 50000,
        targetState: "CA",
      };

      saveCase(
        bundle.ownerName,
        query,
        assetsList,
        []
      );

      alert(`Successfully saved Case: ${bundle.ownerName} to Saved Investigations!`);
    } catch (err: any) {
      alert(`Error saving case: ${err.message}`);
    }
  };

  const fetchBundles = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (nameQuery.trim()) params.append("name", nameQuery.trim());
      if (ownerType !== "all") params.append("ownerType", ownerType);
      if (minPrice.trim()) params.append("minAmount", minPrice.trim());
      if (maxPrice.trim()) params.append("maxAmount", maxPrice.trim());
      params.append("limit", String(limit));
      params.append("offset", String(offset));

      const res = await fetch(`/api/records/search-bundled?${params.toString()}`);
      if (!res.ok) throw new Error("Search request failed.");
      const data = await res.json();
      
      setBundles(data.bundles || []);
      setTotal(data.total || 0);
      setLeadIds(data.leadIds || []);
    } catch (err: any) {
      setError(err.message || "An error occurred fetching bundled data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (hasSearched) {
      fetchBundles();
    }
  }, [offset]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setOffset(0);
    setHasSearched(true);
    if (offset === 0) {
      fetchBundles();
    }
  };

  const handleCreateCampaignFromSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!campaignName.trim()) return;
    setCampaignLoading(true);
    try {
      const res = await fetch("/api/campaigns/build-from-bundled-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          campaignName: campaignName.trim(),
          campaignType: campaignType,
          nameQuery: nameQuery || undefined,
          ownerType: ownerType !== "all" ? ownerType : undefined,
          minAmount: minPrice ? Number(minPrice) : undefined,
          maxAmount: maxPrice ? Number(maxPrice) : undefined,
          limit: limit
        })
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to build campaign from search");
      }
      const data = await res.json();
      
      alert(`Successfully created Campaign #${data.campaign.id} and queued ${data.queued} leads (skipped ${data.skipped})!`);
      setCreateCampaignOpen(false);
      if (onSwitchTab) onSwitchTab("campaigns");
    } catch (err: any) {
      alert(`Campaign build failed: ${err.message}`);
    } finally {
      setCampaignLoading(false);
    }
  };

  const toggleExpand = (ownerName: string) => {
    const next = new Set(expandedOwners);
    if (next.has(ownerName)) {
      next.delete(ownerName);
    } else {
      next.add(ownerName);
    }
    setExpandedOwners(next);
  };

  const handleAddLead = async (asset: Asset) => {
    try {
      const leadData = {
        asset_id: asset.id,
        full_name: asset.owner_name,
        relation: "owner",
        email: null,
        phone: null,
        address: asset.location?.split(",")[0] || null,
        city: asset.location?.split(",")[0]?.trim() || null,
        state: asset.state || "CA",
        zip: asset.location?.match(/\b\d{5}\b/)?.[0] || null,
        confidence: 0.9,
        source: "bundled_workbench",
        verified: 0,
        notes: `Imported via Bundled Workbench. State ID: ${asset.state_id || "N/A"}`,
      };
      
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(leadData),
      });
      if (!res.ok) throw new Error("Failed to save lead.");
      
      alert(`Lead added successfully for ${asset.owner_name}!`);
    } catch (err: any) {
      alert(`Error adding lead: ${err.message}`);
    }
  };

  const handleStartCampaign = async (asset: Asset) => {
    try {
      const assetRecord = {
        id: `api-ast-${asset.id}`,
        name: asset.owner_name,
        type: asset.property_type || "Unclaimed Property",
        amount: asset.amount,
        holderCompany: asset.company || "Unknown Holder",
        state: asset.state || "CA",
        address: asset.location || "Unknown Address",
        stateId: asset.state_id,
        sourceUrl: asset.source_url,
        confidence: "manual_entry",
      };

      const res = await fetch("/api/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: `${asset.owner_name} Quick Campaign`,
          type: "mixed",
          target_filter: JSON.stringify({ states: [asset.state || "CA"], minAmount: asset.amount }),
          schedule_cron: "0 9 * * 1-5"
        })
      });
      if (!res.ok) throw new Error("Failed to create campaign.");
      
      alert(`Campaign initialized for ${asset.owner_name}! Redirecting to Campaigns page.`);
      if (onSwitchTab) onSwitchTab("campaigns");
    } catch (err: any) {
      alert(`Error starting campaign: ${err.message}`);
    }
  };

  const currentPage = Math.floor(offset / limit) + 1;
  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Sparkles className="w-6 h-6 text-orange-500" />
          <div>
            <h2 className="text-xl font-light tracking-tight text-neutral-100">CA Bundling & Search Workbench</h2>
            <p className="text-xs text-neutral-500">
              Aggregating unclaimed cash balances & grouping similar owner identities from California's database.
            </p>
          </div>
        </div>
        <Badge variant="outline" className="px-3 py-1 font-mono text-xs border-orange-500/20 text-orange-400 bg-orange-500/5">
          {total.toLocaleString()} Bundled Owners Match
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
        {/* Left Side: Filter Form */}
        <Card className="lg:col-span-1 border-neutral-800 bg-neutral-900/60 backdrop-blur-md">
          <CardHeader className="pb-4">
            <CardTitle className="text-sm font-semibold uppercase tracking-wider text-neutral-400 flex items-center">
              <Filter className="w-4 h-4 mr-2 text-orange-500" />
              Search Filters
            </CardTitle>
            <CardDescription className="text-xs">Filter 1M+ active records instantly.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSearch} className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs uppercase tracking-wide text-neutral-400">Owner Name</label>
                <Input
                  placeholder="e.g. BEARER or SMITH"
                  value={nameQuery}
                  onChange={(e) => setNameQuery(e.target.value)}
                  className="bg-neutral-950 border-neutral-800 focus:ring-orange-500 text-sm font-mono"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs uppercase tracking-wide text-neutral-400">Owner Type</label>
                <select
                  value={ownerType}
                  onChange={(e) => setOwnerType(e.target.value as any)}
                  className="h-10 w-full rounded-lg border border-neutral-800 bg-neutral-950 px-3 text-sm text-neutral-100 shadow-sm outline-none transition-colors focus:border-orange-500 focus:ring-1 focus:ring-orange-500 font-sans"
                >
                  <option value="all">All Owners</option>
                  <option value="individual">Individuals Only</option>
                  <option value="business">Businesses Only</option>
                  <option value="estate">Estates Only</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-xs uppercase tracking-wide text-neutral-400">Min Cash Balance ($)</label>
                <Input
                  type="number"
                  placeholder="e.g. 500"
                  value={minPrice}
                  onChange={(e) => setMinPrice(e.target.value)}
                  className="bg-neutral-950 border-neutral-800 text-sm font-mono"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs uppercase tracking-wide text-neutral-400">Max Cash Balance ($)</label>
                <Input
                  type="number"
                  placeholder="e.g. 10000"
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(e.target.value)}
                  className="bg-neutral-950 border-neutral-800 text-sm font-mono"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs uppercase tracking-wide text-neutral-400">List Count (Records to Return)</label>
                <Input
                  type="number"
                  min={1}
                  max={5000}
                  placeholder="e.g. 100"
                  value={limit}
                  onChange={(e) => setLimit(Math.max(1, Math.min(5000, Number(e.target.value) || 100)))}
                  className="bg-neutral-950 border-neutral-800 text-sm font-mono"
                />
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-orange-600 hover:bg-orange-700 text-white shadow-sm font-medium transition-colors"
              >
                {loading ? "Filtering Database..." : "Apply Filters"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Right Side: Grouped Bundles Results */}
        <div className="lg:col-span-3 space-y-4">
          {error && (
            <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-lg flex items-center gap-2">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {!hasSearched ? (
            <div className="h-64 flex flex-col items-center justify-center text-neutral-400 bg-neutral-900/40 border border-neutral-800 rounded-xl border-dashed">
              <Search className="w-8 h-8 mb-3 opacity-30 text-orange-500" />
              <p className="text-sm font-medium text-neutral-300">Enter your search criteria on the left sidebar.</p>
              <p className="text-xs text-neutral-500 mt-1">Configure list limits, balance ranges, and names to start.</p>
            </div>
          ) : loading ? (
            <div className="h-64 flex flex-col items-center justify-center text-neutral-500 space-y-4">
              <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
              <div className="font-mono text-sm uppercase tracking-widest animate-pulse">Bundling identical records...</div>
            </div>
          ) : bundles.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center text-neutral-400 bg-neutral-900/40 border border-neutral-800 rounded-xl border-dashed">
              <Search className="w-8 h-8 mb-3 opacity-30 text-orange-500" />
              <p className="text-sm font-medium text-neutral-300">No bundled assets match the search criteria.</p>
              <p className="text-xs text-neutral-500 mt-1">Try expanding your price range or adjusting the owner name string.</p>
            </div>
          ) : (
            <>
              {/* Stats Bar */}
              <div className="flex items-center justify-between text-xs text-neutral-400 bg-neutral-900/40 p-3 rounded-lg border border-neutral-800">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2 mr-2">
                    <input
                      type="checkbox"
                      checked={bundles.length > 0 && selectedOwners.size === bundles.length}
                      onChange={handleSelectAll}
                      className="w-4 h-4 rounded border-neutral-800 bg-neutral-950 text-orange-500 focus:ring-orange-500 cursor-pointer accent-orange-500"
                    />
                    <span className="text-neutral-300 font-mono text-[11px] uppercase select-none">Select All</span>
                  </div>
                  <div>
                    Showing <span className="text-orange-400 font-semibold">{bundles.length}</span> unique owner portfolios
                  </div>
                  {selectedOwners.size > 0 && (
                    <Button
                      size="sm"
                      onClick={handleBulkSave}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-[10px] h-6 py-0 px-2 flex items-center gap-1.5"
                    >
                      <Save className="w-3 h-3" /> Save Selected ({selectedOwners.size})
                    </Button>
                  )}
                  {bundles.length > 0 && (
                    <Button
                      size="sm"
                      onClick={() => {
                        setCampaignName(`CA Bundled Outreach - Min $${minPrice || "0"} - ${bundles.length} Leads`);
                        setCreateCampaignOpen(true);
                      }}
                      className="bg-orange-600 hover:bg-orange-700 text-white font-semibold text-[10px] h-6 py-0 px-2 flex items-center gap-1.5"
                    >
                      <Mail className="w-3 h-3" /> Build Campaign ({bundles.length} Leads)
                    </Button>
                  )}
                </div>
                <div>
                  Page <span className="text-orange-400 font-semibold">{currentPage}</span> of <span className="font-semibold">{totalPages}</span>
                </div>
              </div>

              {/* Bundles Loop */}
              <div className="space-y-3">
                {bundles.map((bundle) => {
                  const isExpanded = expandedOwners.has(bundle.ownerName);
                  return (
                    <Card key={bundle.ownerName} className="border-neutral-800 bg-neutral-900/40 hover:border-neutral-700 transition-all overflow-hidden">
                      <div
                        onClick={() => toggleExpand(bundle.ownerName)}
                        className="p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 cursor-pointer select-none"
                      >
                        <div className="flex items-start gap-3">
                          <input
                            type="checkbox"
                            checked={selectedOwners.has(bundle.ownerName)}
                            onChange={() => handleSelectOwner(bundle.ownerName)}
                            onClick={(e) => e.stopPropagation()}
                            className="mt-2.5 w-4 h-4 rounded border-neutral-800 bg-neutral-950 text-orange-500 focus:ring-orange-500 cursor-pointer accent-orange-500"
                          />
                          <div className="bg-orange-500/10 p-2 rounded-lg text-orange-400 mt-0.5">
                            <Users className="w-4 h-4" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-neutral-100 uppercase font-mono tracking-wide">{bundle.ownerName}</h3>
                            <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-neutral-500">
                              <Badge variant="secondary" className="bg-orange-500/10 text-orange-400 border-orange-500/20 py-0 text-[10px]">
                                {bundle.assetCount} unclaimed {bundle.assetCount === 1 ? "asset" : "assets"}
                              </Badge>
                              <span>·</span>
                              <span className="flex items-center text-neutral-400">
                                <MapPin className="w-3 h-3 mr-0.5" /> CA Registry
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center justify-between sm:justify-end gap-4 border-t sm:border-t-0 pt-2 sm:pt-0 border-neutral-800">
                          <div className="text-right">
                            <div className="text-xs uppercase tracking-wider text-neutral-500">Total Portfolio Value</div>
                            <div className="text-lg font-mono font-bold text-emerald-400">
                              ${bundle.totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                            </div>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSaveCase(bundle);
                            }}
                            className="bg-neutral-950/40 border-neutral-850 hover:bg-neutral-900 text-[10px] h-7 px-2.5 flex items-center gap-1 text-orange-400 border-orange-500/20"
                          >
                            <Save className="w-3.5 h-3.5" /> Save Case
                          </Button>
                          <div className="text-neutral-400 bg-neutral-950/60 p-1.5 rounded-lg border border-neutral-800">
                            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </div>
                        </div>
                      </div>

                      {isExpanded && (
                        <div className="border-t border-neutral-800 bg-neutral-950/60 p-4 space-y-4">
                          <h4 className="text-xs uppercase tracking-wider text-neutral-400 font-semibold">
                            Normalized Asset Line Items
                          </h4>
                          <div className="overflow-x-auto rounded-lg border border-neutral-800 bg-neutral-900/30">
                            <Table>
                              <TableHeader className="bg-neutral-900/60">
                                <TableRow className="border-neutral-800">
                                  <TableHead className="font-mono text-xs uppercase tracking-wider text-neutral-400">State ID</TableHead>
                                  <TableHead className="font-mono text-xs uppercase tracking-wider text-neutral-400">Property Type</TableHead>
                                  <TableHead className="font-mono text-xs uppercase tracking-wider text-neutral-400">Company Holder</TableHead>
                                  <TableHead className="font-mono text-xs uppercase tracking-wider text-neutral-400">Last Known Location</TableHead>
                                  <TableHead className="font-mono text-xs uppercase tracking-wider text-neutral-400 text-right">Amount</TableHead>
                                  <TableHead className="font-mono text-xs uppercase tracking-wider text-neutral-400 text-center">Pipeline Actions</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {bundle.assets.map((asset) => (
                                  <TableRow key={asset.id} className="border-neutral-850 hover:bg-orange-500/5 transition-colors">
                                    <TableCell className="font-mono text-xs text-orange-400 font-semibold">
                                      {asset.state_id || `ID-${asset.id}`}
                                    </TableCell>
                                    <TableCell className="max-w-xs truncate text-xs text-neutral-300" title={asset.property_type || ""}>
                                      {asset.property_type || "N/A"}
                                    </TableCell>
                                    <TableCell className="text-xs text-neutral-400">{asset.company || "Unknown Holder"}</TableCell>
                                    <TableCell className="text-xs text-neutral-400">
                                      <div className="flex items-center">
                                        <MapPin className="w-3 h-3 mr-1 opacity-50" />
                                        {asset.location || "N/A"}
                                      </div>
                                    </TableCell>
                                    <TableCell className="text-right font-mono font-medium text-emerald-400 text-xs">
                                      ${asset.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                    </TableCell>
                                    <TableCell className="text-center">
                                      <div className="flex justify-center items-center gap-1.5">
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          onClick={() => handleAddLead(asset)}
                                          className="text-[10px] h-6 py-0 px-2 border-neutral-700 text-neutral-300 hover:bg-neutral-800"
                                        >
                                          <UserPlus className="w-3 h-3 mr-1" /> Add Lead
                                        </Button>
                                        <Button
                                          size="sm"
                                          onClick={() => handleStartCampaign(asset)}
                                          className="text-[10px] h-6 py-0 px-2 bg-orange-600 hover:bg-orange-700 text-white"
                                        >
                                          <Mail className="w-3 h-3 mr-1" /> Campaign
                                        </Button>
                                      </div>
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        </div>
                      )}
                    </Card>
                  );
                })}
              </div>

              {/* Pagination controls */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between pt-4 border-t border-neutral-800">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={offset === 0}
                    onClick={() => setOffset(Math.max(0, offset - limit))}
                    className="border-neutral-800 text-neutral-300 hover:bg-neutral-900"
                  >
                    <ChevronLeft className="w-4 h-4 mr-1" /> Previous
                  </Button>
                  <span className="text-xs text-neutral-500">
                    Page {currentPage} of {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={currentPage >= totalPages}
                    onClick={() => setOffset(offset + limit)}
                    className="border-neutral-800 text-neutral-300 hover:bg-neutral-900"
                  >
                    Next <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Campaign Builder Dialog */}
      <Dialog open={createCampaignOpen} onOpenChange={setCreateCampaignOpen}>
        <DialogContent className="border-neutral-800 bg-neutral-950/95 backdrop-blur-md text-neutral-100 max-w-md rounded-xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold text-orange-400">
              Build Campaign for Filtered Leads
            </DialogTitle>
            <DialogDescription className="text-xs text-neutral-400">
              This will create a new outreach campaign and automatically queue all {bundles.length} leads matching your current search parameters.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateCampaignFromSearch} className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label htmlFor="campName" className="text-xs uppercase tracking-wide text-neutral-400">Campaign Name</Label>
              <Input
                id="campName"
                placeholder="e.g. CA High Value Outreach"
                value={campaignName}
                onChange={(e) => setCampaignName(e.target.value)}
                className="bg-neutral-900 border-neutral-800 focus:ring-orange-500 text-sm"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="campType" className="text-xs uppercase tracking-wide text-neutral-400">Campaign Channel</Label>
              <select
                id="campType"
                value={campaignType}
                onChange={(e) => setCampaignType(e.target.value)}
                className="flex h-10 w-full rounded-md border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="mixed">Mixed (Email + Call/Mail fallback)</option>
                <option value="email">Email Only</option>
                <option value="call">Call Only</option>
              </select>
            </div>

            <DialogFooter className="pt-4 border-t border-neutral-800 mt-4 flex gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setCreateCampaignOpen(false)}
                className="hover:bg-neutral-900 text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={campaignLoading}
                className="bg-orange-600 hover:bg-orange-700 text-white shadow-sm font-semibold text-xs transition-colors"
              >
                {campaignLoading ? "Queuing Leads..." : `Build Campaign (${bundles.length} Leads)`}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
