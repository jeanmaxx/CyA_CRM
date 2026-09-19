create table if not exists public.platform_notification_outbox (
  id uuid primary key default gen_random_uuid(),
  alert_id uuid not null references public.platform_alerts(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  channel text not null check (channel in ('email','whatsapp')),
  recipient text not null,
  subject text,
  body text not null,
  status text not null default 'draft' check (status in ('draft','queued','sent','failed','cancelled')),
  provider text,
  provider_message_id text,
  attempt_count integer not null default 0,
  last_error text,
  scheduled_for timestamptz,
  sent_at timestamptz,
  prepared_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(alert_id,channel,recipient)
);

create index if not exists platform_notification_outbox_status_idx
  on public.platform_notification_outbox(status,created_at desc);
create index if not exists platform_notification_outbox_org_idx
  on public.platform_notification_outbox(organization_id,created_at desc);

alter table public.platform_notification_outbox enable row level security;
