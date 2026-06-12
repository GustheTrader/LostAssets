import { useState } from "react";
import { 
  Printer, X, FileText, CheckCircle2, Calendar, User, Landmark, ShieldCheck, Bookmark, ArrowRight, CheckSquare, ClipboardList, PenTool
} from "lucide-react";
import { DialogContent, DialogHeader, DialogTitle, DialogDescription } from "./ui/dialog";
import { Button } from "./ui/button";
import { SavedCase, AssetRecord } from "../types";

interface PrintCaseModalProps {
  savedCase: SavedCase;
  onClose?: () => void;
}

export function PrintCaseModal({ savedCase, onClose }: PrintCaseModalProps) {
  const [stampApproved, setStampApproved] = useState(false);
  const grandTotal = savedCase.assets.reduce((sum, a) => sum + a.amount, 0);

  const handlePrint = () => {
    // We trigger window.print()
    // By using print CSS classes, things off other screens are hidden.
    window.print();
  };

  const formattedDate = new Date(savedCase.createdAt).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });

  const printCurrentDate = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric"
  });

  return (
    <DialogContent className="max-w-4xl bg-[#09090b] text-neutral-200 border-neutral-850 p-6 max-h-[92vh] overflow-y-auto flex flex-col print:p-0 print:bg-white print:text-black print:max-h-full print:border-none print:shadow-none">
      {/* HEADER CONTROLS (HIDDEN DURING PRINT) */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-neutral-900/60 p-4 rounded-xl border border-neutral-800 mb-4 print:hidden">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Printer className="w-5 h-5 text-orange-400" />
            <h3 className="font-bold font-mono text-sm uppercase text-neutral-100">Official Case Dossier Printer</h3>
          </div>
          <p className="text-xs text-neutral-400">
            Previewing full letterpress print layout. Press <kbd className="bg-neutral-850 px-1 py-0.5 rounded text-[10px] text-orange-300 font-mono">Print Dossier</kbd> or use system <kbd className="bg-neutral-850 px-1 py-0.5 rounded text-[10px] text-orange-300 font-mono">⌘P</kbd> to output paper copy.
          </p>
        </div>
        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setStampApproved(!stampApproved)}
            className={`font-mono text-xs h-9 px-4 gap-1.5 transition-all cursor-pointer ${
              stampApproved 
                ? "border-emerald-500/30 text-emerald-400 bg-emerald-550/10" 
                : "border-neutral-800 text-neutral-400 hover:text-neutral-200"
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            {stampApproved ? "Apply Official Seal: ON" : "Toggle Official Seal"}
          </Button>

          <Button
            size="sm"
            onClick={handlePrint}
            className="bg-orange-500 hover:bg-orange-600 text-black font-extrabold font-mono text-xs h-9 px-5 gap-2 cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            Print Dossier
          </Button>
        </div>
      </div>

      {/* PRINTABLE AREA */}
      <div 
        id="printable-case-dossier" 
        className="relative bg-white text-black p-8 sm:p-10 rounded-lg shadow-2xl border border-neutral-200 font-sans mx-auto w-full max-w-full print:p-0 print:border-none print:shadow-none print:bg-white print:text-black print:dark:text-black print:dark:bg-white"
        style={{ colorScheme: "light" }}
      >
        {/* WATERMARK APPROVED STAMP */}
        {stampApproved && (
          <div className="absolute top-12 right-12 border-4 border-dashed border-red-600 text-red-650 opacity-80 rounded-lg py-1 px-3 text-xs font-mono font-bold uppercase tracking-widest rotate-12 z-50 pointer-events-none select-none">
            RECOVERY APPROVED<br />
            <span className="text-[10px] font-sans text-red-600 font-normal">SECURE RECORD OFFICE</span>
          </div>
        )}

        {/* LETTERHEAD */}
        <div className="border-b-4 border-double border-neutral-800 pb-5 mb-6 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="p-1 rounded bg-black text-white font-mono font-black text-xs tracking-wider">EPR</span>
              <span className="text-xl font-bold tracking-tight uppercase font-mono text-neutral-900">Escheated Property Registry</span>
            </div>
            <p className="text-[10px] font-mono uppercase tracking-wider text-neutral-500">
              National Recoveries CRM // Estate Dossier Division
            </p>
            <div className="text-[11px] text-neutral-500 leading-none">
              Investigation Headquarters Suite 400 • Sacramento, CA • Austin, TX • Tallahassee, FL
            </div>
          </div>
          <div className="text-right md:text-right font-mono text-[11px] text-neutral-600 space-y-0.5">
            <div><strong>Dossier File:</strong> EPR-C-{savedCase.id.slice(0,8).toUpperCase()}</div>
            <div><strong>Generated:</strong> {printCurrentDate}</div>
            <div><strong>Investigation Registry Scope:</strong> Multi-State Database Map</div>
          </div>
        </div>

        {/* METADATA GRID CONTAINER */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 bg-neutral-50 p-5 rounded-md border border-neutral-250 mb-7 text-xs text-neutral-800">
          <div className="md:col-span-8 space-y-2">
            <div className="flex items-center gap-1.5 border-b border-neutral-200 pb-1.5">
              <ClipboardList className="w-4 h-4 text-neutral-600" />
              <h2 className="text-sm font-bold uppercase tracking-wide text-neutral-900 font-mono">Case File Master Index</h2>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 pt-1 font-mono">
              <div className="flex justify-between border-b border-dashed border-neutral-200 pb-1">
                <span className="text-neutral-500 uppercase tracking-tight text-[10px]">Folder Name:</span>
                <span className="font-bold text-neutral-900">{savedCase.categoryName}</span>
              </div>
              <div className="flex justify-between border-b border-dashed border-neutral-200 pb-1">
                <span className="text-neutral-500 uppercase tracking-tight text-[10px]">Claim Reference No:</span>
                <span className="font-bold text-neutral-900">{savedCase.claimNumber || "N/A - UNDECLARED"}</span>
              </div>
              <div className="flex justify-between border-b border-dashed border-neutral-200 pb-1">
                <span className="text-neutral-500 uppercase tracking-tight text-[10px]">Registry Date Opened:</span>
                <span className="text-neutral-900">{formattedDate}</span>
              </div>
              <div className="flex justify-between border-b border-dashed border-neutral-200 pb-1">
                <span className="text-neutral-500 uppercase tracking-tight text-[10px]">Current Status Stage:</span>
                <span className="font-bold uppercase text-orange-600">{savedCase.status || "Lead"} Stage</span>
              </div>
              <div className="flex justify-between border-b border-dashed border-neutral-200 pb-1 sm:col-span-2">
                <span className="text-neutral-500 uppercase tracking-tight text-[10px]">Client Classification Category:</span>
                <span className="font-bold text-neutral-900">{savedCase.claimantType || "Estate Portfolio"}</span>
              </div>
              {savedCase.agent && (
                <div className="flex justify-between border-b border-dashed border-neutral-200 pb-1 sm:col-span-2">
                  <span className="text-neutral-500 uppercase tracking-tight text-[10px]">Assigned Recovery Agent:</span>
                  <span className="font-bold text-neutral-900 text-[11px]">{savedCase.agent}</span>
                </div>
              )}
            </div>
          </div>

          <div className="md:col-span-4 border-t md:border-t-0 md:border-l border-neutral-200 pt-4 md:pt-0 md:pl-5 flex flex-col justify-between">
            <div className="text-center md:text-right space-y-1">
              <span className="text-[10px] font-mono uppercase tracking-wider text-neutral-500 block">Total Est. Clean Asset Value</span>
              <span className="text-2xl font-bold font-mono text-emerald-700 tracking-tight block">
                ${grandTotal.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              <span className="text-[11px] font-mono text-neutral-500 block">Consolidated of {savedCase.assets.length} Claims</span>
            </div>
            
            <div className="mt-4 pt-3 border-t border-dashed border-neutral-250 text-center md:text-right">
              <span className="text-[10px] font-mono uppercase tracking-wider text-neutral-500 block">Agent Commission Limit</span>
              <span className="text-xs font-mono font-bold text-slate-800">
                10% Cap Limit (${(grandTotal * 0.1).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })})
              </span>
            </div>
          </div>
        </div>

        {/* ASSET CLAIMS TABLE SECTION */}
        <div className="space-y-2 mb-7">
          <div className="flex items-center gap-1.5 border-b-2 border-neutral-800 pb-1.5">
            <Landmark className="w-4 h-4 text-neutral-800" />
            <h3 className="font-bold font-mono text-xs uppercase tracking-wider text-neutral-900">I. Detailed List of Escheated Claims Located</h3>
          </div>
          <p className="text-[11px] text-neutral-600 leading-relaxed italic">
            The following table displays official legal entities, custodians, and properties held in dormancy by state comptroller units mapped to this portfolio.
          </p>

          <table className="w-full text-left text-xs border border-neutral-250 border-collapse">
            <thead>
              <tr className="bg-neutral-100 font-mono uppercase tracking-wider text-[10px] border-b border-neutral-250 text-neutral-700">
                <th className="py-2.5 px-3 border-r border-neutral-200">Owner Claimant</th>
                <th className="py-2.5 px-3 border-r border-neutral-200">State Code</th>
                <th className="py-2.5 px-3 border-r border-neutral-200">Property Type Category</th>
                <th className="py-2.5 px-3 border-r border-neutral-200">Holder Institution Custodian</th>
                <th className="py-2.5 px-3 text-right">Escheated value</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200 text-neutral-800">
              {savedCase.assets.map((asset, idx) => (
                <tr key={asset.id || idx} className="hover:bg-neutral-50">
                  <td className="py-2 px-3 border-r border-neutral-200 font-mono font-bold text-neutral-900">{asset.name}</td>
                  <td className="py-2 px-3 border-r border-neutral-200 font-mono text-neutral-700 text-center">{asset.state}</td>
                  <td className="py-2 px-3 border-r border-neutral-200 text-neutral-600">{asset.type || "Cash Reserves / Unclaimed Credit"}</td>
                  <td className="py-2 px-3 border-r border-neutral-200 text-neutral-550">{asset.holderCompany}</td>
                  <td className="py-2 px-3 text-right font-mono font-medium text-emerald-800">${asset.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                </tr>
              ))}
              <tr className="bg-neutral-50/55 font-bold font-mono text-neutral-900 border-t border-neutral-300">
                <td colSpan={4} className="py-2.5 px-3 text-right border-r border-neutral-200 text-[10px] uppercase text-neutral-500">Aggregate Recoverable Sum:</td>
                <td className="py-2.5 px-3 text-right text-emerald-700 font-bold text-sm">${grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* ACTIVE RECOVERY PROCESS CHECKLIST */}
        <div className="space-y-3 mb-7">
          <div className="flex items-center gap-1.5 border-b border-neutral-200 pb-1.5">
            <CheckCircle2 className="w-4 h-4 text-neutral-800" />
            <h3 className="font-bold font-mono text-xs uppercase tracking-wider text-neutral-900">II. Executive Claim Recovery Action Items Checklist</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 pt-1">
            {(savedCase.tasks || [
              { id: "t1", text: "Confirm living claimant status or obtain certified power of attorney", done: false },
              { id: "t2", text: "Obtain certified copy of probate authorization or testamentary archives", done: false },
              { id: "t3", text: "Acquire signed notarized contract limit agreement (max 10% rate)", done: false },
              { id: "t4", text: "Formally submit physical claims bundle to state controller bureau", done: false }
            ]).map((task, idx) => (
              <div 
                key={task.id || idx} 
                className="flex items-center gap-3 p-2.5 border border-neutral-200 rounded-md bg-neutral-50/40 text-xs"
              >
                <div className="shrink-0">
                  {task.done ? (
                    <div className="w-4.5 h-4.5 border border-black rounded-sm bg-black flex items-center justify-center text-white text-[10px] font-bold">✔</div>
                  ) : (
                    <div className="w-4.5 h-4.5 border-2 border-neutral-400 rounded-sm bg-white"></div>
                  )}
                </div>
                <span className={`text-[11px] leading-tight ${task.done ? "text-neutral-500 line-through" : "text-neutral-850 font-medium"}`}>
                  {task.text}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* CORRESPONDENCE LOGS & INVESTIGATIVE NOTES */}
        <div className="space-y-3.5 mb-7 page-break-inside-avoid">
          <div className="flex items-center gap-1.5 border-b border-neutral-200 pb-1.5">
            <FileText className="w-4 h-4 text-neutral-800" />
            <h3 className="font-bold font-mono text-xs uppercase tracking-wider text-neutral-900">III. Case Correspondence History Logs & Notes</h3>
          </div>
          
          <div className="bg-[#fcfcfa] p-5 rounded border border-neutral-250 font-mono text-xs text-neutral-850 leading-relaxed min-h-[140px] whitespace-pre-wrap whitespace-pre-line">
            {savedCase.notes && savedCase.notes.trim() !== "" ? (
              savedCase.notes
            ) : (
              <div className="text-neutral-400 italic text-center py-8">
                No active investigative notes or custom correspondence history logged for this estate folder file.
              </div>
            )}
          </div>
        </div>

        {/* TIMELINE ACTIVITY RECORDS */}
        {savedCase.timeline && savedCase.timeline.length > 0 && (
          <div className="space-y-3.5 mb-7 page-break-inside-avoid">
            <div className="flex items-center gap-1.5 border-b border-neutral-200 pb-1.5">
              <Calendar className="w-4 h-4 text-neutral-800" />
              <h3 className="font-bold font-mono text-xs uppercase tracking-wider text-neutral-900">IV. Historical Milestone Record Ledger</h3>
            </div>

            <table className="w-full text-left text-[11px] border border-neutral-200 border-collapse font-sans text-neutral-750">
              <thead>
                <tr className="bg-neutral-50 font-mono uppercase tracking-wider text-[9px] border-b border-neutral-200 text-neutral-500">
                  <th className="py-2 px-3 border-r border-neutral-200 w-24">Log Date</th>
                  <th className="py-2 px-3 border-r border-neutral-200 w-36">Event Milestone</th>
                  <th className="py-2 px-3">Description Context</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200 text-neutral-800">
                {savedCase.timeline.map((item, idx) => (
                  <tr key={idx} className="hover:bg-neutral-50">
                    <td className="py-2 px-3 border-r border-neutral-200 font-mono text-[10px] text-neutral-600">{item.date}</td>
                    <td className="py-2 px-3 border-r border-neutral-200 font-bold text-neutral-900 font-mono">{item.stage}</td>
                    <td className="py-2 px-3 text-neutral-600 leading-snug">{item.desc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* CONTROLLER & AGENT SIGN-OFF SECTION */}
        <div className="mt-12 pt-8 border-t-2 border-neutral-800 page-break-inside-avoid">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 text-xs">
            <div className="space-y-5">
              <div className="text-[10px] font-mono uppercase tracking-wider text-neutral-400">Recovery Specialist / Investigator Certification</div>
              <div className="h-10 border-b border-neutral-400 w-4/5 pt-4 font-mono italic text-neutral-550 text-sm pl-2">
                {savedCase.agent || "_________________________"}
              </div>
              <div className="grid grid-cols-2 gap-4 w-4/5">
                <div>
                  <span className="text-[9px] font-mono text-neutral-500 uppercase tracking-tight block">Signature Specialist</span>
                  <span className="font-mono text-neutral-800 italic text-[11px]">{savedCase.agent || "Print Agent Full Name"}</span>
                </div>
                <div>
                  <span className="text-[9px] font-mono text-neutral-500 uppercase tracking-tight block">Date signed</span>
                  <span className="font-mono text-neutral-800 text-[11px]">{printCurrentDate}</span>
                </div>
              </div>
            </div>

            <div className="space-y-5">
              <div className="text-[10px] font-mono uppercase tracking-wider text-neutral-450">Reviewing Controller / Approving Official</div>
              <div className="h-10 border-b border-neutral-400 w-4/5 pt-4 font-mono italic text-red-750 text-sm pl-2">
                {stampApproved ? "EPR Secure Seal Authorized" : "_________________________"}
              </div>
              <div className="grid grid-cols-2 gap-4 w-4/5">
                <div>
                  <span className="text-[9px] font-mono text-neutral-500 uppercase tracking-tight block">Office sign-off approval</span>
                  <span className="font-mono text-neutral-800 italic text-[11px]">{stampApproved ? "System Automated Verification" : "Registrar Representative"}</span>
                </div>
                <div>
                  <span className="text-[9px] font-mono text-neutral-500 uppercase tracking-tight block">Authorized date seal</span>
                  <span className="font-mono text-neutral-800 text-[11px]">{stampApproved ? printCurrentDate : "Pending Stamp"}</span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="mt-8 border-t border-neutral-200 pt-4 flex flex-col md:flex-row justify-between items-center text-[9px] font-mono uppercase tracking-widest text-neutral-400 gap-2">
            <div>Security ID Number Ref: EPR-{savedCase.id.toUpperCase()}</div>
            <div>All State Rules Mapped Under 10% Comm. Compliance Guidelines</div>
            <div>Page 1 of 1 (Archival Master Ledger)</div>
          </div>
        </div>

      </div>
    </DialogContent>
  );
}
