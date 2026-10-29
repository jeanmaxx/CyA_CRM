/*
  Add-on para permitir sincronización manual desde el CRM.

  Configuración única en Google Apps Script:
  1) En Propiedades del script agrega CRM_MANUAL_SYNC_KEY con la clave mostrada en Mi cuenta > Leads Meta Ads.
  2) Conserva este código en el mismo proyecto donde ya existe syncPendingMetaLeads().
  3) Implementar > Nueva implementación > Aplicación web.
     - Ejecutar como: Yo
     - Quién tiene acceso: Cualquiera
  4) Copia la URL terminada en /exec y guárdala en Mi cuenta > Leads Meta Ads.

  La clave no se guarda en la hoja. El endpoint solo permite ejecutar la sincronización existente.
*/

function manualSyncJson_(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  try {
    const props = PropertiesService.getScriptProperties();
    const expected = String(props.getProperty('CRM_MANUAL_SYNC_KEY') || '').trim();
    if (!expected) return manualSyncJson_({ ok: false, error: 'CRM_MANUAL_SYNC_KEY no está configurada.' });

    let body = {};
    try {
      body = JSON.parse(e && e.postData && e.postData.contents || '{}');
    } catch (_) {
      return manualSyncJson_({ ok: false, error: 'Solicitud JSON inválida.' });
    }

    const received = String(body.key || '').trim();
    if (!received || received !== expected) return manualSyncJson_({ ok: false, error: 'Clave de sincronización inválida.' });
    if (String(body.action || 'sync') !== 'sync') return manualSyncJson_({ ok: false, error: 'Acción no permitida.' });

    const results = syncPendingMetaLeads() || [];
    const totals = results.reduce((acc, item) => {
      acc.processed += Number(item && item.processed || 0);
      acc.skipped += Number(item && item.skipped || 0);
      acc.rows += Number(item && item.rows || 0);
      return acc;
    }, { processed: 0, skipped: 0, rows: 0 });

    return manualSyncJson_({
      ok: true,
      processed: totals.processed,
      skipped: totals.skipped,
      rows: totals.rows,
      sheets: results.map(item => ({
        sheet: String(item && item.sheet || ''),
        processed: Number(item && item.processed || 0),
        skipped: Number(item && item.skipped || 0),
        rows: Number(item && item.rows || 0),
        stoppedForTime: Boolean(item && item.stoppedForTime)
      }))
    });
  } catch (error) {
    return manualSyncJson_({ ok: false, error: String(error && error.message || error || 'Error inesperado').slice(0, 220) });
  }
}
