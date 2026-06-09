import React, { useState, useEffect } from "react";
import { Search, Globe, Copy, Check, ExternalLink, Shield, Compass, UserCheck, RefreshCw } from "lucide-react";

interface AssetRecord {
  id: number;
  ownerName: string;
  firstName?: string;
  lastName?: string;
  state: string;
  amount: number;
}

interface StateRegistry {
  code: string;
  name: string;
  url: string;
  supportsDeepLink: boolean;
  deepLinkPattern?: string;
  category: "Western" | "Eastern" | "Southern" | "Midwestern";
  status: "active" | "maintenance";
}

const STATE_REGISTRIES: StateRegistry[] = [
  // Western States
  { code: "CA", name: "California", url: "https://ucpi.sco.ca.gov/en/Property/SearchIndex", supportsDeepLink: false, category: "Western", status: "active" },
  { code: "NV", name: "Nevada", url: "https://nevadatreasurer.gov/unclaimed/", supportsDeepLink: false, category: "Western", status: "active" },
  { code: "OR", name: "Oregon", url: "https://unclaimed.oregon.gov/", supportsDeepLink: false, category: "Western", status: "active" },
  { code: "WA", name: "Washington", url: "https://ucp.dor.wa.gov/", supportsDeepLink: false, category: "Western", status: "active" },
  { code: "AZ", name: "Arizona", url: "https://aztreasury.gov/unclaimed-property", supportsDeepLink: false, category: "Western", status: "active" },
  { code: "UT", name: "Utah", url: "https://mycash.utah.gov/", supportsDeepLink: false, category: "Western", status: "active" },
  { code: "ID", name: "Idaho", url: "https://yourmoney.idaho.gov/", supportsDeepLink: false, category: "Western", status: "active" },
  { code: "CO", name: "Colorado", url: "https://colorado.findyourunclaimedproperty.com/", supportsDeepLink: false, category: "Western", status: "active" },
  { code: "NM", name: "New Mexico", url: "https://www.tax.newmexico.gov/unclaimed-property/", supportsDeepLink: false, category: "Western", status: "active" },
  { code: "WY", name: "Wyoming", url: "https://wyomingunclaimedproperty.gov/", supportsDeepLink: false, category: "Western", status: "active" },
  { code: "MT", name: "Montana", url: "https://mtrevenue.gov/unclaimed-property/", supportsDeepLink: false, category: "Western", status: "active" },
  { code: "AK", name: "Alaska", url: "https://unclaimedproperty.alaska.gov/", supportsDeepLink: false, category: "Western", status: "active" },
  { code: "HI", name: "Hawaii", url: "https://budget.hawaii.gov/itg/unclaimed-property/", supportsDeepLink: false, category: "Western", status: "active" },
  
  // Midwestern States
  { code: "IL", name: "Illinois", url: "https://icash.illinoistreasurer.gov/", supportsDeepLink: false, category: "Midwestern", status: "active" },
  { code: "OH", name: "Ohio", url: "https://unclaimedfunds.ohio.gov/", supportsDeepLink: false, category: "Midwestern", status: "active" },
  { code: "MI", name: "Michigan", url: "https://unclaimedproperty.michigan.gov/", supportsDeepLink: false, category: "Midwestern", status: "active" },
  { code: "IN", name: "Indiana", url: "https://www.indianaunclaimed.gov/", supportsDeepLink: false, category: "Midwestern", status: "active" },
  { code: "WI", name: "Wisconsin", url: "https://statetreasury.wi.gov/Pages/Unclaimed-Property.aspx", supportsDeepLink: false, category: "Midwestern", status: "active" },
  { code: "MN", name: "Minnesota", url: "https://mn.gov/commerce/consumers/your-money/unclaimed-property/", supportsDeepLink: false, category: "Midwestern", status: "active" },
  { code: "IA", name: "Iowa", url: "https://greatiowatreasurehunt.gov/", supportsDeepLink: false, category: "Midwestern", status: "active" },
  { code: "MO", name: "Missouri", url: "https://www.showmemoney.com/", supportsDeepLink: false, category: "Midwestern", status: "active" },
  { code: "ND", name: "North Dakota", url: "https://www.unclaimedproperty.nd.gov/", supportsDeepLink: false, category: "Midwestern", status: "active" },
  { code: "SD", name: "South Dakota", url: "https://southdakota.unclaimedproperty.com/", supportsDeepLink: false, category: "Midwestern", status: "active" },
  { code: "NE", name: "Nebraska", url: "https://treasurer.nebraska.gov/up/", supportsDeepLink: false, category: "Midwestern", status: "active" },
  { code: "KS", name: "Kansas", url: "https://www.kansascash.ks.gov/", supportsDeepLink: false, category: "Midwestern", status: "active" },

  // Eastern States
  { code: "NY", name: "New York", url: "https://www.ouf.osc.state.ny.us/ouf/", supportsDeepLink: false, category: "Eastern", status: "active" },
  { code: "PA", name: "Pennsylvania", url: "https://www.patreasury.gov/unclaimed-property/", supportsDeepLink: false, category: "Eastern", status: "active" },
  { code: "MA", name: "Massachusetts", url: "https://unclaimedproperty.mass.gov/", supportsDeepLink: false, category: "Eastern", status: "active" },
  { code: "NJ", name: "New Jersey", url: "https://unclaimedproperty.nj.gov/", supportsDeepLink: false, category: "Eastern", status: "active" },
  { code: "MD", name: "Maryland", url: "https://marylandunclaimedproperty.gov/", supportsDeepLink: false, category: "Eastern", status: "active" },
  { code: "CT", name: "Connecticut", url: "https://ctbiglist.com/", supportsDeepLink: false, category: "Eastern", status: "active" },
  { code: "ME", name: "Maine", url: "https://www.maine.gov/treasurer/unclaimed-property/", supportsDeepLink: false, category: "Eastern", status: "active" },
  { code: "NH", name: "New Hampshire", url: "https://www.nh.gov/treasurer/unclaimed/", supportsDeepLink: false, category: "Eastern", status: "active" },
  { code: "VT", name: "Vermont", url: "https://www.vermonttreasurer.gov/content/unclaimed-property", supportsDeepLink: false, category: "Eastern", status: "active" },
  { code: "RI", name: "Rhode Island", url: "https://findriup.com/", supportsDeepLink: false, category: "Eastern", status: "active" },
  { code: "DE", name: "Delaware", url: "https://unclaimedproperty.delaware.gov/", supportsDeepLink: false, category: "Eastern", status: "active" },

  // Southern States
  { code: "TX", name: "Texas", url: "https://www.claimittexas.org/", supportsDeepLink: false, category: "Southern", status: "active" },
  { code: "FL", name: "Florida", url: "https://www.fltreasurehunt.gov/", supportsDeepLink: false, category: "Southern", status: "active" },
  { code: "GA", name: "Georgia", url: "https://www.dor.georgia.gov/unclaimed-property", supportsDeepLink: false, category: "Southern", status: "active" },
  { code: "NC", name: "North Carolina", url: "https://www.nccash.com/", supportsDeepLink: false, category: "Southern", status: "active" },
  { code: "VA", name: "Virginia", url: "https://www.vamoneysearch.gov/", supportsDeepLink: false, category: "Southern", status: "active" },
  { code: "SC", name: "South Carolina", url: "https://treasurer.sc.gov/unclaimed-property/", supportsDeepLink: false, category: "Southern", status: "active" },
  { code: "TN", name: "Tennessee", url: "https://claimittn.gov/", supportsDeepLink: false, category: "Southern", status: "active" },
  { code: "AL", name: "Alabama", url: "https://alabama.unclaimedproperty.com/", supportsDeepLink: false, category: "Southern", status: "active" },
  { code: "MS", name: "Mississippi", url: "https://www.treasury.ms.gov/unclaimed-property/", supportsDeepLink: false, category: "Southern", status: "active" },
  { code: "LA", name: "Louisiana", url: "https://lacashclaim.org/", supportsDeepLink: false, category: "Southern", status: "active" },
  { code: "AR", name: "Arkansas", url: "https://claimitAR.gov/", supportsDeepLink: false, category: "Southern", status: "active" },
  { code: "KY", name: "Kentucky", url: "https://www.treasury.ky.gov/unclaimed-property/", supportsDeepLink: false, category: "Southern", status: "active" },
  { code: "WV", name: "West Virginia", url: "https://www.wvtreasury.com/unclaimed-property", supportsDeepLink: false, category: "Southern", status: "active" },
  { code: "OK", name: "Oklahoma", url: "https://www.oklahoma.gov/treasurer/unclaimed-property", supportsDeepLink: false, category: "Southern", status: "active" }
];

