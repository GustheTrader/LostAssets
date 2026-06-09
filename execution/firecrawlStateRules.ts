import fs from "node:fs/promises";
import path from "node:path";
import { STATE_DIRECTORY } from "../src/services/stateDirectory";

interface FirecrawlScrapeResponse {
  success?: boolean;
  data?: {
    markdown?: string;
    metadata?: Record<string, unknown>;
  };
  error?: string;
}

function parseArgs() {
  const args = new Map<string, string>();
  for (const arg of process.argv.slice(2)) {
    const [key, ...value] = arg.replace(/^--/, "").split("=");
    args.set(key, value.join("=") || "true");
  }
  return args;
}

async function scrapeWithFirecrawl(url: string): Promise<string> {
  const apiKey = process.env.FIRECRAWL_API_KEY;
  if (!apiKey) {
    throw new Error("FIRECRAWL_API_KEY is not set. Add it to .env before running this helper.");
  }

  const response = await fetch("https://api.firecrawl.dev/v2/scrape", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      url,
      formats: ["markdown"],
      onlyMainContent: true,
      timeout: 60000,
    }),
  });

  const payload = (await response.json()) as FirecrawlScrapeResponse;
  if (!response.ok || payload.success === false) {
    throw new Error(payload.error || `Firecrawl scrape failed with HTTP ${response.status}`);
  }

  return payload.data?.markdown || "";
}

async function main() {
  const args = parseArgs();
  const state = String(args.get("state") || "").toUpperCase();
  const url = args.get("url") || (state ? STATE_DIRECTORY[state]?.officialUrl : "");

  if (!url) {
    throw new Error("Pass --state=CA or --url=https://official-state-page.example");
  }

  if (url.includes("missingmoney.com/app/claim-search")) {
    throw new Error("Do not scrape protected MissingMoney search flows. Use this helper for official static rules/info pages only.");
  }

  const markdown = await scrapeWithFirecrawl(url);
  await fs.mkdir(".tmp", { recursive: true });

  const slug = state || new URL(url).hostname.replace(/[^a-z0-9]+/gi, "-").toLowerCase();
  const outputPath = path.join(".tmp", `firecrawl-${slug}.md`);
  await fs.writeFile(outputPath, markdown, "utf8");
  console.log(outputPath);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
