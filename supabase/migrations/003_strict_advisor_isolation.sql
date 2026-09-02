-- C&A CRM Suite — aislamiento estricto de registros por asesor
-- Ejecutar después de 001_initial_schema.sql y 002_template_permissions.sql.
--
-- Corrige la excepción anterior que permitía a los asesores acceder a
-- clientes, prospectos y eventos sin asesor asignado. A partir de esta
-- migración:
--   * Admin: puede acceder a todos los registros de su organización.
--   * Asesor: solamente puede acceder a registros con advisor_id = auth.uid().
--   * Sin asignar: solamente visible para Admin.

begin;

create or replace function public.can_access_advisor(target_advisor uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    coalesce(public.current_app_role() = 'admin', false)
    or target_advisor = auth.uid()
$$;

revoke all on function public.can_access_advisor(uuid) from public;
grant execute on function public.can_access_advisor(uuid) to authenticated;

commit;
