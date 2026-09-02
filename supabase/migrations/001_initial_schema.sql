-- C&A CRM Suite — Supabase schema v1
-- Ejecutar una sola vez en Supabase > SQL Editor.
-- No contiene contraseñas, datos de clientes ni claves privadas.

begin;

create extension if not exists pgcrypto;

-- La aplicación pertenece inicialmente a una sola organización.
create table if not exists public.organizations (
  id uuid primary key,
  name text not null,
  slug text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.organizations (id, name, slug)
values ('ca000000-0000-4000-8000-000000000001', 'Casillas & Asociados', 'casillas-asociados')
on conflict (id) do update set name = excluded.name;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  legacy_id text,
  email text,
  full_name text not null,
  city text,
  role text not null default 'advisor' check (role in ('admin', 'advisor')),
  active boolean not null default true,
  photo_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, legacy_id)
);

create table if not exists public.app_settings (
  organization_id uuid primary key references public.organizations(id) on delete cascade,
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.services (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  id text not null,
  name text not null,
  active boolean not null default true,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (organization_id, id)
);

create table if not exists public.collaborators (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  id text not null,
  advisor_id uuid references public.profiles(id) on delete set null,
  legacy_advisor_id text,
  name text not null,
  active boolean not null default true,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (organization_id, id)
);

create table if not exists public.leads (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  id text not null,
  advisor_id uuid references public.profiles(id) on delete set null,
  legacy_advisor_id text,
  collaborator_id text,
  name text not null,
  phone text,
  curp text,
  service_id text,
  status text not null,
  archive_type text,
  recontact_date date,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (organization_id, id)
);

create table if not exists public.clients (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  id text not null,
  advisor_id uuid references public.profiles(id) on delete set null,
  legacy_advisor_id text,
  collaborator_id text,
  name text not null,
  phone text,
  curp text,
  service_id text,
  stage text not null,
  archived boolean not null default false,
  discarded boolean not null default false,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (organization_id, id)
);

create table if not exists public.agenda_events (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  id text not null,
  advisor_id uuid references public.profiles(id) on delete set null,
  legacy_advisor_id text,
  client_id text,
  lead_id text,
  title text not null,
  event_type text not null,
  event_date date not null,
  event_time time,
  completed boolean not null default false,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (organization_id, id)
);

create table if not exists public.message_templates (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  id text not null,
  name text not null,
  template_type text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (organization_id, id)
);

-- Copia inmutable del JSON original durante la migración.
create table if not exists public.legacy_imports (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  imported_by uuid references public.profiles(id) on delete set null,
  source_filename text,
  sha256 text,
  payload jsonb not null,
  created_at timestamptz not null default now()
);

insert into public.app_settings (organization_id, payload)
values ('ca000000-0000-4000-8000-000000000001', jsonb_build_object('schemaVersion', 1, 'cloudMigration', true))
on conflict (organization_id) do nothing;

-- Índices usados por filtros, agenda y pipeline.
create index if not exists idx_profiles_org on public.profiles (organization_id);
create index if not exists idx_clients_org_advisor on public.clients (organization_id, advisor_id);
create index if not exists idx_clients_stage on public.clients (organization_id, service_id, stage);
create index if not exists idx_leads_org_advisor on public.leads (organization_id, advisor_id);
create index if not exists idx_leads_status on public.leads (organization_id, status);
create index if not exists idx_agenda_date on public.agenda_events (organization_id, event_date);
create index if not exists idx_agenda_advisor on public.agenda_events (organization_id, advisor_id);

-- Actualización automática de updated_at.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'organizations','profiles','app_settings','services','collaborators',
    'leads','clients','agenda_events','message_templates'
  ] loop
    execute format('drop trigger if exists %I on public.%I', 'set_' || table_name || '_updated_at', table_name);
    execute format(
      'create trigger %I before update on public.%I for each row execute function public.set_updated_at()',
      'set_' || table_name || '_updated_at', table_name
    );
  end loop;
end;
$$;

