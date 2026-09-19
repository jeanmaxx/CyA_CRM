create or replace function public.current_effective_modules()
returns text[]
language sql
stable
security definer
set search_path to 'public'
as $function$
  select case
    when jsonb_typeof(coalesce(t.modules_override,'{}'::jsonb)->'enabled')='array'
      then coalesce(array(select jsonb_array_elements_text(t.modules_override->'enabled')),'{}'::text[])
    else coalesce(p.modules,'{}'::text[])
  end
  from public.profiles pr
  join public.platform_tenants t on t.organization_id=pr.organization_id
  left join public.crm_plans p on p.id=t.plan_id
  where pr.id=auth.uid()
    and pr.active=true
    and t.status not in ('suspended','cancelled')
  limit 1
$function$;

create or replace function public.current_module_allowed(module_name text)
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $function$
  select coalesce(module_name = any(public.current_effective_modules()),false)
$function$;

create or replace function public.get_my_tenant_entitlements()
returns table(organization_id uuid,plan_id text,plan_name text,seat_limit integer,modules text[],status text)
language sql
stable
security definer
set search_path to 'public'
as $function$
  select pr.organization_id,t.plan_id,coalesce(p.name,'Sin plan'),
         coalesce(t.seat_limit,p.user_limit),public.current_effective_modules(),t.status
  from public.profiles pr
  join public.platform_tenants t on t.organization_id=pr.organization_id
  left join public.crm_plans p on p.id=t.plan_id
  where pr.id=auth.uid() and pr.active=true
  limit 1
$function$;

revoke all on function public.current_effective_modules() from public,anon;
revoke all on function public.current_module_allowed(text) from public,anon;
revoke all on function public.get_my_tenant_entitlements() from public,anon;
grant execute on function public.current_effective_modules() to authenticated;
grant execute on function public.current_module_allowed(text) to authenticated;
grant execute on function public.get_my_tenant_entitlements() to authenticated;

drop policy if exists leads_select on public.leads;
drop policy if exists leads_insert on public.leads;
drop policy if exists leads_update on public.leads;
drop policy if exists leads_delete on public.leads;
create policy leads_select on public.leads for select to authenticated
  using (organization_id=public.current_org_id() and public.current_module_allowed('prospects') and public.can_access_advisor(advisor_id));
create policy leads_insert on public.leads for insert to authenticated
  with check (organization_id=public.current_org_id() and public.current_module_allowed('prospects') and public.can_access_advisor(advisor_id));
create policy leads_update on public.leads for update to authenticated
  using (organization_id=public.current_org_id() and public.current_module_allowed('prospects') and public.can_access_advisor(advisor_id))
  with check (organization_id=public.current_org_id() and public.current_module_allowed('prospects') and public.can_access_advisor(advisor_id));
create policy leads_delete on public.leads for delete to authenticated
  using (organization_id=public.current_org_id() and public.current_module_allowed('prospects') and public.can_access_advisor(advisor_id));

drop policy if exists clients_select on public.clients;
drop policy if exists clients_insert on public.clients;
drop policy if exists clients_update on public.clients;
drop policy if exists clients_delete on public.clients;
create policy clients_select on public.clients for select to authenticated
  using (organization_id=public.current_org_id() and public.current_module_allowed('clients') and public.can_access_advisor(advisor_id));
create policy clients_insert on public.clients for insert to authenticated
  with check (organization_id=public.current_org_id() and public.current_module_allowed('clients') and public.can_access_advisor(advisor_id));
create policy clients_update on public.clients for update to authenticated
  using (organization_id=public.current_org_id() and public.current_module_allowed('clients') and public.can_access_advisor(advisor_id))
  with check (organization_id=public.current_org_id() and public.current_module_allowed('clients') and public.can_access_advisor(advisor_id));
create policy clients_delete on public.clients for delete to authenticated
  using (organization_id=public.current_org_id() and public.current_module_allowed('clients') and public.can_access_advisor(advisor_id));

