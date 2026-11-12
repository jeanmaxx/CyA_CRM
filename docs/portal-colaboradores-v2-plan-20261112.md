# Portal de Colaboradores v2 — Etapa 1: preparación y mapa de implementación
Fecha: 2026-11-12
Estado: planificación técnica; sin cambios funcionales ni de base de datos.
Rama de trabajo: feat/portal-colaboradores-v2-20261112
Base: main. No fusionar ni desplegar hasta validación integral.

## Alcance aprobado
- Prospectos: tablero sin traslape, nuevas categorías «Pendientes en segunda revisión» y «Revisión de SINDOS», «Aprobado» con texto de Líder de equipo, eliminar «Documentación para contrato» y mover «En firma de contrato» a clientes.
- Clientes visibles desde etapa `contrato_firmas`, sin exigir confirmación de firma.
- Tabla de seguimiento: «Cliente dado de alta», «App AforeMóvil instalada», «Revisión de cuenta bancaria nivel 4», «Crear cita en Afore», «Expediente Afore actualizado», «Solicitud en aplicación», «Recepción de depósito» y «Pago de honorarios». Palomitas verdes solo tras confirmación de actividad.
- Expediente común de prospecto/cliente accesible desde el nombre, dos pestañas «Información» y «Seguimiento», domicilio editable y guardado sin cerrar modal.
- Dos únicas aprobaciones por asesor: recepción de depósito y pago de honorarios. Panel del asesor «[Colaborador] solicita confirmación de: [Actividad]». Estados pendiente/aprobado/devuelto; solicitudes devueltas conservan observación e historial.
- Inicio compacto, nombres en capitalización natural y pendientes de su cartera.
- Sin duplicar registros de negocio ni comisiones; usar expediente único.

## Arquitectura verificada en lectura
- UI: `runtime/colaboradores.html`, `colaborador/app.js`, `colaborador/phase2.js` (clientes, filtro actual), `colaborador/phase3.js` (estadísticas y finanzas), `colaborador/phase4.js` (guía), `colaborador/phase5.js`, `colaborador/phase6.js` (descartados), `colaborador/phase7.js`, `colaborador/alva-phase-d.css` y otras hojas de estilo.
- Supabase Edge Function: `supabase/functions/collaborator-portal/index.ts`. Bootstrap lee `leads`, `clients`, `collaborators`, `profiles`; autorización basada en `collaborator_accounts`, organización y vinculación de cartera.
- Tablas observadas: `leads`, `clients`, `agenda_events`, `collaborator_accounts`, `collaborators`, `collaborator_portal_activity`, `collaborator_guide_progress`, `record_audit`; todas deben conservar autorización por organización y asesor.
- Pruebas existentes: `tests/collaborator-ui.cjs`, `tests/collaborator-sidebar.cjs`, y suite `npm test` en `package.json`.
- `colaborador/phase2.js` filtra expresamente `generando_contrato` y `contrato_firmas` para retiro por desempleo. Debe actualizarse.
- `colaborador/app.js` define etapas de prospecto 1–5, con «Documentación para contrato»; `phase2.js` define etapas de cliente 6–11.
- `collaborator-portal/index.ts` contiene `portalPhase` acotado a 1–5, `retirementProgress` derivado de etapa y `serializeClient`. Cambiar etiquetas solo en UI sería insuficiente.
- `phase3.js` usa PROSPECT_LABELS y CLIENT_LABELS antiguos y requiere actualización consistente.
- La guía `phase4.js` también contiene 11 pasos antiguos; desacoplar guía informativa de estado oficial antes de renumerar.
- No usar `platform_alerts` sin revisar su semántica y permisos: pertenece al sistema de alertas de plataforma y puede no ser adecuado para solicitudes de asesores.

## Decisiones pendientes de verificación interna antes de modificar esquema
1. Localizar en CRM los valores exactos para segunda revisión, SINDOS, aprobado, domicilio y agenda; no suponer equivalencia de IDs.
2. Identificar el guardado oficial de cliente y sincronización en `cloud-adapter.js`/RPC para evitar sobrescrituras de JSON payload o actualizaciones concurrentes.
3. Inspeccionar SQL y políticas de `collaborator_portal_activity` y RPC de historial; diseñar solicitudes financieras seguras y transaccionales.
4. Verificar forma y origen de fecha de cita, banco, AFORE y campos financieros en el expediente real sin mostrar datos personales.
5. Confirmar disparador de Cloudflare Pages y ruta real publicada; no asumir que un commit a main despliega correctamente.
6. Revisar todos los scripts de augmentación (`phase5`–`phase7`) que reemplazan `navigate` y renderizan fases.

## Seis etapas y criterios de salida
1. Preparación: rama aislada; inventario y plan técnico; sin despliegue ni escrituras de Supabase.
2. Prospectos: columnas legibles, categorías aprobadas, mapeo de estados, clientes desde firmas; pruebas de transición y estadísticas.
3. Expediente: Información/Seguimiento, domicilio editado con autorización y auditoría, modalidad persistente del formulario; pruebas de permisos.
4. Tabla cliente: estado real por actividad, formularios y sincronización bidireccional; pruebas de consistencia de agenda y refresh.
5. Aprobaciones: solamente depósito y honorarios, notificación al asesor, devolver/aprobar, trazabilidad; pruebas de doble aprobación, acceso cruzado e idempotencia.
6. Inicio + integración: bienvenida, pendientes, responsive, pruebas de regresión completas, verificación de despliegue y fusión controlada a main.

## Reglas de seguridad y despliegue
- No editar datos reales en pruebas; crear datos sintéticos o transacciones que hagan rollback.
- No permitir que un colaborador escriba campos financieros oficiales sin aprobación.
- Todas las operaciones servidor deben verificar cuenta activa, organización, colaborador asignado y asesor dueño del expediente.
- Evitar modificar comisiones, estadoPago y valores financieros por simples indicadores locales.
- El cambio de etapa y la aprobación deben ser atómicos o seguros contra reintentos.
- Antes de PR: ejecutar `npm test`, pruebas de RLS y flujos desde dos cuentas de colaboradores; probar móvil, modo claro y oscuro.
- Crear PR revisable y fusionar solo tras validación. Preservar esta rama para trazabilidad.

## Estado de la etapa 1
Rama independiente creada a partir de main. Este documento es el único archivo añadido en esta fase. Aún no se han validado todas las integraciones de Cloudflare ni se han ejecutado pruebas de punta a punta.