-- Cada usuario nuevo recibe un perfil de asesor. Solo un administrador puede elevar su rol.
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (
    id, organization_id, email, full_name, role, active
  ) values (
    new.id,
    'ca000000-0000-4000-8000-000000000001',
    new.email,
    coalesce(nullif(new.raw_user_meta_data ->> 'full_name', ''), split_part(coalesce(new.email, 'asesor'), '@', 1)),
    'advisor',
    true
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();

-- Funciones auxiliares para políticas RLS.
create or replace function public.current_org_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select organization_id from public.profiles where id = auth.uid() and active = true limit 1
$$;

create or replace function public.current_app_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid() and active = true limit 1
$$;

create or replace function public.can_access_advisor(target_advisor uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_app_role() = 'admin'
    or target_advisor is null
    or target_advisor = auth.uid()
$$;

revoke all on function public.current_org_id() from public;
revoke all on function public.current_app_role() from public;
revoke all on function public.can_access_advisor(uuid) from public;
grant execute on function public.current_org_id() to authenticated;
grant execute on function public.current_app_role() to authenticated;
grant execute on function public.can_access_advisor(uuid) to authenticated;

-- RLS obligatorio en todas las tablas expuestas.
alter table public.organizations enable row level security;
alter table public.profiles enable row level security;
alter table public.app_settings enable row level security;
alter table public.services enable row level security;
alter table public.collaborators enable row level security;
alter table public.leads enable row level security;
alter table public.clients enable row level security;
alter table public.agenda_events enable row level security;
alter table public.message_templates enable row level security;
alter table public.legacy_imports enable row level security;

-- Quitar acceso anónimo a información del CRM.
revoke all on public.organizations, public.profiles, public.app_settings, public.services,
  public.collaborators, public.leads, public.clients, public.agenda_events,
  public.message_templates, public.legacy_imports from anon;

grant select on public.organizations to authenticated;
grant select, update on public.profiles to authenticated;
grant select, insert, update, delete on public.app_settings, public.services,
  public.collaborators, public.leads, public.clients, public.agenda_events,
  public.message_templates to authenticated;
grant select, insert on public.legacy_imports to authenticated;

-- Organización.
drop policy if exists organizations_select on public.organizations;
create policy organizations_select on public.organizations
  for select to authenticated
  using (id = public.current_org_id());

-- Perfiles.
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles
  for select to authenticated
  using (organization_id = public.current_org_id());

drop policy if exists profiles_update on public.profiles;
create policy profiles_update on public.profiles
  for update to authenticated
  using (
    organization_id = public.current_org_id()
    and (id = auth.uid() or public.current_app_role() = 'admin')
  )
  with check (
    organization_id = public.current_org_id()
    and (
      public.current_app_role() = 'admin'
      or (id = auth.uid() and role = 'advisor')
    )
  );

-- Configuración, servicios y plantillas: lectura general; escritura solo Admin.
drop policy if exists app_settings_select on public.app_settings;
create policy app_settings_select on public.app_settings
  for select to authenticated using (organization_id = public.current_org_id());
drop policy if exists app_settings_admin_write on public.app_settings;
create policy app_settings_admin_write on public.app_settings
  for all to authenticated
  using (organization_id = public.current_org_id() and public.current_app_role() = 'admin')
  with check (organization_id = public.current_org_id() and public.current_app_role() = 'admin');

drop policy if exists services_select on public.services;
create policy services_select on public.services
  for select to authenticated using (organization_id = public.current_org_id());
drop policy if exists services_admin_write on public.services;
create policy services_admin_write on public.services
  for all to authenticated
  using (organization_id = public.current_org_id() and public.current_app_role() = 'admin')
  with check (organization_id = public.current_org_id() and public.current_app_role() = 'admin');

drop policy if exists templates_select on public.message_templates;
create policy templates_select on public.message_templates
  for select to authenticated using (organization_id = public.current_org_id());
drop policy if exists templates_admin_write on public.message_templates;
create policy templates_admin_write on public.message_templates
  for all to authenticated
  using (organization_id = public.current_org_id() and public.current_app_role() = 'admin')
  with check (organization_id = public.current_org_id() and public.current_app_role() = 'admin');

-- Colaboradores: Admin ve todos; asesor ve únicamente los propios.
drop policy if exists collaborators_select on public.collaborators;
create policy collaborators_select on public.collaborators
  for select to authenticated
  using (
    organization_id = public.current_org_id()
    and (public.current_app_role() = 'admin' or advisor_id = auth.uid())
  );
drop policy if exists collaborators_write on public.collaborators;
create policy collaborators_write on public.collaborators
  for all to authenticated
  using (
    organization_id = public.current_org_id()
    and (public.current_app_role() = 'admin' or advisor_id = auth.uid())
  )
  with check (
    organization_id = public.current_org_id()
    and (public.current_app_role() = 'admin' or advisor_id = auth.uid())
  );

-- Registros operativos: Admin ve todo; asesor solo lo propio o lo no asignado.
drop policy if exists leads_select on public.leads;
create policy leads_select on public.leads
  for select to authenticated
  using (organization_id = public.current_org_id() and public.can_access_advisor(advisor_id));
drop policy if exists leads_insert on public.leads;
create policy leads_insert on public.leads
  for insert to authenticated
  with check (organization_id = public.current_org_id() and public.can_access_advisor(advisor_id));
drop policy if exists leads_update on public.leads;
create policy leads_update on public.leads
  for update to authenticated
  using (organization_id = public.current_org_id() and public.can_access_advisor(advisor_id))
  with check (organization_id = public.current_org_id() and public.can_access_advisor(advisor_id));
drop policy if exists leads_delete on public.leads;
create policy leads_delete on public.leads
  for delete to authenticated
  using (organization_id = public.current_org_id() and public.can_access_advisor(advisor_id));

drop policy if exists clients_select on public.clients;
create policy clients_select on public.clients
  for select to authenticated
  using (organization_id = public.current_org_id() and public.can_access_advisor(advisor_id));
drop policy if exists clients_insert on public.clients;
create policy clients_insert on public.clients
  for insert to authenticated
  with check (organization_id = public.current_org_id() and public.can_access_advisor(advisor_id));
drop policy if exists clients_update on public.clients;
create policy clients_update on public.clients
  for update to authenticated
  using (organization_id = public.current_org_id() and public.can_access_advisor(advisor_id))
  with check (organization_id = public.current_org_id() and public.can_access_advisor(advisor_id));
drop policy if exists clients_delete on public.clients;
create policy clients_delete on public.clients
  for delete to authenticated
  using (organization_id = public.current_org_id() and public.can_access_advisor(advisor_id));

drop policy if exists agenda_select on public.agenda_events;
create policy agenda_select on public.agenda_events
  for select to authenticated
  using (organization_id = public.current_org_id() and public.can_access_advisor(advisor_id));
drop policy if exists agenda_insert on public.agenda_events;
create policy agenda_insert on public.agenda_events
  for insert to authenticated
  with check (organization_id = public.current_org_id() and public.can_access_advisor(advisor_id));
drop policy if exists agenda_update on public.agenda_events;
create policy agenda_update on public.agenda_events
  for update to authenticated
  using (organization_id = public.current_org_id() and public.can_access_advisor(advisor_id))
  with check (organization_id = public.current_org_id() and public.can_access_advisor(advisor_id));
drop policy if exists agenda_delete on public.agenda_events;
create policy agenda_delete on public.agenda_events
  for delete to authenticated
  using (organization_id = public.current_org_id() and public.can_access_advisor(advisor_id));

-- El respaldo original solamente puede ser leído o insertado por un administrador.
drop policy if exists legacy_imports_admin_select on public.legacy_imports;
create policy legacy_imports_admin_select on public.legacy_imports
  for select to authenticated
  using (organization_id = public.current_org_id() and public.current_app_role() = 'admin');
drop policy if exists legacy_imports_admin_insert on public.legacy_imports;
create policy legacy_imports_admin_insert on public.legacy_imports
  for insert to authenticated
  with check (
    organization_id = public.current_org_id()
    and public.current_app_role() = 'admin'
    and imported_by = auth.uid()
  );

-- Buckets: marca pública; fotografías privadas.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('crm-branding', 'crm-branding', true, 5242880, array['image/png','image/jpeg','image/webp','image/svg+xml']),
  ('crm-avatars', 'crm-avatars', false, 5242880, array['image/png','image/jpeg','image/webp'])
on conflict (id) do nothing;

drop policy if exists branding_public_read on storage.objects;
create policy branding_public_read on storage.objects
  for select to public using (bucket_id = 'crm-branding');
drop policy if exists branding_admin_insert on storage.objects;
create policy branding_admin_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'crm-branding'
    and (storage.foldername(name))[1] = public.current_org_id()::text
    and public.current_app_role() = 'admin'
  );
drop policy if exists branding_admin_update on storage.objects;
create policy branding_admin_update on storage.objects
  for update to authenticated
  using (
    bucket_id = 'crm-branding'
    and (storage.foldername(name))[1] = public.current_org_id()::text
    and public.current_app_role() = 'admin'
  )
  with check (
    bucket_id = 'crm-branding'
    and (storage.foldername(name))[1] = public.current_org_id()::text
    and public.current_app_role() = 'admin'
  );
drop policy if exists branding_admin_delete on storage.objects;
create policy branding_admin_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'crm-branding'
    and (storage.foldername(name))[1] = public.current_org_id()::text
    and public.current_app_role() = 'admin'
  );

