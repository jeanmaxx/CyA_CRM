# Portal de Colaboradores v2 — Cambio de alcance: etapa 5
Fecha: 2026-11-12
Estado: implementación en rama, sin despliegue.

## Decisión del usuario
Se cancela el flujo de aprobación dentro del CRM para depósito y honorarios. La verificación ocurre por canales externos, como WhatsApp, y el colaborador registra quién la realizó. No se generan solicitudes pendientes, notificaciones de aprobación ni botones aprobar/devolver en el Tablero Operativo.

## Popup
Al seleccionar una actividad financiera pendiente en la tabla o expediente:
- Pregunta: «¿Quién verificó el pago?»
- Opciones: asesor asignado al colaborador (nombre real recuperado del CRM), Jorge Casillas, Fernanda Massiel.
- Campo de notas opcionales (hasta 1,000 caracteres).
- Guardar crea constancia con tipo de actividad, verificador seleccionado, colaborador capturista y fecha/hora.

## Persistencia
Se utiliza `complete_activity`, limitado a `deposito` y `honorarios`, que valida identidad de colaborador, asesor, organización, servicio y versión (`updated_at`).
Guarda constancia dentro de `clients.payload.portalVerificaciones`, indicador en `portalActividades`, historial del cliente y auditoría del portal.
Permite avanzar el estado operacional `solicitud_realizada → deposito_recibido` y `deposito_recibido → honorarios_recibidos` tras el registro correspondiente.
**No modifica** `estadoPago`, comisiones, honorarios ni el indicador «Cobrada» de Finanzas; el control de cobros oficiales conserva sus reglas existentes.
La selección del verificador representa una **declaración del colaborador** de verificación externa; no autentica ni notifica a Jorge, Fernanda o al asesor.

## Pruebas
La prueba `tests/collaborator-v2-stage4.cjs` se actualizó para comprobar las tres opciones, el campo de notas y la ausencia de aprobación interna o escrituras de `estadoPago`.
Los archivos JavaScript de la interfaz y pruebas superaron verificación de sintaxis V8.
Aún faltan pruebas `npm test` completas y prueba integrada de la función Supabase en un entorno aislado. No se ha desplegado la función ni se han modificado datos reales.
