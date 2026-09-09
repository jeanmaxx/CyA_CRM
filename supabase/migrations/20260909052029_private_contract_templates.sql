begin;
create table public.contract_templates(
 organization_id uuid not null references public.organizations(id),
 version text not null,
 content_base64 text not null check(length(content_base64)<=15000000),
 defaults jsonb not null default '{}',
 active boolean not null default true,
 primary key(organization_id,version)
);
alter table public.contract_templates enable row level security;
revoke all on public.contract_templates from anon,authenticated;
grant select,insert,update,delete on public.contract_templates to authenticated;
create policy contract_templates_read on public.contract_templates for select to authenticated using(organization_id=public.current_org_id());
create policy contract_templates_technical_write on public.contract_templates for all to authenticated
 using(organization_id=public.current_org_id() and public.current_app_role()='tech_admin')
 with check(organization_id=public.current_org_id() and public.current_app_role()='tech_admin');
comment on table public.contract_templates is 'Private enterprise Word templates; never served by the public static site.';
commit;
