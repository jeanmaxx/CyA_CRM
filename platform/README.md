# ALVA CRM Platform

Rama de desarrollo: `alva-crm-platform`.

Esta carpeta mantiene separadas dos nuevas superficies del CRM operativo:

- `platform/site/`: página comercial de ALVA CRM.
- `platform/admin/`: panel maestro de administración de clientes.

## Fase 1
Interfaz navegable y responsive. No modifica el CRM de producción ni las políticas actuales de Supabase.

## Fase 2 propuesta
1. Autenticación exclusiva para administradores de plataforma.
2. Tablas de control comercial: tenants, suscripciones, planes y módulos.
3. Alta de una organización desde Control Center.
4. Aprovisionamiento de usuario administrador inicial.
5. Suspensión/reactivación sin borrar datos.
6. Historial global de acciones administrativas.
7. Estado de almacenamiento, usuarios y actividad por cliente.
8. Integración del formulario comercial con pipeline de ventas.

## Regla de arquitectura
El CRM de cada organización conserva aislamiento de datos. El Control Center deberá usar una capa administrativa separada y explícita; no se abrirán las políticas RLS actuales de los tenants para resolver la vista global.
