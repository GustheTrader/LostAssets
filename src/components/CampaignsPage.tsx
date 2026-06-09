import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Separator } from "../components/ui/separator";
import { Alert, AlertDescription } from "../components/ui/alert";
import { Play, Pause, Plus, Trash2, BarChart3, Mail, Phone, Layers, Loader2, RefreshCw, CheckCircle, XCircle, Clock } from "lucide-react";

interface Campaign {
  id: number;
  name: string;
  status: "draft" | "running" | "paused" | "completed" | "failed";
  type: "email" | "call" | "mixed";
  target_filter: string;
  schedule_cron: string | null;
  client_id: string | null;
  next_run_at: string | null;
  created_at: string;
  updated_at: string;
}

interface OutreachStats {
  total: number;
  sent: number;
  delivered: number;
  opened: number;
  replied: number;
  bounced: number;
  failed: number;
  pending: number;
}

export function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [stats, setStats] = useState<Record<number, OutreachStats>>({});
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<number | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  // Expanded files management state
  const [expandedCampaignId, setExpandedCampaignId] = useState<number | null>(null);
  const [campaignOutreach, setCampaignOutreach] = useState<any[]>([]);
  const [outreachLoading, setOutreachLoading] = useState(false);

  // Form state
  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState<"email" | "call" | "mixed">("email");
  const [newFilter, setNewFilter] = useState('{"states":[],"minConfidence":0.5,"verifiedOnly":false}');
  const [newClientId, setNewClientId] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/campaigns");
      const data = await res.json();
      setCampaigns(Array.isArray(data) ? data : []);

      // Load stats for each
      const statMap: Record<number, OutreachStats> = {};
      for (const c of data) {
        try {
          const s = await fetch(`/api/campaigns/${c.id}/stats`).then((r) => r.json());
          statMap[c.id] = s;
        } catch {}
      }
      setStats(statMap);
    } catch {
      setMessage({ text: "Failed to load campaigns", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const loadCampaignOutreach = async (campaignId: number) => {
    setOutreachLoading(true);
    try {
      const res = await fetch(`/api/campaigns/${campaignId}/outreach-details`);
      if (!res.ok) throw new Error("Failed to load outreach details");
      const data = await res.json();
      setCampaignOutreach(data || []);
    } catch (err: any) {
      setMessage({ text: `Error loading campaign files: ${err.message}`, type: "error" });
    } finally {
      setOutreachLoading(false);
    }
  };

  const toggleExpandCampaign = (campaignId: number) => {
    if (expandedCampaignId === campaignId) {
      setExpandedCampaignId(null);
      setCampaignOutreach([]);
    } else {
      setExpandedCampaignId(campaignId);
      loadCampaignOutreach(campaignId);
    }
  };

  const handleUpdateOutreachRow = async (row: any, notes: string, outreachStatus: string, claimStatus: string) => {
    try {
      if (row.lead_id) {
        const leadRes = await fetch(`/api/leads/${row.lead_id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ notes }),
        });
        if (!leadRes.ok) throw new Error("Failed to update lead notes");
      }
      
      if (row.asset_id) {
        const assetRes = await fetch(`/api/assets/${row.asset_id}/status`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: claimStatus }),
        });
        if (!assetRes.ok) throw new Error("Failed to update asset status");
      }

      const outreachRes = await fetch(`/api/outreach/${row.outreach_id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: outreachStatus }),
      });
      if (!outreachRes.ok) throw new Error("Failed to update outreach status");

      setMessage({ text: "File details and stage processed successfully!", type: "success" });
      loadCampaignOutreach(expandedCampaignId!);
      load();
    } catch (err: any) {
      setMessage({ text: `Update failed: ${err.message}`, type: "error" });
    }
  };

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setActionId(-1);
    try {
      const res = await fetch("/api/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          name: newName, 
          type: newType, 
          target_filter: JSON.parse(newFilter), 
          schedule_cron: "0 9 * * 1-5",
          client_id: newClientId.trim() || undefined 
        }),
      });
      if (!res.ok) throw new Error("Create failed");
      setCreateOpen(false);
      setNewName("");
      setNewClientId("");
      setMessage({ text: "Campaign created", type: "success" });
      load();
    } catch (e: any) {
      setMessage({ text: e.message, type: "error" });
    } finally {
      setActionId(null);
    }
  };

  const handleStatus = async (id: number, status: string) => {
    setActionId(id);
    try {
      const res = await fetch(`/api/campaigns/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error("Update failed");
      setMessage({ text: `Campaign ${status}`, type: "success" });
      load();
    } catch (e: any) {
      setMessage({ text: e.message, type: "error" });
    } finally {
      setActionId(null);
    }
  };

  const handleQueue = async (id: number) => {
    setActionId(id);
    try {
      const res = await fetch(`/api/campaigns/${id}/queue`, { method: "POST" });
      const data = await res.json();
      setMessage({ text: `Queued ${data.queued} outreach messages`, type: "success" });
      load();
      if (expandedCampaignId === id) {
        loadCampaignOutreach(id);
      }
    } catch (e: any) {
      setMessage({ text: e.message, type: "error" });
    } finally {
      setActionId(null);
    }
  };

  const handleRun = async (id: number) => {
    setActionId(id);
    try {
      const res = await fetch(`/api/campaigns/${id}/run`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ limit: 20 }) });
      const data = await res.json();
      setMessage({ text: `Sent ${data.sent}, failed ${data.failed}`, type: "success" });
      load();
      if (expandedCampaignId === id) {
        loadCampaignOutreach(id);
      }
    } catch (e: any) {
      setMessage({ text: e.message, type: "error" });
    } finally {
      setActionId(null);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete campaign and all outreach?")) return;
    setActionId(id);
    try {
      await fetch(`/api/campaigns/${id}`, { method: "DELETE" });
      setMessage({ text: "Campaign deleted", type: "success" });
      if (expandedCampaignId === id) {
        setExpandedCampaignId(null);
        setCampaignOutreach([]);
      }
      load();
    } catch (e: any) {
      setMessage({ text: e.message, type: "error" });
    } finally {
      setActionId(null);
    }
  };

  const statusBadge = (status: string) => {
    const map: Record<string, string> = {
      draft: "bg-neutral-500/10 text-neutral-400 border-neutral-500/20",
      running: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
      paused: "bg-amber-500/10 text-amber-400 border-amber-500/20",
      completed: "bg-blue-500/10 text-blue-400 border-blue-500/20",
      failed: "bg-red-500/10 text-red-400 border-red-500/20",
    };
    return <Badge className={map[status] || map.draft}>{status.toUpperCase()}</Badge>;
  };

  if (loading && campaigns.length === 0) return <div className="p-6 text-neutral-400">Loading campaigns...</div>;

  return (
    <div className="space-y-6 text-left">
      {message && (
        <Alert className={message.type === "error" ? "border-red-500/30 bg-red-500/5" : "border-emerald-500/30 bg-emerald-500/5"}>
          <AlertDescription className={message.type === "error" ? "text-red-400" : "text-emerald-400"}>{message.text}</AlertDescription>
        </Alert>
      )}

      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-neutral-100 flex items-center gap-2">
          <Mail className="w-5 h-5 text-orange-500" />
          Outreach Campaigns
        </h2>
        <Button onClick={() => setCreateOpen(true)} className="bg-orange-600 hover:bg-orange-700 text-white">
          <Plus className="w-4 h-4 mr-1" /> New Campaign
        </Button>
      </div>

      {createOpen && (
        <Card className="border-neutral-800 bg-neutral-900">
          <CardHeader>
            <CardTitle className="text-sm text-neutral-100">Create Campaign</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="text-xs text-neutral-500">Name</label>
                <input className="mt-1 w-full rounded-md border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm text-neutral-100" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="e.g. CA High-Value Email Blast" />
              </div>
              <div>
                <label className="text-xs text-neutral-500">Type</label>
                <select className="mt-1 w-full rounded-md border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm text-neutral-100" value={newType} onChange={(e) => setNewType(e.target.value as any)}>
                  <option value="email">Email</option>
                  <option value="call">Call</option>
                  <option value="mixed">Mixed</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-neutral-500">Target Filter (JSON)</label>
                <input className="mt-1 w-full rounded-md border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm text-neutral-100 font-mono" value={newFilter} onChange={(e) => setNewFilter(e.target.value)} />
              </div>
              <div>
                <label className="text-xs text-neutral-500">Client ID Number</label>
                <input className="mt-1 w-full rounded-md border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm text-neutral-100 font-mono" value={newClientId} onChange={(e) => setNewClientId(e.target.value)} placeholder="e.g. CL-8849" />
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleCreate} disabled={actionId === -1} className="bg-emerald-600 hover:bg-emerald-700 text-white">{actionId === -1 ? <Loader2 className="w-4 h-4 animate-spin" /> : "Create"}</Button>
              <Button variant="ghost" onClick={() => { setCreateOpen(false); setNewClientId(""); }} className="text-neutral-400">Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-4">
        {campaigns.map((c) => {
          const s = stats[c.id] || { total:0, sent:0, delivered:0, opened:0, replied:0, bounced:0, failed:0, pending:0 };
          const busy = actionId === c.id;
          return (
            <Card key={c.id} className="border-neutral-800 bg-neutral-900">
              <CardContent className="p-5">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-3">
                      <span className="font-semibold text-neutral-100">{c.name}</span>
                      {statusBadge(c.status)}
                      {c.client_id && (
                        <Badge variant="outline" className="border-orange-500/30 text-orange-400 bg-orange-500/5 text-[10px]">
                          Client ID: #{c.client_id}
                        </Badge>
                      )}
                      <Badge variant="outline" className="border-neutral-700 text-neutral-400 text-[10px]">
                        {c.type === "email" && <Mail className="w-3 h-3 mr-1 inline" />}
                        {c.type === "call" && <Phone className="w-3 h-3 mr-1 inline" />}
                        {c.type === "mixed" && <Layers className="w-3 h-3 mr-1 inline" />}
                        {c.type}
                      </Badge>
                    </div>
                    <div className="text-xs text-neutral-500 font-mono">Filter: {c.target_filter}</div>
                    <div className="text-xs text-neutral-500">Created {new Date(c.created_at).toLocaleDateString()}</div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {c.status === "draft" && (
                      <Button size="sm" onClick={() => handleStatus(c.id, "running")} disabled={busy} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                        <Play className="w-4 h-4 mr-1" /> Start
                      </Button>
                    )}
                    {c.status === "running" && (
                      <Button size="sm" onClick={() => handleStatus(c.id, "paused")} disabled={busy} className="bg-amber-600 hover:bg-amber-700 text-white">
                        <Pause className="w-4 h-4 mr-1" /> Pause
                      </Button>
                    )}
                    {c.status === "paused" && (
                      <Button size="sm" onClick={() => handleStatus(c.id, "running")} disabled={busy} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                        <Play className="w-4 h-4 mr-1" /> Resume
                      </Button>
                    )}
                    <Button size="sm" variant="outline" onClick={() => handleQueue(c.id)} disabled={busy} className="border-neutral-700 text-neutral-300 hover:bg-neutral-800">
                      <RefreshCw className="w-4 h-4 mr-1" /> Queue
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => handleRun(c.id)} disabled={busy} className="border-neutral-700 text-neutral-300 hover:bg-neutral-800">
                      <Mail className="w-4 h-4 mr-1" /> Send Now
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => toggleExpandCampaign(c.id)}
                      disabled={busy}
                      className={`border-neutral-700 text-neutral-300 hover:bg-neutral-800 flex items-center gap-1 ${expandedCampaignId === c.id ? "bg-orange-500/10 border-orange-500/30 text-orange-400" : ""}`}
                    >
                      <Layers className="w-4 h-4" /> Files
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => handleDelete(c.id)} disabled={busy} className="text-red-400 hover:bg-red-500/10">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                <Separator className="my-4 bg-neutral-800" />

                <div className="grid grid-cols-2 md:grid-cols-7 gap-3 mb-2">
                  {[
                    { label: "Total", value: s.total, icon: BarChart3 },
                    { label: "Pending", value: s.pending, icon: Clock },
                    { label: "Sent", value: s.sent, icon: Mail },
                    { label: "Delivered", value: s.delivered, icon: CheckCircle },
                    { label: "Opened", value: s.opened, icon: CheckCircle },
                    { label: "Replied", value: s.replied, icon: CheckCircle },
                    { label: "Failed", value: s.failed, icon: XCircle },
                  ].map((stat) => (
                    <div key={stat.label} className="text-center p-2 rounded-lg bg-neutral-950 border border-neutral-800">
                      <div className="text-xs text-neutral-500 flex items-center justify-center gap-1">
                        <stat.icon className="w-3 h-3" /> {stat.label}
                      </div>
                      <div className="text-lg font-semibold text-neutral-100">{stat.value || 0}</div>
                    </div>
                  ))}
                </div>

                {expandedCampaignId === c.id && (
                  <>
                    <Separator className="my-4 bg-neutral-800" />
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-semibold uppercase tracking-wider text-neutral-400 flex items-center gap-2">
                          <Layers className="w-4.5 h-4.5 text-orange-500" />
                          Campaign Files ({campaignOutreach.length})
                        </h4>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => loadCampaignOutreach(c.id)}
                          className="h-7 px-2 text-[10px] text-neutral-400 hover:text-neutral-200 flex items-center gap-1"
                        >
                          <RefreshCw className="w-3 h-3" /> Refresh Files
                        </Button>
                      </div>

                      {outreachLoading ? (
                        <div className="flex items-center justify-center py-12 text-sm text-neutral-500">
                          <Loader2 className="w-5 h-5 animate-spin text-orange-500 mr-2" />
                          Loading campaign files...
                        </div>
                      ) : campaignOutreach.length === 0 ? (
                        <div className="text-center py-8 text-xs text-neutral-500 italic">
                          No outreach files/leads queued for this campaign. Click "Queue" to load leads.
                        </div>
                      ) : (
                        <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1 custom-scrollbar">
                          {campaignOutreach.map((row) => (
                            <OutreachRowItem
                              key={row.outreach_id}
                              row={row}
                              onSave={async (notes, outreachStatus, claimStatus) => {
                                await handleUpdateOutreachRow(row, notes, outreachStatus, claimStatus);
                              }}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          );
        })}
        {campaigns.length === 0 && (
          <div className="text-center py-12 text-neutral-500">No campaigns yet. Create one to start automated outreach.</div>
        )}
      </div>
    </div>
  );
}

interface OutreachRowItemProps {
  row: {
    outreach_id: number;
    channel: string;
    sequence_step: number;
    outreach_status: string;
    scheduled_at: string | null;
    sent_at: string | null;
    lead_id: number | null;
    lead_name: string;
    lead_relation: string | null;
    lead_email: string | null;
    lead_phone: string | null;
    lead_address: string | null;
    lead_notes: string | null;
    asset_id: number | null;
    asset_owner: string;
    asset_amount: number;
    asset_company: string | null;
    asset_type: string | null;
    asset_claim_status: string | null;
  };
  onSave: (notes: string, outreachStatus: string, claimStatus: string) => Promise<void>;
}

function OutreachRowItem({ row, onSave }: OutreachRowItemProps) {
  const [notes, setNotes] = useState(row.lead_notes || "");
  const [outreachStatus, setOutreachStatus] = useState(row.outreach_status);
  const [claimStatus, setClaimStatus] = useState(row.asset_claim_status || "unclaimed");
  const [saving, setSaving] = useState(false);

  const OUTREACH_STATUS_OPTIONS = ["pending", "queued", "sent", "delivered", "opened", "replied", "bounced", "failed", "skipped"];
  const CLAIM_STATUS_OPTIONS = ["unclaimed", "contacted", "in_progress", "claimed", "expired", "rejected"];

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(notes, outreachStatus, claimStatus);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-4 rounded-lg bg-neutral-950/80 border border-neutral-800/80 space-y-3 hover:border-neutral-700/80 transition-all text-left">
      {/* File Info Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-2 border-b border-neutral-900/60">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-semibold text-neutral-100 text-sm">{row.lead_name || "Unknown Lead"}</span>
            <Badge variant="outline" className="text-[10px] border-neutral-800 text-neutral-400 capitalize">
              {row.lead_relation || "Owner"}
            </Badge>
            <Badge className="text-[10px] bg-orange-500/10 text-orange-400 border border-orange-500/20 uppercase font-mono">
              Step {row.sequence_step} · {row.channel}
            </Badge>
          </div>
          <div className="text-xs text-neutral-500 mt-0.5 font-mono">
            {row.lead_email && <span className="mr-3">📧 {row.lead_email}</span>}
            {row.lead_phone && <span className="mr-3">📞 {row.lead_phone}</span>}
            {row.lead_address && <span>📍 {row.lead_address.split(",")[0]}</span>}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="text-[10px] uppercase tracking-wider text-neutral-500">Asset Amount</div>
            <div className="text-sm font-mono font-semibold text-emerald-400">
              ${row.asset_amount?.toLocaleString(undefined, { minimumFractionDigits: 2 }) || "0.00"}
            </div>
          </div>
        </div>
      </div>

      {/* Asset Context Summary */}
      <div className="text-xs text-neutral-400 bg-neutral-900/30 p-2 rounded border border-neutral-850 flex flex-wrap gap-x-6 gap-y-1">
        <div><span className="text-neutral-500 uppercase text-[10px] tracking-wide">Owner in Registry:</span> {row.asset_owner || "N/A"}</div>
        <div><span className="text-neutral-500 uppercase text-[10px] tracking-wide">Holder:</span> {row.asset_company || "Unknown"}</div>
        <div><span className="text-neutral-500 uppercase text-[10px] tracking-wide">Property Type:</span> {row.asset_type || "Unclaimed Funds"}</div>
      </div>

      {/* Inputs / Notes / Stage Selectors */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
        {/* Stage selectors */}
        <div className="space-y-3">
          <div className="space-y-1">
            <label className="text-[10px] uppercase tracking-wide text-neutral-500 font-semibold block">Outreach Stage/Status</label>
            <select
              value={outreachStatus}
              onChange={(e) => setOutreachStatus(e.target.value)}
              className="w-full text-xs rounded border border-neutral-800 bg-neutral-900 px-2 py-1.5 text-neutral-200 focus:ring-orange-500"
            >
              {OUTREACH_STATUS_OPTIONS.map((st) => (
                <option key={st} value={st}>{st.toUpperCase()}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] uppercase tracking-wide text-neutral-500 font-semibold block">Claim Process Stage</label>
            <select
              value={claimStatus}
              onChange={(e) => setClaimStatus(e.target.value)}
              className="w-full text-xs rounded border border-neutral-800 bg-neutral-900 px-2 py-1.5 text-neutral-200 focus:ring-orange-500"
            >
              {CLAIM_STATUS_OPTIONS.map((st) => (
                <option key={st} value={st}>{st.toUpperCase().replace("_", " ")}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Notes input */}
        <div className="md:col-span-2 space-y-1 flex flex-col justify-between">
          <div className="space-y-1 flex-1 flex flex-col">
            <label className="text-[10px] uppercase tracking-wide text-neutral-500 font-semibold block">File notes & log</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Enter notes about phone calls, correspondence, or claimant status..."
              className="w-full flex-1 min-h-[70px] text-xs rounded border border-neutral-800 bg-neutral-900 p-2 text-neutral-200 placeholder-neutral-600 focus:ring-orange-500 resize-none font-sans"
            />
          </div>
          
          <div className="flex justify-end pt-2">
            <Button
              size="sm"
              disabled={saving}
              onClick={handleSave}
              className="bg-orange-600 hover:bg-orange-700 text-white font-semibold text-[10px] h-7 px-3 flex items-center gap-1.5"
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Save Changes"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
