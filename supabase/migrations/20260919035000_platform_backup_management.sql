create or replace function public.platform_trigger_backup(target_org uuid default null)
returns bigint
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  backup_token text;
  request_id bigint;
begin
  if target_org is not null and not exists (
    select 1 from public.organizations where id=target_org
  ) then
    raise exception 'Organización no encontrada';
  end if;

  select token into backup_token
  from private.backup_scheduler
  limit 1;

  if backup_token is null or length(backup_token)=0 then
    raise exception 'Token de respaldo no configurado';
  end if;

  select net.http_post(
    url := 'https://ibhgisndtaclvwznqugu.supabase.co/functions/v1/crm-backup',
    headers := jsonb_build_object(
      'Content-Type','application/json',
      'x-backup-token',backup_token
    ),
    body := jsonb_build_object(
      'scheduled',true,
      'target_org',case when target_org is null then null else target_org::text end,
      'requested_by','platform'
    ),
    timeout_milliseconds := 120000
  ) into request_id;

  return request_id;
end;
$function$;

revoke all on function public.platform_trigger_backup(uuid) from public, anon, authenticated;
grant execute on function public.platform_trigger_backup(uuid) to service_role;

create index if not exists backup_runs_organization_started_idx
  on public.backup_runs(organization_id, started_at desc);
