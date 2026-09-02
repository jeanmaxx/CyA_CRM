-- C&A CRM Suite — conciliar clientes convertidos con sus prospectos históricos.
-- Ejecutar después de 005_claim_unassigned_clients_for_admin.sql.
--
-- Conserva una copia del prospecto dentro del payload del cliente, transfiere
-- sus eventos y retira de Prospectos solamente las relaciones inequívocas.

begin;

create temporary table ca_conversion_links (
  organization_id uuid not null,
  client_id text not null,
  lead_id text not null,
  primary key (organization_id, client_id),
  unique (organization_id, lead_id)
) on commit drop;

-- 1. Relaciones explícitas creadas por versiones recientes del CRM.
insert into ca_conversion_links (organization_id, client_id, lead_id)
select client.organization_id, client.id, lead.id
from public.clients as client
join public.leads as lead
  on lead.organization_id = client.organization_id
 and lead.id = client.payload ->> 'origenLeadId'
where coalesce(client.payload ->> 'origenLeadId', '') <> ''
on conflict do nothing;

-- 2. Clientes históricos: solamente se acepta la mejor coincidencia si es
-- única para el cliente y el prospecto. CURP tiene prioridad sobre teléfono
-- y el teléfono sobre el nombre completo normalizado.
with candidates as (
  select
    client.organization_id,
    client.id as client_id,
    lead.id as lead_id,
    (
      case
        when length(trim(coalesce(client.curp, ''))) = 18
         and upper(trim(client.curp)) = upper(trim(lead.curp)) then 1000
        else 0
      end
      + case
          when length(regexp_replace(coalesce(client.phone, ''), '[^0-9]', '', 'g')) >= 7
           and regexp_replace(coalesce(client.phone, ''), '[^0-9]', '', 'g') = regexp_replace(coalesce(lead.phone, ''), '[^0-9]', '', 'g') then 250
          else 0
        end
      + case
          when length(regexp_replace(lower(coalesce(client.name, '')), '[^[:alnum:]]', '', 'g')) >= 5
           and regexp_replace(lower(coalesce(client.name, '')), '[^[:alnum:]]', '', 'g') = regexp_replace(lower(coalesce(lead.name, '')), '[^[:alnum:]]', '', 'g') then 80
          else 0
        end
      + case when client.advisor_id is not null and client.advisor_id = lead.advisor_id then 30 else 0 end
      + case when client.collaborator_id is not null and client.collaborator_id = lead.collaborator_id then 30 else 0 end
      + case
          when lead.payload ->> 'causaArchivoId' = 'convertido_cliente'
            or lead.payload ->> 'causaArchivo' = 'Convertido a cliente' then 40
          else 0
        end
    ) as score
  from public.clients as client
  join public.leads as lead
    on lead.organization_id = client.organization_id
  where coalesce(client.payload ->> 'origenLeadId', '') = ''
    and not exists (
      select 1
      from ca_conversion_links as linked
      where linked.organization_id = client.organization_id
        and (linked.client_id = client.id or linked.lead_id = lead.id)
    )
    and (
      (length(trim(coalesce(client.curp, ''))) = 18 and upper(trim(client.curp)) = upper(trim(lead.curp)))
      or (
        length(regexp_replace(coalesce(client.phone, ''), '[^0-9]', '', 'g')) >= 7
        and regexp_replace(coalesce(client.phone, ''), '[^0-9]', '', 'g') = regexp_replace(coalesce(lead.phone, ''), '[^0-9]', '', 'g')
      )
      or (
        length(regexp_replace(lower(coalesce(client.name, '')), '[^[:alnum:]]', '', 'g')) >= 5
        and regexp_replace(lower(coalesce(client.name, '')), '[^[:alnum:]]', '', 'g') = regexp_replace(lower(coalesce(lead.name, '')), '[^[:alnum:]]', '', 'g')
      )
    )
),
top_score as (
  select organization_id, client_id, max(score) as score
  from candidates
  group by organization_id, client_id
),
best_for_client as (
  select candidate.*
  from candidates as candidate
  join top_score
    on top_score.organization_id = candidate.organization_id
   and top_score.client_id = candidate.client_id
   and top_score.score = candidate.score
),
unique_for_client as (
  select organization_id, client_id, min(lead_id) as lead_id
  from best_for_client
  group by organization_id, client_id
  having count(*) = 1
),
unique_both_ways as (
  select *, count(*) over (partition by organization_id, lead_id) as lead_uses
  from unique_for_client
)
insert into ca_conversion_links (organization_id, client_id, lead_id)
select organization_id, client_id, lead_id
from unique_both_ways
where lead_uses = 1
on conflict do nothing;

-- Guardar la trazabilidad completa dentro del expediente del cliente.
update public.clients as client
set payload = coalesce(client.payload, '{}'::jsonb) || jsonb_build_object(
  'origenLeadId', lead.id,
  'origenProspecto', true,
  'prospectoOrigen', jsonb_build_object(
    'id', lead.id,
    'nombre', lead.name,
    'telefono', lead.phone,
    'curp', lead.curp,
    'servicio', lead.service_id,
    'estado', lead.status,
    'archivoTipo', lead.archive_type,
    'asesorId', lead.advisor_id,
    'colaboradorId', lead.collaborator_id,
    'fechaRegistro', lead.created_at,
    'datos', coalesce(lead.payload, '{}'::jsonb)
  )
)
from ca_conversion_links as link
join public.leads as lead
  on lead.organization_id = link.organization_id
 and lead.id = link.lead_id
where client.organization_id = link.organization_id
  and client.id = link.client_id;

-- Los eventos del prospecto continúan dentro del expediente del cliente.
update public.agenda_events as event
set client_id = link.client_id,
    lead_id = null,
    advisor_id = coalesce(event.advisor_id, client.advisor_id),
    legacy_advisor_id = null
from ca_conversion_links as link
join public.clients as client
  on client.organization_id = link.organization_id
 and client.id = link.client_id
where event.organization_id = link.organization_id
  and event.lead_id = link.lead_id;

-- Ya existe el expediente de cliente y la copia del origen: se puede retirar
-- el registro duplicado de Prospectos.
delete from public.leads as lead
using ca_conversion_links as link
where lead.organization_id = link.organization_id
  and lead.id = link.lead_id;

select count(*) as clientes_conciliados
from ca_conversion_links;

commit;

