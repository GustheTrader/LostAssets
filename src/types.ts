export type AssetType = "Bank Account" | "Uncashed Check" | "Life Insurance" | "Utility Deposit" | "Safe Deposit Box";
export type CaseStatus = "new_lead" | "verified" | "contact_found" | "outreach_sent" | "follow_up_needed" | "claimed" | "rejected";

export interface AssetRecord {
  id: string;
  name: string;
  address: string;
  state: string;
  type: AssetType;
  holderCompany: string;
  amount: number;
  stateId?: string;
  sourceUrl?: string;
  confidence?: "official_bulk_csv" | "open_data" | "live_portal_protected";
}

export interface Relative {
  id: string;
  name: string;
  relation: string;
  age: number;
  location: string;
  email: string;
  phone: string;
  matchConfidence: number;
  relatedTo?: string;
}

export interface SearchQuery {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  generalHighValue?: boolean;
  targetState?: string;
  assetType?: string;
  recordLimit?: number;
}

export interface SavedCase {
  id: string;
  categoryName: string;
  query: SearchQuery;
  assets: AssetRecord[];
  relatives: Relative[];
  createdAt: number;
  status: CaseStatus;
  notes?: string;
  lastRescannedAt?: number;
  nextRescanAt?: number;
}
