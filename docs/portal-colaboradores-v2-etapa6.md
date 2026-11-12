# Portal de Colaboradores v2 — Etapa 6 y preparación para validación
Fecha: 2026-11-12
Rama: `feat/portal-colaboradores-v2-20261112`

## Inicio
- Cabecera compacta con nombre del colaborador y asesor en formato de nombre propio.
- Respeta cumpleaños como mensaje auxiliar.
- «Prospectos recientes» utiliza los estados reales (reconsulta, sindos, aprobado) y oculta archivados.
- Nuevo panel «Pendientes de mis clientes» debajo de prospectos recientes: siguiente actividad por expediente de retiro por desempleo, máximo ocho filas visibles, navegación a actividad o Mis clientes.
- Reutiliza exactamente la lógica de actividades de la tabla (`caV2ActivityCompleted` y `caV2ActivitySteps`). No crea estado duplicado ni tareas financieras artificiales.
- Adaptación móvil mediante CSS con texto que se ajusta y botones accesibles.

## Integración
- `colaborador/app.js`: login/bootstrap, guardado de prospectos y clics del menú utilizan `window.navigate` compuesto, preservando las capas de clientes, estadísticas, descartados, etapas 2–4 y home 6.
- `runtime/colaboradores.html`: cargas únicas de JS y CSS de etapas 2, 3, 4 y 6.
- `tests/collaborator-v2-stage6.cjs`: bienvenida, capitalización, pendientes, navegación y estados de prospectos, incluido en `npm test`.

## Salida / NO despliegue automático
- Se requiere suite completa `npm test`, validación de Edge Function TypeScript y pruebas de usuario/roles antes de cualquier merge.
- Verificar RLS/tenancy, actualizaciones concurrentes, contratos, movimientos financieros y consistencia de agenda.
- Revisar en navegador móvil, modo claro/oscuro, barras y bordes, sin datos reales de prueba.
- Las verificaciones externas de pago no modifican `estadoPago` ni la marca de comisiones cobradas: se registran como constancias, con auditoría.
- No se ha desplegado Edge Function ni Cloudflare y no se han modificado datos productivos.
