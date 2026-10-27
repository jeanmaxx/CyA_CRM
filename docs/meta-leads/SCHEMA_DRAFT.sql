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

-- Advisors can see their own integration metadata but never need the raw token.
create policy "lead_integrations_select_own"
on public.lead_integrations for select
to authenticated
using (
  advisor_id = (select auth.uid())
  and organization_id = (select organization_id from public.profiles where id = (select auth.uid()))
);

-- Creation/token rotation will be handled by a server-side RPC/Edge Function so the
-- browser never creates its own authorization data directly.
revoke insert, update, delete on public.lead_integrations from anon, authenticated;
