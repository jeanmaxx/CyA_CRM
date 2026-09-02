-- C&A CRM Suite — vincular registros históricos con las cuentas Auth reales.
-- Ejecutar después de 003_strict_advisor_isolation.sql.

begin;

update public.clients as record
set advisor_id = profile.id,
    legacy_advisor_id = null
from public.profiles as profile
where record.organization_id = profile.organization_id
  and record.advisor_id is null
  and record.legacy_advisor_id is not null
  and profile.legacy_id = record.legacy_advisor_id;

update public.leads as record
set advisor_id = profile.id,
    legacy_advisor_id = null
from public.profiles as profile
where record.organization_id = profile.organization_id
  and record.advisor_id is null
  and record.legacy_advisor_id is not null
  and profile.legacy_id = record.legacy_advisor_id;

update public.agenda_events as record
set advisor_id = profile.id,
    legacy_advisor_id = null
from public.profiles as profile
where record.organization_id = profile.organization_id
  and record.advisor_id is null
  and record.legacy_advisor_id is not null
  and profile.legacy_id = record.legacy_advisor_id;

update public.collaborators as record
set advisor_id = profile.id,
    legacy_advisor_id = null
from public.profiles as profile
where record.organization_id = profile.organization_id
  and record.advisor_id is null
  and record.legacy_advisor_id is not null
  and profile.legacy_id = record.legacy_advisor_id;

commit;
