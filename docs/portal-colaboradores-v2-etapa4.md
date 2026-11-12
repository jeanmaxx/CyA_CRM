# Portal de Colaboradores v2 · Etapa 4 — Tabla de seguimiento

Fecha: 2026-11-12
Rama: `feat/portal-colaboradores-v2-20261112`
Estado: implementación de código en rama, pendiente de pruebas autenticadas y despliegue integral.

## Implementación
- `colaborador/portal-v2-stage4.js`: sustituye vista de tarjetas de Mis clientes por tabla horizontal de ocho actividades. Cliente fijo a la izquierda y nombre enlazado al Expediente.
- `colaborador/portal-v2-stage4.css`: tabla responsive con columna sticky, desplazamiento y círculos de estado.
- Las seis actividades operativas permiten formularios: cliente dado de alta (fecha); App AforeMóvil instalada; banco y nivel 4; cita AFORE (fecha/hora/sucursal); expediente AFORE actualizado; solicitud en aplicación (fecha).
- Recepción de depósito y pago de honorarios solo muestran el estado oficial; no hay operación de escritura por el colaborador para estas actividades. Las solicitudes y aprobaciones se implementarán en etapa 5.
- Para servicios distintos a retiro por desempleo, se muestra «No aplica» en lugar de acciones AFORE.
- Pestaña Seguimiento del Expediente reutiliza la lista de actividades sin duplicarla.

## Sincronización y seguridad
- Nueva operación `complete_activity` en `supabase/functions/collaborator-portal/index.ts`: comprobación de usuario autenticado, cuenta activa, tenant, módulo, colaborador, asesor, expediente perteneciente a cartera y servicio.
- Actualiza exclusivamente campos oficiales del mismo registro `clients.payload`: `fechaAltaAfore`, `aforeMovil`, `banco`, `cuentaNivel4`, `nivelCuentaBBVA` (solo BBVA), `fechaBiometrica`, `horaBiometrica`, `sucursalAfore`, `afore` y `fechaSolicitudRealizada` según actividad.
- Cambia `clients.stage` únicamente en transiciones operativas reconocidas: contrato_firmado→dado_alta, dado_alta→afore_actualizada, afore_actualizada→solicitud_realizada. No avanza depósito ni honorarios.
- Registra evidencia por actividad en `payload.portalActividades`, historial en `payload.historial` y actividad de colaborador en `collaborator_portal_activity`.
- Resuelve el estado completado primero desde información real del CRM; no exige que el colaborador vuelva a marcar lo que el asesor ya registró.
- Actualización condicional con `updated_at` para evitar pisar cambios concurrentes.
- No se ha creado una tabla paralela de clientes ni se han alterado comisiones, importes ni `estadoPago`.

## Limitaciones y criterios de prueba
- El registro de cita actualiza los campos oficiales que consume el CRM. **Todavía no crea un nuevo evento independiente en `agenda_events`**. Antes del despliegue debe verificarse cómo se generan/usan las citas para evitar doble agenda.
- La relación de datos y procesos «aprobación financiera / notificación del asesor» queda para etapa 5.
- Añadida `tests/collaborator-v2-stage4.cjs` a `npm test`: columnas, indicadores existentes, aislamiento de servicios, no escritura financiera y estructura del backend.
- Revisada sintaxis JS de módulos modificados con V8.
- Pendiente: ejecutar `npm ci && npm test` en checkout completo, verificar compilación Deno/TypeScript del Edge Function, probar permisos con dos cuentas de colaboradores, conflicto de versión, actualización de asesor y compatibilidad móvil.
- No se hizo despliegue de Edge Functions, migración SQL, modificaciones de datos reales ni merge a `main`.
