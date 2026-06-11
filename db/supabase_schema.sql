-- LostAssets Supabase/Postgres schema.
-- Run this in the Supabase SQL editor before importing large state CSV files.

create table if not exists public.assets (
  id bigserial primary key,
  owner_name text not null,
  first_name text,
  last_name text,
  state text not null,
  property_type text,
  amount numeric default 0,
  company text,
  location text,
  state_id text,
  source_url text,
  confidence text check (confidence in ('official_bulk_csv','open_data','live_portal_protected','manual_entry')),
  claim_status text default 'unclaimed' check (claim_status in ('unclaimed','contacted','in_progress','claimed','expired','rejected')),
  source_file text,
  source_row bigint,
  raw_record jsonb,
  claimed_at timestamptz,
  is_estate boolean default false,
  heir_notes text default '',
  priority_tier integer default 3,
  confirmed_deceased boolean default false,
  death_date text,
  is_business boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_assets_state on public.assets (state);
create index if not exists idx_assets_name on public.assets using gin (to_tsvector('simple', owner_name));
create index if not exists idx_assets_claim_status on public.assets (claim_status);
create index if not exists idx_assets_amount on public.assets (amount desc);
create index if not exists idx_assets_state_amount on public.assets (state, amount desc);
create index if not exists idx_assets_source_file_row on public.assets (source_file, source_row);
create unique index if not exists idx_assets_source_file_row_unique
  on public.assets (source_file, source_row);
create unique index if not exists idx_assets_state_id
  on public.assets (state_id)
  where state_id is not null and state_id != '';

create table if not exists public.leads (
  id bigserial primary key,
  asset_id bigint references public.assets(id) on delete set null,
  full_name text not null,
  relation text,
  email text,
  phone text,
  address text,
  city text,
  state text,
  zip text,
  confidence numeric default 0,
  source text,
  verified boolean default false,
  notes text,
  last_enriched_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_leads_asset on public.leads (asset_id);
create index if not exists idx_leads_email on public.leads (email);

create table if not exists public.campaigns (
  id bigserial primary key,
  name text not null,
  status text default 'draft' check (status in ('draft','running','paused','completed','failed')),
  type text not null check (type in ('email','call','mixed')),
  target_filter jsonb,
  schedule_cron text,
  next_run_at timestamptz,
  client_id text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.outreach (
  id bigserial primary key,
  campaign_id bigint references public.campaigns(id) on delete cascade,
  lead_id bigint references public.leads(id) on delete cascade,
  asset_id bigint references public.assets(id) on delete set null,
  channel text not null check (channel in ('email','call','sms','mail')),
  sequence_step integer default 1,
  subject text,
  body_html text,
  body_text text,
  status text default 'pending' check (status in ('pending','queued','sent','delivered','opened','replied','bounced','failed','skipped')),
  message_id text,
  scheduled_at timestamptz,
  sent_at timestamptz,
  delivered_at timestamptz,
  opened_at timestamptz,
  replied_at timestamptz,
  error_log text,
  created_at timestamptz default now()
);

create index if not exists idx_outreach_campaign on public.outreach (campaign_id);
create index if not exists idx_outreach_status on public.outreach (status);
create index if not exists idx_outreach_scheduled on public.outreach (scheduled_at);

create table if not exists public.regulations (
  id bigserial primary key,
  state text not null unique,
  state_name text not null,
  claim_form_url text,
  required_documents jsonb,
  notarization_required boolean default false,
  heirship_affidavit_required boolean default false,
  probate_required_threshold numeric default 0,
  finder_fee_cap numeric,
  finder_contract_required boolean default false,
  contract_must_be_notarized boolean default false,
  cooling_off_days integer default 0,
  legal_reference text,
  notes text,
  updated_at timestamptz default now()
);

create table if not exists public.audit_log (
  id bigserial primary key,
  entity_type text not null,
  entity_id bigint not null,
  action text not null,
  actor text default 'system',
  metadata jsonb,
  created_at timestamptz default now()
);

create index if not exists idx_audit_entity on public.audit_log (entity_type, entity_id);

create table if not exists public.relatives (
  id bigserial primary key,
  lead_id bigint references public.leads(id) on delete cascade,
  asset_id bigint references public.assets(id) on delete set null,
  full_name text not null,
  relation_type text,
  confidence numeric default 0.5,
  source text,
  created_at timestamptz default now()
);

create index if not exists idx_relatives_lead on public.relatives (lead_id);
create index if not exists idx_relatives_asset on public.relatives (asset_id);

create table if not exists public.cases (
  id text primary key,
  name text not null,
  query_json jsonb,
  status text default 'new_lead' check (status in ('new_lead','verified','contact_found','outreach_sent','follow_up_needed','claimed','rejected')),
  created_at timestamptz default now(),
  last_rescanned_at timestamptz,
  next_rescan_at timestamptz
);

create table if not exists public.case_assets (
  case_id text references public.cases(id) on delete cascade,
  asset_id bigint references public.assets(id) on delete cascade,
  primary key (case_id, asset_id)
);

select setval(pg_get_serial_sequence('public.assets', 'id'), coalesce((select max(id) from public.assets), 1), true);
select setval(pg_get_serial_sequence('public.leads', 'id'), coalesce((select max(id) from public.leads), 1), true);
select setval(pg_get_serial_sequence('public.campaigns', 'id'), coalesce((select max(id) from public.campaigns), 1), true);
select setval(pg_get_serial_sequence('public.outreach', 'id'), coalesce((select max(id) from public.outreach), 1), true);
select setval(pg_get_serial_sequence('public.regulations', 'id'), coalesce((select max(id) from public.regulations), 1), true);
select setval(pg_get_serial_sequence('public.audit_log', 'id'), coalesce((select max(id) from public.audit_log), 1), true);
select setval(pg_get_serial_sequence('public.relatives', 'id'), coalesce((select max(id) from public.relatives), 1), true);
