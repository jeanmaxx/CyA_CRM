create table if not exists public.platform_sales_leads (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  company text not null,
  contact text not null,
  need text,
  status text not null default 'new'
    check (status in ('new','contacted','demo','qualified','won','lost')),
  source text not null default 'website',
  notes text,
  assigned_to uuid references auth.users(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists platform_sales_leads_status_created_idx
  on public.platform_sales_leads(status, created_at desc);
create index if not exists platform_sales_leads_assigned_idx
  on public.platform_sales_leads(assigned_to);

alter table public.platform_sales_leads enable row level security;