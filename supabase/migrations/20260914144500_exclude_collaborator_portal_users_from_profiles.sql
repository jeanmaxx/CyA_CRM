create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if coalesce(new.raw_user_meta_data ->> 'portal','') = 'collaborator' then
    return new;
  end if;

  insert into public.profiles (
    id, organization_id, email, full_name, role, active
  ) values (
    new.id,
    'ca000000-0000-4000-8000-000000000001',
    new.email,
    coalesce(nullif(new.raw_user_meta_data ->> 'full_name', ''), split_part(coalesce(new.email, 'asesor'), '@', 1)),
    'advisor',
    true
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- Existing collaborator portal users must never appear as internal CRM profiles.
delete from public.profiles p
using public.collaborator_accounts ca
where p.id = ca.user_id;
