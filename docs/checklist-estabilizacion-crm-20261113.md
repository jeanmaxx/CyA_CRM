# Checklist de estabilización del CRM híbrido — 13/11/2026

## Alcance confirmado con capturas del usuario

### A. Expediente de prospectos
- [x] Compactar cabecera, reducir tarjetas y espaciado; navegación de 3 columnas escritorio / 2 móvil.
- [x] Mantener los botones de CURP/RENAPO en la misma hilera cuando exista anchura; no duplicar formularios.
- [x] Origen y captación: mostrar fuente, campaña, conjunto, anuncio y formulario con rótulos humanos.
- [x] No mostrar IDs técnicos de campañas ni respuestas crudas de Meta Ads en el expediente.
- [x] Precalificación roja: IMSS activo, retiro anterior dentro de cinco años, menos de 65 semanas confirmadas.
- [x] Naranja: datos no seguros, revisión solicitada, datos incompletos o semanas por debajo de 105 sin evidencia de superar 65.
- [x] Verde: IMSS inactivo + retiro no reciente + 105+ semanas declaradas.
- [x] Verde condicionado: IMSS inactivo + retiro no reciente + 66–104 semanas conocidas; el saldo AFORE se verifica antes de una aprobación definitiva.
- [x] Preservar cuestionario original y fuente almacenada sin modificar datos de Meta Ads.

### B. Tabla de Clientes
- [x] Solo **15 columnas**: fecha de alta en CRM, nombre, 12 columnas con nombres de hitos, fecha de solicitud.
- [x] Suprimir servicio, etapa, proceso pendiente, documentos como barra de progreso, acciones de editar/expediente, sin eliminar la actividad «Documentos» entre los doce hitos.
- [x] Hitos clicables con el manejador de permisos anterior y nombres accesibles; nombre es acceso único al expediente.
- [x] Mantener filas de clientes atendidos y archivo y buscador existente.
- [x] Visualización móvil con 12 actividades identificables, sin botones duplicados.
- [x] Conservar cálculo de fecha existente; no rehacer la regla de firma + 46 días ni sobrescribir correcciones manuales.

### C. Expediente del cliente
- [x] Evitar doble interfaz de resumen antiguo frente al nuevo expediente híbrido.
- [x] Mostrar prioritariamente doce actividades y nueve tarjetas editables; reutilizar el editor y guardado nativos.
- [x] Retirar botón suelto de copiar CURP bajo el encabezado.
- [x] Sustituir engrane de configuración antiguo por icono vectorial consistente.
- [x] Hacer scroll interno del expediente y ajustar tamaños escritorio/tableta/móvil.
- [x] Mantener menú protegido de administración, solicitudes de cambio, descarte y eliminación definitiva deshabilitada.

### D. Validación y publicación
- [x] Rama de respaldo `backup/main-pre-fix-visual-20261113`.
- [x] Rama aislada `fix/crm-hibrido-ui-precalificacion-20261113`.
- [x] Añadir regresiones de preaprobación y tabla con 12 hitos.
- [ ] Validar la suite completa en GitHub Actions.
- [ ] Validar Chromium escritorio/móvil en claro y oscuro.
- [ ] Revisar conflictos entre capas de perfil; con test de compatibilidad específico.
- [ ] Confirmar estabilidad de roles, Agenda, Finanzas, contratos y datos en escenarios sintéticos existentes.
- [ ] Fusionar exclusivamente con pruebas y revisión de cambios satisfactorias.
- [ ] Verificar resultado después de integrar; confirmar que la versión del sitio Cloudflare se sirve efectivamente cuando sea comprobable.

## Decisiones de seguridad
No modificar base de datos, comisiones ni reglas de cobro para resolver cambios puramente visuales. No afirmar que una precalificación declarada constituye elegibilidad oficial. Una respuesta de 65 semanas exactas requiere validación manual; el intervalo verde condicionado solo comienza en 66 semanas. No eliminar ningún cliente real.