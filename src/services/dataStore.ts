import { SavedCase, AssetRecord, Relative, SearchQuery } from "../types";

const STORAGE_KEY = "lost_asset_locator_cases";

export const getSavedCases = (): SavedCase[] => {
  const data = localStorage.getItem(STORAGE_KEY);
  return data ? JSON.parse(data) : [];
};

export const saveCase = (
  categoryName: string,
  query: SearchQuery,
  assets: AssetRecord[],
  relatives: Relative[]
): SavedCase => {
  const newCase: SavedCase = {
    id: `case-${Math.random().toString(36).substr(2, 9)}`,
    categoryName,
    query,
    assets,
    relatives,
    createdAt: Date.now(),
  };

  const cases = getSavedCases();
  cases.push(newCase);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cases));
  
  return newCase;
};

export const deleteCase = (id: string) => {
  const cases = getSavedCases();
  const filtered = cases.filter(c => c.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
};
