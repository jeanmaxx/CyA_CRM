# ALVA CRM Platform

Rama de desarrollo: `alva-crm-platform`.

Esta carpeta mantiene separadas dos superficies del CRM operativo:

- `platform/site/`: página comercial de ALVA CRM.
- `platform/admin/`: ALVA Control Center para administrar clientes.

## Fase 1 · Interfaz
Completada:
- Landing comercial responsive.
- Control Center navegable.
- Catálogo inicial de planes.
- Vistas de clientes, actividad y configuración.

## Fase 2 · Backend multiempresa
Completada:
- Autenticación exclusiva para administradores de plataforma.
- Tablas separadas: `platform_admins`, `crm_plans`, `platform_tenants`, `platform_activity`.
- Alta de organizaciones desde Control Center.
- Creación del administrador inicial de cada cliente.
- Contraseña temporal mostrada una sola vez.
- Estado de cliente, plan, límite de usuarios, onboarding, contactos, contrato y renovación.
- Métricas globales de usuarios, prospectos y clientes por organización.
- Bitácora de cambios administrativos.
- Planes editables.
- Pipeline comercial desde la página web mediante `platform_sales_leads`.
- Formulario comercial conectado a Supabase.
- Gestión de solicitudes comerciales desde Control Center.
- Edge Functions `platform-admin` y `platform-lead`.
- Las tablas administrativas tienen RLS habilitado y no exponen políticas directas a usuarios finales.

## Seguridad
El CRM de cada organización conserva aislamiento por RLS. El Control Center no abre las políticas de los tenants: utiliza una Edge Function protegida con JWT y además valida pertenencia a `platform_admins`.

El trigger de nuevos usuarios reconoce altas con metadata `portal=platform` para impedir que los administradores de clientes nuevos sean asignados por error a Casillas & Asociados.

## Pendiente / Fase 3
1. Suspensión efectiva de acceso al CRM según estado del tenant.
2. Facturación, periodicidad, cobros y MRR.
3. Renovaciones y alertas de vencimiento.
4. Envío automatizado de bienvenida / recuperación de contraseña.
5. Gestión de administradores de plataforma desde la propia consola.
6. Dominio comercial definitivo y publicación.
7. Pruebas end-to-end con una organización de sandbox antes del primer cliente real.

## Regla de arquitectura
El CRM operativo permanece independiente. Las funciones globales de ALVA se agregan alrededor del CRM sin mezclar permisos entre organizaciones.
