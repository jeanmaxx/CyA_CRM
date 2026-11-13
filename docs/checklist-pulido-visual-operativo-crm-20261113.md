# CRM C&A — checklist de pulido y validación real
**Fecha:** 13/11/2026  **Base:** `main` posterior al PR #92.  **Estado:** revisión completada, implementación **pendiente**.

## A. Prospectos — solicitudes explícitas
- [ ] **P01** Compactar el expediente: usar rejilla de campos cortos con anchos proporcionados, altura/padding reducidos, campos alineados y encabezado legible; evitar espacio vacío sin comprimir la tipografía en exceso. Validar a 1440 px, 1024 px y 390 px.
- [ ] **P02** Mantener junto al CURP sus botones Copiar y RENAPO; evitar saltos de renglón salvo móvil; fecha/nombre/CURP/teléfono/correo/ciudad/domicilio con jerarquía clara.
- [ ] **P03** En **Origen y captación** colocar primero indicador de preaprobación y **las tres respuestas del formulario** (IMSS, retiro anterior, semanas), en formato legible.
- [ ] **P04** Mostrar «Fuente de contacto» editable después de las respuestas.
- [ ] **P05** Agrupar **los datos de Meta Ads** (fuente técnica, campaña, conjunto, anuncio, formulario) en una **sola tarjeta desplegable**, cerrada por defecto al abrir expediente y sin mostrar IDs crudos; expandir/contraer sin perder información ni mutar datos.
- [ ] **P06** **Seguimiento** en este orden: barra de etapas → servicio y estado/etapa → notas/observaciones. Preservar botón guardar, transiciones, seguridad y datos existentes.

## B. Lista Clientes — solicitudes explícitas
- [ ] **C01** Cambiar encabezado «Fecha de alta» por **«Registro»** (mantener fuente fechaRegistro, NO fechaAltaAfore).
- [ ] **C02** Cambiar «Alta AFORE» por **«ALTA»** (sin cambiar id de actividad alta).
- [ ] **C03** Cambiar «Expediente» por **«Expediente actualizado»**, permitiendo dos renglones, tamaño de fuente legible y sin solapamiento.
- [ ] **C04** Cambiar «Fecha de solicitud» por **«Solicitud»** (mantener cálculos originales firma + 46 días y ajustes manuales).
- [ ] **C05** Cambiar «CLIENTES ATENDIDOS» a **barra horizontal desplegable de ancho completo** equivalente a «Archivados» en Prospectos. Debe mostrar contador y poder contraerse/expandirse sin duplicar registros.
- [ ] **C06** Diálogo de actividad con tarjeta **opaca y sólida** en tema claro/oscuro, manteniendo overlay oscuro translúcido, buen contraste, botones y foco accesibles.
- [ ] **C07** «Documentos integrados»: casillas marcables y desmarcables cuando el usuario tenga permiso; guardar tras confirmación; estados, auditoría y persistencia correctos.
- [ ] **C08** Si un expediente está archivado o sin permiso, mostrar texto explícito de **solo lectura y causa** (no fingir que las casillas fallaron). Nunca dar permisos a quien no corresponda; definir/validar si se permite corrección auditada en atendidos.

## C. Expediente cliente — solicitudes explícitas
- [ ] **E01** Reducir anchos y alturas excesivos, agrupar campos en rejilla, compactar controles/ayudas y mantener pie de guardado visible sin tapar entradas.
- [ ] **E02** En AFORE eliminar la **duplicación de ficha informativa** que aparece al abrir sección; mantener una sola ficha de SURA (u otra AFORE) y un solo editor de cita.
- [ ] **E03** Mover «Datos opcionales / RFC» a **Información previsional**, una sola vez; ocultar la misma sección en Identidad, Banco, Comisiones y otras tarjetas, sin borrar sus valores.
- [ ] **E04** En Notas recuperar **Próxima acción** con selector de tipo, fecha, hora y nota adicional breve, y conservar el campo de notas existente.
- [ ] **E05** Guardar Próxima acción por el flujo nativo para que aparezca en Agenda cuando corresponde, evitar eventos duplicados, verificar la cancelación y los cambios sin alterar otros campos.
- [ ] **E06** Corregir desbordamiento de «Próxima acción» bajo el pie de Guardar cambios; los botones no deben cubrir inputs.

