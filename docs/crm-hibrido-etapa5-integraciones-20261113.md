# Etapa 5 — Integraciones CRM híbrido (13/11/2026)

Rama: `feat/crm-hibrido-etapa5-integraciones-20261113` · PR incremental #91 sobre etapa 4 (#90).
Respaldo: `backup/crm-hibrido-etapa4-pre-etapa5-20261113`.
**Estado:** avance parcial, no fusionado a main ni desplegado.

## Cambio funcional: WhatsApp institucional

- El centro institucional existente conserva plantillas originales, selección de bloques, edición, copia y apertura manual a WhatsApp.
- En escritorio, categorías en navegación lateral y contenido editable a la derecha; en móvil, categorías horizontales desplazables.
- Se retira la explicación permanente que ocupaba la parte superior y se conserva la obligación de revisión y envío manual de mensajes.
- Los botones informan su selección con `aria-pressed`.
- Al abrir el mensaje de un cliente, una confirmación real de `etapasOperativasV2.deposito.done` puede sugerir **Finalización** aun cuando el pipeline legado esté desfasado.
- Una verificación externa de honorarios **no** equivale a cobro en Finanzas. No se escriben estados de pago, honorarios ni comisiones desde WhatsApp.
- No cambia la lógica de solicitud de firma + 46 días, los ajustes manuales ni fechas históricas.

## Integraciones nativas preservadas, sin duplicación

- **Cumpleaños:** permanece `app-birthday-greetings.js`; imagen, mensaje y registro manual propios. No se crea otra fuente de cumpleaños.
- **Agenda:** conserva `agenda_events` y el botón nativo de creación de evento del expediente; la actividad Cita AFORE registra datos del cliente ya existentes.
- **Finanzas y comisiones:** se conserva la lógica original de cobros, liquidaciones y porcentajes; la actividad Honorarios no inicia cobros ni archiva expedientes.
- **Colaboradores:** se conserva `etapasOperativasV2` como fuente de evidencia compartida; la verificación externa no modifica `estadoPago`.
- **Plantillas:** se conserva `store.plantillas` y la sincronización de plantillas existente; no se crean plantillas paralelas.

## Pruebas fase 5

- `tests/whatsapp-clients.cjs` ampliada para comprobar sugerencia de Finalización por depósito confirmado, aislamiento financiero y honorarios verificados externamente.
- `npm test` también contiene regresiones preexistentes de cumpleaños, agenda/operaciones, finanzas, permisos de colaboradores y los 12 hitos.
- GitHub Actions #43379078204: suite completa del CRM, comparación con main y comprobación TypeScript Edge **aprobadas**.
- Las pruebas de navegador autenticado, escritorio/móvil, contraste claro/oscuro, permisos cruzados y concurrencia real siguen pendientes.

## Avance de fase 6 — diagnóstico sin modificación en producción

- Supabase verificado en lectura: `public.clients`, `leads`, `agenda_events`, `record_audit`, `message_templates`, `collaborator_portal_activity` tienen RLS activada.
- Advisor de seguridad (13/11/2026): detecta 13 tablas con RLS activada sin políticas (pueden ser deliberadamente inaccesibles), 6 funciones SECURITY DEFINER ejecutables por `authenticated` (requieren auditoría de autorización antes de tocar) y protección contra contraseñas filtradas deshabilitada.
- Referencias: https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy ; https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable ; https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection
- No se alteran funciones RLS, permisos ni datos reales: revocar o reescribir funciones sin revisar dependencias podría impedir acceso de asesores.

## Pendientes para concluir fase 5 y desplegar en fase 6

1. Comprobar con sesiones reales sintéticas que Agenda, cumpleaños, fechas y Finanzas permanezcan sincronizados entre las vistas; evaluar acceso de asesor/colaborador ajeno.
2. Verificar visualmente los nuevos paneles WhatsApp en claro/oscuro y móvil, así como el expediente de nueve tarjetas.
3. Probar dos ediciones concurrentes y errores de red para `etapasOperativasV2`; no sustituir `updated_at`.
4. Confirmar integridad de contratos PDF, comisiones de clientes atendidos/archivados y vistas de servicios distintos a retiro.
5. Resolver cualquier problema previo a fusionar PR #89, #90, #91 en orden; ejecutar CI y comprobación del Cloudflare desplegado; preparar y ensayar reversión.
6. La eliminación definitiva de expediente permanece deshabilitada hasta disponer de backend reversible y control de dependencias financieras.
