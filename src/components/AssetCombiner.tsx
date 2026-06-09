import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { Search, MapPin, DollarSign, Layers, CheckSquare, Square, Mail, Phone, Loader2, Sparkles, AlertCircle, ArrowRight, UserCheck, PlusCircle } from "lucide-react";

interface Asset {
  id: number;
  ownerName: string;
  firstName: string | null;
  lastName: string | null;
  state: string;
  type: string;
  amount: number;
  company: string;
  location: string;
  stateId: string;
  sourceUrl: string;
  confidence: string;
}

interface AssetCombinerProps {
  onSwitchTab?: (tab: string) => void;
}

export function AssetCombiner({ onSwitchTab }: AssetCombinerProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [anchorAsset, setAnchorAsset] = useState<Asset | null>(null);
  const [relatedAssets, setRelatedAssets] = useState<Asset[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  // Campaign creation form state
  const [campaignName, setCampaignName] = useState("");
  const [clientId, setClientId] = useState("");
  const [channel, setChannel] = useState<"email" | "call" | "mixed">("mixed");
  const [deploying, setDeploying] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setLoading(true);
    setError(null);
    setAnchorAsset(null);
    setRelatedAssets([]);
    setSelectedIds(new Set());
    setCampaignName("");

    try {
      // Query California database via single search (passing as lastName for matching)
      const res = await fetch(`/api/search?lastName=${encodeURIComponent(searchQuery.trim())}&state=CA&recordLimit=50`);
      if (!res.ok) throw new Error("Search request failed.");
      
      const data = await res.json();
      const records = (data.records || []) as Asset[];

      if (records.length === 0) {
        setError(`No assets matching "${searchQuery}" were found in California.`);
        return;
      }

      // 1. Sort by amount descending to isolate the absolute top asset as our Anchor
      const sorted = [...records].sort((a, b) => b.amount - a.amount);
      const top = sorted[0];
      setAnchorAsset(top);

      // 2. The rest are the related assets that can be combined
      const others = sorted.slice(1);
      setRelatedAssets(others);

      // Default the campaign name
      setCampaignName(`${top.ownerName} Recovery Campaign`);
    } catch (err: any) {
      setError(err.message || "An error occurred during lookup.");
    } finally {
      setLoading(false);
    }
  };

  const toggleSelect = (id: number) => {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
  };

  const selectAll = () => {
    if (selectedIds.size === relatedAssets.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(relatedAssets.map(r => r.id)));
    }
  };

  const handleDeployCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!anchorAsset) return;
    if (!clientId.trim()) {
      alert("Please enter a Client ID Number to proceed.");
      return;
    }

    setDeploying(true);
    try {
      const combinedList = [anchorAsset, ...relatedAssets.filter(r => selectedIds.has(r.id))];
      const totalAmount = combinedList.reduce((sum, item) => sum + item.amount, 0);

      const targetFilter = {
        combinedAssetIds: combinedList.map(c => c.id),
        states: ["CA"],
        minAmount: totalAmount,
        anchorAssetId: anchorAsset.id,
        ownerName: anchorAsset.ownerName
      };

      const res = await fetch("/api/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: campaignName.trim() || `${anchorAsset.ownerName} Recovery Campaign`,
          type: channel,
          target_filter: targetFilter,
          schedule_cron: "0 9 * * 1-5",
          client_id: clientId.trim()
        })
      });

      if (!res.ok) throw new Error("Failed to deploy outreach campaign.");

      const result = await res.json();
      alert(`Outreach campaign successfully deployed!\nCampaign ID: #${result.id}\nClient ID: #${clientId}`);
      
      if (onSwitchTab) {
        onSwitchTab("campaigns");
      }
    } catch (err: any) {
      alert(`Error creating campaign: ${err.message}`);
    } finally {
      setDeploying(false);
    }
  };

  // Compute aggregated totals dynamically
  const selectedSecondaryAssets = relatedAssets.filter(r => selectedIds.has(r.id));
  const totalCombinedCount = 1 + selectedSecondaryAssets.length;
  const totalCombinedAmount = (anchorAsset?.amount || 0) + selectedSecondaryAssets.reduce((sum, item) => sum + item.amount, 0);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Layers className="w-6 h-6 text-orange-500" />
          <div>
            <h2 className="text-xl font-light tracking-tight text-neutral-100">CA Asset Combiner & recovery</h2>
            <p className="text-xs text-neutral-500">
              Isolate the highest-valued CA record for an identity, bundle secondary accounts, and dispatch targeted campaigns.
            </p>
          </div>
        </div>
        <Badge variant="outline" className="px-3 py-1 font-mono text-xs border-orange-500/20 text-orange-400 bg-orange-500/5">
          Step-by-Step Combiner
        </Badge>
      </div>

      {/* Lookup Bar */}
      <Card className="border-neutral-800 bg-neutral-900/60 backdrop-blur-md">
        <CardContent className="p-4">
          <form onSubmit={handleSearch} className="flex gap-3">
            <div className="relative flex-grow">
              <Search className="absolute left-3 top-3 h-4 w-4 text-neutral-500" />
              <Input
                placeholder="Search owner name to fetch California records (e.g. BEARER, SMITH, TRUST)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-neutral-950 border-neutral-800 text-neutral-100 font-mono text-sm placeholder:text-neutral-500 focus-visible:ring-orange-500"
              />
            </div>
            <Button
              type="submit"
              disabled={loading}
              className="bg-orange-600 hover:bg-orange-700 text-white font-medium shadow-md transition-colors px-6"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Search className="w-4 h-4 mr-1" />}
              Fetch & Analyze
            </Button>
          </form>
        </CardContent>
      </Card>

      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-lg flex items-center gap-2">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {loading && (
        <div className="h-64 flex flex-col items-center justify-center text-neutral-500 space-y-4">
          <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
          <div className="font-mono text-sm uppercase tracking-widest animate-pulse">Querying CA indices...</div>
        </div>
      )}

      {anchorAsset && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start animate-fade-in">
          {/* Main Workspace (Left Column - 2/3 wide) */}
          <div className="lg:col-span-2 space-y-6">
            {/* Top / Anchor Asset Display */}
            <Card className="border-orange-500/30 bg-gradient-to-r from-orange-500/5 via-neutral-900/40 to-neutral-900 border overflow-hidden">
              <div className="bg-orange-500/10 px-4 py-2 border-b border-orange-500/20 flex justify-between items-center">
                <span className="text-[10px] font-mono uppercase tracking-widest text-orange-400 flex items-center">
                  <UserCheck className="w-3.5 h-3.5 mr-1" /> Isolate Anchor (Top Asset)
                </span>
                <Badge className="bg-orange-500 text-white border-none text-[10px]">HIGHEST BALANCED ACCOUNT</Badge>
              </div>
              <CardContent className="p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h3 className="text-lg font-mono font-bold text-neutral-50 uppercase tracking-wide">
                    {anchorAsset.ownerName}
                  </h3>
                  <div className="flex flex-wrap items-center gap-2 mt-1.5 text-xs text-neutral-400">
                    <span className="text-orange-400 font-mono font-semibold">{anchorAsset.stateId || `ID-${anchorAsset.id}`}</span>
                    <span>·</span>
                    <span className="text-neutral-300">{anchorAsset.type}</span>
                    <span>·</span>
                    <span className="flex items-center text-neutral-500">
                      <MapPin className="w-3 h-3 mr-0.5" /> {anchorAsset.location}
                    </span>
                  </div>
                  <div className="text-[11px] text-neutral-500 mt-2">
                    Holder / Custodian: <span className="text-neutral-400">{anchorAsset.company}</span>
                  </div>
                </div>

                <div className="text-left sm:text-right flex-shrink-0">
                  <div className="text-xs uppercase tracking-wider text-neutral-500">Anchor Balance</div>
                  <div className="text-2xl font-mono font-black text-emerald-400">
                    ${anchorAsset.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Related/Secondary Assets List */}
            <Card className="border-neutral-800 bg-neutral-900/40">
              <CardHeader className="pb-3 border-b border-neutral-800 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-semibold uppercase tracking-wider text-neutral-300 flex items-center">
                    <Layers className="w-4 h-4 mr-2 text-orange-500" />
                    Combine Secondary Assets
                  </CardTitle>
                  <CardDescription className="text-xs">Select related claims to aggregate into the outreach campaign.</CardDescription>
                </div>
                {relatedAssets.length > 0 && (
                  <Button
                    size="xs"
                    variant="outline"
                    onClick={selectAll}
                    className="text-[10px] h-6 border-neutral-700 text-neutral-400"
                  >
                    {selectedIds.size === relatedAssets.length ? "Deselect All" : "Select All"}
                  </Button>
                )}
              </CardHeader>
              <CardContent className="p-0">
                {relatedAssets.length === 0 ? (
                  <div className="p-8 text-center text-neutral-500 text-sm">
                    No secondary assets found for this identity in the database records.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader className="bg-neutral-950/20">
                        <TableRow className="border-neutral-800">
                          <TableHead className="w-12 text-center"></TableHead>
                          <TableHead className="font-mono text-xs uppercase tracking-wider text-neutral-400">State ID</TableHead>
                          <TableHead className="font-mono text-xs uppercase tracking-wider text-neutral-400">Owner Identity</TableHead>
                          <TableHead className="font-mono text-xs uppercase tracking-wider text-neutral-400">Property Type</TableHead>
                          <TableHead className="font-mono text-xs uppercase tracking-wider text-neutral-400">Holder Company</TableHead>
                          <TableHead className="font-mono text-xs uppercase tracking-wider text-neutral-400 text-right">Amount</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {relatedAssets.map((asset) => {
                          const isChecked = selectedIds.has(asset.id);
                          return (
                            <TableRow
                              key={asset.id}
                              onClick={() => toggleSelect(asset.id)}
                              className={`border-neutral-850 cursor-pointer select-none transition-colors ${isChecked ? "bg-orange-500/5 hover:bg-orange-500/10" : "hover:bg-neutral-800/40"}`}
                            >
                              <TableCell className="text-center p-2">
                                <div className="flex justify-center">
                                  {isChecked ? (
                                    <CheckSquare className="w-4 h-4 text-orange-500" />
                                  ) : (
                                    <Square className="w-4 h-4 text-neutral-600 hover:text-neutral-500" />
                                  )}
                                </div>
                              </TableCell>
                              <TableCell className="font-mono text-xs text-orange-400">{asset.stateId || `ID-${asset.id}`}</TableCell>
                              <TableCell className="font-mono font-medium text-xs text-neutral-300 uppercase truncate max-w-[150px]" title={asset.ownerName}>
                                {asset.ownerName}
                              </TableCell>
                              <TableCell className="text-xs text-neutral-400 truncate max-w-[160px]" title={asset.type}>
                                {asset.type}
                              </TableCell>
                              <TableCell className="text-xs text-neutral-500 truncate max-w-[150px]" title={asset.company}>
                                {asset.company}
                              </TableCell>
                              <TableCell className="text-right font-mono font-medium text-emerald-400 text-xs">
                                ${asset.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Aggregated Recovery Panel & Campaign builder (Right Column - 1/3 wide) */}
          <div className="space-y-6">
            {/* dynamic statistics portfolio card */}
            <Card className="border-neutral-800 bg-neutral-900/60 backdrop-blur-md">
              <CardHeader className="pb-3 border-b border-neutral-800">
                <CardTitle className="text-sm font-semibold uppercase tracking-wider text-neutral-400 flex items-center">
                  <Sparkles className="w-4 h-4 mr-2 text-orange-500" />
                  Combined Portfolio Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-4">
                <div className="grid grid-cols-2 gap-2 text-center">
                  <div className="p-3 bg-neutral-950 rounded-lg border border-neutral-800">
                    <div className="text-[10px] uppercase text-neutral-500 font-semibold">Total Accounts</div>
                    <div className="text-2xl font-mono font-bold text-orange-400 mt-1">{totalCombinedCount}</div>
                  </div>
                  <div className="p-3 bg-neutral-950 rounded-lg border border-neutral-800">
                    <div className="text-[10px] uppercase text-neutral-500 font-semibold">Combined Value</div>
                    <div className="text-xl font-mono font-bold text-emerald-400 mt-1">
                      ${totalCombinedAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="text-[11px] text-neutral-500 uppercase tracking-wide">Basket Contents:</div>
                  <div className="p-3 bg-neutral-950/60 rounded-lg border border-neutral-850 text-xs text-neutral-300 space-y-2">
                    <div className="flex justify-between items-center border-b border-neutral-800 pb-1">
                      <span className="truncate max-w-[140px] text-neutral-400 uppercase font-mono">1. {anchorAsset.ownerName} (Anchor)</span>
                      <span className="font-mono text-emerald-400">${anchorAsset.amount.toLocaleString()}</span>
                    </div>
                    {selectedSecondaryAssets.map((asset, index) => (
                      <div key={asset.id} className="flex justify-between items-center text-[11px]">
                        <span className="truncate max-w-[140px] text-neutral-500 uppercase font-mono">{index + 2}. {asset.ownerName}</span>
                        <span className="font-mono text-emerald-400">${asset.amount.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* CA Agent Regulatory Compliance Checklist */}
            <Card className="border-neutral-800 bg-neutral-900/60 backdrop-blur-md">
              <CardHeader className="pb-3 border-b border-neutral-800">
                <CardTitle className="text-sm font-semibold uppercase tracking-wider text-neutral-400 flex items-center">
                  <AlertCircle className="w-4 h-4 mr-2 text-orange-500" />
                  CA Agent Compliance Guidelines
                </CardTitle>
                <CardDescription className="text-xs">
                  Legal rules under CA Civil Procedure § 1500 et seq.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 space-y-3.5 text-xs text-neutral-400">
                {totalCombinedAmount >= 166250 ? (
                  <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 font-medium rounded-lg">
                    ⚠️ PROBATE COURT REQUIRED
                    <p className="font-normal text-[11px] text-neutral-400 mt-1">
                      Combined balance exceeds the <strong>$166,250</strong> CA probate threshold. Standard judicial administration is mandatory.
                    </p>
                  </div>
                ) : (
                  <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-medium rounded-lg">
                    ✓ STANDARD CLAIMS PIPELINE
                    <p className="font-normal text-[11px] text-neutral-400 mt-1">
                      Combined balance is under <strong>$166,250</strong>. Eligible for direct State Controller filing.
                    </p>
                  </div>
                )}

                <div className="space-y-2">
                  <div className="flex justify-between border-b border-neutral-850 pb-1.5">
                    <span className="text-neutral-500">Notarization Required</span>
                    <span className="font-mono text-orange-400 font-semibold">YES</span>
                  </div>
                  <div className="flex justify-between border-b border-neutral-850 pb-1.5">
                    <span className="text-neutral-500">Heirship Affidavit</span>
                    <span className="font-mono text-orange-400 font-semibold">MANDATORY</span>
                  </div>
                  <div className="flex justify-between border-b border-neutral-850 pb-1.5">
                    <span className="text-neutral-500">Finder Fee Cap</span>
                    <span className="font-mono text-emerald-400 font-semibold">NO LIMIT</span>
                  </div>
                </div>

                <div className="space-y-1 bg-neutral-950 p-2.5 rounded-lg border border-neutral-850">
                  <div className="font-semibold text-neutral-300 mb-1">Required Outreach Docs:</div>
                  <ul className="list-disc pl-4 space-y-1 text-[11px]">
                    <li>Copy of Valid Photo ID</li>
                    <li>Official SSN / Tax ID Proof</li>
                    <li>Signed Agent Contract (Notarized)</li>
                    <li>Linkage documents showing connection</li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            {/* Campaign deployment form */}
            <Card className="border-neutral-800 bg-neutral-900/60 backdrop-blur-md">
              <CardHeader className="pb-3 border-b border-neutral-800">
                <CardTitle className="text-sm font-semibold uppercase tracking-wider text-neutral-400 flex items-center">
                  <PlusCircle className="w-4 h-4 mr-2 text-orange-500" />
                  Outreach Deployment
                </CardTitle>
                <CardDescription className="text-xs">Launch recovery outreach for combined assets.</CardDescription>
              </CardHeader>
              <CardContent className="p-4 pt-5">
                <form onSubmit={handleDeployCampaign} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs uppercase tracking-wider text-neutral-400 font-semibold flex justify-between">
                      <span>Client ID Number</span>
                      <span className="text-[10px] text-orange-500 lowercase">(required)</span>
                    </label>
                    <Input
                      placeholder="e.g. CLI-7742"
                      value={clientId}
                      onChange={(e) => setClientId(e.target.value)}
                      required
                      className="bg-neutral-950 border-neutral-800 text-sm font-mono text-orange-400 placeholder:text-neutral-600 focus-visible:ring-orange-500"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs uppercase tracking-wider text-neutral-400 font-semibold">
                      Outreach Campaign Name
                    </label>
                    <Input
                      placeholder="e.g. John Doe Claim Campaign"
                      value={campaignName}
                      onChange={(e) => setCampaignName(e.target.value)}
                      required
                      className="bg-neutral-950 border-neutral-800 text-sm text-neutral-200 placeholder:text-neutral-600 focus-visible:ring-orange-500"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs uppercase tracking-wider text-neutral-400 font-semibold">
                      Outreach Channel
                    </label>
                    <select
                      value={channel}
                      onChange={(e) => setChannel(e.target.value as any)}
                      className="flex h-10 w-full rounded-md border border-neutral-850 bg-neutral-950 px-3 py-2 text-sm text-neutral-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <option value="mixed">Mixed (Email + Calls)</option>
                      <option value="email">Email Only</option>
                      <option value="call">Phone Call Only</option>
                    </select>
                  </div>

                  <Button
                    type="submit"
                    disabled={deploying}
                    className="w-full bg-orange-600 hover:bg-orange-700 text-white font-semibold shadow-md transition-colors mt-2"
                  >
                    {deploying ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin mr-1" /> Deploying Claim...
                      </>
                    ) : (
                      <>
                        Deploy Recovery Campaign <ArrowRight className="w-4 h-4 ml-1" />
                      </>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
