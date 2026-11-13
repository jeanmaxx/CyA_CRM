# Etapa 4 — Doce actividades del trámite de retiro por desempleo

**Fecha de inicio:** 12 de noviembre de 2026. **Rama:** `feat/crm-hibrido-etapa4-seguimiento12-20261112`; **PR:** #90, borrador incremental sobre etapa 3 (#89).

## Alcance técnico implementado

El nuevo seguimiento se dibuja en la **tabla de clientes activos y atendidos**, su tarjeta móvil y en la parte superior del **expediente híbrido**, fuera de sus nueve tarjetas. Está limitado al servicio `retiro_desempleo` y conserva el pipeline de etapas heredado para integraciones que todavía lo utilizan.

| Orden | Etiqueta | Identificador | Evidencia para estado verde |
|---|---|---|---|
| 1 | Contrato | `contrato` | Historial de contrato generado o confirmación explícita |
| 2 | Firmas | `firmas` | Estado de firmas o contrato firmado; autocompletado al firmar |
| 3 | Firmado | `firmado` | Firma confirmada (legado o actividad explícita) |
| 4 | Alta | `alta` | Fecha real de alta confirmada o registro explícito |
| 5 | App | `app` | Confirmación explícita de instalación |
| 6 | Banco N4 | `banco_n4` | Verificación explícita, no basta banco elegido |
| 7 | Cita | `cita` | Cita AFORE programada, no asistida |
| 8 | Documentos | `documentos` | CURP, Constancia de Situación Fiscal y Acta, todas confirmadas |
| 9 | Expediente | `expediente` | Actualización AFORE en estado legado o confirmación |
| 10 | Solicitud | `solicitud` | Fecha real, etapa legada o confirmación |
| 11 | Depósito | `deposito` | Etapa legada o confirmación explícita |
| 12 | Honorarios | `honorarios` | Etapa legada o confirmación, condicionada a cobro en Finanzas |

**Colores:** verde = evidencia confirmada; **amarillo canario** = actividad anterior pendiente al existir una posterior confirmada; gris = actividad no confirmada sin otra posterior. Ninguna etapa opcional se da por hecha solo porque el cliente avanzó en el pipeline legado.

Cada indicador abre un panel con descripción, fecha, observaciones y controles específicos. La corrección de un hito previamente confirmado exige un motivo escrito; no se permiten cambios por doble clic ni borrados silenciosos. Las dependencias de Expediente antes de Solicitud, Solicitud antes de Depósito y Depósito antes de Honorarios exigen confirmación explícita y generan trazabilidad. Honorarios no se marca por el mero avance operativo: debe constar cobro en Finanzas; no se modifican pagos de comisiones.

## Almacenamiento y compatibilidad

- Los hechos nuevos se almacenan como `cliente.etapasOperativasV2[id]` en el **payload de cliente existente**; incluyen `done`, `fecha`, `nota`, `actorId`, `registradaEn` y, para Documentos, `checks`. No se crea tabla adicional ni duplicado de cliente.
- El guardado utiliza `cloudSyncNow({throwOnError:true})`; ante fallo revierte la actividad en la sesión actual y muestra advertencia, sin confirmar falsamente el guardado.
- Se añaden entradas de `historial` mediante `addHist` en el CRM; la recuperación/versionado del backend existente permanece operativa.
- **Se respetan:** `fechaRetiroEstimada`, `fechaSolicitudManual`, honorarios, comisiones y `estadoPago`. Solo confirmaciones reales explícitas pueden avanzar la `etapa` canónica o fijar `fechaFirmaContrato`, `fechaAltaAfore`, `fechaSolicitudRealizada`, documentos y cita AFORE; no hay recálculo de la estimación existente ni cierre financiero implícito. El encabezado puede *mostrar* la estimación del cobro a partir de la solicitud real confirmada en el nuevo seguimiento, sin recalcular registros guardados.
- El orden de la tarjeta Contratos responde también a una firma confirmada en el seguimiento nuevo.
- Se preservan registros históricos y ajustes manuales. El cálculo interno de la solicitud existente **no se modifica**.

## Pruebas automatizadas

`tests/crm-activities12.cjs` valida los 12 identificadores, estado amarillo por evidencia posterior, no atribuir hitos opcionales sin comprobación, checklist de documentos, dependencias de Solicitud y Honorarios, separación de finanzas/fechas y acceso por asesor. Integrado en `npm test` y GitHub Actions.

