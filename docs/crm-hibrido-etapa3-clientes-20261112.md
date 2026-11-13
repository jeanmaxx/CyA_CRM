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

1. **Edición completamente interna:** la primera integración reutiliza los paneles de lectura y funciones existentes, pero varias categorías todavía abren el editor legado. Diseñar y validar el montaje seguro del editor nativo dentro del panel híbrido, incluyendo advertencias por cambios sin guardar, guardado independiente y permanencia del expediente. No crear una segunda ruta de escritura sin controles de auditoría y RLS.
2. **Distribución fina:** la sección Información previsional/Banco usa el panel de datos existentes filtrado por etiquetas; consolidar un contrato estable por campo y pruebas de compatibilidad.
3. **Notas:** conservar y exponer edición cronológica auditada; la vista actual muestra una consulta y reutiliza la edición actual.
4. **Comisiones:** garantizar vista de importes, atribución y permisos correctos; usar registro oficial de Finanzas, no un cálculo paralelo.
5. **Menú de administración:** habilitar eliminación solo tras validar restricciones y confirmación de eliminación definitiva; preservar solicitudes/transferencias de asesor y citas pendientes.
6. **Cobro probable:** confirmar fuente y calendario operativo de dos días hábiles; es un valor de presentación y no una actualización del cálculo histórico.
7. **Seguimiento de 12 etapas:** pertenece a la **etapa 4**. El seguimiento anterior se conserva provisionalmente fuera de las nueve tarjetas hasta implementar y validar los nuevos indicadores.
8. **Regresión de flujo del cliente:** probar conversión desde prospecto, cambiar asesor, descarte, contratos/PDF, Agenda, comisiones, guardar en perfiles con permisos distintos y reapertura.
9. **Prueba visual autenticada:** verificar que wrappers cargados dinámicamente no sobrescriban el nuevo perfil y que los botones existentes funcionen.
10. **Respaldos:** una rama GitHub no respalda datos de Supabase. Cualquier futura migración debe documentar respaldo, reversibilidad y pruebas sin tocar expedientes reales.

## Criterio de seguridad

Mantener PR en borrador hasta que la edición interna sea real, se valide mediante pruebas y comprobación visual, y exista un plan de fusión/despliegue sin interrupción operativa. No afirmar que esta fase está completada ni desplegada antes de ello.
