# Activación controlada — Meta Leads → CRM C&A

Estado: **preparado, no activado en producción**.

## Objetivo

Activar la integración de Google Sheets / Meta Leads con el CRM sin importar históricos por accidente y con una ruta clara de reversión.

## Orden de activación

1. Aplicar el esquema de `lead_integrations` mediante una migración formal revisada.
2. Verificar que la tabla tenga RLS activa y que `anon` / `authenticated` no tengan acceso directo.
3. Desplegar `manage-lead-integration` con verificación JWT activa.
4. Desplegar `meta-lead-ingest` con verificación JWT desactivada; la función se autentica exclusivamente mediante `X-Lead-Integration-Token`.
5. Ingresar al CRM como asesor y abrir **Mi cuenta → Leads Meta Ads**.
6. Crear o rotar la integración y copiar:
   - `CRM_ENDPOINT`
   - `CRM_INTEGRATION_TOKEN`
7. En Google Apps Script, pegar `docs/meta-leads/google-apps-script-template.js`.
8. En Propiedades del script configurar:
   - `CRM_ENDPOINT`
   - `CRM_INTEGRATION_TOKEN`
   - `CRM_SHEET_NAME=Hoja 1`
   - `CRM_START_DATE=<fecha de corte elegida>`
9. Ejecutar primero la función de diagnóstico incluida en la plantilla. No crear disparadores hasta que confirme:
   - encabezado canónico en fila 2;
   - columnas Meta A:T;
   - ID Meta obtenido desde columna A;
   - nombre, teléfono, correo y CURP correctamente mapeados.
10. Ejecutar una sincronización manual con **un solo lead posterior a la fecha de corte**.
11. Confirmar en CRM:
   - aparece en `Nuevos Meta Ads`;
   - queda asignado al asesor correcto;
   - fuente `Meta Ads`;
   - conserva campaña/anuncio/formulario;
   - conserva respuestas declaradas separadas de la revisión operativa;
   - puede guardarse aunque falte nombre recibido de Meta;
   - no duplica un prospecto existente por ID Meta, CURP, teléfono o correo.
12. Solo después crear el disparador periódico.

## Reversión

La integración puede detenerse sin borrar datos:

1. En **Mi cuenta → Leads Meta Ads**, pulsar `Desactivar`.
2. Eliminar/deshabilitar el disparador de Apps Script.
3. Los prospectos ya creados permanecen en el CRM y pueden gestionarse normalmente.
4. No es necesario borrar `lead_integrations`; conservarla permite auditoría y una reactivación controlada.

## Seguridad

- El token de integración nunca debe guardarse en celdas de Google Sheets.
- El token solo se muestra al crearlo o rotarlo y en base de datos se almacena únicamente su hash SHA-256.
- `meta-lead-ingest` no confía en datos enviados por el navegador ni en `advisor_id` recibido: el asesor y la organización se resuelven desde la integración asociada al token.
- `manage-lead-integration` exige una sesión Supabase válida y valida que el perfil y la organización sigan activos.
- Las funciones aceptan las claves nuevas (`SUPABASE_PUBLISHABLE_KEYS` / `SUPABASE_SECRET_KEYS`) con fallback temporal a las legacy para compatibilidad.

## Hoja real verificada

Archivo: `LEADS DE META ADS`

- pestaña: `Hoja 1`;
- encabezado canónico: fila 2;
- bloque Meta canónico: columnas A:T;
- la fila 1 contiene un lead histórico y no debe tratarse como encabezado;
- existen columnas de seguimiento manual posteriores a T que no deben entrar al payload canónico.

## Pendientes que requieren participación del usuario

- Pegar el Apps Script en la hoja.
- Autorizar Google Apps Script la primera vez.
- Elegir/confirmar la fecha exacta de corte para comenzar a importar leads nuevos.
- Confirmar el primer lead de prueba antes de activar el disparador periódico.

## Lo que NO debe hacerse antes de la prueba

- No fusionar el PR a `main`.
- No activar un disparador periódico.
- No importar filas históricas.
- No compartir el token de integración por chat, correo o dentro de la hoja.
