-- Run after the migration as postgres. All simulated changes roll back.
begin;
select set_config('crm.test_user',(select p.id::text from public.profiles p where p.role='admin' and p.active and exists(select 1 from public.clients c where c.advisor_id=p.id) order by p.created_at,p.id limit 1),true);
update public.profiles set role='advisor' where id=current_setting('crm.test_user')::uuid;
select set_config('request.jwt.claims',jsonb_build_object('sub',current_setting('crm.test_user'),'role','authenticated')::text,true);
set local role authenticated;
do $$ declare n int; cid text; begin
 if public.current_app_role() <> 'advisor' then raise exception 'Advisor simulation failed'; end if;
 update public.profiles set photo_path=photo_path where id=auth.uid();get diagnostics n=row_count;
 if n<>1 then raise exception 'Self photo update blocked'; end if;
 begin
  update public.profiles set role='tech_admin' where id=auth.uid();
  raise exception 'Self promotion was allowed';
 exception when insufficient_privilege then null; end;
 update public.profiles set full_name=full_name where id<>auth.uid();get diagnostics n=row_count;
 if n<>0 then raise exception 'Other profiles writable by advisor'; end if;
 update public.app_settings set payload=payload;get diagnostics n=row_count;
 if n<>0 then raise exception 'Settings writable by advisor'; end if;
 select id into cid from public.clients where advisor_id=auth.uid() limit 1;
 if cid is null then raise exception 'Owned client unavailable'; end if;
 update public.clients set payload=payload||jsonb_build_object('fechaRegistro','1900-01-01') where id=cid and advisor_id=auth.uid();
 select count(*) into n from public.record_audit where record_id=cid and actor_id=auth.uid() and changes->'fechaRegistro'->>'nuevo'='1900-01-01';
 if n<1 then raise exception 'Server audit missing actor or change'; end if;
 begin delete from public.record_audit; raise exception 'Audit deletion was allowed'; exception when insufficient_privilege then null; end;
 if exists(select 1 from public.clients where advisor_id is distinct from auth.uid()) then raise exception 'Advisor sees other clients'; end if;
end $$;
reset role;
select set_config('request.jwt.claims','{}',true);
update public.profiles set role='admin' where id=current_setting('crm.test_user')::uuid;
select set_config('request.jwt.claims',jsonb_build_object('sub',current_setting('crm.test_user'),'role','authenticated')::text,true);
set local role authenticated;
do $$ declare n int;begin
 if public.current_app_role()<>'admin' then raise exception 'Admin simulation failed';end if;
 update public.app_settings set payload=payload;get diagnostics n=row_count;if n<>0 then raise exception 'Operational admin can change global settings';end if;
 if not public.can_access_advisor('00000000-0000-0000-0000-000000000001') then raise exception 'Director access regressed';end if;
end $$;
reset role;
select set_config('request.jwt.claims','{}',true);
update public.profiles set role='tech_admin' where id=current_setting('crm.test_user')::uuid;
select set_config('request.jwt.claims',jsonb_build_object('sub',current_setting('crm.test_user'),'role','authenticated')::text,true);
set local role authenticated;
do $$ declare n int;begin
 if public.current_app_role()<>'tech_admin' then raise exception 'Technical simulation failed';end if;
 update public.app_settings set payload=payload;get diagnostics n=row_count;if n<>1 then raise exception 'Technical settings unavailable';end if;
 update public.services set name=name;get diagnostics n=row_count;if n<1 then raise exception 'Technical services unavailable';end if;
end $$;
reset role;
rollback;
select 'PASS: self photo, denied self promotion/global edits, advisor isolation, director operation, technical settings and immutable date audit. All test mutations rolled back.' as result;
