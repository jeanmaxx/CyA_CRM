revoke all on function public.current_org_id() from public, anon;
revoke all on function public.current_app_role() from public, anon;
revoke all on function public.get_my_tenant_access() from public, anon;

grant execute on function public.current_org_id() to authenticated;
grant execute on function public.current_app_role() to authenticated;
grant execute on function public.get_my_tenant_access() to authenticated;
