create or replace function public.platform_apply_billing_rules()
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  suspended_ids uuid[];
  affected integer := 0;
begin
  with due as (
    update public.platform_tenants
       set status = 'suspended',
           suspended_at = now(),
           suspension_reason = 'Pago vencido: suspensión automática',
           updated_at = now()
     where status = 'active'
       and auto_suspend_on_overdue = true
       and next_payment_on is not null
       and next_payment_on < current_date
       and coalesce(grace_until, next_payment_on) < current_date
     returning organization_id
  )
  select coalesce(array_agg(organization_id),'{}'::uuid[]), count(*)
    into suspended_ids, affected
  from due;

  if affected > 0 then
    insert into public.platform_activity(
      admin_user_id, organization_id, event_type, summary, details
    )
    select
      null,
      x,
      'tenant_auto_suspended',
      'Organización suspendida automáticamente por pago vencido',
      jsonb_build_object('source','billing_cron','date',current_date)
    from unnest(suspended_ids) as x;
  end if;

  return jsonb_build_object(
    'ok', true,
    'suspended_count', affected,
    'organizations', suspended_ids,
    'executed_at', now()
  );
end;
$function$;

revoke all on function public.platform_apply_billing_rules() from public, anon, authenticated;

do $$
declare
  existing_job bigint;
begin
  select jobid into existing_job
  from cron.job
  where jobname = 'alva_platform_daily_billing'
  limit 1;

  if existing_job is not null then
    perform cron.unschedule(existing_job);
  end if;

  perform cron.schedule(
    'alva_platform_daily_billing',
    '15 13 * * *',
    'select public.platform_apply_billing_rules();'
  );
end $$;
