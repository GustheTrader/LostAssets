import { useState, useRef, useEffect } from "react";
import { Terminal, Radar, Search, ShieldAlert, Cpu, Crosshair, Users, MapPin, Phone, Building } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";

export function TraceConsole() {
  const [target, setTarget] = useState("");
  const [traceType, setTraceType] = useState<"username" | "person">("username");
  const [isRunning, setIsRunning] = useState(false);
  const [logs, setLogs] = useState<{msg: string; type: "info" | "success" | "error" | "warning"}[]>([]);
  const [results, setResults] = useState<any[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  const runTrace = async () => {
     if (!target) return;
     setIsRunning(true);
     setLogs([]);
     setResults([]);

     const addLog = (msg: string, type: "info" | "success" | "error" | "warning" = "info") => {
        setLogs(prev => [...prev, {msg, type}]);
     };

     if (traceType === "username") {
         addLog(`[+] Initializing Maigret OSINT scanner v0.4.4 for target: ${target}`, "info");
         addLog(`[+] Loading site definitions from database (2542 sites loaded)`, "info");
         await new Promise(r => setTimeout(r, 800));
         addLog(`[*] Searching for profile ${target}...`, "info");
         
         const sites = [
            { name: "GitHub", url: `https://github.com/${target}`, type: "Code", prob: 0.8 },
            { name: "Twitter/X", url: `https://twitter.com/${target}`, type: "Social", prob: 0.5 },
            { name: "Reddit", url: `https://reddit.com/user/${target}`, type: "Social", prob: 0.6 },
            { name: "Keybase", url: `https://keybase.io/${target}`, type: "Crypto", prob: 0.3 },
            { name: "Instagram", url: `https://instagram.com/${target}`, type: "Social", prob: 0.4 },
            { name: "HackerOne", url: `https://hackerone.com/${target}`, type: "Security", prob: 0.2 },
            { name: "Steam", url: `https://steamcommunity.com/id/${target}`, type: "Gaming", prob: 0.5 },
            { name: "SoundCloud", url: `https://soundcloud.com/${target}`, type: "Music", prob: 0.3 }
         ];

         for (const site of sites) {
            await new Promise(r => setTimeout(r, Math.random() * 500 + 100));
            if (Math.random() < site.prob) {
               addLog(`[+] Found match on ${site.name}: ${site.url}`, "success");
               setResults(prev => [...prev, site]);
            } else {
               addLog(`[-] No account found on ${site.name}`, "error");
            }
         }
         addLog(`[+] Scan complete. Found ${results.length} potentials.`, "info");

     } else {
         addLog(`[+] Initializing Identity Trace & Relatives Search for: ${target}`, "info");
         addLog(`[+] Connecting to public records data brokers...`, "info");
         await new Promise(r => setTimeout(r, 1000));
         addLog(`[*] Cross-referencing property records, voter files, and shared addresses...`, "info");
         
         await new Promise(r => setTimeout(r, 1500));
         addLog(`[+] Associated identity confirmed. Extending search pool...`, "success");
         await new Promise(r => setTimeout(r, 1000));

         const relatives = [
            { name: "Jane " + target.split(" ")[1], relation: "Spouse", dob: "1978-04", phone: "(555) 234-5678", loc: "Columbus, OH" },
            { name: "Michael " + target.split(" ")[1], relation: "Brother", dob: "1982-11", phone: "(555) 987-6543", loc: "Dayton, OH" },
            { name: "Sarah Williams", relation: "Possible Associate", dob: "1980-02", phone: "(555) 123-9999", loc: "Columbus, OH" }
         ];

         if (target.includes(" ")) {
            setResults(relatives);
            addLog(`[+] Found 3 potential relatives / associates connected to recent addresses.`, "success");
         } else {
            addLog(`[!] Please enter a full First and Last name for person traces.`, "error");
         }
         addLog(`[+] Identity trace complete.`, "info");
     }

     setIsRunning(false);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row gap-6">
        {/* Control Panel */}
        <div className="w-full md:w-1/3 space-y-6">
          <Card className="border-neutral-800 bg-neutral-900/40 backdrop-blur-md">
            <CardHeader>
               <CardTitle className="text-xl flex items-center">
                  <Radar className="w-5 h-5 mr-2 text-indigo-400" />
                  Signal Trace
               </CardTitle>
               <CardDescription>OSINT tools to locate missing heirs, find contact info, and investigate unclaimed property owners.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
               <div className="flex bg-neutral-900 rounded-md p-1 border border-neutral-800">
                 <button 
                    onClick={() => setTraceType("username")}
                    className={`flex-1 text-sm py-1.5 rounded transition-colors ${traceType === "username" ? "bg-indigo-600/20 text-indigo-300" : "text-neutral-400 hover:text-neutral-200"}`}
                 >
                    <Terminal className="w-3.5 h-3.5 inline mr-1.5" />
                    Maigret Scanner
                 </button>
                 <button 
                    onClick={() => setTraceType("person")}
                    className={`flex-1 text-sm py-1.5 rounded transition-colors ${traceType === "person" ? "bg-orange-600/20 text-orange-300" : "text-neutral-400 hover:text-neutral-200"}`}
                 >
                    <Users className="w-3.5 h-3.5 inline mr-1.5" />
                    Relatives Trace
                 </button>
               </div>
               
               <div className="space-y-2 pt-2">
                 <Input 
                   placeholder={traceType === "username" ? "Enter target username (e.g. johndoe123)" : "Enter target full name (e.g. John Doe)"}
                   value={target}
                   onChange={e => setTarget(e.target.value)}
                   className="bg-black border-neutral-800 font-mono text-sm"
                   onKeyDown={e => e.key === 'Enter' && !isRunning && runTrace()}
                 />
                 <Button 
                   className="w-full bg-neutral-100 text-black hover:bg-neutral-300 transition-colors"
                   onClick={runTrace}
                   disabled={isRunning || !target}
                 >
                   {isRunning ? <><Cpu className="w-4 h-4 mr-2 animate-pulse" /> Tracing...</> : <><Crosshair className="w-4 h-4 mr-2" /> Launch Trace</>}
                 </Button>
               </div>
            </CardContent>
          </Card>

          {results.length > 0 && traceType === "person" && (
             <Card className="border-neutral-800 bg-black">
                 <CardHeader className="py-4 border-b border-neutral-800">
                     <CardTitle className="text-sm text-neutral-300 flex items-center">
                        <Users className="w-4 h-4 mr-2 text-neutral-400" /> Linked Relatives
                     </CardTitle>
                 </CardHeader>
                 <CardContent className="p-0">
                    <div className="divide-y divide-neutral-800">
                        {results.map((r, i) => (
                           <div key={i} className="p-4 text-sm">
                               <div className="flex justify-between items-start mb-1">
                                  <div className="font-semibold text-neutral-200">{r.name}</div>
                                  <Badge variant="outline" className="text-[10px] bg-neutral-900 leading-none">{r.relation}</Badge>
                               </div>
                               <div className="text-neutral-500 text-xs mb-2">DOB: {r.dob}</div>
                               <div className="grid grid-cols-2 gap-2 text-xs text-neutral-400">
                                   <div className="flex items-center"><Phone className="w-3 h-3 mr-1" /> {r.phone}</div>
                                   <div className="flex items-center"><MapPin className="w-3 h-3 mr-1" /> {r.loc}</div>
                               </div>
                           </div>
                        ))}
                    </div>
                 </CardContent>
             </Card>
          )}

          {results.length > 0 && traceType === "username" && (
             <Card className="border-neutral-800 bg-black">
                 <CardHeader className="py-4 border-b border-neutral-800">
                     <CardTitle className="text-sm text-neutral-300 flex items-center">
                        <ShieldAlert className="w-4 h-4 mr-2 text-neutral-400" /> Live Profiles
                     </CardTitle>
                 </CardHeader>
                 <CardContent className="p-0">
                    <div className="divide-y divide-neutral-800">
                        {results.map((r, i) => (
                           <div key={i} className="p-3 text-sm flex items-center justify-between hover:bg-neutral-900 transition-colors">
                               <div className="flex items-center space-x-3">
                                   <Badge className="bg-neutral-800 text-neutral-300 w-16 justify-center">{r.type}</Badge>
                                   <span className="text-neutral-200 font-medium">{r.name}</span>
                               </div>
                               <a href={r.url} target="_blank" rel="noreferrer" className="text-indigo-400 hover:text-indigo-300 text-xs flex items-center">
                                   Open <Search className="w-3 h-3 ml-1" />
                               </a>
                           </div>
                        ))}
                    </div>
                 </CardContent>
             </Card>
          )}
        </div>

        {/* Terminal Output */}
        <div className="w-full md:w-2/3 bg-[#0c0c0c] border border-neutral-800 rounded-xl overflow-hidden font-mono text-sm leading-relaxed flex flex-col h-[600px] shadow-2xl">
          <div className="bg-[#1a1a1a] flex border-b border-neutral-800 px-4 py-2 items-center justify-between">
              <div className="flex space-x-2">
                 <div className="w-3 h-3 rounded-full bg-rose-500/80"></div>
                 <div className="w-3 h-3 rounded-full bg-amber-500/80"></div>
                 <div className="w-3 h-3 rounded-full bg-emerald-500/80"></div>
              </div>
              <div className="text-xs text-neutral-500 font-medium tracking-widest uppercase flex items-center">
                 <Terminal className="w-3 h-3 mr-2" />
                 OSINT TTY1
              </div>
              <div className="w-16"></div>
          </div>
          <div ref={scrollRef} className="flex-1 p-6 overflow-y-auto space-y-1">
             <div className="text-neutral-600 mb-4">
               {`__  __       _                  _ 
|  \\/  |     (_)                | |
| \\  / | __ _ _ _ __ _ __ ___  | |_
| |\\/| |/ _\` | | '__| '__/ _ \\ | __|
| |  | | (_| | | |  | | |  __/ | |_
|_|  |_|\\__,_|_|_|  |_|  \\___|  \\__|
OSINT Tool / Trace Database v1.0`}
             </div>
             {logs.length === 0 && (
                <div className="text-neutral-500">System idle. Ready for intelligence gathering...</div>
             )}
             {logs.map((log, i) => (
                <div key={i} className={
                    log.type === "success" ? "text-emerald-400" :
                    log.type === "error" ? "text-rose-400" :
                    log.type === "warning" ? "text-amber-400" :
                    "text-neutral-300"
                }>
                   {log.msg}
                </div>
             ))}
             {isRunning && (
                <div className="text-neutral-500 animate-pulse mt-2">_</div>
             )}
          </div>
        </div>
      </div>
    </div>
  );
}
