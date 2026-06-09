// Name Normalizer
// Parse messy owner_name strings into structured parts + normalized search queries

export interface NormalizedName {
  givenName: string[];
  surname: string;
  middleInitials: string[];
  suffix: string | null;
  orgType: "person" | "estate" | "corporate" | "unknown";
  searchQueries: string[];
}

const CORP_KEYWORDS = [
  "INC", "LLC", "CORP", "LTD", "CO", "COMPANY", "ASSOCIATION",
  "FOUNDATION", "TRUST", "LLP", "LP", "PLC", "PARTNERSHIP"
];

const ESTATE_KEYWORDS = ["ESTATE OF", "ESTATE", "TRUST", "FAMILY TRUST", "LIVING TRUST"];

const SUFFIXES = new Set(["JR", "SR", "II", "III", "IV", "V", "VI", "VII", "MD", "PHD", "ESQ"]);

export function normalizeName(raw: string): NormalizedName {
  const clean = raw
    .toUpperCase()
    .replace(/\b(STATE OF|THE)\b/g, "")
    .replace(/\s+/g, " ")
    .trim();

  let orgType: NormalizedName["orgType"] = "person";
  if (ESTATE_KEYWORDS.some(k => clean.includes(k))) orgType = "estate";
  else if (Array.from(CORP_KEYWORDS).some(k => clean.includes(k))) orgType = "corporate";

  let working = clean;
  for (const ew of ESTATE_KEYWORDS) {
    if (working.startsWith(ew)) working = working.replace(ew, "").trim();
  }
  working = working.replace(/[^A-Z\s\-'"]/g, "").replace(/\s+/g, " ").trim();

  const tokens = working.split(" ").filter(Boolean);
  if (tokens.length === 0) {
    return { givenName: [], surname: "", middleInitials: [], suffix: null, orgType, searchQueries: [raw.trim()] };
  }

  let suffix: string | null = null;
  if (SUFFIXES.has(tokens[tokens.length - 1])) {
    suffix = tokens.pop()!;
  }

  const surname = tokens.length >= 2 ? tokens.pop()! : tokens.pop() ?? "";
  const middleInitials: string[] = [];
  const givenName: string[] = [];
  for (const t of tokens) {
    if (t.length === 1 && /^[A-Z]$/.test(t)) {
      middleInitials.push(t);
    } else {
      givenName.push(t);
    }
  }

  const searchQueries = buildSearchQueries(givenName, middleInitials, surname, suffix, orgType, raw);
  return { givenName, surname, middleInitials, suffix, orgType, searchQueries };
}

function buildSearchQueries(
  givenName: string[],
  middleInitials: string[],
  surname: string,
  suffix: string | null,
  orgType: NormalizedName["orgType"],
  raw: string
): string[] {
  if (orgType !== "person") {
    return [raw.replace(/\b(ESTATE OF|THE)\b/g, "").trim().replace(/\s+/g, " ")];
  }

  const givenStr = givenName.join(" ");
  const miStr = middleInitials.map(m => m + ".").join(" ");
  const fullGiven = miStr ? `${givenStr} ${miStr}` : givenStr;

  const queries: string[] = [];
  queries.push(`${givenStr} ${surname}`);
  if (middleInitials.length) queries.push(`${givenStr} ${middleInitials[0]}. ${surname}`);
  queries.push(`${surname}, ${givenStr}`);
  if (suffix) queries.push(`${givenStr} ${surname} ${suffix}`);

  const seen = new Set<string>();
  const deduped: string[] = [];
  for (const q of queries) {
    if (!seen.has(q)) { seen.add(q); deduped.push(q); }
  }
  return deduped;
}

export function extractHumanName(raw: string): string {
  const upper = raw.toUpperCase().trim();
  const dbaIndex = upper.search(/\b(DBA|A\/K\/A|AKA|FBO)\b/);
  if (dbaIndex > 0) return upper.slice(0, dbaIndex).trim();
  for (const ew of ESTATE_KEYWORDS) {
    if (upper.startsWith(ew)) return upper.replace(ew, "").trim().replace(/\s+/g, " ");
  }
  return upper;
}
