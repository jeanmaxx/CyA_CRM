# Respaldos y recuperación

Desde Mi Cuenta se puede crear una copia ZIP y consultar el resultado del servidor. El administrador técnico ve también la última copia manual de cada asesor y la papelera. Los asesores solo respaldan sus datos autorizados. El calendario ejecuta una copia interna de la organización diariamente a las 07:00 UTC (01:00 en Querétaro).

La copia externa a Drive **no está conectada**. El código desplegado no envía información a destinos externos. Se requiere identificar y autorizar una cuenta y carpeta antes de implementar ese envío.

## Contenido y verificación

El ZIP contiene database.json, manifest.json y los documentos accesibles en Storage. El manifiesto incluye conteos y alcance. El historial conserva tamaño y SHA-256. No incluye contraseñas ni sesiones de Auth. La copia JSON anterior sigue disponible para compatibilidad; no incluye los binarios de los documentos.

Antes de una recuperación completa, descargar el ZIP, comparar su SHA-256 con el historial, abrirlo y comprobar los conteos del manifiesto. Restaurar primero en un entorno de prueba. La interfaz no importa ZIP completos: su recuperación integral requiere una operación técnica por tablas y documentos, conservando los identificadores y las relaciones; no se debe cargar database.json en el importador JSON antiguo. La recuperación de cuentas Auth se gestiona aparte.

Para una eliminación puntual, usar la papelera técnica. El botón Restaurar no reemplaza un registro que ya existe. Las versiones anteriores de actualizaciones quedan en recovery_records para una revisión técnica, aunque la papelera muestra únicamente eliminaciones. No hay eliminación automática de estos respaldos en esta versión.

## Capturas sin confirmar

Los cambios se confirman después de la respuesta de Supabase. Cada pestaña conserva por separado las operaciones pendientes de su cuenta. Al recargar esa pestaña se intenta recuperar su borrador. Mi Cuenta permite descargar las capturas pendientes conservadas en este navegador, incluidas otras pestañas. Los borradores no contienen credenciales y no sustituyen el respaldo del servidor.

Ante un conflicto, descargar pendientes y cargar la versión guardada antes de volver a aplicar la corrección. No borrar los datos del navegador mientras existan cambios pendientes. La protección de servidor que impediría guardar desde pestañas antiguas está preparada en la migración 20260909224224_require_transactional_saves.sql, pero NO está aplicada: la revisión automática solicitó autorización específica por su efecto sobre todas las tablas operativas. Mientras tanto, el guardado nuevo usa confirmación y control de versiones, pero una pestaña antigua todavía podría emplear el mecanismo previo.

Las capturas originales de septiembre 8 reportadas como ausentes no se recuperaron ni se demostró su eliminación. La protección añadida evita fallos identificados en el proceso de guardado; no constituye evidencia del origen de ese incidente.
