// Maigret Adapter for Lost Asset Enrichment
// Uses the Maigret OSINT tool to discover usernames and emails from public profiles.
// Install once: pip install maigret
// https://github.com/soxoj/maigret

import { exec } from "child_process";
import { promisify } from "util";
import { normalizeName, extractHumanName } from "./nameNormalization";

const execAsync = promisify(exec);

export interface MaigretResult {
  username: string;
  sites: string[];
  emails: string[];
  confidence: number;
  source: string;
}

export interface MaigretEnrichment {
  emails: string[];
  usernames: string[];
  sitesFound: string[];
  confidence: number;
  notes: string;
}

/**
 * Generate likely usernames from a person's name.
 */
function generateUsernameVariants(fullName: string): string[] {
  const norm = normalizeName(fullName);
  const given = norm.givenName.join("").toLowerCase();
  const surname = norm.surname.toLowerCase();
  const variants: string[] = [];

  if (!given || !surname) return [];

  // Common patterns
  variants.push(`${given}${surname}`);           // johndoe
  variants.push(`${given}.${surname}`);          // john.doe
  variants.push(`${given}_${surname}`);          // john_doe
  variants.push(`${surname}${given}`);           // doejohn
  variants.push(`${surname}.${given}`);          // doe.john
  variants.push(`${given}${surname[0]}`);        // johnd
  variants.push(`${surname}${given[0]}`);        // doej

  // With middle initial if present
  if (norm.middleInitials.length > 0) {
    const mi = norm.middleInitials[0].toLowerCase();
    variants.push(`${given}${mi}${surname}`);
    variants.push(`${given}.${mi}.${surname}`);
  }

  // Unique + reasonable length
  return Array.from(new Set(variants)).filter(v => v.length >= 4 && v.length <= 20);
}

/**
 * Run Maigret on a single username and parse JSON output.
 */
async function runMaigret(username: string, timeoutMs = 25000): Promise<MaigretResult | null> {
  try {
    const cmd = `maigret ${username} --json --timeout 8 --no-color 2>/dev/null`;
    const { stdout } = await execAsync(cmd, {
      timeout: timeoutMs,
      maxBuffer: 1024 * 1024,
    });

    if (!stdout || stdout.trim().length === 0) return null;

    let data: any;
    try {
      data = JSON.parse(stdout);
    } catch {
      return null;
    }

    const emails: string[] = [];
    const sites: string[] = [];

    // Maigret JSON structure can vary; we look for common patterns
    if (data && typeof data === "object") {
      // Some versions put results under username key
      const result = data[username] || data;

      if (result && result.sites) {
        for (const site of Object.keys(result.sites)) {
          sites.push(site);
          const siteData = result.sites[site];
          if (siteData && siteData.status === "Claimed") {
            // Look for email in various fields
            const possibleEmail = siteData.email || siteData.user_email || siteData.info?.email;
            if (possibleEmail && typeof possibleEmail === "string" && possibleEmail.includes("@")) {
              emails.push(possibleEmail.toLowerCase());
            }
          }
        }
      }
    }

    if (sites.length === 0 && emails.length === 0) return null;

    return {
      username,
      sites,
      emails: Array.from(new Set(emails)),
      confidence: emails.length > 0 ? 0.65 : 0.35,
      source: "maigret",
    };
  } catch (err: any) {
    // Maigret not installed or command failed
    if (err.message?.includes("not found") || err.code === "ENOENT") {
      console.warn("[maigret] Maigret CLI not found. Run: pip install maigret");
    }
    return null;
  }
}

/**
 * Main enrichment function using Maigret.
 */
export async function enrichWithMaigret(ownerName: string): Promise<MaigretEnrichment> {
  const humanName = extractHumanName(ownerName);
  const variants = generateUsernameVariants(humanName);

  if (variants.length === 0) {
    return {
      emails: [],
      usernames: [],
      sitesFound: [],
      confidence: 0,
      notes: "Could not generate username variants from name.",
    };
  }

  const results: MaigretResult[] = [];

  // Run Maigret on up to 6 most promising variants (parallel, with limit)
  const limitedVariants = variants.slice(0, 6);
  const promises = limitedVariants.map(v => runMaigret(v));
  const settled = await Promise.allSettled(promises);

  for (const s of settled) {
    if (s.status === "fulfilled" && s.value) {
      results.push(s.value);
    }
  }

  const allEmails = results.flatMap(r => r.emails);
  const allUsernames = results.map(r => r.username);
  const allSites = results.flatMap(r => r.sites);

  const bestConfidence = results.length > 0
    ? Math.max(...results.map(r => r.confidence))
    : 0;

  let notes = "No public profiles found via Maigret.";
  if (allEmails.length > 0) {
    notes = `Found ${allEmails.length} email(s) via Maigret on ${results.length} username(s).`;
  } else if (results.length > 0) {
    notes = `Found ${results.length} public profile(s) but no emails.`;
  }

  return {
    emails: Array.from(new Set(allEmails)),
    usernames: Array.from(new Set(allUsernames)),
    sitesFound: Array.from(new Set(allSites)),
    confidence: bestConfidence,
    notes,
  };
}

/**
 * Batch version for multiple leads.
 */
export async function batchMaigretEnrich(
  names: string[],
  concurrency = 3
): Promise<MaigretEnrichment[]> {
  const out: MaigretEnrichment[] = [];
  for (let i = 0; i < names.length; i += concurrency) {
    const chunk = names.slice(i, i + concurrency);
    const res = await Promise.all(chunk.map(n => enrichWithMaigret(n)));
    out.push(...res);
  }
  return out;
}
