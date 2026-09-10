begin;
create table public.backup_runs(id uuid primary key default gen_random_uuid(),organization_id uuid not null references public.organizations(id),actor_id uuid,kind text not null,status text not null default 'running',started_at timestamptz not null default now(),finished_at timestamptz,path text,drive_file_id text,bytes bigint,sha256 text,counts jsonb,error text);
alter table public.backup_runs enable row level security;
grant select on public.backup_runs to authenticated;
grant all on public.backup_runs to service_role;
create policy backup_runs_read on public.backup_runs for select to authenticated using(organization_id=public.current_org_id() and (actor_id=auth.uid() or public.current_app_role()='tech_admin'));
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('crm-backups','crm-backups',false,104857600,array['application/zip']) on conflict(id) do nothing;
create policy backup_file_read on storage.objects for select to authenticated using(bucket_id='crm-backups' and exists(select 1 from public.backup_runs b where b.path=name and b.organization_id=public.current_org_id() and (b.actor_id=auth.uid() or public.current_app_role()='tech_admin')));
create table private.backup_scheduler(id bool primary key default true check(id),token text not null default encode(extensions.gen_random_bytes(32),'hex'));
insert into private.backup_scheduler(id) values(true);
grant usage on schema private to service_role;
grant select on private.backup_scheduler to service_role;
create function public.crm_backup_cron_authorize(provided_token text) returns boolean language sql stable security invoker set search_path='' as $$ select coalesce(length(provided_token)=64 and exists(select 1 from private.backup_scheduler where token=provided_token),false) $$;
revoke all on function public.crm_backup_cron_authorize(text) from public;
grant execute on function public.crm_backup_cron_authorize(text) to service_role;
create function public.crm_backup_data(target_org uuid) returns jsonb language plpgsql stable security invoker set search_path='' as $$
begin
 if coalesce(auth.role(),'')<>'service_role' and (auth.uid() is null or target_org is distinct from public.current_org_id()) then raise exception 'Acceso denegado'; end if;
 return jsonb_build_object('format','cya-crm-database-v1','organization_id',target_org,'captured_at',now(),
 'clients',(select coalesce(jsonb_agg(c),'[]') from public.clients c where organization_id=target_org),
 'leads',(select coalesce(jsonb_agg(c),'[]') from public.leads c where organization_id=target_org),
 'agenda_events',(select coalesce(jsonb_agg(c),'[]') from public.agenda_events c where organization_id=target_org),
 'collaborators',(select coalesce(jsonb_agg(c),'[]') from public.collaborators c where organization_id=target_org),
 'services',(select coalesce(jsonb_agg(c),'[]') from public.services c where organization_id=target_org),
 'profiles',(select coalesce(jsonb_agg(c),'[]') from public.profiles c where organization_id=target_org),
 'app_settings',(select coalesce(jsonb_agg(c),'[]') from public.app_settings c where organization_id=target_org),
 'message_templates',(select coalesce(jsonb_agg(c),'[]') from public.message_templates c where organization_id=target_org),
 'contract_templates',(select coalesce(jsonb_agg(c),'[]') from public.contract_templates c where organization_id=target_org),
 'record_audit',(select coalesce(jsonb_agg(c),'[]') from public.record_audit c where organization_id=target_org),
 'recovery_records',(select coalesce(jsonb_agg(c),'[]') from public.recovery_records c where organization_id=target_org));
end $$;
revoke all on function public.crm_backup_data(uuid) from public;
grant execute on function public.crm_backup_data(uuid) to authenticated,service_role;
grant select on public.recovery_records to service_role;
create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;
-- 07:00 UTC = 01:00 in Querétaro. The random token never enters frontend code or cron command text.
select cron.schedule('cya-daily-backup','0 7 * * *',$job$select net.http_post(url:='https://ibhgisndtaclvwznqugu.supabase.co/functions/v1/crm-backup',headers:=jsonb_build_object('Content-Type','application/json','x-backup-token',(select token from private.backup_scheduler where id)),body:='{"scheduled":true}'::jsonb,timeout_milliseconds:=120000);$job$);
commit;
