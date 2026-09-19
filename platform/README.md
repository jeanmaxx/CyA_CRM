# ALVA CRM Platform

Rama de desarrollo histórica: `alva-crm-platform`. El código aprobado también se publica desde `main`.

Esta carpeta mantiene separadas dos superficies del CRM operativo:

- `platform/site/`: página comercial de ALVA CRM.
- `platform/admin/`: ALVA Control Center para administrar clientes.

## Fase 1 · Interfaz
Completada:
- Landing comercial responsive.
- Control Center navegable.
- Catálogo inicial de planes.
- Vistas de clientes, solicitudes, actividad y configuración.

## Fase 2 · Backend multiempresa
Completada:
- Autenticación exclusiva para administradores de plataforma.
- Tablas separadas: `platform_admins`, `crm_plans`, `platform_tenants`, `platform_activity`.
- Alta de organizaciones desde Control Center.
- Creación del administrador inicial de cada cliente.
- Contraseña temporal mostrada una sola vez.
- Métricas globales de usuarios, prospectos y clientes por organización.
- Pipeline comercial desde la página web mediante `platform_sales_leads`.
- Edge Functions `platform-admin` y `platform-lead`.
- RLS de tenants conservado sin abrir lectura global a usuarios del CRM.

## Fase 3 · Operación SaaS
Implementada:
- Organización activa dinámica dentro del CRM; las escrituras ya no están ligadas al UUID de C&A.
- Suspensión y cancelación efectivas a nivel RLS mediante `current_org_id()` y `current_app_role()`.
- Mensaje de suspensión antes de cargar el CRM mediante `get_my_tenant_access()`.
- Protección equivalente en funciones con service role y Portal de Colaboradores.
- Alta de nuevos tenants con servicios iniciales y configuración sin datos contractuales heredados de C&A.
- Precio contratado, ciclo de cobro, próximo pago, periodo de gracia y renovación por cliente.
- Registro de pagos en `platform_payments`.
- MRR estimado, pagos vencidos y renovaciones próximas en Control Center.
- Suspensión automática opcional por pago vencido.
- Revisión diaria mediante `pg_cron` a las 13:15 UTC (07:15 centro de México).
- Administración de accesos ALVA: owner, admin, support y billing.
- Límite real de usuarios por tenant; la creación de asesores se bloquea al alcanzar `seat_limit`.
- Datos corporativos del tenant (domicilio, representante y ciudad contractual) gestionables desde Control Center.
- Enlaces de acceso por tenant con branding público: `/?tenant=slug`, sin cambiar el login normal de C&A.
- Validación de contexto: una cuenta de otra organización no puede iniciar desde el enlace de un tenant diferente.
- Respaldos diarios multiempresa en ZIP, historial global, respaldo manual por organización y descarga mediante URL firmada de 5 minutos.
- Prueba manual de respaldo completada con ZIP válido en Supabase Storage.
- Prueba transaccional de aislamiento: C&A no ve un tenant sandbox; suspendido ve 0 organizaciones; reactivado recupera solo su organización.
- Conversión comercial Solicitud → cliente: precarga datos, crea organización, vincula el lead y lo marca como ganado.
- Protección contra doble conversión y rollback del lead si el aprovisionamiento falla.
- Pruebas CI para multiempresa, suspensión, límites de usuarios, branding, respaldos, conversión comercial y Edge Functions.

## Seguridad
El CRM de cada organización conserva aislamiento por RLS. El Control Center utiliza una Edge Function protegida con JWT y valida además que el usuario esté activo en `platform_admins`.

Las tablas administrativas tienen RLS habilitado y no exponen políticas directas a usuarios finales.

La suspensión real no depende de esconder botones: cuando un tenant está `suspended` o `cancelled`, `current_org_id()` devuelve `NULL`, por lo que las políticas existentes dejan de exponer sus datos.

Los usuarios internos creados para nuevas organizaciones usan metadata `portal=internal`, evitando el bootstrap histórico que asignaba cuentas nuevas a C&A.

## Pendiente recomendado
1. Prueba manual de alta completa desde Control Center con una empresa sandbox y credenciales reales.
2. Carga/administración central de plantillas contractuales específicas por tenant.
3. Correos automatizados de bienvenida, renovación y cobranza.
4. Dominio comercial definitivo y subdominio privado para Control Center.
5. Integración con proveedor de pagos si se decide automatizar cobro.
6. Reporte financiero mensual y exportación.
7. Segundo destino externo de respaldos (actualmente el ZIP principal queda seguro en Supabase Storage).

## Regla de arquitectura
El CRM operativo permanece independiente en apariencia. Las capacidades SaaS se agregan alrededor del CRM y la organización se resuelve a partir del usuario autenticado, sin mezclar datos entre empresas.
