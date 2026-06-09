import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Separator } from "../components/ui/separator";
import { AlertCircle, BookOpen, ExternalLink, FileText, Shield } from "lucide-react";

interface Regulation {
  id: number;
  state: string;
  state_name: string;
  claim_form_url: string | null;
  required_documents: string | null;
  notarization_required: number;
  heirship_affidavit_required: number;
  probate_required_threshold: number;
  finder_fee_cap: number | null;
  finder_contract_required: number;
  contract_must_be_notarized: number;
  cooling_off_days: number;
  legal_reference: string | null;
  notes: string | null;
}

export function RegulationsPage() {
  const [regs, setRegs] = useState<Regulation[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "notary" | "probate" | "finder_fee">("all");
  const [selected, setSelected] = useState<Regulation | null>(null);

  useEffect(() => {
    fetch(`/api/regulations${filter !== "all" ? `?filter=${filter}` : ""}`)
      .then((r) => r.json())
      .then((d) => { setRegs(Array.isArray(d) ? d : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [filter]);

  if (loading) return <div className="p-6 text-neutral-400">Loading regulations...</div>;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      <div className="lg:col-span-4 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-neutral-100 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-orange-500" />
            State Regulations
          </h2>
          <Badge variant="outline" className="text-xs border-neutral-700 text-neutral-400">
            {regs.length} states
          </Badge>
        </div>
        <div className="flex flex-wrap gap-2">
          {(["all","notary","probate","finder_fee"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                filter === f
                  ? "bg-orange-500/20 border-orange-500/50 text-orange-400"
                  : "border-neutral-700 text-neutral-400 hover:bg-neutral-900"
              }`}
            >
              {f === "all" ? "All" : f === "notary" ? "Notary Required" : f === "probate" ? "Probate Threshold" : "Finder Fee Cap"}
            </button>
          ))}
        </div>
        <div className="space-y-2 max-h-[70vh] overflow-y-auto pr-1">
          {regs.map((r) => (
            <button
              key={r.state}
              onClick={() => setSelected(r)}
              className={`w-full text-left p-3 rounded-lg border transition-colors ${
                selected?.state === r.state
                  ? "bg-orange-500/10 border-orange-500/30"
                  : "bg-neutral-900 border-neutral-800 hover:border-neutral-700"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-semibold text-sm text-neutral-100">{r.state_name}</span>
                <span className="text-xs font-mono text-neutral-500">{r.state}</span>
              </div>
              <div className="flex flex-wrap gap-1 mt-2">
                {r.notarization_required === 1 && <Badge className="bg-red-500/10 text-red-400 border-red-500/20 text-[10px]">Notary</Badge>}
                {r.heirship_affidavit_required === 1 && <Badge className="bg-amber-500/10 text-amber-400 border-amber-500/20 text-[10px]">Heirship</Badge>}
                {r.probate_required_threshold > 0 && <Badge className="bg-blue-500/10 text-blue-400 border-blue-500/20 text-[10px]">Probate &gt;${r.probate_required_threshold.toLocaleString()}</Badge>}
                {r.finder_fee_cap !== null && <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-[10px]">Fee Cap {r.finder_fee_cap}%</Badge>}
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="lg:col-span-8">
        {selected ? (
          <Card className="border-neutral-800 bg-neutral-900">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-xl text-neutral-100 flex items-center gap-2">
                  <Shield className="w-5 h-5 text-orange-500" />
                  {selected.state_name} ({selected.state})
                </CardTitle>
                {selected.claim_form_url && (
                  <a href={selected.claim_form_url} target="_blank" rel="noreferrer" className="text-xs text-orange-400 hover:underline flex items-center gap-1">
                    <ExternalLink className="w-3 h-3" /> Official Form
                  </a>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-lg bg-neutral-950 border border-neutral-800">
                  <h3 className="text-xs uppercase tracking-wide text-neutral-500 mb-3 flex items-center gap-2">
                    <FileText className="w-4 h-4" /> Required Documents
                  </h3>
                  {selected.required_documents ? (
                    <ul className="space-y-2">
                      {JSON.parse(selected.required_documents).map((doc: string, i: number) => (
                        <li key={i} className="text-sm text-neutral-300 flex items-start gap-2">
                          <span className="text-orange-500 mt-1">•</span> {doc}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-neutral-500">No specific document list on file.</p>
                  )}
                </div>

                <div className="p-4 rounded-lg bg-neutral-950 border border-neutral-800 space-y-3">
                  <h3 className="text-xs uppercase tracking-wide text-neutral-500 mb-2 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" /> Legal Requirements
                  </h3>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-neutral-400">Notarization</span>
                    <Badge className={selected.notarization_required ? "bg-red-500/10 text-red-400 border-red-500/20" : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"}>
                      {selected.notarization_required ? "Required" : "Not Required"}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-neutral-400">Heirship Affidavit</span>
                    <Badge className={selected.heirship_affidavit_required ? "bg-amber-500/10 text-amber-400 border-amber-500/20" : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"}>
                      {selected.heirship_affidavit_required ? "Required" : "Not Required"}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-neutral-400">Probate Threshold</span>
                    <span className="text-neutral-200 font-mono">{selected.probate_required_threshold > 0 ? `$${selected.probate_required_threshold.toLocaleString()}` : "None"}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-neutral-400">Finder Contract</span>
                    <Badge className={selected.finder_contract_required ? "bg-red-500/10 text-red-400 border-red-500/20" : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"}>
                      {selected.finder_contract_required ? "Required" : "Not Required"}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-neutral-400">Contract Notarized</span>
                    <Badge className={selected.contract_must_be_notarized ? "bg-red-500/10 text-red-400 border-red-500/20" : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"}>
                      {selected.contract_must_be_notarized ? "Required" : "Not Required"}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-neutral-400">Cooling-Off Period</span>
                    <span className="text-neutral-200 font-mono">{selected.cooling_off_days > 0 ? `${selected.cooling_off_days} days` : "None"}</span>
                  </div>
                  {selected.finder_fee_cap !== null && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-neutral-400">Finder Fee Cap</span>
                      <span className="text-emerald-400 font-mono">{selected.finder_fee_cap}%</span>
                    </div>
                  )}
                </div>
              </div>

              <Separator className="bg-neutral-800" />

              <div>
                <h3 className="text-xs uppercase tracking-wide text-neutral-500 mb-2">Legal Reference</h3>
                <p className="text-sm text-neutral-300 font-mono bg-neutral-950 p-3 rounded-lg border border-neutral-800">
                  {selected.legal_reference || "No legal reference on file."}
                </p>
              </div>

              {selected.notes && (
                <div>
                  <h3 className="text-xs uppercase tracking-wide text-neutral-500 mb-2">Notes</h3>
                  <p className="text-sm text-neutral-400">{selected.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="flex items-center justify-center h-64 text-neutral-500 text-sm">
            Select a state to view its regulations.
          </div>
        )}
      </div>
    </div>
  );
}
