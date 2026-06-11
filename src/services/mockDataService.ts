import { AssetRecord, Relative, SearchQuery } from "../types";

export const AVAILABLE_STATES = ["CA", "NV", "OR", "WA", "AZ", "UT", "ID", "CO", "IL", "WI", "KY", "TN", "TX", "NY", "NQ"];
export const ASSET_TYPES: AssetRecord["type"][] = ["Bank Account", "Uncashed Check", "Life Insurance", "Utility Deposit", "Safe Deposit Box"];
const COMPANIES = ["Wells Fargo", "Bank of America", "State Farm", "PG&E", "Comcast", "Prudential", "US Bank", "Geico", "Xcel Energy", "ComEd", "Allstate", "Humana"];
const CITIES: Record<string, string[]> = {
  CA: ["Los Angeles", "San Francisco", "San Diego", "Sacramento"],
  NV: ["Las Vegas", "Reno", "Henderson"],
  OR: ["Portland", "Eugene", "Salem"],
  WA: ["Seattle", "Spokane", "Tacoma"],
  AZ: ["Phoenix", "Tucson", "Mesa"],
  UT: ["Salt Lake City", "Provo", "West Jordan"],
  ID: ["Boise", "Idaho Falls"],
  CO: ["Denver", "Colorado Springs", "Aurora", "Boulder", "Fort Collins"],
  IL: ["Chicago", "Springfield", "Peoria", "Rockford", "Naperville"],
  WI: ["Milwaukee", "Madison", "Green Bay", "Kenosha"],
  KY: ["Louisville", "Lexington", "Bowling Green", "Frankfort"],
  TN: ["Nashville", "Memphis", "Knoxville", "Chattanooga"],
  TX: ["Houston", "Austin", "Dallas", "San Antonio"],
  NY: ["New York City", "Buffalo", "Rochester", "Albany"],
  NQ: ["NQ City 1", "NQ Valley", "NQ Springs"],
};

// Generate random mock assets based on a search query
export const searchLostAssets = async (query: SearchQuery): Promise<AssetRecord[]> => {
  const results: AssetRecord[] = [];

  try {
    const fName = query.firstName || "";
    const lName = query.lastName || "";
    // If not specific state and high value, we might iterate or just pick a couple
    const statesToSearch = query.targetState ? [query.targetState] : ["CA", "NY", "TX", "FL"];
    
    // We limit API calls so we don't spam
    const searchLimit = statesToSearch.slice(0, query.generalHighValue ? 3 : 1);

    for (const st of searchLimit) {
      const res = await fetch(`/api/scrape?firstName=${encodeURIComponent(fName)}&lastName=${encodeURIComponent(lName)}&state=${encodeURIComponent(st)}${query.generalHighValue ? "&highValue=true" : ""}`);
      const data = await res.json();
      
      if (data.records) {
        for (const rec of data.records) {
          results.push({
            id: `api-ast-${rec.id}`,
            name: `${rec.first_name || rec.firstName || "Unknown"} ${rec.last_name || rec.lastName || ""}`.trim().toUpperCase(),
            type: rec.property_type || rec.type,
            amount: rec.amount,
            holderCompany: rec.company,
            state: rec.state,
            address: rec.location,
            stateId: rec.state_id || rec.stateId
          });
        }
      }
    }
  } catch (err) {
    console.warn("Failed to reach API scraper", err);
  }

  return results.sort((a, b) => b.amount - a.amount);
};

// Generate random relatives/skip tracing data
export const trackRelatives = async (query: SearchQuery, baseState: string, foundAssets: AssetRecord[]): Promise<Relative[]> => {
  await new Promise((resolve) => setTimeout(resolve, 2000));

  const relations = ["Spouse", "Child", "Sibling", "Parent", "Possible Associate"];
  const results: Relative[] = [];
  const numResults = Math.floor(Math.random() * 4) + 2; // 2 to 5 relatives
  
  for (let i = 0; i < numResults; i++) {
    const isPrimaryFamily = i < 2;
    const relation = isPrimaryFamily ? relations[Math.floor(Math.random() * 3)] : relations[Math.floor(Math.random() * relations.length)];
    
    // Pick an asset to relate to
    const targetAsset = foundAssets.length > 0 ? foundAssets[Math.floor(Math.random() * foundAssets.length)] : null;
    let targetName = "Unclaimed Property Owner";
    let lName = query.lastName || "Unknown";
    
    if (targetAsset) {
        targetName = targetAsset.name;
        // Try to extract last name from the asset's name assuming format "FIRST LAST"
        const nameParts = targetName.split(' ');
        lName = nameParts.length > 1 ? nameParts[nameParts.length - 1] : "Unknown";
    } else if (query.firstName || query.lastName) {
        targetName = `${query.firstName || ""} ${query.lastName || ""}`.trim().toUpperCase();
    }

    let relLastName = lName;
    // chance of different last name for spouse or siblings
    if (Math.random() > 0.7 || lName === "Unknown") {
        relLastName = ["Smith", "Johnson", "Williams", "Brown", "Jones"][Math.floor(Math.random() * 5)];
    }
    const relFirstName = ["Michael", "Sarah", "David", "Jessica", "Robert", "Jennifer", "William", "Elizabeth"][Math.floor(Math.random() * 8)];

    results.push({
      id: `rel-${Math.random().toString(36).substr(2, 9)}`,
      name: `${relFirstName} ${relLastName}`.toUpperCase(),
      relation,
      age: Math.floor(Math.random() * 50) + 20,
      location: isPrimaryFamily && Math.random() > 0.5 ? baseState : AVAILABLE_STATES[Math.floor(Math.random() * AVAILABLE_STATES.length)],
      email: `${relFirstName.toLowerCase()}.${relLastName.toLowerCase()}@example.com`,
      phone: `(${Math.floor(Math.random() * 800) + 200}) ${Math.floor(Math.random() * 800) + 200}-${Math.floor(Math.random() * 9000) + 1000}`,
      matchConfidence: targetAsset ? Math.floor(Math.random() * 15) + 85 : Math.floor(Math.random() * 30) + 70, 
      relatedTo: targetName,
    });
  }

  return results.sort((a, b) => b.matchConfidence - a.matchConfidence);
};
