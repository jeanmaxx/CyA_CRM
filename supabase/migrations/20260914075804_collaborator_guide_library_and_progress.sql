create table if not exists public.collaborator_guide_content (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  slug text not null,
  title text not null,
  subtitle text not null default '',
  icon text not null default '▤',
  body text not null default '',
  source_label text not null default '',
  source_url text not null default '',
  sort_order integer not null default 100,
  active boolean not null default true,
  updated_at timestamptz not null default now(),
  updated_by uuid null references auth.users(id) on delete set null,
  primary key (organization_id, slug)
);

create table if not exists public.collaborator_guide_progress (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  collaborator_id text not null,
  record_type text not null check (record_type in ('lead','client')),
  record_id text not null,
  steps jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (organization_id, collaborator_id, record_type, record_id),
  constraint collaborator_guide_progress_collaborator_fk
    foreign key (organization_id, collaborator_id)
    references public.collaborators(organization_id,id)
    on delete cascade
);

create index if not exists collaborator_guide_content_active_idx
  on public.collaborator_guide_content(organization_id,active,sort_order);
create index if not exists collaborator_guide_progress_lookup_idx
  on public.collaborator_guide_progress(organization_id,collaborator_id,record_type,record_id);

alter table public.collaborator_guide_content enable row level security;
alter table public.collaborator_guide_progress enable row level security;

-- These tables are intentionally server-only. Portal access goes through the
-- collaborator-portal Edge Function, which enforces collaborator ownership.
revoke all on public.collaborator_guide_content from anon, authenticated;
revoke all on public.collaborator_guide_progress from anon, authenticated;
grant all on public.collaborator_guide_content to service_role;
grant all on public.collaborator_guide_progress to service_role;
