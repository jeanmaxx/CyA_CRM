create table if not exists public.platform_alerts (
  id uuid primary key default gen_random_uuid(),
  alert_key text not null unique,
  organization_id uuid references public.organizations(id) on delete cascade,
  category text not null check (category in ('billing','renewal','backup','template','onboarding','system')),
  severity text not null check (severity in ('info','warning','critical')),
  status text not null default 'open' check (status in ('open','dismissed','resolved')),
  title text not null,
  message text,
  due_on date,
  metadata jsonb not null default '{}'::jsonb,
  first_detected_at timestamptz not null default now(),
  last_detected_at timestamptz not null default now(),
  dismissed_by uuid references auth.users(id) on delete set null,
  dismissed_at timestamptz,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists platform_alerts_status_severity_idx
  on public.platform_alerts(status,severity,last_detected_at desc);
create index if not exists platform_alerts_org_idx
  on public.platform_alerts(organization_id,last_detected_at desc);

alter table public.platform_alerts enable row level security;

create or replace function public.platform_refresh_alerts()
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  open_count integer;
  critical_count integer;
  warning_count integer;
  info_count integer;
begin
  create temp table if not exists tmp_platform_current_alerts (
    alert_key text primary key,
    organization_id uuid,
    category text,
    severity text,
    title text,
    message text,
    due_on date,
    metadata jsonb
  ) on commit drop;
  truncate tmp_platform_current_alerts;

  insert into tmp_platform_current_alerts
    (alert_key,organization_id,category,severity,title,message,due_on,metadata)
  select
    'payment_overdue:'||t.organization_id::text,
    t.organization_id,'billing','critical',
    'Pago vencido',
    'El pago programado para '||to_char(t.next_payment_on,'DD/MM/YYYY')||' superó el periodo de gracia.',
    t.next_payment_on,
    jsonb_build_object('next_payment_on',t.next_payment_on,'grace_until',t.grace_until)
  from public.platform_tenants t
  where t.status='active'
    and t.next_payment_on is not null
    and t.next_payment_on < current_date
    and coalesce(t.grace_until,t.next_payment_on) < current_date

  union all
  select
    'payment_grace:'||t.organization_id::text,
    t.organization_id,'billing','warning',
    'Pago en periodo de gracia',
    'El pago venció el '||to_char(t.next_payment_on,'DD/MM/YYYY')||
      ' y mantiene gracia hasta '||to_char(t.grace_until,'DD/MM/YYYY')||'.',
    t.grace_until,
    jsonb_build_object('next_payment_on',t.next_payment_on,'grace_until',t.grace_until)
  from public.platform_tenants t
  where t.status='active'
    and t.next_payment_on is not null
    and t.next_payment_on < current_date
    and t.grace_until is not null
    and t.grace_until >= current_date

  union all
  select
    'payment_due:'||t.organization_id::text,
    t.organization_id,'billing','info',
    'Pago próximo',
    'El próximo pago está programado para '||to_char(t.next_payment_on,'DD/MM/YYYY')||'.',
    t.next_payment_on,
    jsonb_build_object('next_payment_on',t.next_payment_on)
  from public.platform_tenants t
  where t.status='active'
    and t.next_payment_on between current_date and current_date+7

  union all
  select
    'renewal_due:'||t.organization_id::text,
    t.organization_id,'renewal','warning',
    'Renovación próxima',
    'El contrato renueva el '||to_char(t.renews_on,'DD/MM/YYYY')||'.',
    t.renews_on,
    jsonb_build_object('renews_on',t.renews_on,'notice_days',t.renewal_notice_days)
  from public.platform_tenants t
  where t.status in ('active','implementation')
    and t.renews_on is not null
    and t.renews_on between current_date and current_date+greatest(coalesce(t.renewal_notice_days,15),1)

  union all
  select
    'template_missing:'||t.organization_id::text,
    t.organization_id,'template','info',
    'Plantilla Word no configurada',
    'La organización usa el contrato estándar porque no tiene una plantilla DOCX v3 activa.',
    null,
    '{}'::jsonb
  from public.platform_tenants t
  where t.status in ('active','implementation')
    and not exists (
      select 1 from public.contract_templates ct
      where ct.organization_id=t.organization_id
        and ct.version='retiro-contrato-pagare-v3'
        and ct.active=true
    )

  union all
  select
    'backup_stale:'||t.organization_id::text,
    t.organization_id,'backup','warning',
    'Respaldo pendiente o atrasado',
    case when b.last_backup is null
      then 'La organización todavía no tiene un respaldo completo.'
      else 'El último respaldo completo terminó el '||to_char(b.last_backup,'DD/MM/YYYY')||'.'
    end,
    null,
    jsonb_build_object('last_backup',b.last_backup)
  from public.platform_tenants t
  left join (
    select organization_id,max(finished_at)::date as last_backup
    from public.backup_runs
    where status in ('complete','external_pending')
    group by organization_id
  ) b on b.organization_id=t.organization_id
  where t.status in ('active','implementation')
    and (b.last_backup is null or b.last_backup < current_date-2);

  insert into public.platform_alerts
    (alert_key,organization_id,category,severity,status,title,message,due_on,metadata,first_detected_at,last_detected_at,updated_at)
  select
    x.alert_key,x.organization_id,x.category,x.severity,'open',x.title,x.message,x.due_on,x.metadata,now(),now(),now()
  from tmp_platform_current_alerts x
  on conflict (alert_key) do update set
    organization_id=excluded.organization_id,
    category=excluded.category,
    severity=excluded.severity,
    title=excluded.title,
    message=excluded.message,
    due_on=excluded.due_on,
    metadata=excluded.metadata,
    status=case when platform_alerts.status='resolved' then 'open' else platform_alerts.status end,
    dismissed_by=case when platform_alerts.status='resolved' then null else platform_alerts.dismissed_by end,
    dismissed_at=case when platform_alerts.status='resolved' then null else platform_alerts.dismissed_at end,
    resolved_at=null,
    last_detected_at=now(),
    updated_at=now();

  update public.platform_alerts a
  set status='resolved',resolved_at=now(),updated_at=now()
  where a.status<>'resolved'
    and not exists(select 1 from tmp_platform_current_alerts x where x.alert_key=a.alert_key);

  select count(*) filter(where status='open'),
         count(*) filter(where status='open' and severity='critical'),
         count(*) filter(where status='open' and severity='warning'),
         count(*) filter(where status='open' and severity='info')
  into open_count,critical_count,warning_count,info_count
  from public.platform_alerts;

  return jsonb_build_object(
    'ok',true,
    'open',open_count,
    'critical',critical_count,
    'warning',warning_count,
    'info',info_count,
    'refreshed_at',now()
  );
end;
$function$;

revoke all on function public.platform_refresh_alerts() from public,anon,authenticated;
grant execute on function public.platform_refresh_alerts() to service_role;

do $$
declare existing_job bigint;
begin
  select jobid into existing_job from cron.job where jobname='alva_platform_daily_alerts' limit 1;
  if existing_job is not null then perform cron.unschedule(existing_job); end if;
  perform cron.schedule(
    'alva_platform_daily_alerts',
    '30 13 * * *',
    'select public.platform_refresh_alerts();'
  );
end $$;
