begin;
create table public.recovery_records (
 id bigint generated always as identity primary key,
 organization_id uuid not null references public.organizations(id),
 table_name text not null, record_id text not null, operation text not null,
 snapshot jsonb not null, actor_id uuid, occurred_at timestamptz not null default now()
);
alter table public.recovery_records enable row level security;
grant select on public.recovery_records to authenticated;
create policy recovery_technical_read on public.recovery_records for select to authenticated
 using (organization_id=public.current_org_id() and public.current_app_role()='tech_admin');
create index recovery_record_idx on public.recovery_records(organization_id,table_name,record_id,occurred_at desc);
-- The trigger alone writes immutable snapshots; its owner is needed for the audit-only table.
create function private.keep_record_version() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null and session_user not in ('postgres','supabase_admin') and coalesce(auth.role(),'')<>'service_role' then raise exception 'Sesión requerida'; end if;
 if tg_op='UPDATE' and (to_jsonb(old)-'updated_at')=(to_jsonb(new)-'updated_at') then return new; end if;
 insert into public.recovery_records(organization_id,table_name,record_id,operation,snapshot,actor_id)
 values(old.organization_id,tg_table_name,old.id,tg_op,to_jsonb(old),auth.uid());
 if tg_op='DELETE' then return old; else return new; end if;
end $$;
revoke all on function private.keep_record_version() from public;
create trigger keep_client_version before update or delete on public.clients for each row execute function private.keep_record_version();
create trigger keep_lead_version before update or delete on public.leads for each row execute function private.keep_record_version();
create trigger keep_event_version before update or delete on public.agenda_events for each row execute function private.keep_record_version();

-- Invoker preserves the caller's RLS. The entire batch commits or rolls back together.
create function public.crm_save_changes(operations jsonb) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare op jsonb; t text; rid text; incoming jsonb; previous jsonb; saved jsonb; org uuid:=public.current_org_id(); cols text; vals text; sets text; keycol text; result jsonb:='[]';
begin
 if auth.uid() is null or org is null then raise exception 'Sesión requerida'; end if;
 if jsonb_typeof(operations)<>'array' or jsonb_array_length(operations)>2000 then raise exception 'Lote inválido'; end if;
 for op in select value from jsonb_array_elements(operations) order by (value->'row'='null'::jsonb), array_position(array['collaborators','leads','clients','agenda_events','message_templates','services','app_settings'],value->>'table'),value->>'id' loop
  t:=op->>'table';rid:=op->>'id';incoming:=nullif(op->'row','null'::jsonb);
  if t not in ('clients','leads','agenda_events','collaborators','message_templates','services','app_settings') then raise exception 'Tabla inválida'; end if;
  if t in ('services','app_settings') and public.current_app_role()<>'tech_admin' then raise exception 'Acceso técnico requerido'; end if;
  keycol:=case when t='app_settings' then 'organization_id' else 'id' end;
  perform pg_advisory_xact_lock(hashtextextended(org::text||t||rid,0));
  execute format('select to_jsonb(r) from public.%I r where organization_id=$1 and %I::text=$2 for update',t,keycol) into previous using org,rid;
  if incoming is not null and (incoming->>'organization_id' is distinct from org::text or incoming->>keycol is distinct from rid) then raise exception 'Registro inválido'; end if;
  if previous is not null and incoming is not null and previous->'payload'=incoming->'payload' then
   result:=result||jsonb_build_array(jsonb_build_object('table',t,'id',rid,'updated_at',previous->'updated_at'));continue;
  end if;
  if previous is not null and (previous->>'updated_at')::timestamptz is distinct from (op->>'expected')::timestamptz then
   raise exception 'Conflicto en %: otro usuario cambió este registro. Conserva los pendientes y recarga la versión actual.',coalesce(previous->>'name',previous->>'title',rid) using errcode='40001';
  end if;
  if previous is null and op->>'expected' is not null and incoming is not null then raise exception 'El registro fue eliminado por otra sesión. Revisa la papelera.' using errcode='40001'; end if;
  if incoming is null then
   execute format('delete from public.%I where organization_id=$1 and %I::text=$2',t,keycol) using org,rid;
   result:=result||jsonb_build_array(jsonb_build_object('table',t,'id',rid));continue;
  end if;
  incoming:=incoming-'updated_at';
  if previous is not null then incoming:=incoming-'created_at'; end if;
  select string_agg(format('%I',key),','),string_agg(format('x.%I',key),','),string_agg(format('%I=x.%I',key,key),',') into cols,vals,sets from jsonb_object_keys(incoming) key;
  if previous is null then
   execute format('insert into public.%I (%s) select %s from jsonb_populate_record(null::public.%I,$1) x returning to_jsonb(%I.*)',t,cols,vals,t,t) into saved using incoming;
  else
   execute format('update public.%I r set %s from jsonb_populate_record(null::public.%I,$1) x where r.organization_id=$2 and r.%I::text=$3 returning to_jsonb(r.*)',t,sets,t,keycol) into saved using incoming,org,rid;
  end if;
  if saved is null then raise exception 'No se pudo guardar el registro'; end if;
  result:=result||jsonb_build_array(jsonb_build_object('table',t,'id',rid,'updated_at',saved->'updated_at'));
 end loop;
 return result;
end $$;
revoke all on function public.crm_save_changes(jsonb) from public;
grant execute on function public.crm_save_changes(jsonb) to authenticated;
commit;
