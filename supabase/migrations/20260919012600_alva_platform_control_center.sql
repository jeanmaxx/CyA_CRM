create table if not exists public.platform_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  role text not null default 'admin' check (role in ('owner','admin','support','billing')),
  active boolean not null default true,
  permissions jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.crm_plans (
  id text primary key,
  name text not null,
  description text,
  active boolean not null default true,
  currency text not null default 'MXN',
  monthly_price_cents integer,
  user_limit integer,
  modules text[] not null default '{}'::text[],
  features jsonb not null default '{}'::jsonb,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.platform_tenants (
  organization_id uuid primary key references public.organizations(id) on delete cascade,
  plan_id text references public.crm_plans(id) on update cascade,
  status text not null default 'implementation' check (status in ('implementation','active','suspended','cancelled')),
  onboarding_stage text not null default 'setup',
  primary_contact_name text,
  primary_contact_email text,
  primary_contact_phone text,
  billing_email text,
  seat_limit integer,
  modules_override jsonb not null default '{}'::jsonb,
  contract_started_on date,
  renews_on date,
  trial_ends_on date,
  notes text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.platform_activity (
  id bigint generated always as identity primary key,
  admin_user_id uuid references auth.users(id) on delete set null,
  organization_id uuid references public.organizations(id) on delete set null,
  event_type text not null,
  summary text not null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists platform_tenants_status_idx on public.platform_tenants(status);
create index if not exists platform_tenants_plan_idx on public.platform_tenants(plan_id);
create index if not exists platform_activity_org_created_idx on public.platform_activity(organization_id, created_at desc);
create index if not exists platform_activity_created_idx on public.platform_activity(created_at desc);

alter table public.platform_admins enable row level security;
alter table public.crm_plans enable row level security;
alter table public.platform_tenants enable row level security;
alter table public.platform_activity enable row level security;

insert into public.crm_plans (id,name,description,user_limit,modules,sort_order)
values
  ('essential','Esencial','Operación base para equipos pequeños',5,array['prospects','clients','agenda','dashboard'],10),
  ('professional','Profesional','Operación completa para equipos en crecimiento',20,array['prospects','clients','agenda','dashboard','finance','collaborators','documents','reports'],20),
  ('enterprise','Empresa','Configuración avanzada y acompañamiento para operaciones complejas',null,array['prospects','clients','agenda','dashboard','finance','collaborators','documents','reports','multi_office','custom_workflows'],30)
on conflict (id) do update set name=excluded.name,description=excluded.description,user_limit=excluded.user_limit,modules=excluded.modules,sort_order=excluded.sort_order,updated_at=now();

insert into public.platform_admins (user_id,display_name,role,active)
values ('69a3de56-4b22-4a7e-a533-027ea312d27b','Administrador Técnico','owner',true)
on conflict (user_id) do update set display_name=excluded.display_name,role='owner',active=true,updated_at=now();

insert into public.platform_tenants (organization_id,plan_id,status,onboarding_stage,seat_limit,contract_started_on,notes)
values ('ca000000-0000-4000-8000-000000000001','professional','active','live',20,'2026-09-02','Organización piloto de ALVA CRM.')
on conflict (organization_id) do update set plan_id=excluded.plan_id,status=excluded.status,onboarding_stage=excluded.onboarding_stage,seat_limit=coalesce(public.platform_tenants.seat_limit,excluded.seat_limit),updated_at=now();

insert into public.platform_activity (admin_user_id,organization_id,event_type,summary,details)
select '69a3de56-4b22-4a7e-a533-027ea312d27b','ca000000-0000-4000-8000-000000000001','platform_initialized','Control Center inicializado',jsonb_build_object('phase',2,'source','migration')
where not exists (select 1 from public.platform_activity where event_type='platform_initialized' and organization_id='ca000000-0000-4000-8000-000000000001');