## D. Problemas adicionales identificados en la inspección
- [ ] **A01** Evitar que el campo «Colaborador (opcional)» se desplace entre tarjetas superiores del prospecto (captura del expediente).
- [ ] **A02** Revisar duplicidad «Fuente de contacto / Fuente Meta Ads» y de resumen de preaprobación para dejar una sola jerarquía informativa.
- [ ] **A03** Revisar **inconsistencia de documentos**: checklist nativo del cliente y actividad 8 (hoy pide CURP, CSF y acta) no coinciden necesariamente. Unificar criterios sin marcar recibidos ficticios ni sobrescribir evidencias.
- [ ] **A04** Confirmar que la vista de formulario híbrido oculte no solo `.form-group` ajenos, sino encabezados, `details`, contenedores de ayuda y otros elementos no incluidos en la categoría; no alterar guardado nativo.
- [ ] **A05** Mostrar todas las fechas de edición en **dd/mm/aaaa** (en captura de último retiro aparece `07/15/2021`); conservar valores reales ISO en almacenamiento.
- [ ] **A06** Prevenir desbordamientos horizontales, campos superpuestos o texto diminuto; conservar tamaños de control tocables y contrastes claros/oscuro.
- [ ] **A07** Verificar que los popups de actividades se abran encima de Clientes atendidos sin translucidez ni interferencia con su despliegue, clics en checkbox, scroll o foco.

## E. Criterios de aceptación obligatorios (NO dar por terminado sin ellos)
- [ ] **T01** Pruebas de render a **1440×900, 1024×768 y 390×844**, temas oscuro/claro; inspección real de cada tarjeta, captura comparativa y cero errores de consola.
- [ ] **T02** Prospecto: abrir, cambiar sección, desplegar/cerrar Meta, cambiar respuestas y guardar; sin pérdida de cambios ni duplicación.
- [ ] **T03** Cliente activo: seleccionar casillas documentales autorizadas, guardar, cerrar, reabrir y comprobar persistencia; comprobar rollback de fallo de sincronización.
- [ ] **T04** Cliente atendido/archivado: lectura clara y autorización correcta sin excepción no deseada.
- [ ] **T05** Notas: probar tipo/fecha/hora/nota, guardado, evento Agenda asociado y reabrir expediente; no generar eventos cuando no se programa nada.
- [ ] **T06** AFORE: solo una ficha y cita, conservar vínculos, fecha y hora; sin duplicados ni desaparición de controles.
- [ ] **T07** Lista: encabezados exactos y barras de atendidos operativas; 12 hitos con mismas reglas y sin cambios en Finanzas/Comisiones.
- [ ] **T08** Ejecutar `npm test`, Chromium, comprobación de permisos de Administrador/Asesor/Colaborador, contrastar `main`, Edge y flujo de Contratos.
- [ ] **T09** Respaldo `backup/main-pre-pulido-20261113`, cambios aislados en `fix/crm-hibrido-pulido-visual-operativo-20261113`, revisión de PR y fusión solo con pruebas correctas.
- [ ] **T10** Tras fusión comprobar GitHub Actions/Pages y **Cloudflare Pages** si la integración lo permite; no declarar validado Cloudflare si no se accede al sitio autenticado.
- [ ] **T11** Nunca alterar clientes reales durante las pruebas, inventar pagos, recalcular fecha firma +46 desde alta, ni modificar comisiones.

## Diagnóstico de código observado
- `app-client-activities-v2.css`: popup usa `background:var(--surface)`, sin definición localizada en `styles.css`; probable causa de transparencia.
- `app-client-activities-v2.js`: `authorized(c)` deshabilita las casillas para `c.archivado`; requiere manejo visible y pruebas de permisos. `documents(c)` evalúa CURP/CSF/Acta, mientras el checklist de expediente nativo usa otra definición.
- `app-client-hybrid-v2.js`: `selection('afore')` adjunta `pd-cita-afore` además del editor nativo. `inlineFields.notas` solo incluye `fc-notas`, omitiendo los campos `fc-prox-*`; `showEditorFields` oculta grupos pero no todo el marcado independiente.
- `app-prospect-hybrid-v2.js`: `routeFields()` mueve filas completas y ordena servicio antes del stepper; `summary()` siempre construye `cya-hybrid-origin-overview` abierto.
- `app-core-02a.js`: encabezados actuales, y bloque `clients-attended-section` en details sin estilo de barra completa.
- `app/index.html`: campos nativos de Próxima acción (`fc-prox-tipo`, `fc-prox-fecha`, `fc-prox-hora`, `fc-prox-nota`) ya existen. Deben reutilizarse, no replicarse.

**Estado:** este archivo documenta cambios **aún por implementar**, no es evidencia de aprobación de pruebas.
