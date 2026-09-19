alter table public.platform_tenants
  add column if not exists billing_cycle text not null default 'monthly'
    check (billing_cycle in ('monthly','annual','custom')),
  add column if not exists agreed_price_cents integer,
  add column if not exists next_payment_on date,
  add column if not exists grace_until date,
  add column if not exists auto_suspend_on_overdue boolean not null default false,
  add column if not exists renewal_notice_days integer not null default 15,
  add column if not exists suspended_at timestamptz,
  add column if not exists suspension_reason text;

create table if not exists public.platform_payments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  amount_cents integer not null check (amount_cents > 0),
  currency text not null default 'MXN',
  paid_on date not null default current_date,
  period_start date,
  period_end date,
  method text,
  reference text,
  notes text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists platform_payments_org_paid_idx
  on public.platform_payments(organization_id, paid_on desc);
create index if not exists platform_tenants_next_payment_idx
  on public.platform_tenants(next_payment_on)
  where status in ('active','implementation');

alter table public.platform_payments enable row level security;

create or replace function public.current_org_id()
returns uuid
language sql
stable
security definer
set search_path to 'public'
as $function$
  select p.organization_id
  from public.profiles p
  left join public.platform_tenants t on t.organization_id = p.organization_id
  where p.id = auth.uid()
    and p.active = true
    and coalesce(t.status,'active') not in ('suspended','cancelled')
  limit 1
$function$;

create or replace function public.current_app_role()
returns text
language sql
stable
security definer
set search_path to 'public'
as $function$
  select p.role
  from public.profiles p
  left join public.platform_tenants t on t.organization_id = p.organization_id
  where p.id = auth.uid()
    and p.active = true
    and coalesce(t.status,'active') not in ('suspended','cancelled')
  limit 1
$function$;

create or replace function public.get_my_tenant_access()
returns table (
  organization_id uuid,
  organization_name text,
  status text,
  allowed boolean,
  suspension_reason text,
  renews_on date,
  next_payment_on date
)
language sql
stable
security definer
set search_path to 'public'
as $function$
  select
    p.organization_id,
    o.name,
    coalesce(t.status,'active'),
    (p.active = true and coalesce(t.status,'active') not in ('suspended','cancelled')),
    t.suspension_reason,
    t.renews_on,
    t.next_payment_on
  from public.profiles p
  join public.organizations o on o.id = p.organization_id
  left join public.platform_tenants t on t.organization_id = p.organization_id
  where p.id = auth.uid()
  limit 1
$function$;

grant execute on function public.get_my_tenant_access() to authenticated;
