# Rediseño híbrido del CRM C&A — Documento maestro y auditoría técnica (Etapa 1)

**Fecha de corte:** 12 de noviembre de 2026  
**Repositorio:** `jeanmaxx/CyA_CRM`  
**Base congelada:** `abf31a954c1487e594836a2c2c28a37e98b83d90` (`main`)  
**Rama aislada:** `feat/crm-hibrido-etapa1-20261112`  
**Proyecto Supabase verificado, solo lectura:** `ibhgisndtaclvwznqugu` (CyA CRM).  
**Estado:** etapa 1 documentada; inicio de etapa 2 autorizado el 12/11/2026. Ninguna modificación funcional, migración, Edge Function o dato operativo autorizada por este documento.

## 1. Objetivo aprobado

Rediseñar conjuntamente los expedientes de prospectos y clientes en una interfaz híbrida **ancha, minimalista, navy/dorado, claro/oscuro**. Conservar la funcionalidad, datos, permisos, integraciones, auditoría y flujos actuales. El proceso tiene seis etapas, cada una validada antes de continuar. No hacer desplegues durante la etapa 1.

## 2. Arquitectura de la interfaz del cliente

**Cabecera horizontal compacta**: nombre, CURP, teléfono, ciudad; asesor, colaborador (o cliente directo) y origen (Meta Ads u otro). Acciones WhatsApp, Felicitación (siempre disponible; destacar en cumpleaños), Agenda y Configuración. Un solo icono Copiar CURP. Dos fechas discretas en cabecera, sin "Resumen operativo" separado: **solicitud probable** y **fecha probable de cobro** (no monto). Cabecera no debe crecer verticalmente.

**Tabla Clientes**: fecha de registro | tarjeta nombre + CURP y colaborador opcional | 12 indicadores de avance | fecha probable de solicitud. Conservar filtros, búsqueda, exportaciones, accesos, servicio, atribución y permisos. En ordenador, priorizar ancho sin scroll horizontal innecesario; móvil responsive.

**Tarjetas (resumen 2–3 datos)**, clic para desplegar un panel de edición interior, inicialmente cerrado salvo Contratos antes de firma. Una sola tarjeta abierta, guardado por sección, aviso de cambios sin guardar, actualizar resúmenes sin cerrar expediente, fechas dd/mm/aaaa. Sin tarjeta Seguimiento; las 12 etapas ya se muestran fuera del expediente:
- Antes de **Contrato firmado**: Contratos, Identidad y contacto (incluye domicilio), Información previsional, AFORE, Banco, Finanzas, Comisiones, Notas, Historial.
- Después de **Contrato firmado**: Identidad y contacto, Información previsional, AFORE, Banco, Finanzas, Comisiones, Contratos, Notas, Historial.
- Historial **siempre último**; Notas como registro cronológico en penúltimo lugar; eventos auditados con autor/fecha/hora.
- Contratos: crear, último generado, editor actual, ver/guardar PDF; mantener plantillas y la generación existente.
- AFORE: datos/citas/notas del cliente más lista de notas generales de administradoras, editables por asesores/admin con auditoría.
- Banco: catálogo de instituciones comerciales de México con búsqueda y «Otro/no encontrado», sin confundir banco seleccionado con nivel N4 verificado.
- Datos de documentos para retiro por desempleo se representan como actividad del proceso, no tarjeta Domicilio/documentos; otros servicios pueden requerir tarjetas especializadas.
- Configuración del cliente: en este orden **Regresar a prospectos, Cambiar asesor, Descartar cliente, Eliminar definitivamente**. Reasignación conserva colaborador con revisión explícita de comisiones; descarte conserva causa/notas y ofrece cancelar citas futuras; eliminación requiere protecciones y comprobación de referencias.

**Tabla inferior**: Clientes atendidos contraído por defecto y con su formato; Clientes descartados debajo, contraído y solo visible cuando existan registros, conservando consulta y motivos.

## 3. Expediente del prospecto

Tarjetas: Identidad/contacto, Elegibilidad, Origen/captación (fuente, campaña y respuestas Meta Ads originales), Seguimiento operativo del prospecto, Historial siempre al final. Separar datos declarados y verificados (RENAPO, SINDOS, IMSS). Bajo nombre: asesor, colaborador y fuente. Controles CURP: **Copiar (icono)** y **RENAPO** juntos; eliminar botones de «Copiar solicitud» y «Abrir WhatsApp» del bloque de verificación y retirar funciones muertas tras inventario de referencias. Conservar acceso WhatsApp por su acción institucional independiente. No bloquear guardado por campos incompletos salvo reglas actuales indispensables.

