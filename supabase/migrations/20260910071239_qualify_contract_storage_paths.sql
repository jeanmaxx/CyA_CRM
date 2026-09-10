begin;

-- The client table used inside the EXISTS subquery also has a "name" column.
-- Qualifying the outer Storage column prevents Postgres from resolving the
-- contract path against clients.name.
drop policy if exists contracts_read on storage.objects;
drop policy if exists contracts_insert on storage.objects;

create policy contracts_read on storage.objects
for select to authenticated
using (
  bucket_id = 'crm-contracts'
  and (storage.foldername(storage.objects.name))[1] = public.current_org_id()::text
  and exists (
    select 1
    from public.clients c
    where c.organization_id = public.current_org_id()
      and c.id = (storage.foldername(storage.objects.name))[2]
      and public.can_access_advisor(c.advisor_id)
  )
);

create policy contracts_insert on storage.objects
for insert to authenticated
with check (
  bucket_id = 'crm-contracts'
  and (storage.foldername(storage.objects.name))[1] = public.current_org_id()::text
  and exists (
    select 1
    from public.clients c
    where c.organization_id = public.current_org_id()
      and c.id = (storage.foldername(storage.objects.name))[2]
      and public.can_access_advisor(c.advisor_id)
  )
);

commit;
