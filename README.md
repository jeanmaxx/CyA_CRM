# C&A CRM Suite — versión en la nube

Aplicación web de Casillas & Asociados con autenticación y persistencia en Supabase.

## Arquitectura

- `index.html` y `styles.css`: estructura visual y estilos del CRM.
- `app-core-*.js`: reglas de negocio originales, separadas en archivos pequeños sin cambiar su orden de ejecución.
- `cloud-adapter.js`: autenticación, lectura, escritura e importación en Supabase.
- `cloud-config.js`: URL del proyecto y clave pública del cliente.
- `supabase/migrations/001_initial_schema.sql`: esquema, políticas RLS y buckets.

El repositorio solo contiene código. Los clientes, prospectos, eventos, configuraciones e imágenes se almacenan en Supabase. La clave incluida en `cloud-config.js` es la clave publicable del proyecto; no es una clave administrativa.

## Publicación

GitHub Pages debe publicar la rama `main` desde la carpeta raíz. La URL esperada es:

`https://jeanmaxx.github.io/CyA_CRM/`

## Primera importación

1. Iniciar sesión con el administrador creado en Supabase Auth.
2. Abrir `Configuración` y usar la opción existente para importar el respaldo JSON.
3. Confirmar las cantidades antes de continuar.
4. Verificar Dashboard, Prospectos, Clientes, Agenda y Configuración.

La primera importación conserva una copia exacta del JSON en `legacy_imports` y después normaliza los datos en las tablas del CRM. Una vez que existan clientes o prospectos en la nube, el importador bloquea otra importación inicial para evitar duplicados.

## Seguridad

- Los registros públicos están desactivados en Supabase Auth.
- Todas las tablas de operación tienen Row Level Security.
- Solo los administradores pueden modificar perfiles, servicios y configuración general.
- Nunca se debe subir al repositorio el respaldo JSON ni una clave `service_role`/secreta.