## 4. Las 12 actividades integradas del retiro por desempleo

| N | Etiqueta corta | Nombre completo | Registro principal |
|---|---|---|---|
| 1 | Contrato | Creando contrato | documento creado; no saltar |
| 2 | Firmas | Contrato en firmas | puede omitirse; completar automáticamente cuando se confirma firmado |
| 3 | Firmado | Contrato firmado | fecha real, nota; no saltar |
| 4 | Alta | Alta realizada | fecha real; puede omitirse |
| 5 | App AFORE | App AforeMóvil instalada | confirmación; puede omitirse |
| 6 | Banco N4 | Cuenta bancaria verificada N4 | banco y verificación; puede omitirse |
| 7 | Cita | Cita AFORE programada | AFORE, fecha, hora, plaza/sucursal/municipio; puede omitirse |
| 8 | Documentos | Documentos integrados | checks CURP, CSF y acta de nacimiento; puede omitirse |
| 9 | Expediente | Expediente AFORE actualizado | hito dependiente: confirmación explícita |
| 10 | Solicitud | Solicitud realizada | fecha; si falta 9 preguntar confirmación y registrar ambos |
| 11 | Depósito | Depósito realizado | si falta 10 preguntar confirmación y registrar ambos |
| 12 | Honorarios | Honorarios liquidados | si falta 11 preguntar confirmación; verificar cobro en Finanzas |

Verde = hecho confirmado; **amarillo canario** = hito anterior saltado que sigue pendiente; neutro = futuro/pendiente. Un clic abre el detalle y permite registrar/corregir; sin doble clic; para reabrir paso confirmado, acción explícita con motivo, sin borrar hechos financieros. Tooltips con texto completo; alternativa accesible para móvil. Documentos integrados requiere tres checks completos para verde; recordar INE vigente y comprobante domicilio <= 3 meses. Cita verde significa **programada**, no asistida; los documentos pueden integrarse después de programarla pero antes de asistir.

## 5. Fechas operativas, fuente y ajustes

**Solicitud probable — decisión definitiva 12/11/2026:** **CONSERVAR SIN CAMBIOS EL CÁLCULO EXISTENTE DESDE LA FECHA DE FIRMA + 46 DÍAS NATURALES**, con ajuste manual como funciona hoy. No sustituir la base por fecha de alta, no implementar reglas de horario 14:00 y no recalcular registros históricos. Esta decisión posterior prevalece sobre las propuestas previas de cálculo desde alta.  
**Cobro probable (fecha):** +2 días **hábiles** desde fecha real de solicitud si está disponible; en su defecto fecha probable de solicitud. Lunes→miércoles; viernes→martes; especificar calendario de inhábiles antes de automatizar festividades. Monto estimado en Finanzas, no cabecera.  
**Importante en Etapa 1:** El repositorio usa `fechaRetiroEstimada`, `fechaFirmaContrato`, `fechaAltaAfore` y `fechaSolicitudManual` en distintos módulos. Auditar la semántica exacta de cada fecha y sus disparadores **antes** de cambiar cálculo o etiquetas.

## 6. WhatsApp institucional y permisos

Aplicar en CRM principal el tamaño/distribución que ya funciona en Portal de Colaboradores: dos grupos Seguimiento y No viable/seguimiento futuro, pestañas laterales de categorías/mensajes, sin textos explicativos permanentes; área de edición y pie fijo con Copiar/Abrir WhatsApp y demás funciones actuales; selección inteligente por estado o último resultado (ej. SINDOS, IMSS activo). Una sola base de plantillas institucionales. Saludo con nombre adecuado; envío manual.  
El asesor opera clientes y Finanzas según permisos actuales; el colaborador puede ver su comisión y honorarios al cliente, **nunca comisión total/del asesor**, no editar Finanzas; confirmar sus hitos autorizados. Mantener auditoría y sincronización bidireccional sin duplicación de datos.

## 7. Inventario técnico inicial verificado (solo lectura)

