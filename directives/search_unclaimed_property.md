# Search Unclaimed Property

## Goal
Search state unclaimed-property sources with deterministic adapters, normalize every result, and preserve enough source detail for later verification.

## Inputs
- First name and/or last name, unless running high-value mode
- State code
- Optional asset type
- Optional high-value flag
- Optional record limit from 1 to 100

## Tooling
Use `execution/stateSearchAdapters.ts`. Do not hand-scrape from orchestration. Add or improve a state adapter when a state needs custom behavior.
Use `src/services/stateDirectory.ts` as the canonical all-state registry for official portals, MissingMoney links, access mode, and machine-readable status.
Use `execution/firecrawlStateRules.ts` only for official static rules/info pages when `FIRECRAWL_API_KEY` is available. Firecrawl output belongs in `.tmp/` for review before any directive or rules file is updated.

## Output
Each result must include owner name, state, property type, holder, amount, location/address, state claim ID, source URL, and confidence. The UI should label the person or business as `Claim Owner`, never `Property Name`.

## Edge Cases
- Captcha or protected official portals should not be bypassed manually. Return adapter-sourced or fallback records with clear confidence.
- Network failure should produce a deterministic fallback, not a broken UI.
- Batch runs should continue after one failed state or lead.
- Respect the requested total record limit and clamp it between 1 and 100.

## Learnings
- CA, TX, NY, AZ, CO, FL, ID, IL, KY, NV, OR, TN, UT, WA, and WI now have explicit adapter entries or official protected-portal placeholders.
- Never fabricate unclaimed-property rows. If a source is protected by Turnstile/captcha or no public bulk/open-data source exists, return no records and keep the official source URL for manual verification.
- CA uses the official State Controller weekly bulk download for real records at or above $500. In high-value mode without a last name, scan the full `$500+` CSV and return the largest balances first rather than the first rows encountered.
- TX currently uses a limited City of College Station public open-data endpoint only; it is not the statewide ClaimItTexas portal. Statewide Texas data access is gated: request it from `up.dbrequests@cpa.texas.gov` and include name, company, mailing address, phone, and Texas private investigator license number if applicable.
- NAUPA is the best canonical directory for official state unclaimed-property portals. It says most states participate in MissingMoney.com, but many state portals are protected and should be treated as manual-verification or licensed-data-request sources unless a public bulk/open-data feed is confirmed.
- MissingMoney is a cross-state official search portal, not a bulk data feed. It can display states with matches and link to official claim workflows, but do not scrape protected search result flows or claim submissions.
- Firecrawl can help archive clean markdown from official state informational/rules pages. It does not replace lawful data access, state bulk feeds, or gated dataset requests.

## Access Matrix
- All states plus DC: canonical portal coverage lives in `src/services/stateDirectory.ts`.
- CA: Best bulk access. Official CSV download page publishes all records, including a `$500 and up` ZIP. Use for high-value prospecting.
- TX: Best gated access. Statewide dataset requires a Comptroller data request/SIFT access; do not treat city open data as statewide.
- Other states: Official portal access is recorded in the state directory and adapter map, but no public bulk record feed is confirmed yet. Return no fabricated records until a lawful bulk/open-data source, API, export, or granted data request is available.
- City/county datasets can be useful for local leads, but they must be labeled as local scope and not statewide coverage.

## Firecrawl Rules Workflow
1. Pick a state from `src/services/stateDirectory.ts`.
2. Run `npx tsx execution/firecrawlStateRules.ts --state=CA` or pass `--url=` for a specific official rules page.
3. Review the generated `.tmp/firecrawl-STATE.md` manually for claim requirements, timelines, fee limits, and source URLs.
4. Update `src/services/stateRulesService.ts` only with verified state-specific rules. If a rule cannot be confirmed, keep the generic "verify current state law" placeholder.
