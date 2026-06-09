// Hermes Agent CLI — Autonomous Lost Asset Recovery Agent
// Usage: npx tsx agent/cli.ts <command> [options]
//
// Commands:
//   scan <state>      Scan state database for new unclaimed assets
//   find <name>       Search all 7 states for a person's assets
//   lead <name>       Create a lead for skip-trace
//   contract <id>     Generate state-compliant contract for an asset
//   queue <state>     Queue outreach for all uncontacted assets in a state
//   send              Execute pending outreach
//   status            Show system status
//   regulations <st>  Show regulations for a state
//   pipeline <state>  Run full pipeline: scan -> contract -> queue
//   trace-maigret <name>   Run Maigret OSINT on a name (find emails/usernames)
//   trace-relatives <assetId>  Find relatives for an asset using public records
//   watch             Run continuous monitoring (every 6hrs)

import { db } from '../db/migrate';
import * as campaignsDb from '../db/campaigns';
import * as leadsDb from '../db/leads';
import * as regulationsDb from '../db/regulations';
import { searchState, searchBatch, StateSearchInput, supportedStateAdapters } from '../execution/stateSearchAdapters';
import { queueOutreachForCampaign, executePendingOutreach, runCampaignScheduler } from '../db/agentOrchestrator';
import { enrichWithMaigret } from '../execution/maigretAdapter';
import { enrichContact, enrichRelatives } from '../execution/skipTraceEnricher';

// The 7 target states
const TARGET_STATES = ['CA', 'AZ', 'NV', 'TX', 'TN', 'IL', 'FL'];

