export type CsvColumnMapping = {
  ownerName: (string | null)[];
  firstName: (string | null)[];
  lastName: (string | null)[];
  state: (string | null)[];
  propertyType: (string | null)[];
  amount: (string | null)[];
  company: (string | null)[];
  location: {
    city: string | null;
    stateCol: string | null;
    zip: string | null;
    address: string | null;
  };
  stateId: string | null;
};

// Maps state unclaimed property CSV headers to our asset columns.
// States use wildly different headers, so this intentionally favors broad synonyms.
export function detectColumnMapping(headers: string[]): CsvColumnMapping {
  const normalized = headers.map((s) => s.toLowerCase().replace(/[^a-z0-9]/g, " ").trim());
  const find = (patterns: string[]) => {
    for (const pattern of patterns) {
      const index = normalized.findIndex((column) => column.includes(pattern));
      if (index !== -1) return headers[index];
    }
    return null;
  };

  return {
    ownerName: [
      find([
        "owner name",
        "property owner",
        "reported owner",
        "name of owner",
        "claimant name",
        "name",
        "owner",
        "holder name",
        "payee",
        "payee name",
        "creditor",
        "beneficiary",
      ]),
    ],
    firstName: [find(["first name", "firstname", "fname"])],
    lastName: [find(["last name", "lastname", "lname", "surname"])],
    state: [find(["state", "jurisdiction", "st", "state code", "state abbreviation"])],
    propertyType: [
      find([
        "property type",
        "asset type",
        "type",
        "category",
        "fund type",
        "account type",
        "description",
        "property description",
        "item description",
        "asset description",
      ]),
    ],
    amount: [
      find([
        "amount",
        "cash amount",
        "value",
        "balance",
        "reported amount",
        "due owner",
        "remittance",
        "check amount",
        "$",
        "dollar",
        "total",
        "sum",
        "net amount",
        "gross amount",
      ]),
    ],
    company: [
      find([
        "company",
        "holder",
        "reporting company",
        "holder name",
        "source",
        "from",
        "reporting entity",
        "institution",
        "bank",
        "reporter",
        "business",
        "corporation",
        "financial institution",
      ]),
    ],
    location: {
      city: find(["city", "municipality", "town"]),
      stateCol: find(["owner state", "address state", "prop state"]),
      zip: find(["zip", "zip code", "zipcode", "postal", "postal code"]),
      address: find(["address", "street", "mailing address", "owner address", "property address", "addr", "street address"]),
    },
    stateId: find([
      "id",
      "property id",
      "claim id",
      "record id",
      "reference",
      "reference number",
      "property number",
      "item number",
      "case id",
      "file number",
      "claim number",
    ]),
  };
}

export function pickFirst(row: Record<string, unknown>, cols: (string | null)[] | string | null): string | null {
  const candidates = Array.isArray(cols) ? cols : [cols];
  for (const column of candidates) {
    const value = column ? row[column] : undefined;
    if (value !== undefined && value !== null && String(value).trim() !== "") {
      return String(value).trim();
    }
  }
  return null;
}

export function parseAmount(value: string | null): number {
  if (!value) return 0;
  const cleaned = value.replace(/[^0-9.\-]/g, "");
  const amount = parseFloat(cleaned);
  return Number.isFinite(amount) ? amount : 0;
}

export function buildLocation(row: Record<string, unknown>, colMap: CsvColumnMapping): string | null {
  const parts: string[] = [];
  const address = colMap.location.address ? row[colMap.location.address] : null;
  const city = colMap.location.city ? row[colMap.location.city] : null;
  const state = colMap.location.stateCol ? row[colMap.location.stateCol] : null;
  const zip = colMap.location.zip ? row[colMap.location.zip] : null;

  if (address) parts.push(String(address).trim());
  if (city) parts.push(String(city).trim());
  if (state) parts.push(String(state).trim());
  if (zip) parts.push(String(zip).trim());

  return parts.length > 0 ? parts.join(", ") : null;
}
