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
