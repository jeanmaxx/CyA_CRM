-- Permite que los asesores creen y ajusten plantillas compartidas.
-- Servicios y configuración general continúan reservados al administrador.

begin;

drop policy if exists templates_admin_write on public.message_templates;
drop policy if exists templates_org_write on public.message_templates;

create policy templates_org_write on public.message_templates
  for all to authenticated
  using (organization_id = public.current_org_id())
  with check (organization_id = public.current_org_id());

commit;
