import { useState } from "react";
import { AlertTriangle, CheckCircle, Clock, ExternalLink, Radar, Search, ShieldAlert, UserSearch, Users } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Alert, AlertDescription, AlertTitle } from "./ui/alert";

type TraceStatus = "verified" | "not_found" | "blocked" | "provider_required" | "error";
type TraceKind = "username" | "person";

interface TraceEvidence {
  sourceName: string;
  sourceUrl: string;
  status: TraceStatus;
  checkedAt: string;
  matchBasis: string;
  confidence: number;
  details?: string;
}

interface TraceLead {
  id: string;
  label: string;
  type: "profile" | "owner" | "relative" | "business_officer" | "registered_agent" | "manual_review";
  confidence: number;
  status: TraceStatus;
  evidence: TraceEvidence[];
  nextAction: string;
}

interface TraceResult {
  kind: TraceKind;
  target: string;
  generatedAt: string;
  leads: TraceLead[];
  message: string;
}

const statusTone: Record<TraceStatus, string> = {
  verified: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  not_found: "bg-neutral-500/15 text-neutral-300 border-neutral-500/30",
  blocked: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  provider_required: "bg-sky-500/15 text-sky-300 border-sky-500/30",
  error: "bg-rose-500/15 text-rose-300 border-rose-500/30",
};

function statusLabel(status: TraceStatus) {
  return status.replace(/_/g, " ");
}

function formatCheckedAt(value: string) {
  return new Date(value).toLocaleString();
}

function statusIcon(status: TraceStatus) {
  if (status === "verified") return <CheckCircle className="w-4 h-4" />;
  if (status === "provider_required") return <UserSearch className="w-4 h-4" />;
  if (status === "blocked") return <ShieldAlert className="w-4 h-4" />;
  return <AlertTriangle className="w-4 h-4" />;
}

