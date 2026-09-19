alter table public.platform_sales_leads
  add column if not exists converted_organization_id uuid references public.organizations(id) on delete set null,
  add column if not exists converted_at timestamptz;

create index if not exists platform_sales_leads_converted_org_idx
  on public.platform_sales_leads(converted_organization_id);
