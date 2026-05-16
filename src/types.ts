export type AssetType = "Bank Account" | "Uncashed Check" | "Life Insurance" | "Utility Deposit" | "Safe Deposit Box";

export interface AssetRecord {
  id: string;
  name: string;
  address: string;
  state: string;
  type: AssetType;
  holderCompany: string;
  amount: number;
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
}

export interface SavedCase {
  id: string;
  categoryName: string;
  query: SearchQuery;
  assets: AssetRecord[];
  relatives: Relative[];
  createdAt: number;
}
