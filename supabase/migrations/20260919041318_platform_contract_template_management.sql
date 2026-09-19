alter table public.contract_templates
  add column if not exists filename text,
  add column if not exists file_bytes integer,
  add column if not exists file_sha256 text,
  add column if not exists uploaded_by uuid references auth.users(id) on delete set null,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

create index if not exists contract_templates_updated_idx
  on public.contract_templates(updated_at desc);
