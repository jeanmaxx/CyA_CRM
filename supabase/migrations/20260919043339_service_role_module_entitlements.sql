create or replace function public.organization_module_allowed(target_org uuid,module_name text)
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $function$
  select coalesce(
    case
      when jsonb_typeof(coalesce(t.modules_override,'{}'::jsonb)->'enabled')='array'
        then module_name in (select jsonb_array_elements_text(t.modules_override->'enabled'))
      else module_name=any(coalesce(p.modules,'{}'::text[]))
    end,
    false
  )
  from public.platform_tenants t
  left join public.crm_plans p on p.id=t.plan_id
  where t.organization_id=target_org
    and t.status not in ('suspended','cancelled')
  limit 1
$function$;

revoke all on function public.organization_module_allowed(uuid,text) from public,anon,authenticated;
grant execute on function public.organization_module_allowed(uuid,text) to service_role;
