# Portal de Colaboradores v2 — Etapa 3: expediente editable
Fecha: 2026-11-12
Rama: feat/portal-colaboradores-v2-20261112

## Implementado en rama
- Modal «Expediente» desde nombre o botón del cliente, con pestañas Información y Seguimiento.
- Información: nombre, teléfono, CURP y servicio de solo lectura, domicilio completo editable, guardado que mantiene el modal abierto.
- Seguimiento: AFORE, cita, etapas informativas y acceso al contrato oficial existente. La edición de actividades corresponde a la etapa 4.
- Prospectos: domicilio completo en formulario, apertura como «Expediente · Prospecto» al editar, formulario permanece abierto tras guardar.
- Backend: nueva acción `update_client_info` en `supabase/functions/collaborator-portal/index.ts` con verificación de cuenta, colaborador, asesor y organización; control optimista usando `updated_at`, historial en payload y registro de actividad.
- Protección adicional para `update_prospect` mediante `expectedUpdatedAt` y validación de asesor asignado.
- El domicilio permanece en la cadena oficial `payload.domicilio`, que es el esquema actualmente usado por el CRM; no se crearon campos duplicados ni se modificaron las tablas.
- `serializeClient` comunica campos informativos necesarios para el expediente; los campos financieros continúan reservados al asesor.

## Validación parcial
- Archivos JavaScript modificados y nuevos compilados sintácticamente en V8.
- Prueba nueva: `tests/collaborator-v2-stage3.cjs`, añadida a `npm test`.
- No se ejecutó `npm test` completo, ni pruebas de navegación, ni prueba autenticada contra Supabase.
- La función de Supabase se modificó solo en GitHub: no está desplegada. La escritura del domicilio no estará disponible en producción hasta desplegar esta función y validar permisos.
- No se modificaron datos reales, ni esquema de Supabase, ni `main`, ni Cloudflare.

## Pendiente antes de despliegue
1. Ejecutar `npm ci && npm test` en checkout completo; revisar errores y corregir antes de merge.
2. Probar con usuario colaborador autorizado y uno ajeno: que el segundo no pueda modificar expediente ajeno.
3. Probar conflicto de versión: asesor modifica domicilio después de que colaborador abre expediente; la actualización del colaborador debe devolver 409 y permitir recarga.
4. Revisar cliente en firma, otro servicio, contrato y edición posterior; probar móvil y modos claro/oscuro.
5. Verificar que sincronización del CRM refresque cambios de Supabase sin sobrescribirlos por sincronización desactualizada.
6. Etapa 4: enlazar pasos reales a un modelo de actividades común, manteniendo el resumen de esta etapa como lectura hasta entonces.
