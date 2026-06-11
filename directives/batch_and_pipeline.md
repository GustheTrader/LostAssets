# Batch Search And Pipeline

## Goal
Turn one-off searches into repeatable lead operations: batch lookup, saved-case status, and scheduled rescans.

## Inputs
- CSV-style pasted leads: `firstName,lastName,state`
- Total record limit from 1 to 100
- Saved cases from the browser database
- Optional next rescan date

## Tooling
- Use `/api/batch-search` for multi-lead searches.
- Use `/api/rescan` for saved-case refreshes.
- Use local case metadata for pipeline status and rescan timestamps.
- For large official CSV files, do not use the browser upload flow. Create the Supabase tables from `db/supabase_schema.sql`, then run `npm run supabase:import -- --state CA <file-or-folder>` so `execution/importSupabaseCsv.ts` streams rows in deterministic batches.
- To move the existing local SQLite working database to Supabase, first run `db/supabase_schema.sql` in the Supabase SQL editor, then run `npm run supabase:migrate-sqlite -- --dry-run --db data.sqlite` to verify counts. Replace the service role placeholder in `.env`, then run `npm run supabase:migrate-sqlite -- --db data.sqlite`.

## Pipeline Statuses
- `new_lead`
- `verified`
- `contact_found`
- `outreach_sent`
- `follow_up_needed`
- `claimed`
- `rejected`

## Edge Cases
- Invalid batch rows should be skipped with a visible error count.
- Batch search should treat the record limit as the total number of returned records, not per-row.
- Rescans should preserve case notes/status while refreshing assets.
- Scheduled rescans should be user-visible and manually triggerable.
- Supabase imports require `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in `.env`. Use `--dry-run --limit 1000` first for any new source format to verify column mapping without writing rows.
- SQLite-to-Supabase migration preserves local integer IDs so lead/campaign/outreach relationships stay intact. After migration, re-run `db/supabase_schema.sql` or at least the `setval(...)` statements at the bottom so future cloud inserts continue from the imported max IDs.