## Validaciones y trabajo restante antes de despliegue

1. **Integración operativa:** conectar gradualmente las confirmaciones de Firma/Solicitud/Depósito/Honorarios con sus flujos canónicos **sin crear dos fuentes contradictorias**, mediante reglas idempotentes y pruebas de regresión. No sobrescribir el cálculo actual de fecha probable.
2. **Integración de colaborador:** renderizar el mismo seguimiento y habilitar exclusivamente los hitos autorizados para el Portal de Colaboradores, manteniendo honorarios del cliente y comisión propia visibles, nunca la comisión del asesor.
3. **Prueba visual autenticada:** escritorio/móvil, claro/oscuro, áreas con scroll, tabla, expediente, botones de Contratos, Finanzas y Agenda.
4. **Permisos / RLS:** validar en ambiente de pruebas con sesiones de administrador y asesores distintos, no solo JSDOM. Agregar pruebas de recuperación de red y concurrencia de dos usuarios.
5. **Corrección de hitos:** casos de reapertura/rectificación con motivo, verificación documental y fechas reales pasadas.
6. **Migración histórica:** no inferir timestamps inexistentes; si el histórico no tiene evidencia, dejar amarillo/gris hasta confirmación. Conservar los servicios diferentes a retiro sin imponerles estas 12 etapas.

**Estado (cierre técnico 13/11/2026):** IMPLEMENTACIÓN DE FASE 4 COMPLETADA EN RAMA, CON PRUEBAS AUTOMATIZADAS APROBADAS. La sincronización de evidencias con el Portal de Colaboradores y el avance canónico está implementada y probada, sin cambios de pronósticos ni liquidación financiera automática. La prueba visual/autenticada, la comprobación de datos reales bajo permisos y el despliegue corresponden a la fase 6. Los PR #89 y #90 siguen aislados sin fusionar a main; producción y Supabase no se modificaron. La eliminación definitiva continúa deshabilitada por seguridad.

## Cierre de las confirmaciones y sincronización — 13/11/2026

- CRM principal y Portal de Colaboradores consultan **`etapasOperativasV2`**, conservando compatibilidad de lectura con `portalActividades` y las etapas heredadas; ambas interfaces muestran las mismas doce categorías y estados: verde, amarillo canario o gris. La evidencia nueva se guarda en el payload del cliente existente y no se crean tablas paralelas.
- La firma confirmada desde el portal actualiza el contrato y los hitos `firmado` y `firmas` de manera compartida. En el CRM, los pasos Contrato y Firmas requieren contrato generado; confirmar Firmado fija la fecha real y avanza el pipeline cuando corresponde, sin alterar la fecha probable calculada anteriormente.
- Las confirmaciones explícitas de Alta, Expediente, Solicitud y Depósito pueden avanzar el pipeline canónico según sus dependencias. Cita registra fecha/hora/sucursal; Documento exige los tres checks; N4 requiere banco registrado y evidencia explícita. Para pasos anteriores confirmados al avanzar otro, se guarda **fecha real desconocida**, evitando inventarla.
- El colaborador registra la **verificación externa de honorarios**, pero esta no marca cobro ni archivado. El estado verde de Honorarios requiere la situación financiera real; el cierre contable y las comisiones siguen gobernados por Finanzas y el flujo de cierre existente.
- Se conservan las políticas de pertenencia por organización, asesor y colaborador. El servidor de colaboradores verifica la cuenta y el expediente en cada acción; las modificaciones usan verificación `updated_at` contra conflictos.
- La prueba `tests/crm-activities12-canonical-bridge.cjs` valida Contrato → Firmas → Firmado → Alta, estimación histórica intacta, N4, cita futura y rollback tras error de red. `tests/crm-activities12.cjs` y `tests/crm-activities12-integration.cjs` comprueban dependencias, permisos y representación en tabla, móvil y expediente.
- Última ejecución validada: https://github.com/jeanmaxx/CyA_CRM/actions/runs/43377897472 — suite CRM, TypeScript Edge y comparación con main **aprobadas**.

**Entrega de fase 4:** código y pruebas listos para revisión de la fase 6; el PR continúa como borrador por requerir pruebas autenticadas, visuales y de despliegue antes de fusionar. No se declara un cambio en producción.
