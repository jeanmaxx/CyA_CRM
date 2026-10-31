-- Follow-up performance migration already applied in production.
create index if not exists mobile_push_deliveries_push_token_idx
  on public.mobile_push_deliveries (push_token_id);
create index if not exists mobile_push_deliveries_user_idx
  on public.mobile_push_deliveries (user_id);
