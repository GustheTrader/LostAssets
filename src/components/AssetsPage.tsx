import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Separator } from "../components/ui/separator";
import { DollarSign, MapPin, Search, UserPlus, Users, FileText, Filter, ChevronDown, ChevronUp } from "lucide-react";

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

interface Lead {
  id: number;
  full_name: string;
  relation: string | null;
  email: string | null;
  phone: string | null;
  city: string | null;
  state: string | null;
  confidence: number;
  verified: number;
}

const CLAIM_STATUS_OPTIONS = ["unclaimed", "contacted", "in_progress", "claimed", "expired", "rejected"];
const STATUS_COLORS: Record<string, string> = {
  unclaimed: "bg-neutral-500/10 text-neutral-400 border-neutral-500/20",
  contacted: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  in_progress: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  claimed: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  expired: "bg-red-500/10 text-red-400 border-red-500/20",
  rejected: "bg-red-500/10 text-red-400 border-red-500/20",
};

export function AssetsPage() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [selected, setSelected] = useState<Asset | null>(null);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [stateFilter, setStateFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [minAmount, setMinAmount] = useState("");
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [saveBusy, setSaveBusy] = useState(false);

  const load = async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (stateFilter) params.append("state", stateFilter);
    if (statusFilter) params.append("status", statusFilter);
    if (minAmount) params.append("minAmount", minAmount);
    const res = await fetch(`/api/records?${params.toString()}`);
    const data = await res.json();
    setAssets(Array.isArray(data) ? data : []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [stateFilter, statusFilter, minAmount]);

  const loadLeads = async (assetId: number) => {
    const res = await fetch(`/api/leads?assetId=${assetId}`);
    const data = await res.json();
    setLeads(Array.isArray(data) ? data : []);
  };

  const toggleExpand = (a: Asset) => {
    if (expanded.has(a.id)) {
      expanded.delete(a.id);
      setExpanded(new Set(expanded));
    } else {
      expanded.add(a.id);
      setExpanded(new Set(expanded));
      loadLeads(a.id);
      setSelected(a);
    }
  };

  const handleStatusChange = async (id: number, status: string) => {
    await fetch(`/api/assets/${id}/status`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
    load();
  };

  const totalValue = assets.reduce((s, a) => s + (a.amount || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <FileText className="w-6 h-6 text-orange-500" />
          <div>
            <h2 className="text-lg font-semibold text-neutral-100">Asset Database</h2>
            <p className="text-xs text-neutral-500">{assets.length} records · ${totalValue.toLocaleString()} total value</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <select className="rounded-md border border-neutral-700 bg-neutral-900 px-3 py-1.5 text-sm text-neutral-100" value={stateFilter} onChange={(e) => setStateFilter(e.target.value)}>
            <option value="">All States</option>
            {Array.from(new Set(assets.map(a => a.state))).sort().map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <select className="rounded-md border border-neutral-700 bg-neutral-900 px-3 py-1.5 text-sm text-neutral-100" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">All Status</option>
            {CLAIM_STATUS_OPTIONS.map(s => <option key={s} value={s}>{s.replace("_"," ")}</option>)}
          </select>
          <input type="number" placeholder="Min $" className="w-28 rounded-md border border-neutral-700 bg-neutral-900 px-3 py-1.5 text-sm text-neutral-100" value={minAmount} onChange={(e) => setMinAmount(e.target.value)} />
          <Button size="sm" variant="outline" onClick={load} className="border-neutral-700 text-neutral-300 hover:bg-neutral-800">
            <Search className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="space-y-3">
        {assets.map((a) => (
          <Card key={a.id} className="border-neutral-800 bg-neutral-900">
            <CardContent className="p-4">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-neutral-100">{a.owner_name}</span>
                    <Badge className={STATUS_COLORS[a.claim_status] || STATUS_COLORS.unclaimed}>
                      {a.claim_status}
                    </Badge>
                    <Badge variant="outline" className="text-neutral-400 border-neutral-700 text-[10px]">
                      <MapPin className="w-3 h-3 mr-1 inline" />{a.state}
                    </Badge>
                    {a.property_type && <Badge variant="outline" className="text-neutral-400 border-neutral-700 text-[10px]">{a.property_type}</Badge>}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-neutral-500">
                    <span className="font-mono text-emerald-400">${a.amount.toLocaleString()}</span>
                    <span>{a.company || "Unknown holder"}</span>
                    <span>{a.location || ""}</span>
                    {a.state_id && <span className="font-mono text-orange-300">ID: {a.state_id}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <select
                    className="rounded-md border border-neutral-700 bg-neutral-950 px-2 py-1 text-xs text-neutral-100"
                    value={a.claim_status}
                    onChange={(e) => handleStatusChange(a.id, e.target.value)}
                  >
                    {CLAIM_STATUS_OPTIONS.map(s => <option key={s} value={s}>{s.replace("_", " ")}</option>)}
                  </select>
                  <Button size="sm" variant="ghost" onClick={() => toggleExpand(a)} className="text-neutral-400 hover:text-neutral-100">
                    {expanded.has(a.id) ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </Button>
                </div>
              </div>

              {expanded.has(a.id) && selected?.id === a.id && (
                <div className="mt-4 pt-4 border-t border-neutral-800 grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <h3 className="text-xs uppercase tracking-wide text-neutral-500 flex items-center gap-2">
                      <Users className="w-4 h-4" /> Linked Leads ({leads.length})
                    </h3>
                    {leads.length === 0 && (
                      <div className="text-sm text-neutral-500 italic">No leads linked. Add one manually.</div>
                    )}
                    {leads.map((l) => (
                      <div key={l.id} className="p-3 rounded-lg bg-neutral-950 border border-neutral-800 flex items-center justify-between">
                        <div>
                          <div className="text-sm font-medium text-neutral-200">{l.full_name}</div>
                          <div className="text-xs text-neutral-500">{l.relation || "unknown relation"} · {l.email || "no email"} · {l.phone || "no phone"}</div>
                          <div className="text-xs text-neutral-500">{l.city}, {l.state} · Confidence {(l.confidence * 100).toFixed(0)}%</div>
                        </div>
                        <Badge className={l.verified ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-[10px]" : "bg-neutral-500/10 text-neutral-400 border-neutral-500/20 text-[10px]"}>
                          {l.verified ? "Verified" : "Unverified"}
                        </Badge>
                      </div>
                    ))}
                    <AddLeadForm assetId={a.id} onCreated={() => loadLeads(a.id)} />
                  </div>

                  <div className="space-y-3">
                    <h3 className="text-xs uppercase tracking-wide text-neutral-500">Claim Pipeline Actions</h3>
                    <div className="p-4 rounded-lg bg-neutral-950 border border-neutral-800 space-y-2">
                      <Button size="sm" className="w-full bg-orange-600 hover:bg-orange-700 text-white">
                        <DollarSign className="w-4 h-4 mr-2" /> Create Claim Contract
                      </Button>
                      <p className="text-xs text-neutral-500">Auto-generates state-specific finder agreement based on regulations for {a.state}.</p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
        {assets.length === 0 && !loading && (
          <div className="text-center py-12 text-neutral-500 border border-dashed border-neutral-700 rounded-xl">
            No assets yet. Run a search to populate the database.
          </div>
        )}
      </div>
    </div>
  );
}

function AddLeadForm({ assetId, onCreated }: { assetId: number; onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [relation, setRelation] = useState("owner");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!name.trim()) return;
    setBusy(true);
    await fetch("/api/leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ asset_id: assetId, full_name: name, relation, email, phone, source: "manual", confidence: 0.8 }),
    });
    setBusy(false);
    setOpen(false);
    setName(""); setEmail(""); setPhone("");
    onCreated();
  };

  if (!open) return (
    <Button size="sm" variant="outline" onClick={() => setOpen(true)} className="border-neutral-700 text-neutral-300 hover:bg-neutral-800">
      <UserPlus className="w-4 h-4 mr-2" /> Add Lead
    </Button>
  );

  return (
    <div className="grid grid-cols-2 gap-2 p-3 rounded-lg bg-neutral-950 border border-neutral-800">
      <input className="col-span-2 rounded border border-neutral-700 bg-neutral-900 px-3 py-1.5 text-sm text-neutral-100" placeholder="Full name" value={name} onChange={(e) => setName(e.target.value)} />
      <select className="rounded border border-neutral-700 bg-neutral-900 px-3 py-1.5 text-sm text-neutral-100" value={relation} onChange={(e) => setRelation(e.target.value)}>
        <option value="owner">Owner</option>
        <option value="spouse">Spouse</option>
        <option value="child">Child</option>
        <option value="sibling">Sibling</option>
        <option value="heir">Heir</option>
        <option value="executor">Executor</option>
      </select>
      <input className="rounded border border-neutral-700 bg-neutral-900 px-3 py-1.5 text-sm text-neutral-100" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
      <input className="col-span-2 rounded border border-neutral-700 bg-neutral-900 px-3 py-1.5 text-sm text-neutral-100" placeholder="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
      <div className="col-span-2 flex gap-2">
        <Button size="sm" onClick={submit} disabled={busy} className="bg-orange-600 hover:bg-orange-700 text-white">{busy ? "Saving..." : "Save Lead"}</Button>
        <Button size="sm" variant="ghost" onClick={() => setOpen(false)} className="text-neutral-400">Cancel</Button>
      </div>
    </div>
  );
}
