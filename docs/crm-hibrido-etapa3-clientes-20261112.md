# Etapa 3 — expediente híbrido de clientes (integración inicial)

Fecha: 12/11/2026. Rama aislada: `feat/crm-hibrido-etapa3-clientes-20261112`. Esta rama parte de la **etapa 2 en borrador**. No fusionar a `main` ni desplegar sin completar validación de fases previas.

## Implementación actual

- Cabecera ancha compacta con nombre, CURP, teléfono, ciudad, asesor, colaborador y fuente; icono de copiar CURP; fecha probable de solicitud y fecha probable de cobro visuales. **No se modificó la regla interna vigente** de estimación basada en firma del contrato ni las fechas guardadas.
- Nueve tarjetas: Contratos, Identidad y contacto, Información previsional, AFORE, Banco, Finanzas, Comisiones, Notas, Historial.
- Contratos se muestra primero antes de confirmar firma y después cambia a la penúltima sección operativa, anterior a Notas e Historial. Historial permanece último.
- Se reutilizan los paneles originales y **los mismos nodos DOM**, sin clonar controles ni crear registros duplicados, para proteger contratos, PDF, cita AFORE, documentos, finanzas y sus manejadores.
- Contratos se abre por defecto antes de firma; después, todas las tarjetas comienzan cerradas.
- Menú contextual con Regresar a prospectos, Cambiar asesor, Descartar y Eliminar definitivamente en ese orden. Las dos primeras operaciones usan flujos preexistentes. La eliminación permanente permanece **deshabilitada** hasta verificar permisos, referencias y recuperación.
- Los controles de permisos y sincronización siguen en los módulos existentes; Supabase no se modifica en esta fase.
- Se añaden regresiones Node/JSDOM dentro de `npm test` y GitHub Actions; comprobar manualmente desktop, móvil, claro y oscuro antes de publicar.

## Bloqueadores conocidos de la etapa 3 — NO considerar fase finalizada

1. **Edición interna (implementada, requiere auditoría funcional):** Identidad, Previsional, AFORE, Banco, Comisiones y Notas ahora montan **el formulario de edición original** dentro del panel del expediente; no se duplica el formulario ni el modelo de datos. Conserva validaciones y `guardarCliente`, muestra solo campos de la categoría, solicita confirmación si hay cambios sin guardar y, tras guardado correcto, vuelve a esa tarjeta. Un observador devuelve el editor a su DOM original si se cierra o se vuelve a representar el perfil. **Pendiente:** verificar que el guardado nativo de expediente completo no altere accidentalmente campos de otras categorías (incluidas fechas y Finanzas) y realizar pruebas reales de permisos/sincronización, con datos sintéticos.
2. **Distribución fina:** la sección Información previsional/Banco usa el panel de datos existentes filtrado por etiquetas; consolidar un contrato estable por campo y pruebas de compatibilidad.
3. **Notas:** el textarea original se edita en el panel interno y muestra debajo las últimas observaciones disponibles en el historial. Pendiente: verificar que el historial de notas nuevas se registre cronológicamente y no se sobrescriba sin auditoría.
4. **Comisiones:** el panel interno reutiliza los campos nativos de colaborador, honorarios, comisión y porcentaje. Pendiente: validar reglas de atribución y permisos cruzados por rol, sin exponer comisiones ajenas.
5. **Menú de administración:** habilitar eliminación solo tras validar restricciones y confirmación de eliminación definitiva; preservar solicitudes/transferencias de asesor y citas pendientes.
6. **Cobro probable:** confirmar fuente y calendario operativo de dos días hábiles; es un valor de presentación y no una actualización del cálculo histórico.
7. **Seguimiento de 12 etapas:** pertenece a la **etapa 4**. El seguimiento anterior se conserva provisionalmente fuera de las nueve tarjetas hasta implementar y validar los nuevos indicadores.
8. **Regresión de flujo del cliente:** probar conversión desde prospecto, cambiar asesor, descarte, contratos/PDF, Agenda, comisiones, guardar en perfiles con permisos distintos y reapertura.
9. **Prueba visual autenticada:** verificar que los wrappers cargados dinámicamente no sobrescriban el nuevo perfil y que los botones existentes funcionen; las regresiones automáticas JSDOM para edición interna están incorporadas al CI, pero no sustituyen la prueba visual/autenticada.
10. **Respaldos:** una rama GitHub no respalda datos de Supabase. Cualquier futura migración debe documentar respaldo, reversibilidad y pruebas sin tocar expedientes reales.

