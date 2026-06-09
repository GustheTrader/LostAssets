import { CaseStatus, SavedCase, AssetRecord, Relative, SearchQuery } from "../types";

const STORAGE_KEY = "lost_asset_locator_cases";

export const getSavedCases = (): SavedCase[] => {
  const data = localStorage.getItem(STORAGE_KEY);
  const cases = data ? JSON.parse(data) : [];
  return cases.map((savedCase: SavedCase) => ({
    ...savedCase,
    status: savedCase.status || "new_lead",
  }));
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
    status: "new_lead",
    nextRescanAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
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

export const updateCaseStatus = (id: string, status: CaseStatus): SavedCase[] => {
  const cases = getSavedCases();
  const updated = cases.map((savedCase) => savedCase.id === id ? { ...savedCase, status } : savedCase);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  return updated;
};

export const updateCaseNotes = (id: string, notes: string): SavedCase[] => {
  const cases = getSavedCases();
  const updated = cases.map((savedCase) => savedCase.id === id ? { ...savedCase, notes } : savedCase);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  return updated;
};

export const updateCaseRescan = (id: string, assets: AssetRecord[], lastRescannedAt: number, nextRescanAt: number): SavedCase[] => {
  const cases = getSavedCases();
  const updated = cases.map((savedCase) => savedCase.id === id ? {
    ...savedCase,
    assets,
    lastRescannedAt,
    nextRescanAt,
  } : savedCase);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  return updated;
};