- GitHub `main` base `abf31a954c1487e594836a2c2c28a37e98b83d90`; frontend JS modular y tests Node en `package.json`.
- En Supabase `public.clients` (331 filas al corte): campos canónicos `organization_id,id,advisor_id,collaborator_id,name,phone,curp,service_id,stage,archived,discarded,payload JSONB,created_at,updated_at`. `public.leads` (245): `status,archive_type,recontact_date,payload JSONB`. `agenda_events` (364) relaciona citas; `message_templates` (27); `record_audit` (874); `collaborator_portal_activity` (22). Todas estas tablas con RLS habilitada.
- `app-core-02a.js`, `app-core-02b.js`, `app-core-03.js`, `app-workflow.js`, `app-finance-ui.js`, `app-meta-leads-workflow.js` contienen flujos y datos a preservar. `app-whatsapp-message-center.js` contiene plantillas/acciones. `cloud-adapter.js` gestiona persistencia. `colaborador/portal-v2-stage4.js` y `supabase/functions/collaborator-portal/index.ts` contienen hitos y controles del colaborador.
- Verificación puntual: `app-core-03.js` calcula actualmente `fechaRetiroEstimada` desde firma salvo marca de cálculo manual; el cálculo desde firma se debe **preservar exactamente**; no introducir un recálculo desde alta ni alterar ajustes manuales.
- Hay etapas canónicas `generando_contrato, contrato_firmas, contrato_firmado, dado_alta, afore_actualizada, solicitud_realizada, solicitud_rechazada, deposito_recibido, honorarios_recibidos, concluido`. **Las 12 actividades nuevas NO deben reemplazar estos estados sin matriz de compatibilidad**.
- `record_audit` dispone de `record_type, record_id, actor_id, actor_name, occurred_at, changes`; verificar las escrituras reales antes de asumir cobertura total.
- Tablas tienen ámbito organizacional y RLS; toda nueva acción deberá respetar aislamiento por organización/asesor/colaborador. Nunca introducir service-role en frontend.

## 8. Matriz de compatibilidad pendiente antes de Etapa 2

Documentar para cada actividad: campos fuente en JSONB/columna, evento de escritura, autor, fecha, permisos, qué hacer con ausencias de evidencia, qué se visualiza en tabla/expediente, cómo afecta Agenda y Finanzas, estado histórico anterior y equivalente en Portal de Colaboradores. **No inferir checks verdes exclusivamente por etapa avanzada**; conservar hechos verificados, historial y comisiones. Analizar prospectos/servicios que no sean retiro por desempleo.

## 9. Etapas y puertas de validación

1. **Auditoría, respaldo lógico (rama GitHub) y diseño técnico**: inventario, plan maestro, matriz de campos, riesgos, seguridad; solo lectura en Supabase, sin alterar datos. Estado: DOCUMENTADO; iniciar etapa 2 en rama separada.
2. **Prospectos**: expediente híbrido, CURP/RENAPO, elegibilidad y Meta Ads, fuente y colaborador, retirar botones/código obsoleto. Pruebas visuales y RLS.
3. **Clientes**: cabecera compacta, 9 tarjetas, orden dinámico contratos, notas, administración, paneles internos, fechas.
4. **Seguimiento**: 12 hitos, dependencias, amarillo, documentos, citas, fecha real/probable, compatibilidad histórica y auditoría.
5. **Integraciones**: WhatsApp, cumpleaños, agenda, Finanzas, comisiones, sincronización Portal Colaboradores.
6. **Pruebas y despliegue**: regresión total, diferentes roles y servicios, escritorio/móvil, claro/oscuro; revisión y fusión controlada a main, despliegue verificado con plan de reversión.

## 10. Protección de datos y lanzamiento

Sin escrituras de prueba sobre clientes reales. Previo a cualquier cambio de esquema, documentar backup/restauración y aprobar migración reversible; usar entornos o datos sintéticos. Los tests deben cubrir clientes atendidos y descartados, comisiones cobradas e históricas, múltiples roles y servicios, PDF sin hoja blanca, elegibilidad, recontactos, RENAPO, integración Meta Ads y WhatsApp. GitHub branch no es copia de seguridad de la base de datos. No afirmar despliegue en Cloudflare hasta verificar su versión pública.

## 11. Estado y próximos pasos

La etapa 1 habilita **análisis y documentación**; no autoriza despliegue funcional. Pendiente: inventario de claves JSONB sin exponer datos personales, matriz de 12 hitos vs modelo existente, evaluación de calendarios de días inhábiles, plan de pruebas/baseline y revisión de dependencias de código muerto. Crear PR de documentación para revisión cuando esté completa; iniciar etapa 2 solo después de estos criterios.
