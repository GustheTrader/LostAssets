export type TraceStatus = "verified" | "not_found" | "blocked" | "provider_required" | "error";
export type TraceKind = "username" | "person";

export interface TraceEvidence {
  sourceName: string;
  sourceUrl: string;
  status: TraceStatus;
  checkedAt: string;
  matchBasis: string;
  confidence: number;
  details?: string;
}

export interface TraceLead {
  id: string;
  label: string;
  type: "profile" | "owner" | "relative" | "business_officer" | "registered_agent" | "manual_review";
  confidence: number;
  status: TraceStatus;
  evidence: TraceEvidence[];
  nextAction: string;
}

export interface TraceResult {
  kind: TraceKind;
  target: string;
  generatedAt: string;
  leads: TraceLead[];
  message: string;
}

const USERNAME_SOURCES = [
  { name: "GitHub", url: (target: string) => `https://github.com/${target}`, type: "Code profile" },
  { name: "Reddit", url: (target: string) => `https://www.reddit.com/user/${target}`, type: "Social profile" },
  { name: "Keybase", url: (target: string) => `https://keybase.io/${target}`, type: "Identity profile" },
  { name: "HackerOne", url: (target: string) => `https://hackerone.com/${target}`, type: "Security profile" },
  { name: "Steam", url: (target: string) => `https://steamcommunity.com/id/${target}`, type: "Gaming profile" },
  { name: "SoundCloud", url: (target: string) => `https://soundcloud.com/${target}`, type: "Music profile" },
];

function checkedAt() {
  return new Date().toISOString();
}

function normalizeUsername(value: string) {
  return value.trim().replace(/^@/, "");
}

function isValidUsername(value: string) {
  return /^[a-zA-Z0-9._-]{2,64}$/.test(value);
}

async function checkPublicUrl(sourceName: string, sourceUrl: string, target: string, sourceType: string): Promise<TraceEvidence> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    const response = await fetch(sourceUrl, {
      method: "GET",
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "User-Agent": "LostAssets Trace MVP/1.0 evidence-checker",
        Accept: "text/html,application/xhtml+xml",
      },
    });

    const status: TraceStatus = response.status === 200
      ? "verified"
      : response.status === 404
        ? "not_found"
        : response.status === 401 || response.status === 403 || response.status === 429
          ? "blocked"
          : "error";

    return {
      sourceName,
      sourceUrl,
      status,
      checkedAt: checkedAt(),
      matchBasis: `${sourceType} URL constructed from exact username "${target}" and checked with HTTP ${response.status}.`,
      confidence: status === "verified" ? 70 : status === "blocked" ? 20 : 0,
      details: response.statusText,
    };
  } catch (error: any) {
    return {
      sourceName,
      sourceUrl,
      status: error?.name === "AbortError" ? "blocked" : "error",
      checkedAt: checkedAt(),
      matchBasis: `${sourceType} URL constructed from exact username "${target}", but the source could not be verified.`,
      confidence: 0,
      details: error?.message || "Request failed",
    };
  } finally {
    clearTimeout(timeout);
  }
}

export async function traceUsername(rawTarget: string): Promise<TraceResult> {
  const target = normalizeUsername(rawTarget);
  const generatedAt = checkedAt();

  if (!isValidUsername(target)) {
    return {
      kind: "username",
      target,
      generatedAt,
      leads: [],
      message: "Enter a username with 2-64 letters, numbers, dots, underscores, or hyphens.",
    };
  }

  const evidence = await Promise.all(
    USERNAME_SOURCES.map((source) => checkPublicUrl(source.name, source.url(target), target, source.type)),
  );

  const leads = evidence
    .filter((item) => item.status === "verified" || item.status === "blocked")
    .map((item) => ({
      id: `username-${item.sourceName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${target}`,
      label: item.sourceName,
      type: "profile" as const,
      confidence: item.confidence,
      status: item.status,
      evidence: [item],
      nextAction: item.status === "verified"
        ? "Open source URL and manually confirm biography, location, linked sites, and name overlap before using this as identity evidence."
        : "Source blocked automated verification. Open manually if this source matters.",
    }));

  return {
    kind: "username",
    target,
    generatedAt,
    leads,
    message: leads.length
      ? `Verified ${leads.filter((lead) => lead.status === "verified").length} public profile source(s); blocked sources require manual review.`
      : "No public profile sources were verified by deterministic URL checks.",
  };
}

export async function tracePerson(rawTarget: string): Promise<TraceResult> {
  const target = rawTarget.trim().replace(/\s+/g, " ");
  const generatedAt = checkedAt();

  if (!target.includes(" ")) {
    return {
      kind: "person",
      target,
      generatedAt,
      leads: [],
      message: "Enter a full first and last name for person tracing.",
    };
  }

  const evidence: TraceEvidence = {
    sourceName: "Verified skip-trace provider",
    sourceUrl: "provider-not-connected",
    status: "provider_required",
    checkedAt: generatedAt,
    matchBasis: "Person, relative, phone, email, DOB, and address data require a licensed/contracted provider or manually verified public-record source.",
    confidence: 0,
    details: "No provider credentials are configured. The MVP will not generate people or contact data.",
  };

  return {
    kind: "person",
    target,
    generatedAt,
    leads: [{
      id: `person-provider-required-${target.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
      label: target,
      type: "manual_review",
      confidence: 0,
      status: "provider_required",
      evidence: [evidence],
      nextAction: "Connect a vetted skip-trace/public-record provider, or attach manually verified source documents before outreach.",
    }],
    message: "Provider-backed person tracing is not connected yet. No relatives, phones, DOBs, or addresses were generated.",
  };
}
