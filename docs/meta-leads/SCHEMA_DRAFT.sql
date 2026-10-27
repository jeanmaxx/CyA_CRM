-- DRAFT ONLY. Do not run directly in production.
-- This will be converted into an official Supabase migration after branch validation.

create table if not exists public.lead_integrations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  advisor_id uuid not null references public.profiles(id) on delete cascade,
  provider text not null default 'google_sheets_meta',
  label text not null default 'Meta Ads',
  token_hash text not null unique,
  enabled boolean not null default true,
  config jsonb not null default '{}'::jsonb,
  last_received_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, advisor_id, provider)
);

alter table public.lead_integrations enable row level security;

-- The browser never reads this table directly. All reads/writes and token rotation
-- are mediated by authenticated Edge Functions; ingestion uses the service role.
-- This prevents token hashes and integration metadata from becoming a public API surface.
revoke all on table public.lead_integrations from anon, authenticated;

create index if not exists lead_integrations_org_advisor_idx
  on public.lead_integrations (organization_id, advisor_id);

create index if not exists lead_integrations_enabled_token_idx
  on public.lead_integrations (token_hash)
  where enabled = true;