drop policy if exists avatars_org_read on storage.objects;
create policy avatars_org_read on storage.objects
  for select to authenticated
  using (
    bucket_id = 'crm-avatars'
    and (storage.foldername(name))[1] = public.current_org_id()::text
  );
drop policy if exists avatars_insert on storage.objects;
create policy avatars_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'crm-avatars'
    and (storage.foldername(name))[1] = public.current_org_id()::text
    and (
      public.current_app_role() = 'admin'
      or (storage.foldername(name))[2] = auth.uid()::text
    )
  );
drop policy if exists avatars_update on storage.objects;
create policy avatars_update on storage.objects
  for update to authenticated
  using (
    bucket_id = 'crm-avatars'
    and (storage.foldername(name))[1] = public.current_org_id()::text
    and (public.current_app_role() = 'admin' or (storage.foldername(name))[2] = auth.uid()::text)
  )
  with check (
    bucket_id = 'crm-avatars'
    and (storage.foldername(name))[1] = public.current_org_id()::text
    and (public.current_app_role() = 'admin' or (storage.foldername(name))[2] = auth.uid()::text)
  );
drop policy if exists avatars_delete on storage.objects;
create policy avatars_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'crm-avatars'
    and (storage.foldername(name))[1] = public.current_org_id()::text
    and (public.current_app_role() = 'admin' or (storage.foldername(name))[2] = auth.uid()::text)
  );

commit;

-- Resultado esperado: sin filas de clientes todavía.
select
  (select count(*) from public.organizations) as organizations,
  (select count(*) from public.clients) as clients,
  (select count(*) from public.leads) as leads,
  (select count(*) from public.agenda_events) as agenda_events;
