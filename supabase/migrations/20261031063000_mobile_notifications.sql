-- C&A CRM Android V2: push tokens + realtime lead notifications.
create table if not exists public.mobile_push_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  token text not null unique,
  platform text not null default 'android',
  app_version text,
  active boolean not null default true,
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists mobile_push_tokens_org_active_idx
  on public.mobile_push_tokens (organization_id, active);
create index if not exists mobile_push_tokens_user_idx
  on public.mobile_push_tokens (user_id);

alter table public.mobile_push_tokens enable row level security;
grant select, insert, update, delete on public.mobile_push_tokens to authenticated;

create policy "mobile_push_tokens_select_own"
  on public.mobile_push_tokens for select
  to authenticated
  using (user_id = (select auth.uid()));

create policy "mobile_push_tokens_insert_own_org"
  on public.mobile_push_tokens for insert
  to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.profiles p
      where p.id = (select auth.uid())
        and p.organization_id = mobile_push_tokens.organization_id
        and p.active = true
    )
  );

create policy "mobile_push_tokens_update_own_org"
  on public.mobile_push_tokens for update
  to authenticated
  using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.profiles p
      where p.id = (select auth.uid())
        and p.organization_id = mobile_push_tokens.organization_id
        and p.active = true
    )
  );

create policy "mobile_push_tokens_delete_own"
  on public.mobile_push_tokens for delete
  to authenticated
  using (user_id = (select auth.uid()));

-- New leads can be observed by authenticated clients under the existing leads RLS policies.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname='supabase_realtime' and schemaname='public' and tablename='leads'
  ) then
    alter publication supabase_realtime add table public.leads;
  end if;
end $$;
