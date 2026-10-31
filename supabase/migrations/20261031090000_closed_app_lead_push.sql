-- C&A CRM Android 1.3: closed-app lead push dispatch.
-- The Edge Function fetches the canonical lead row and never trusts message text
-- from this webhook payload. The database-to-function call is authenticated with
-- a per-organization random secret that is never exposed to client roles.

create table if not exists public.mobile_push_webhook_secrets (
  organization_id uuid primary key references public.organizations(id) on delete cascade,
  secret text not null default (
    replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '')
  ),
  created_at timestamptz not null default now(),
  rotated_at timestamptz not null default now()
);

alter table public.mobile_push_webhook_secrets enable row level security;
revoke all on public.mobile_push_webhook_secrets from anon, authenticated;
grant all on public.mobile_push_webhook_secrets to service_role;

insert into public.mobile_push_webhook_secrets (organization_id)
select o.id
from public.organizations o
on conflict (organization_id) do nothing;

create table if not exists public.mobile_push_deliveries (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  lead_id text not null,
  push_token_id uuid not null references public.mobile_push_tokens(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','sent','failed')),
  attempts integer not null default 0 check (attempts >= 0),
  fcm_message_name text,
  last_error text,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, lead_id, push_token_id)
);

create index if not exists mobile_push_deliveries_lead_idx
  on public.mobile_push_deliveries (organization_id, lead_id);
create index if not exists mobile_push_deliveries_status_idx
  on public.mobile_push_deliveries (status, updated_at desc);

alter table public.mobile_push_deliveries enable row level security;
revoke all on public.mobile_push_deliveries from anon, authenticated;
grant all on public.mobile_push_deliveries to service_role;

create or replace function public.cya_dispatch_new_lead_mobile_push()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  hook_secret text;
begin
  -- Future organizations get a secret automatically on their first lead.
  insert into public.mobile_push_webhook_secrets (organization_id)
  values (new.organization_id)
  on conflict (organization_id) do nothing;

  select s.secret
    into hook_secret
    from public.mobile_push_webhook_secrets s
   where s.organization_id = new.organization_id;

  -- Never make lead creation depend on notification infrastructure.
  if hook_secret is null then
    return new;
  end if;

  perform net.http_post(
    url := 'https://ibhgisndtaclvwznqugu.supabase.co/functions/v1/mobile-push',
    body := jsonb_build_object(
      'type', 'INSERT',
      'table', 'leads',
      'schema', 'public',
      'record', jsonb_build_object(
        'organization_id', new.organization_id,
        'id', new.id,
        'created_at', new.created_at
      )
    ),
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'X-CYA-Push-Hook', hook_secret
    ),
    timeout_milliseconds := 5000
  );
  return new;
end;
$$;

revoke all on function public.cya_dispatch_new_lead_mobile_push() from public, anon, authenticated;
grant execute on function public.cya_dispatch_new_lead_mobile_push() to postgres, service_role;

drop trigger if exists cya_new_lead_mobile_push on public.leads;
create trigger cya_new_lead_mobile_push
  after insert on public.leads
  for each row
  execute function public.cya_dispatch_new_lead_mobile_push();
