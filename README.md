# C&A CRM Suite — versión en la nube

Aplicación web de Casillas & Asociados con autenticación y persistencia en Supabase.

## Arquitectura

- `index.html` y `styles.css`: estructura visual y estilos del CRM.
- `app-core-*.js`: reglas de negocio originales, separadas en archivos pequeños sin cambiar su orden de ejecución.
- `cloud-adapter.js`: autenticación, lectura, escritura e importación en Supabase.
- `cloud-config.js`: URL del proyecto y clave pública del cliente.
- `supabase/migrations/001_initial_schema.sql`: esquema, políticas RLS y buckets.

El repositorio solo contiene código. Los clientes, prospectos, eventos, configuraciones, fotos personales y versiones de contratos se almacenan en Supabase. El logo predeterminado utiliza un icono ya publicado. La plantilla Word y sus datos empresariales permanecen en una tabla protegida de Supabase. La clave incluida en `cloud-config.js` es la clave publicable del proyecto; no es una clave administrativa.

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
- Solo el administrador técnico puede modificar perfiles, servicios y configuración general. Cada usuario puede cambiar su propia foto y contraseña.
- Nunca se debe subir al repositorio el respaldo JSON ni una clave `service_role`/secreta.


## Operación y cuenta técnica (septiembre de 2026)

`app-workflow.js` y `app-prospect-workflow.js` integran las fechas reales, criterios iniciales por servicio, archivo contraíble y confirmación de firma por el asesor. `app-contract-word.js` genera el contrato de retiro y pagaré desde la tabla protegida `contract_templates`; los demás servicios conservan sus plantillas existentes. JSZip y docx-preview se distribuyen con versiones fijas y sus licencias en `vendor`.

Después de aplicar `20260909051417_technical_admin_workflow_contracts.sql` y `20260909052029_private_contract_templates.sql`, cargar la plantilla mediante un canal administrativo en `contract_templates` y desplegar `manage-advisor`, el administrador operativo inicial dispone una sola vez de **Mi cuenta → Crear cuenta técnica**. Allí elige el correo y la contraseña de la cuenta independiente. El servidor verifica que sea el primer administrador activo de la organización y que aún no exista una cuenta técnica activa. No hay credenciales predefinidas.

- `advisor`: expedientes propios, plantillas operativas, foto y contraseña propias.
- `admin`: operación y vista Director; foto y contraseña propias.
- `tech_admin`: administración global y gestión de cuentas, además de acceso operativo.

Las versiones DOCX se guardan en el bucket privado `crm-contracts`, sin permisos de sobrescritura ni borrado desde el cliente. El historial conserva los campos de cada versión. `record_audit` registra desde el servidor el autor, la hora y los valores anteriores y nuevos de las fechas; la aplicación no puede editar esas entradas. Las fechas de registro, firma y alta operativa se distinguen de la captura en el sistema.

Los criterios son filtros iniciales de asesoría. La CURP aporta fecha de nacimiento; el régimen requiere verificar la primera cotización. Los recontactos permanecen archivados hasta una decisión del asesor, ordenados por la fecha más próxima. El bloqueo de firma se sustituye por confirmación del responsable.

## Validación

Con Node.js 24: `npm ci` y `npm test`. Las pruebas usan datos sintéticos y cubren criterios, formularios, confirmaciones, permisos de la función de cuentas y dos versiones independientes del contrato. `tests/rls.sql` verifica los permisos reales en una transacción que revierte todos los cambios de prueba. El contrato generado también se revisó visualmente como documento de cuatro páginas. La plantilla de pruebas es sintética; el documento empresarial no se incluye en git.

El error de acceso «JWT issued at future» quedó fuera de esta actualización por indicación del usuario.