drop policy if exists agenda_select on public.agenda_events;
drop policy if exists agenda_insert on public.agenda_events;
drop policy if exists agenda_update on public.agenda_events;
drop policy if exists agenda_delete on public.agenda_events;
create policy agenda_select on public.agenda_events for select to authenticated
  using (organization_id=public.current_org_id() and public.current_module_allowed('agenda') and public.can_access_advisor(advisor_id));
create policy agenda_insert on public.agenda_events for insert to authenticated
  with check (organization_id=public.current_org_id() and public.current_module_allowed('agenda') and public.can_access_advisor(advisor_id));
create policy agenda_update on public.agenda_events for update to authenticated
  using (organization_id=public.current_org_id() and public.current_module_allowed('agenda') and public.can_access_advisor(advisor_id))
  with check (organization_id=public.current_org_id() and public.current_module_allowed('agenda') and public.can_access_advisor(advisor_id));
create policy agenda_delete on public.agenda_events for delete to authenticated
  using (organization_id=public.current_org_id() and public.current_module_allowed('agenda') and public.can_access_advisor(advisor_id));

drop policy if exists collaborators_select on public.collaborators;
drop policy if exists collaborators_write on public.collaborators;
create policy collaborators_select on public.collaborators for select to authenticated
  using (organization_id=public.current_org_id() and public.current_module_allowed('collaborators')
    and (public.current_app_role()=any(array['admin'::text,'tech_admin'::text]) or advisor_id=auth.uid()));
create policy collaborators_write on public.collaborators for all to authenticated
  using (organization_id=public.current_org_id() and public.current_module_allowed('collaborators')
    and (public.current_app_role()=any(array['admin'::text,'tech_admin'::text]) or advisor_id=auth.uid()))
  with check (organization_id=public.current_org_id() and public.current_module_allowed('collaborators')
    and (public.current_app_role()=any(array['admin'::text,'tech_admin'::text]) or advisor_id=auth.uid()));

drop policy if exists contract_templates_read on public.contract_templates;
drop policy if exists contract_templates_technical_write on public.contract_templates;
create policy contract_templates_read on public.contract_templates for select to authenticated
  using (organization_id=public.current_org_id() and public.current_module_allowed('documents'));
create policy contract_templates_technical_write on public.contract_templates for all to authenticated
  using (organization_id=public.current_org_id() and public.current_module_allowed('documents') and public.current_app_role()='tech_admin')
  with check (organization_id=public.current_org_id() and public.current_module_allowed('documents') and public.current_app_role()='tech_admin');

drop policy if exists templates_select on public.message_templates;
drop policy if exists templates_org_write on public.message_templates;
create policy templates_select on public.message_templates for select to authenticated
  using (organization_id=public.current_org_id() and public.current_module_allowed('documents'));
create policy templates_org_write on public.message_templates for all to authenticated
  using (organization_id=public.current_org_id() and public.current_module_allowed('documents'))
  with check (organization_id=public.current_org_id() and public.current_module_allowed('documents'));

drop policy if exists contracts_read on storage.objects;
drop policy if exists contracts_insert on storage.objects;
create policy contracts_read on storage.objects for select to authenticated
  using (bucket_id='crm-contracts' and public.current_module_allowed('documents')
    and (storage.foldername(name))[1]=(public.current_org_id())::text
    and exists(select 1 from public.clients c
      where c.organization_id=public.current_org_id()
        and c.id=(storage.foldername(storage.objects.name))[2]
        and public.can_access_advisor(c.advisor_id)));
create policy contracts_insert on storage.objects for insert to authenticated
  with check (bucket_id='crm-contracts' and public.current_module_allowed('documents')
    and (storage.foldername(name))[1]=(public.current_org_id())::text
    and exists(select 1 from public.clients c
      where c.organization_id=public.current_org_id()
        and c.id=(storage.foldername(storage.objects.name))[2]
        and public.can_access_advisor(c.advisor_id)));
