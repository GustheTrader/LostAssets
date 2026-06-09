import { AssetRecord, Relative, SearchQuery } from "../types";
export { AVAILABLE_STATES } from "./stateDirectory";

export const ASSET_TYPES: AssetRecord["type"][] = ["Bank Account", "Uncashed Check", "Life Insurance", "Utility Deposit", "Safe Deposit Box"];

// Search live/public sources through the server adapters. This intentionally
// returns no synthetic records when a source is unsupported or protected.
export const searchLostAssets = async (query: SearchQuery): Promise<AssetRecord[]> => {
  const results: AssetRecord[] = [];

  try {
    const fName = query.firstName || "";
    const lName = query.lastName || "";
    const statesToSearch = query.targetState ? [query.targetState] : ["CA"];
    
    // We limit API calls so we don't spam
    const searchLimit = statesToSearch.slice(0, query.generalHighValue ? 3 : 1);

    const recordLimit = Math.max(1, Math.min(100, Math.floor(Number(query.recordLimit) || 10)));

    for (const st of searchLimit) {
      const remaining = recordLimit - results.length;
      if (remaining <= 0) break;
      const res = await fetch(`/api/search?firstName=${encodeURIComponent(fName)}&lastName=${encodeURIComponent(lName)}&state=${encodeURIComponent(st)}&assetType=${encodeURIComponent(query.assetType || "")}&recordLimit=${remaining}${query.generalHighValue ? "&highValue=true" : ""}`);
      const data = await res.json();
      
      if (data.records) {
        for (const rec of data.records) {
          if (results.length >= recordLimit) break;
          results.push({
            id: `api-ast-${rec.id}`,
            name: (rec.owner_name || rec.ownerName || `${rec.first_name || rec.firstName || "Unknown"} ${rec.last_name || rec.lastName || ""}`).trim().toUpperCase(),
            type: rec.property_type || rec.type,
            amount: rec.amount,
            holderCompany: rec.company,
            state: rec.state,
            address: rec.location,
            stateId: rec.state_id || rec.stateId,
            sourceUrl: rec.source_url || rec.sourceUrl,
            confidence: rec.confidence,
          });
        }
      }
    }
  } catch (err) {
    console.warn("Failed to reach API scraper", err);
  }

  return results.sort((a, b) => b.amount - a.amount);
};

// Real skip-trace enrichment needs a verified provider. Do not generate people.
export const trackRelatives = async (query: SearchQuery, baseState: string, foundAssets: AssetRecord[]): Promise<Relative[]> => {
  void query;
  void baseState;
  void foundAssets;
  return [];
};