function log(msg: string) {
  const ts = new Date().toISOString().slice(11, 19);
  console.log(`[${ts}] ${msg}`);
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

// ── SCAN: Search state unclaimed property databases ──────
async function cmdScan(state: string, lastName?: string, firstName?: string) {
  const stateCode = state.toUpperCase();
  if (!TARGET_STATES.includes(stateCode)) {
    log(`State ${stateCode} not in target list. Supported: ${TARGET_STATES.join(', ')}`);
    return;
  }

  log(`Scanning ${stateCode} for unclaimed property...`);
  const input: StateSearchInput = {
    state: stateCode,
    lastName: lastName?.toUpperCase(),
    firstName: firstName?.toUpperCase(),
    highValue: !lastName, // get top values if no name filter
    recordLimit: 100,
  };

  const records = await searchState(input);
  log(`Found ${records.length} records in ${stateCode}`);
  
  // Store in assets table (done by searchState via persistRecords)
  // List what was found
  if (records.length > 0) {
    const byAmount = [...records].sort((a, b) => b.amount - a.amount);
    console.log('\nTop assets found:');
    byAmount.slice(0, 10).forEach((r, i) => {
      console.log(`  ${i+1}. ${r.ownerName.padEnd(25)} $${r.amount.toFixed(2).padStart(10)}  ${r.propertyType.padEnd(20)}  ${r.stateId}`);
    });
    if (records.length > 10) console.log(`  ... and ${records.length - 10} more`);
  }
  
  return records;
}

// ── FIND: Search name across all 7 states ───────────────
async function cmdFind(lastName: string, firstName?: string) {
  log(`Searching ALL 7 states for \"${lastName}, ${firstName || ''}\"...`);
  
  const inputs: StateSearchInput[] = TARGET_STATES.map(state => ({
    state,
    lastName: lastName.toUpperCase(),
    firstName: firstName?.toUpperCase(),
    recordLimit: 25,
  }));

  const results = await searchBatch(inputs);
  let total = 0;
  
  for (const result of results) {
    if (result.records.length > 0) {
      console.log(`\n=== ${result.state} (${result.records.length} records) ===`);
      result.records.slice(0, 10).forEach(r => {
        console.log(`  $${r.amount.toFixed(2).padStart(10)}  ${r.propertyType.padEnd(20)}  ${r.company.padEnd(20)}  ID: ${r.stateId}`);
      });
      total += result.records.length;
    }
  }
  
  log(`\nTotal: ${total} records across ${TARGET_STATES.length} states`);
  return results;
}

// ── LEAD: Create a lead ─────────────────────────────────
async function cmdLead(fullName: string, state: string, email?: string, phone?: string) {
  const stateCode = state.toUpperCase();
  const id = leadsDb.createLead({
    asset_id: null,
    full_name: fullName,
    relation: 'owner',
    email: email || null,
    phone: phone || null,
    address: null,
    city: null,
    state: stateCode,
    zip: null,
    confidence: 0.8,
    source: 'cli',
    verified: 0,
    notes: 'Manual lead created via CLI',
  });
  log(`Created lead #${id} for ${fullName} (${stateCode})`);
  return id;
}

// ── TRACE-MAIGRET: Run Maigret OSINT on a name ─────────
async function cmdTraceMaigret(name: string) {
  log(`Running Maigret OSINT on "${name}"...`);
  
  const result = await enrichWithMaigret(name);
  
  console.log('\n=== Maigret Results ===');
  console.log(`Emails found: ${result.emails.length}`);
  if (result.emails.length > 0) {
    result.emails.forEach(e => console.log(`  - ${e}`));
  }
  
  console.log(`Usernames found: ${result.usernames.length}`);
  if (result.usernames.length > 0) {
    result.usernames.slice(0, 10).forEach(u => console.log(`  - ${u}`));
  }
  
  console.log(`Sites: ${result.sitesFound.length}`);
  console.log(`Confidence: ${(result.confidence * 100).toFixed(0)}%`);
  console.log(`Notes: ${result.notes}`);
  if (relResult.relatives.length > 0) {
    console.log(`Relatives: ${relResult.relatives.join(", ")}`);
  }
  if (result.relatives && result.relatives.length > 0) {
    console.log(`Relatives (${result.relatives.length}): ${result.relatives.slice(0,5).join(", ")}`);
  }
  
  return result;
}

// ── TRACE-RELATIVES: Find relatives for an asset ──────
async function cmdTraceRelatives(assetId: number) {
  const asset = db.prepare('SELECT * FROM assets WHERE id = ?').get(assetId) as any;
  if (!asset) {
    log(`Asset #${assetId} not found`);
    return;
  }

  log(`Tracing relatives and contact for asset #${assetId}...`);

  const relResult = await enrichRelatives(asset.owner_name, asset.state);
  const result = await enrichContact(asset.owner_name, asset.state, asset.location, asset.company);

  console.log('\n=== Relative / Contact Trace ===');
  console.log(`Owner: ${asset.owner_name}`);
  console.log(`Address: ${result.address || 'unknown'}`);
  console.log(`Email: ${result.email || 'not found'}`);
  console.log(`Phone: ${result.phone || 'not found'}`);
  console.log(`Confidence: ${(result.confidence * 100).toFixed(0)}%`);
  console.log(`Sources: ${result.sources.join(', ')}`);
  console.log(`Notes: ${result.notes}`);

  if (relResult.relatives.length > 0) {
    console.log(`Relatives: ${relResult.relatives.join(", ")}`);
  }
  if (result.relatives && result.relatives.length > 0) {
    console.log(`Relatives (${result.relatives.length}): ${result.relatives.slice(0,5).join(", ")}`);
  }

  console.log('\n[Persistence] Relatives and enrichment saved to DB.');
}

// ── MAIN DISPATCHER ─────────────────────────────────────
async function main() {
  const args = process.argv.slice(2);
  const cmd = args[0]?.toLowerCase();

  switch (cmd) {
    case 'scan':
      await cmdScan(args[1], args[2], args[3]);
      break;
      
    case 'find':
      await cmdFind(args[1], args[2]);
      break;
      
    case 'lead':
      await cmdLead(args[1], args[2], args[3], args[4]);
      break;

    case 'trace-maigret':
    case 'maigret':
      if (!args[1]) {
        console.log('Usage: npx tsx agent/cli.ts trace-maigret "John Smith"');
        return;
      }
      await cmdTraceMaigret(args[1]);
      break;

    case 'trace-relatives':
    case 'relatives':
      if (!args[1]) {
        console.log('Usage: npx tsx agent/cli.ts trace-relatives <assetId>');
        return;
      }
      await cmdTraceRelatives(parseInt(args[1]));
      break;
      
    case 'help':
    default:
      console.log(`
Hermes Agent CLI — Autonomous Lost Asset Recovery

USAGE:
  npx tsx agent/cli.ts <command> [options]

COMMANDS:
  scan <state> [last] [first]    Scan state DB for unclaimed assets
  find <last> [first]            Search ALL 7 states for a person
  lead <name> <state> [email]    Create a lead record
  trace-maigret <name>           Run Maigret OSINT (find emails/usernames)
  trace-relatives <assetId>      Find relatives/contact for an asset
  contract <assetId>             Generate recovery contract for an asset
  queue <state> [email|call]     Create campaign + queue outreach
  send [limit]                   Send pending outreach (default: 20)
  status                         Show system status
  regulations|reg <state>        Show regulations for a state
  pipeline <state>               Full auto pipeline
  all                            Run pipeline on ALL 7 states
  watch                          Continuous monitoring (every 6hrs)
  help                           This message

TARGET STATES: ${TARGET_STATES.join(', ')}
`);
  }
}

main().catch(err => {
  console.error('Agent CLI error:', err);
  process.exit(1);
});