## Criterio de seguridad

Mantener PR en borrador hasta que la edición interna sea real, se valide mediante pruebas y comprobación visual, y exista un plan de fusión/despliegue sin interrupción operativa. No afirmar que esta fase está completada ni desplegada antes de ello.

## Control de integridad añadido en esta revisión

- Los guardados desde las tarjetas Identidad, Previsional, AFORE, Banco, Comisiones y Notas indican explícitamente su sección al guardado **nativo** `guardarCliente`. El adaptador permite persistir solo las claves pertenecientes a esa sección y restaura el resto de la información previa, incluido cualquier dato legado desconocido.
- Para ediciones parciales se desactiva el recálculo transversal de fecha estimada y recordatorios desde `sincronizarFechasCliente`; el flujo completo original y los formularios específicos de contratos/alta conservan su comportamiento vigente. Se respeta cualquier ajuste manual previo.
- La edición de Banco conserva expresamente su CLABE capturada. Notas deja evidencia cronológica de los textos anterior y nuevo en el historial del cliente.
- Nuevas pruebas: `tests/crm-hybrid-client-save-isolation.cjs` (aislamiento de campos) y `tests/crm-hybrid-client-real-save.cjs` (ejecución real del guardado con cliente de prueba sintético y comprobación de fechas, montos, etapa, agenda y Notas). Las suites se ejecutan en GitHub Actions.
- Diseño de escritorio ajustado a **tres tarjetas por fila**; tablet dos y móvil una, para minimizar altura.

### Hallazgo técnico que **no se modificó**

Se observaron varias implementaciones históricas de fechas: `calcFechaRetiro` en `app-core-04.js` utiliza una suma desde registro y `sincronizarFechasCliente` en `app-workflow.js` programa el recordatorio `solicitud_45` desde el alta. La instrucción vigente del usuario es **no cambiar la lógica actual**, por lo que esta fase solo aísla los guardados de las tarjetas y conserva sus fechas. Antes de etapa 4 hay que mapear cuál dato alimenta exactamente la tabla y la cabecera, sin asumir que todos esos cálculos tienen la misma semántica.

## Revisión de seguridad y listas — continuación

- **Navegación segura:** Regresar a prospectos y Descartar cliente avisan cuando existen cambios sin guardar en el editor interno; el usuario puede cancelar la acción.
- **Historial HTML:** el texto de observaciones y cambios ahora se escapa al mostrarlo para que notas con caracteres especiales no inyecten marcado HTML.
- **Clientes atendidos y descartados:** quedan en ese orden debajo de clientes activos, ambas secciones contraídas por defecto; Descartados solo aparece si existen registros para la vista/asesor. Se filtran los archivados fuera de la lista activa. No se alteran registros de la base.
- **Eliminar:** se retiran los accesos de eliminación rápida desde filas y tarjetas móviles; la opción de administración «Eliminar definitivamente» **continúa deshabilitada** hasta contar con permisos y verificación de referencias en backend, confirmación reforzada y un plan de recuperación.
- **Cabecera:** se conserva la felicitación (visible aun cuando falte fecha de nacimiento, deshabilitada hasta completar datos) y se añadió Agenda que abre el formulario de evento **ya existente**, preasignando el cliente; no se crea un sistema paralelo de eventos.
- **Seguimiento:** se oculta la barra de etapas *legada* dentro del expediente híbrido para no duplicar el indicador de la tabla; las nuevas 12 actividades se desarrollarán y probarán en la etapa 4.
- **Pruebas:** la suite amplió cobertura de cierre con modificaciones pendientes, accesos a Agenda y listas archivadas. La última ejecución de Actions con controles funcionales pasó, antes del último ajuste de estilo. La comprobación de apariencia autenticada en escritorio/móvil y los permisos de eliminación siguen pendientes.

La etapa 3 está **en validación**, no desplegada ni fusionada a `main`. El PR de revisión permanece en borrador.
