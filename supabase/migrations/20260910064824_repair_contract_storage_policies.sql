begin;
drop policy if exists contracts_read on storage.objects;
drop policy if exists contracts_insert on storage.objects;
create policy contracts_read on storage.objects for select to authenticated using(
 bucket_id='crm-contracts' and (storage.foldername(name))[1]=public.current_org_id()::text and
 exists(select 1 from public.clients c where c.organization_id=public.current_org_id() and c.id=(storage.foldername(name))[2] and public.can_access_advisor(c.advisor_id)));
create policy contracts_insert on storage.objects for insert to authenticated with check(
 bucket_id='crm-contracts' and (storage.foldername(name))[1]=public.current_org_id()::text and
 exists(select 1 from public.clients c where c.organization_id=public.current_org_id() and c.id=(storage.foldername(name))[2] and public.can_access_advisor(c.advisor_id)));
commit;
