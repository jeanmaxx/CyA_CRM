-- Conserva por separado los nombres y apellidos del equipo sin modificar
-- full_name, que continúa siendo el nombre formal usado por el CRM.
alter table public.profiles
  add column if not exists given_names text,
  add column if not exists surnames text;

-- Compatibilidad inicial para perfiles existentes. El administrador puede
-- corregir nombres compuestos posteriormente desde el formulario de Asesores.
update public.profiles
set
  given_names = coalesce(nullif(btrim(given_names), ''), split_part(btrim(full_name), ' ', 1)),
  surnames = coalesce(
    nullif(btrim(surnames), ''),
    nullif(btrim(substr(btrim(full_name), length(split_part(btrim(full_name), ' ', 1)) + 1)), '')
  )
where given_names is null or btrim(given_names) = ''
   or surnames is null or btrim(surnames) = '';

comment on column public.profiles.given_names is 'Nombre o nombres de pila para saludos personalizados';
comment on column public.profiles.surnames is 'Apellidos para reconstruir el nombre formal completo';
