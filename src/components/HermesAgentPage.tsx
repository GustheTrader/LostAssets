import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Badge } from "../components/ui/badge";
import { Separator } from "../components/ui/separator";
import { Loader2, Send, Bot, User, Zap, Search, Users, Mail, Play, BarChart3, ChevronRight } from "lucide-react";

interface ChatMessage {
  role: "user" | "agent";
  text: string;
  log?: string[];
  action?: string;
  error?: string;
  timestamp: string;
}

const QUICK_COMMANDS = [
  { icon: Search, label: "Search John Smith CA", cmd: "search for john smith in ca limit 5" },
  { icon: Mail, label: "Create CA Campaign", cmd: "create campaign for CA email" },
  { icon: Users, label: "Add Lead", cmd: "add lead Robert Jones in TX" },
  { icon: Play, label: "Run Outreach", cmd: "run outreach" },
  { icon: BarChart3, label: "Show Status", cmd: "show status" },
];

export function HermesAgentPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "agent",
      text: "I am Hermes, the LostAssets orchestrator.\n\nI can:\n  • Search state registries for unclaimed property\n  • Create outreach campaigns from results\n  • Add leads and queue messages\n  • Execute pending outreach (email / call)\n  • Show live stats\n\nType a command or click a shortcut below.",
      timestamp: new Date().toLocaleTimeString(),
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const sendCommand = async (text: string) => {
    if (!text.trim()) return;
    setInput("");
    setLoading(true);

    const userMsg: ChatMessage = {
      role: "user",
      text,
      timestamp: new Date().toLocaleTimeString(),
    };
    setMessages((prev) => [...prev, userMsg]);

    try {
      const res = await fetch("/api/agent/command", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ command: text }),
      });
      const data = await res.json();

      const agentMsg: ChatMessage = {
        role: "agent",
        text: data.error
          ? `Error: ${data.error}`
          : formatResponse(data.action, data.result),
        log: data.log || [],
        action: data.action,
        error: data.error,
        timestamp: new Date().toLocaleTimeString(),
      };
      setMessages((prev) => [...prev, agentMsg]);
    } catch (e: any) {
      setMessages((prev) => [
        ...prev,
        { role: "agent", text: `Network error: ${e.message}`, timestamp: new Date().toLocaleTimeString() },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendCommand(input);
  };

  return (
    <div className="space-y-4 h-[calc(100vh-8rem)] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-light tracking-tight text-neutral-100 flex items-center gap-2">
          <Zap className="w-6 h-6 text-orange-500" />
          Hermes Agent
        </h2>
        <Badge variant="outline" className="font-mono text-xs text-neutral-400 border-neutral-800">
          Natural-Language Orchestrator
        </Badge>
      </div>

      {/* Quick commands */}
      <div className="flex flex-wrap gap-2">
        {QUICK_COMMANDS.map((q) => (
          <Button
            key={q.label}
            variant="outline"
            size="sm"
            onClick={() => sendCommand(q.cmd)}
            className="border-neutral-700 text-neutral-300 hover:bg-orange-500/10 hover:text-orange-400 hover:border-orange-500/30"
          >
            <q.icon className="w-3.5 h-3.5 mr-1.5" />
            {q.label}
          </Button>
        ))}
      </div>

      {/* Chat log */}
      <Card className="flex-1 border-neutral-800 bg-neutral-900/40 overflow-hidden flex flex-col">
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((m, i) => (
            <div key={i} className={`flex gap-3 ${m.role === "user" ? "flex-row-reverse" : ""}`}>
              <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${m.role === "user" ? "bg-orange-600 text-white" : "bg-indigo-600 text-white"}`}>
                {m.role === "user" ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
              </div>
              <div className={`max-w-[80%] rounded-lg px-3 py-2 text-sm whitespace-pre-line ${m.role === "user" ? "bg-orange-500/10 text-orange-200 border border-orange-500/20" : "bg-neutral-800 text-neutral-200 border border-neutral-700"}`}>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] font-mono uppercase opacity-50">{m.role}</span>
                  <span className="text-[10px] font-mono opacity-40">{m.timestamp}</span>
                </div>
                {m.text}
                {m.log && m.log.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-neutral-700/50 space-y-1">
                    {m.log.map((l, j) => (
                      <div key={j} className="text-[11px] font-mono text-neutral-400 flex items-start gap-1">
                        <ChevronRight className="w-3 h-3 mt-0.5 text-orange-500 shrink-0" />
                        {l}
                      </div>
                    ))}
                  </div>
                )}
                {m.error && (
                  <div className="mt-2 text-[11px] text-red-400 font-mono">{m.error}</div>
                )}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex gap-3">
              <div className="w-7 h-7 rounded-full bg-indigo-600 text-white flex items-center justify-center shrink-0">
                <Bot className="w-4 h-4" />
              </div>
              <div className="bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-orange-500" />
                <span className="text-sm text-neutral-400">Hermes is thinking...</span>
              </div>
            </div>
          )}
        </div>

        <Separator className="bg-neutral-800" />

        {/* Input */}
        <form onSubmit={handleSubmit} className="p-3 flex gap-2">
          <Input
            placeholder="Command Hermes: search, campaign, lead, run, status..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="flex-1 bg-neutral-950 border-neutral-700 text-neutral-200 placeholder:text-neutral-500 font-mono text-sm"
          />
          <Button type="submit" disabled={loading} className="bg-orange-600 hover:bg-orange-700 text-white">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </Button>
        </form>
      </Card>
    </div>
  );
}

function formatResponse(action: string, result: any): string {
  switch (action) {
    case "search":
      return `Found ${result.count} unclaimed assets.\nTop record: ${result.records[0]?.ownerName} — ${result.records[0]?.propertyType || "property"} ($${result.records[0]?.amount || 0}) in ${result.records[0]?.state || ""}.`;
    case "campaign_created":
      return `Campaign #${result.campaign.id} created (${result.campaign.type}).\nQueued ${result.queued} outreach messages. Skipped ${result.skipped} (missing email/phone).`;
    case "lead_created":
      return `Lead #${result.leadId} created successfully.`;
    case "execute":
      return `Outreach executed.\nSent: ${result.sent}\nFailed: ${result.failed}`;
    case "status":
      return `Dashboard Status:\n  Assets: ${result.stats.assets}\n  Leads: ${result.stats.leads}\n  Campaigns: ${result.stats.campaigns}\n  Pending Outreach: ${result.stats.outreachPending}\n  Sent Outreach: ${result.stats.outreachSent}`;
    case "unknown":
      return result.message;
    default:
      return JSON.stringify(result, null, 2);
  }
}
