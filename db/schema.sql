-- LostAssets Production Schema
-- SQLite (drop-in replaceable with PostgreSQL syntax)

PRAGMA foreign_keys = ON;

-- Core asset records from state searches
CREATE TABLE IF NOT EXISTS assets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  owner_name TEXT NOT NULL,
  first_name TEXT,
  last_name TEXT,
  state TEXT NOT NULL,
  property_type TEXT,
  amount REAL DEFAULT 0,
  company TEXT,
  location TEXT,
  state_id TEXT,
  source_url TEXT,
  confidence TEXT CHECK(confidence IN ('official_bulk_csv','open_data','live_portal_protected','manual_entry')),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  claimed_at DATETIME,
  claim_status TEXT DEFAULT 'unclaimed' CHECK(claim_status IN ('unclaimed','contacted','in_progress','claimed','expired','rejected')),
  is_estate BOOLEAN DEFAULT 0,
  is_business BOOLEAN DEFAULT 0,
  heir_notes TEXT DEFAULT '',
  priority_tier INTEGER DEFAULT 3,
  confirmed_deceased BOOLEAN DEFAULT 0,
  death_date TEXT DEFAULT NULL
);
CREATE INDEX IF NOT EXISTS idx_assets_state ON assets(state);
CREATE INDEX IF NOT EXISTS idx_assets_name ON assets(owner_name);
CREATE INDEX IF NOT EXISTS idx_assets_claim_status ON assets(claim_status);
CREATE INDEX IF NOT EXISTS idx_assets_amount ON assets(amount);
CREATE UNIQUE INDEX IF NOT EXISTS idx_assets_state_id ON assets(state_id) WHERE state_id IS NOT NULL AND state_id != '';