export function TraceConsole() {
  const [target, setTarget] = useState("");
  const [traceType, setTraceType] = useState<TraceKind>("username");
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<TraceResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const runTrace = async () => {
    if (!target.trim()) return;

    setIsRunning(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch(`/api/trace/${traceType}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Trace failed.");
      setResult(data);
    } catch (err: any) {
      setError(err.message || "Trace failed.");
    } finally {
      setIsRunning(false);
    }
  };

  const verifiedCount = result?.leads.filter((lead) => lead.status === "verified").length || 0;
  const reviewCount = result?.leads.filter((lead) => lead.status === "blocked" || lead.status === "provider_required").length || 0;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      <div className="lg:col-span-4 space-y-6">
        <Card className="border-neutral-800 bg-neutral-900/50 backdrop-blur-md">
          <CardHeader>
            <CardTitle className="text-xl flex items-center">
              <Radar className="w-5 h-5 mr-2 text-orange-400" />
              Validated Trace
            </CardTitle>
            <CardDescription>
              Evidence-first checks for owner research. No generated relatives, phones, DOBs, or profiles.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-1 rounded-md border border-neutral-800 bg-neutral-950 p-1">
              <button
                onClick={() => setTraceType("username")}
                className={`rounded px-3 py-2 text-sm transition-colors ${traceType === "username" ? "bg-orange-500/15 text-orange-300" : "text-neutral-400 hover:text-neutral-200"}`}
              >
                <Search className="w-4 h-4 inline mr-1.5" />
                Username
              </button>
              <button
                onClick={() => setTraceType("person")}
                className={`rounded px-3 py-2 text-sm transition-colors ${traceType === "person" ? "bg-orange-500/15 text-orange-300" : "text-neutral-400 hover:text-neutral-200"}`}
              >
                <Users className="w-4 h-4 inline mr-1.5" />
                Person
              </button>
            </div>

            <Input
              placeholder={traceType === "username" ? "username or @handle" : "First Last"}
              value={target}
              onChange={(event) => setTarget(event.target.value)}
              onKeyDown={(event) => event.key === "Enter" && !isRunning && runTrace()}
              className="bg-black border-neutral-800 font-mono text-sm"
            />

            <Button
              className="w-full bg-neutral-100 text-black hover:bg-neutral-300"
              onClick={runTrace}
              disabled={isRunning || !target.trim()}
            >
              {isRunning ? "Checking sources..." : "Run Validated Trace"}
            </Button>
          </CardContent>
        </Card>

        <Alert className="border-sky-500/30 bg-sky-500/10 text-sky-100">
          <ShieldAlert className="h-4 w-4" />
          <AlertTitle>Validation Rule</AlertTitle>
          <AlertDescription>
            Contact data appears only when backed by a named source or connected provider. Provider-required means the app refused to guess.
          </AlertDescription>
        </Alert>
      </div>

      <div className="lg:col-span-8 space-y-6">
        {error && (
          <Alert className="border-rose-500/30 bg-rose-500/10 text-rose-100">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Trace Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {!result && !error && (
          <Card className="border-neutral-800 bg-neutral-900/40 backdrop-blur-md min-h-[420px] flex items-center justify-center">
            <CardContent className="text-center max-w-md">
              <Radar className="w-10 h-10 mx-auto mb-4 text-neutral-500" />
              <div className="text-lg font-semibold text-neutral-200">Ready for evidence checks</div>
              <p className="text-sm text-neutral-500 mt-2">
                Username mode verifies public profile URLs. Person mode is ready for a real skip-trace provider and currently returns a provider-required audit record.
              </p>
            </CardContent>
          </Card>
        )}

        {result && (
          <>
            <Card className="border-neutral-800 bg-neutral-900/50 backdrop-blur-md">
              <CardHeader className="pb-3">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <CardTitle className="text-lg">{result.target}</CardTitle>
                    <CardDescription>{result.message}</CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Badge className="bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">{verifiedCount} verified</Badge>
                    <Badge className="bg-amber-500/15 text-amber-300 border border-amber-500/30">{reviewCount} review</Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="flex items-center text-xs text-neutral-500">
                <Clock className="w-3.5 h-3.5 mr-1.5" />
                Generated {formatCheckedAt(result.generatedAt)}
              </CardContent>
            </Card>

            <div className="space-y-4">
              {result.leads.map((lead) => (
                <Card key={lead.id} className="border-neutral-800 bg-black/60">
                  <CardHeader className="pb-3">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <CardTitle className="text-base flex items-center gap-2">
                          {statusIcon(lead.status)}
                          {lead.label}
                        </CardTitle>
                        <CardDescription className="capitalize">{lead.type.replace(/_/g, " ")}</CardDescription>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={`border ${statusTone[lead.status]}`}>{statusLabel(lead.status)}</Badge>
                        <Badge variant="outline" className="border-neutral-700 text-neutral-300">{lead.confidence}%</Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {lead.evidence.map((evidence) => (
                      <div key={`${lead.id}-${evidence.sourceName}`} className="rounded-lg border border-neutral-800 bg-neutral-950 p-4">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                          <div className="font-medium text-neutral-200">{evidence.sourceName}</div>
                          <div className="text-xs text-neutral-500">{formatCheckedAt(evidence.checkedAt)}</div>
                        </div>
                        <p className="mt-2 text-sm text-neutral-400">{evidence.matchBasis}</p>
                        {evidence.details && <p className="mt-1 text-xs text-neutral-600">{evidence.details}</p>}
                        {evidence.sourceUrl !== "provider-not-connected" && (
                          <a
                            href={evidence.sourceUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="mt-3 inline-flex items-center text-sm text-orange-300 hover:text-orange-200"
                          >
                            Open source <ExternalLink className="w-3.5 h-3.5 ml-1" />
                          </a>
                        )}
                      </div>
                    ))}
                    <div className="rounded-lg border border-neutral-800 bg-neutral-900/60 p-4 text-sm text-neutral-300">
                      <span className="text-neutral-500">Next action:</span> {lead.nextAction}
                    </div>
                  </CardContent>
                </Card>
              ))}

              {result.leads.length === 0 && (
                <Card className="border-neutral-800 bg-black/60">
                  <CardContent className="p-8 text-center text-neutral-400">
                    No trace leads passed the validation rules for this target.
                  </CardContent>
                </Card>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
