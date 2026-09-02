-- C&A CRM Suite — asignar al administrador los clientes históricos sin propietario.
-- Ejecutar después de 004_map_legacy_advisor_ownership.sql.
--
-- Esta migración solamente toma clientes que nunca tuvieron advisor_id ni una
-- referencia legacy. No modifica clientes ya asignados a otro asesor.

begin;

with organization_admin as (
  select distinct on (organization_id)
    organization_id,
    id
  from public.profiles
  where role = 'admin'
    and active = true
  order by organization_id, created_at, id
)
update public.clients as client
set advisor_id = organization_admin.id,
    legacy_advisor_id = null
from organization_admin
where client.organization_id = organization_admin.organization_id
  and client.advisor_id is null
  and client.legacy_advisor_id is null;

-- Los eventos vinculados a esos clientes deben aparecer en la misma vista.
update public.agenda_events as event
set advisor_id = client.advisor_id,
    legacy_advisor_id = null
from public.clients as client
where event.organization_id = client.organization_id
  and event.client_id = client.id
  and event.advisor_id is null
  and client.advisor_id is not null;

commit;