-- Leads (potential owners / relatives found by skip-trace)
CREATE TABLE IF NOT EXISTS leads (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  asset_id INTEGER REFERENCES assets(id) ON DELETE SET NULL,
  full_name TEXT NOT NULL,
  relation TEXT, -- owner, spouse, child, sibling, heir, executor
  email TEXT,
  phone TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  zip TEXT,
  confidence REAL DEFAULT 0, -- 0-1
  source TEXT, -- skiptrace_provider, public_record, manual, ai_inference
  verified INTEGER DEFAULT 0, -- boolean
  notes TEXT,
  last_enriched_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_leads_asset ON leads(asset_id);
CREATE INDEX IF NOT EXISTS idx_leads_email ON leads(email);

-- Outreach campaigns (email + call sequences)
CREATE TABLE IF NOT EXISTS campaigns (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  status TEXT DEFAULT 'draft' CHECK(status IN ('draft','running','paused','completed','failed')),
  type TEXT NOT NULL CHECK(type IN ('email','call','mixed')),
  target_filter TEXT, -- JSON: {states:[],minAmount:0,claimStatus:'unclaimed'}
  schedule_cron TEXT, -- e.g. '0 9 * * 1-5' for business days 9am
  client_id TEXT,
  next_run_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Individual outreach messages
CREATE TABLE IF NOT EXISTS outreach (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  campaign_id INTEGER REFERENCES campaigns(id) ON DELETE CASCADE,
  lead_id INTEGER REFERENCES leads(id) ON DELETE CASCADE,
  asset_id INTEGER REFERENCES assets(id) ON DELETE SET NULL,
  channel TEXT NOT NULL CHECK(channel IN ('email','call','sms','mail')),
  sequence_step INTEGER DEFAULT 1,
  subject TEXT,
  body_html TEXT,
  body_text TEXT,
  status TEXT DEFAULT 'pending' CHECK(status IN ('pending','queued','sent','delivered','opened','replied','bounced','failed','skipped')),
  message_id TEXT, -- SendGrid msg-id or Twilio CallSid
  scheduled_at DATETIME,
  sent_at DATETIME,
  delivered_at DATETIME,
  opened_at DATETIME,
  replied_at DATETIME,
  error_log TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_outreach_campaign ON outreach(campaign_id);
CREATE INDEX IF NOT EXISTS idx_outreach_status ON outreach(status);
CREATE INDEX IF NOT EXISTS idx_outreach_scheduled ON outreach(scheduled_at);

-- State regulations for legal compliance
CREATE TABLE IF NOT EXISTS regulations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  state TEXT NOT NULL UNIQUE,
  state_name TEXT NOT NULL,
  claim_form_url TEXT,
  required_documents TEXT, -- JSON array
  notarization_required INTEGER DEFAULT 0,
  heirship_affidavit_required INTEGER DEFAULT 0,
  probate_required_threshold REAL DEFAULT 0,
  finder_fee_cap REAL, -- percentage
  finder_contract_required INTEGER DEFAULT 0,
  contract_must_be_notarized INTEGER DEFAULT 0,
  cooling_off_days INTEGER DEFAULT 0,
  legal_reference TEXT,
  notes TEXT,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Audit / activity log
CREATE TABLE IF NOT EXISTS audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  entity_type TEXT NOT NULL, -- asset, lead, campaign, outreach
  entity_id INTEGER NOT NULL,
  action TEXT NOT NULL, -- create, update, send, claim, fail
  actor TEXT DEFAULT 'system',
  metadata TEXT, -- JSON
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_log(entity_type, entity_id);

-- Saved cases (bookmarks / categories)
CREATE TABLE IF NOT EXISTS cases (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  query_json TEXT,
  status TEXT DEFAULT 'new_lead' CHECK(status IN ('new_lead','verified','contact_found','outreach_sent','follow_up_needed','claimed','rejected')),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_rescanned_at DATETIME,
  next_rescan_at DATETIME
);

-- Case-Asset link
CREATE TABLE IF NOT EXISTS case_assets (
  case_id TEXT REFERENCES cases(id) ON DELETE CASCADE,
  asset_id INTEGER REFERENCES assets(id) ON DELETE CASCADE,
  PRIMARY KEY (case_id, asset_id)
);

-- Relatives discovered via public records / skip trace
CREATE TABLE IF NOT EXISTS relatives (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  lead_id INTEGER REFERENCES leads(id) ON DELETE CASCADE,
  asset_id INTEGER REFERENCES assets(id) ON DELETE SET NULL,
  full_name TEXT NOT NULL,
  relation_type TEXT,           -- spouse, child, sibling, parent, other
  confidence REAL DEFAULT 0.5,
  source TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_relatives_lead ON relatives(lead_id);
CREATE INDEX IF NOT EXISTS idx_relatives_asset ON relatives(asset_id);

-- Additional optimized indexes
CREATE INDEX IF NOT EXISTS idx_assets_is_business ON assets(is_business);
CREATE INDEX IF NOT EXISTS idx_assets_is_estate ON assets(is_estate);

-- Triggers for automatic owner type classification
CREATE TRIGGER IF NOT EXISTS trg_assets_owner_type_insert
AFTER INSERT ON assets
BEGIN
  UPDATE assets
  SET is_business = (
    CASE WHEN (
      new.owner_name LIKE '% INC%' OR new.owner_name LIKE '% LLC%' OR new.owner_name LIKE '% CORP%' OR 
      new.owner_name LIKE '% CO %' OR new.owner_name LIKE '% CO' OR new.owner_name LIKE '% LTD%' OR 
      new.owner_name LIKE '%COMPANY%' OR new.owner_name LIKE '%ASSOCIATION%' OR new.owner_name LIKE '%PARTNERS%' OR 
      new.owner_name LIKE '%TRUST%' OR new.owner_name LIKE '%FOUNDATION%' OR new.owner_name LIKE '%BANK%' OR 
      new.owner_name LIKE '% SYS%' OR new.owner_name LIKE '% INT%' OR new.owner_name LIKE '% SVC%' OR 
      new.owner_name LIKE '% SERV%' OR new.owner_name LIKE '% CLUB%' OR new.owner_name LIKE '% DEPT%' OR 
      new.owner_name LIKE '% GROUP%' OR new.owner_name LIKE '% UNION%' OR new.owner_name LIKE '% SOC%' OR 
      new.owner_name LIKE '% CLINIC%' OR new.owner_name LIKE '% HOSP%' OR new.owner_name LIKE '% CTR%' OR 
      new.owner_name LIKE '% CENTER%' OR new.owner_name LIKE '% CORP'
    ) THEN 1 ELSE 0 END
  ),
  is_estate = (
    CASE WHEN (
      new.is_estate = 1 OR new.owner_name LIKE '%ESTATE%' OR new.owner_name LIKE '%EST OF%' OR 
      new.owner_name LIKE '%DECEASED%' OR new.owner_name LIKE '% DEC %' OR new.owner_name LIKE '% DEC' OR 
      new.property_type LIKE '%LIFE INS%'
    ) THEN 1 ELSE 0 END
  )
  WHERE id = new.id;
END;

CREATE TRIGGER IF NOT EXISTS trg_assets_owner_type_update
AFTER UPDATE OF owner_name, is_estate, property_type ON assets
BEGIN
  UPDATE assets
  SET is_business = (
    CASE WHEN (
      new.owner_name LIKE '% INC%' OR new.owner_name LIKE '% LLC%' OR new.owner_name LIKE '% CORP%' OR 
      new.owner_name LIKE '% CO %' OR new.owner_name LIKE '% CO' OR new.owner_name LIKE '% LTD%' OR 
      new.owner_name LIKE '%COMPANY%' OR new.owner_name LIKE '%ASSOCIATION%' OR new.owner_name LIKE '%PARTNERS%' OR 
      new.owner_name LIKE '%TRUST%' OR new.owner_name LIKE '%FOUNDATION%' OR new.owner_name LIKE '%BANK%' OR 
      new.owner_name LIKE '% SYS%' OR new.owner_name LIKE '% INT%' OR new.owner_name LIKE '% SVC%' OR 
      new.owner_name LIKE '% SERV%' OR new.owner_name LIKE '% CLUB%' OR new.owner_name LIKE '% DEPT%' OR 
      new.owner_name LIKE '% GROUP%' OR new.owner_name LIKE '% UNION%' OR new.owner_name LIKE '% SOC%' OR 
      new.owner_name LIKE '% CLINIC%' OR new.owner_name LIKE '% HOSP%' OR new.owner_name LIKE '% CTR%' OR 
      new.owner_name LIKE '% CENTER%' OR new.owner_name LIKE '% CORP'
    ) THEN 1 ELSE 0 END
  ),
  is_estate = (
    CASE WHEN (
      new.is_estate = 1 OR new.owner_name LIKE '%ESTATE%' OR new.owner_name LIKE '%EST OF%' OR 
      new.owner_name LIKE '%DECEASED%' OR new.owner_name LIKE '% DEC %' OR new.owner_name LIKE '% DEC' OR 
      new.property_type LIKE '%LIFE INS%'
    ) THEN 1 ELSE 0 END
  )
  WHERE id = new.id;
END;
