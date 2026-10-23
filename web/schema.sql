-- Run this in your Supabase SQL Editor

-- ==========================================
-- 1. Multi-Tenant B2B Core
-- ==========================================

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  stripe_customer_id text,
  subscription_tier text default 'free', -- 'free', 'startup', 'enterprise'
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create type user_role as enum ('owner', 'admin', 'developer', 'auditor');

create table public.organization_users (
  org_id uuid references public.organizations(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  role user_role default 'developer' not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  primary key (org_id, user_id)
);

-- Backward compatibility for the MVP users table
create table public.users (
  id uuid references auth.users not null primary key,
  email text,
  default_org_id uuid references public.organizations(id),
  subscription_tier text default 'free', -- 'free', 'pro', 'enterprise'
  stripe_customer_id text,
  generations_this_month integer default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- ==========================================
-- 1b. Billing RPC: Atomically increment generation count
-- ==========================================

create or replace function increment_generation_count(target_user_id uuid)
returns void as $$
begin
  update public.users
  set generations_this_month = generations_this_month + 1
  where id = target_user_id;
end;
$$ language plpgsql security definer;

-- ==========================================
-- 1c. Monthly Reset: Cron job to reset free tier counters
-- ==========================================
-- Run this in Supabase Dashboard > Database > Extensions > Enable pg_cron
-- Then execute:
-- select cron.schedule(
--   'reset-monthly-generations',
--   '0 0 1 * *',  -- First day of every month at midnight UTC
--   $$update public.users set generations_this_month = 0$$
-- );

-- ==========================================
-- 2. Immutable Enterprise Audit Ledger
-- ==========================================

create table public.pull_request_audits (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references public.organizations(id) on delete cascade not null,
  
  -- GitHub/GitLab Metadata
  pr_id text not null,
  pr_title text not null,
  source_branch text not null,
  author text not null,
  
  -- AI Analysis Metrics
  risk_level text not null,
  quality_score integer not null,
  has_breaking_changes boolean not null,
  
  -- The Cryptographic Compliance Proof
  tamper_proof_hash text not null unique,
  
  -- The Full Pipeline Output
  full_synthesis_json jsonb not null,
  
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Index for fast auditor lookups by hash
create index idx_audit_hash on public.pull_request_audits(tamper_proof_hash);

-- ==========================================
-- 3. Row Level Security (RLS)
-- ==========================================

alter table public.organizations enable row level security;
alter table public.organization_users enable row level security;
alter table public.users enable row level security;
alter table public.pull_request_audits enable row level security;

-- Users can only read orgs they belong to
create policy "Users can view own organizations" on public.organizations
  for select using (
    exists (
      select 1 from public.organization_users 
      where organization_users.org_id = organizations.id 
      and organization_users.user_id = auth.uid()
    )
  );

-- Audits can only be viewed by org members
create policy "Users can view org audits" on public.pull_request_audits
  for select using (
    exists (
      select 1 from public.organization_users 
      where organization_users.org_id = pull_request_audits.org_id 
      and organization_users.user_id = auth.uid()
    )
  );

-- ==========================================
-- 4. API Keys for Extensions & Add-ons
-- ==========================================

create table public.api_keys (
  key text primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  org_id uuid references public.organizations(id) on delete cascade,
  name text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  last_used_at timestamp with time zone
);

alter table public.api_keys enable row level security;

create policy "Users can view own api keys" on public.api_keys
  for select using (user_id = auth.uid());
