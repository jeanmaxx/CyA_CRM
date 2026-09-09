begin;

alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check check(role in ('admin','advisor','tech_admin'));
create unique index if not exists one_active_technical_admin_per_org on public.profiles(organization_id) where role='tech_admin' and active;

create or replace function public.can_access_advisor(target_advisor uuid)
returns boolean language sql stable security invoker set search_path='' as $$
 select auth.uid() is not null and (coalesce(public.current_app_role() in ('admin','tech_admin'),false) or target_advisor=auth.uid())
$$;
revoke all on function public.can_access_advisor(uuid) from public;
grant execute on function public.can_access_advisor(uuid) to authenticated;

-- Global settings are reserved for the technical account. Operational access is preserved.
do $migration$
declare p record; q text; w text; technical_only boolean;
begin
 for p in select * from pg_policies where schemaname in ('public','storage') and (coalesce(qual,'') like '%current_app_role()%admin%' or coalesce(with_check,'') like '%current_app_role()%admin%') loop
  if p.tablename='profiles' then continue; end if;
  technical_only := p.tablename in ('app_settings','services','legacy_imports') or p.policyname like 'branding_admin_%' or p.policyname like 'avatars_%';
  q:=p.qual; w:=p.with_check;
  if technical_only then
   q:=replace(q,'current_app_role() = ''admin''::text','current_app_role() = ''tech_admin''::text');
   w:=replace(w,'current_app_role() = ''admin''::text','current_app_role() = ''tech_admin''::text');
  else
   q:=replace(q,'current_app_role() = ''admin''::text','current_app_role() = ANY (ARRAY[''admin''::text,''tech_admin''::text])');
   w:=replace(w,'current_app_role() = ''admin''::text','current_app_role() = ANY (ARRAY[''admin''::text,''tech_admin''::text])');
  end if;
  execute format('alter policy %I on %I.%I %s %s',p.policyname,p.schemaname,p.tablename,case when q is not null then 'using ('||q||')' else '' end,case when w is not null then 'with check ('||w||')' else '' end);
 end loop;
end $migration$;

drop policy if exists profiles_update on public.profiles;
create policy profiles_update on public.profiles for update to authenticated
 using(organization_id=public.current_org_id() and (id=auth.uid() or public.current_app_role()='tech_admin'))
 with check(organization_id=public.current_org_id() and (id=auth.uid() or public.current_app_role()='tech_admin'));

-- A self-service profile update can change the photo only, never a role or account status.
create schema if not exists private;
revoke all on schema private from public;
create or replace function private.guard_profile_update() returns trigger
language plpgsql security invoker set search_path='' as $$
begin
 if auth.uid() is not null and coalesce(auth.role(),'') <> 'service_role' and coalesce(public.current_app_role(),'') <> 'tech_admin' then
  if (to_jsonb(new)-'photo_path'-'updated_at') is distinct from (to_jsonb(old)-'photo_path'-'updated_at') then
   raise exception 'Solo el administrador técnico puede editar los datos de una cuenta' using errcode='42501';
  end if;
 end if;
 return new;
end $$;
drop trigger if exists guard_profile_update on public.profiles;
create trigger guard_profile_update before update on public.profiles for each row execute function private.guard_profile_update();

-- Server-authored audit entries cannot be edited through the client API.
create table if not exists public.record_audit(
 id bigint generated always as identity primary key,
 organization_id uuid not null references public.organizations(id),
 record_type text not null,
 record_id text not null,
 actor_id uuid,
 actor_name text not null,
 occurred_at timestamptz not null default now(),
 changes jsonb not null
);
alter table public.record_audit enable row level security;
revoke all on public.record_audit from anon, authenticated;
grant select on public.record_audit to authenticated;
create policy record_audit_read on public.record_audit for select to authenticated using(
 organization_id=public.current_org_id() and (
 (record_type='clients' and exists(select 1 from public.clients c where c.organization_id=record_audit.organization_id and c.id=record_audit.record_id and public.can_access_advisor(c.advisor_id))) or
 (record_type='leads' and exists(select 1 from public.leads l where l.organization_id=record_audit.organization_id and l.id=record_audit.record_id and public.can_access_advisor(l.advisor_id)))
 ));
create index record_audit_record_idx on public.record_audit(organization_id,record_type,record_id,occurred_at desc);
-- Definer is required solely so the trigger can append to the otherwise read-only audit table.
create or replace function private.audit_record_dates() returns trigger
language plpgsql security definer set search_path='' as $$
declare k text; before_payload jsonb; changes jsonb:='{}'; who uuid:=auth.uid(); actor text;
begin
 if who is null and coalesce(auth.role(),'') <> 'service_role' and session_user not in ('postgres','supabase_admin') then
  raise exception 'Sesión requerida' using errcode='42501';
 end if;
 before_payload:=case when tg_op='INSERT' then '{}'::jsonb else old.payload end;
 foreach k in array array['fechaRegistro','fechaAltaAfore','fechaFirmaContrato','contratoFirmado','fechaSolicitudManual','fechaSolicitudRealizada'] loop
  if (new.payload->k) is distinct from (before_payload->k) then
   changes:=changes||jsonb_build_object(k,jsonb_build_object('anterior',before_payload->k,'nuevo',new.payload->k));
  end if;
 end loop;
 if changes<>'{}'::jsonb then
  select full_name into actor from public.profiles where id=who;
  insert into public.record_audit(organization_id,record_type,record_id,actor_id,actor_name,changes)
   values(new.organization_id,tg_table_name,new.id,who,coalesce(actor,'Sistema'),changes);
 end if;
 return new;
end $$;
revoke all on function private.audit_record_dates() from public;
create trigger audit_client_dates after insert or update on public.clients for each row execute function private.audit_record_dates();
create trigger audit_lead_dates after insert or update on public.leads for each row execute function private.audit_record_dates();

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('crm-contracts','crm-contracts',false,10485760,array['application/vnd.openxmlformats-officedocument.wordprocessingml.document'])
on conflict(id) do nothing;
create policy contracts_read on storage.objects for select to authenticated using(
 bucket_id='crm-contracts' and (storage.foldername(name))[1]=public.current_org_id()::text and
 exists(select 1 from public.clients c where c.organization_id=public.current_org_id() and c.id=(storage.foldername(name))[2] and public.can_access_advisor(c.advisor_id)));
create policy contracts_insert on storage.objects for insert to authenticated with check(
 bucket_id='crm-contracts' and (storage.foldername(name))[1]=public.current_org_id()::text and
 exists(select 1 from public.clients c where c.organization_id=public.current_org_id() and c.id=(storage.foldername(name))[2] and public.can_access_advisor(c.advisor_id)));
-- No update or delete policy: generated versions are immutable.
commit;