export default function MultiStateSearch() {
  const [dbNames, setDbNames] = useState<AssetRecord[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [taggedName, setTaggedName] = useState({ firstName: "", lastName: "", originalName: "" });
  const [activeCategory, setActiveCategory] = useState<string>("All");
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Fetch unique names from the local SQLite database to tag
  useEffect(() => {
    fetch("/api/records?limit=50")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          const formatted = data.map((row: any) => ({
            id: row.id,
            ownerName: row.owner_name || "",
            firstName: row.first_name || "",
            lastName: row.last_name || "",
            state: row.state || "CA",
            amount: row.amount || 0,
          }));
          // filter duplicates
          const seen = new Set();
          const unique = formatted.filter((item) => {
            const k = item.ownerName.toUpperCase();
            return seen.has(k) ? false : seen.add(k);
          });
          setDbNames(unique);
        }
      })
      .catch((err) => console.error("Error loading names:", err));
  }, []);

  const handleTag = (record: AssetRecord) => {
    // Attempt to split first and last name if they are empty
    let first = record.firstName || "";
    let last = record.lastName || "";
    
    if (!first && !last && record.ownerName) {
      const parts = record.ownerName.trim().split(/\s+/);
      if (parts.length === 1) {
        last = parts[0];
      } else if (parts.length >= 2) {
        first = parts[0];
        last = parts.slice(1).join(" ");
      }
    }
    
    setTaggedName({
      firstName: first,
      lastName: last,
      originalName: record.ownerName
    });

    // Automatically copy first copy to clipboard
    navigator.clipboard.writeText(record.ownerName);
    setCopiedField("fullName");
    setTimeout(() => setCopiedField(null), 2000);
  };

  const copyToClipboard = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const filteredNames = dbNames.filter((item) =>
    item.ownerName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const categories = ["All", "Western", "Midwestern", "Eastern", "Southern"];
  const displayRegistries = STATE_REGISTRIES.filter(
    (reg) => activeCategory === "All" || reg.category === activeCategory
  );

  return (
    <div className="space-y-6">
      {/* Title block */}
      <div className="flex items-center justify-between border-b border-neutral-800 pb-4">
        <div>
          <h2 className="text-xl font-bold tracking-wider text-neutral-100 flex items-center gap-2">
            <Globe className="w-5 h-5 text-orange-500" />
            National Multi-State Search Hub
          </h2>
          <p className="text-xs text-neutral-400 mt-1">
            Search official US state registries beyond California. Tag client names to copy details instantly and open search portals.
          </p>
        </div>
      </div>

      {/* Main split work pane */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
        
        {/* Left pane: Name tagger & Clipboard console */}
        <div className="xl:col-span-4 space-y-6">
          
          {/* Active Tagged Name Panel */}
          <div className="bg-neutral-900/60 border border-neutral-800 rounded-xl p-5 backdrop-blur-md relative overflow-hidden shadow-lg">
            <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-orange-500/10 to-transparent rounded-full -mr-8 -mt-8 pointer-events-none" />
            
            <h3 className="text-xs font-bold font-mono tracking-widest text-neutral-400 uppercase flex items-center gap-2 mb-4">
              <UserCheck className="w-4 h-4 text-orange-400" />
              Active Tagged Target
            </h3>

            {taggedName.originalName ? (
              <div className="space-y-4">
                <div>
                  <div className="text-[10px] uppercase font-bold text-neutral-500 tracking-wider">Full Name</div>
                  <div className="text-base font-bold text-neutral-100 mt-0.5 flex items-center justify-between group">
                    <span>{taggedName.originalName}</span>
                    <button 
                      onClick={() => copyToClipboard(taggedName.originalName, "fullName")}
                      className="p-1.5 rounded-md bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-orange-400 transition-colors"
                    >
                      {copiedField === "fullName" ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-[10px] uppercase font-bold text-neutral-500 tracking-wider">First Name</div>
                    <div className="text-sm font-bold text-neutral-200 mt-0.5 flex items-center justify-between bg-neutral-950 p-2 rounded-lg border border-neutral-800">
                      <span className="truncate mr-1">{taggedName.firstName || "—"}</span>
                      <button 
                        disabled={!taggedName.firstName}
                        onClick={() => copyToClipboard(taggedName.firstName, "first")}
                        className="p-1 rounded bg-neutral-900 hover:bg-neutral-800 text-neutral-400 hover:text-orange-400 disabled:opacity-30 transition-colors"
                      >
                        {copiedField === "first" ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <div className="text-[10px] uppercase font-bold text-neutral-500 tracking-wider">Last Name</div>
                    <div className="text-sm font-bold text-neutral-200 mt-0.5 flex items-center justify-between bg-neutral-950 p-2 rounded-lg border border-neutral-800">
                      <span className="truncate mr-1">{taggedName.lastName || "—"}</span>
                      <button 
                        disabled={!taggedName.lastName}
                        onClick={() => copyToClipboard(taggedName.lastName, "last")}
                        className="p-1 rounded bg-neutral-900 hover:bg-neutral-800 text-neutral-400 hover:text-orange-400 disabled:opacity-30 transition-colors"
                      >
                        {copiedField === "last" ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-neutral-800/60 flex items-center justify-between">
                  <span className="text-[10px] font-mono text-neutral-500">CLIPBOARD SYNC ACTIVE</span>
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                </div>
              </div>
            ) : (
              <div className="text-center py-6 text-neutral-500 text-xs">
                No target currently tagged. Select a name from the list below or search to tag one.
              </div>
            )}
          </div>

          {/* Database Leads list to tag */}
          <div className="bg-neutral-900/60 border border-neutral-800 rounded-xl p-5 backdrop-blur-md shadow-lg flex flex-col h-[400px]">
            <h3 className="text-xs font-bold font-mono tracking-widest text-neutral-400 uppercase mb-4">
              Select Client to Tag
            </h3>

            {/* Search leads */}
            <div className="relative mb-3 shrink-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
              <input
                type="text"
                placeholder="Search database leads..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-lg pl-9 pr-4 py-2 text-xs text-neutral-200 placeholder-neutral-500 focus:outline-none focus:border-orange-500/50"
              />
            </div>

            {/* List scroll wrapper */}
            <div className="flex-grow overflow-y-auto space-y-2 pr-1 custom-scrollbar">
              {filteredNames.length > 0 ? (
                filteredNames.map((record) => (
                  <button
                    key={record.id}
                    onClick={() => handleTag(record)}
                    className={`w-full flex items-center justify-between p-3 rounded-lg text-left transition-all border ${
                      taggedName.originalName === record.ownerName
                        ? "bg-orange-500/10 border-orange-500/30 text-orange-400"
                        : "bg-neutral-950 border-neutral-800/60 text-neutral-300 hover:bg-neutral-900"
                    }`}
                  >
                    <div>
                      <div className="text-xs font-bold truncate max-w-[180px]">{record.ownerName}</div>
                      <div className="text-[10px] text-neutral-500 mt-0.5">Original State: {record.state}</div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-xs font-bold font-mono text-emerald-400">${record.amount.toLocaleString()}</div>
                      <span className="text-[9px] uppercase font-mono text-neutral-500 block">Click to tag</span>
                    </div>
                  </button>
                ))
              ) : (
                <div className="text-center py-8 text-neutral-500 text-xs">
                  No matches in local database.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right pane: MissingMoney search & all 50 states directory */}
        <div className="xl:col-span-8 space-y-6">
          
          {/* MissingMoney.com Massive Launch Card */}
          <div className="bg-gradient-to-r from-blue-950/80 to-indigo-950/80 border border-blue-900/40 rounded-xl p-6 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-br from-indigo-500/10 to-transparent rounded-full -mr-16 -mt-16 pointer-events-none" />
            
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-2">
                <span className="text-[10px] uppercase font-bold font-mono text-blue-400 tracking-wider">OFFICIAL NAUPA SEARCH ENGINE</span>
                <h3 className="text-lg font-bold text-neutral-50 flex items-center gap-2">
                  <Compass className="w-5 h-5 text-indigo-400" />
                  Search 45+ States Simultaneously with MissingMoney.com
                </h3>
                <p className="text-xs text-neutral-300 max-w-2xl leading-relaxed">
                  MissingMoney.com is the national database sponsored by the National Association of State Treasurers. It aggregates databases across the United States. Click below to launch in your browser with clipboard ready!
                </p>
              </div>

              <div className="shrink-0 flex items-center gap-3">
                <a
                  href="https://www.missingmoney.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-5 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-xs font-bold text-white transition-all flex items-center gap-2 shadow-lg shadow-indigo-600/20"
                >
                  Launch MissingMoney
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            </div>
          </div>

          {/* Directory section */}
          <div className="space-y-4">
            
            {/* Category tabs */}
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex space-x-1 bg-neutral-900/60 p-1 border border-neutral-800 rounded-lg shrink-0">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                      activeCategory === cat ? "bg-orange-500 text-white font-semibold" : "text-neutral-400 hover:text-neutral-200"
                    }`}
                  >
                    {cat} {cat !== "All" && "Region"}
                  </button>
                ))}
              </div>
              <span className="text-[10px] font-mono text-neutral-500">{displayRegistries.length} Registries Available</span>
            </div>

            {/* Grid of states */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {displayRegistries.map((reg) => (
                <div 
                  key={reg.code}
                  className="bg-neutral-900/40 border border-neutral-800/80 rounded-xl p-4 hover:border-neutral-700 transition-all hover:bg-neutral-900/60 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-5 bg-neutral-850 border border-neutral-800 rounded font-mono font-bold text-[9px] flex items-center justify-center text-orange-400">
                          {reg.code}
                        </div>
                        <h4 className="text-sm font-bold text-neutral-100">{reg.name}</h4>
                      </div>
                      <span className="text-[8px] uppercase tracking-wider font-bold text-neutral-500 bg-neutral-950 px-2 py-0.5 rounded border border-neutral-800">
                        {reg.category}
                      </span>
                    </div>

                    <p className="text-[11px] text-neutral-400 mt-2 leading-relaxed">
                      Official state search registry website for {reg.name}. Bypasses bot restrictions.
                    </p>
                  </div>

                  <div className="pt-4 mt-4 border-t border-neutral-800/60 flex items-center justify-between">
                    <span className="text-[9px] font-mono text-emerald-500 flex items-center gap-1">
                      <Shield className="w-3 h-3" />
                      Active Portal
                    </span>

                    <a
                      href={reg.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 rounded bg-neutral-800 hover:bg-neutral-700 text-[10px] font-bold text-neutral-200 hover:text-white transition-all flex items-center gap-1 border border-neutral-700/60"
                    >
                      Search {reg.code}
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              ))}
            </div>

          </div>

        </div>

      </div>
    </div>
  );
}
