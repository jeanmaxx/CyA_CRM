/*
  Google Apps Script para la hoja que recibe Meta Lead Ads.

  Estructura acordada de LEADS DE META ADS:
  - A:T = datos canónicos de Meta Ads;
  - U = Resumen para compartir;
  - V = Notas manuales;
  - W = Acción CRM (Importar / Reactivar);
  - X = Estado CRM;
  - Y = Fecha CRM.

  Fecha oficial de inicio automático: 2026-10-27.
  Los leads anteriores NO se importan automáticamente, pero pueden enviarse
  manualmente seleccionando Importar o Reactivar en la columna W.

  Propiedades del script (no guardar secretos en celdas):
  - CRM_ENDPOINT
  - CRM_INTEGRATION_TOKEN
  - CRM_SHEET_NAME (opcional; Hoja 1)
  - CRM_START_DATE (opcional; default 2026-10-27)
*/

const CRM_DEFAULT_START_DATE_ = '2026-10-27';
const CRM_ACTION_COL_ = 23; // W
const CRM_STATUS_COL_ = 24; // X
const CRM_DATE_COL_ = 25;   // Y

const META_CANONICAL_COLUMNS_ = [
  'id','created_time','ad_id','ad_name','adset_id','adset_name','campaign_id','campaign_name',
  'form_id','form_name','is_organic','platform',
  '¿actualmente_te_encuentras_sin_cotizar_ante_el_imss_o_con_empleo_informal/independiente?',
  'a_lo_largo_de_tu_vida_laboral,_¿calculas_haber_cotizado_al_menos_2_años_(105_semanas)_ante_el_imss',
  '¿has_tramitado_algún_retiro_por_desempleo_de_tu_afore_en_los_últimos_5_años?',
  'ingresa_tu_curp_(18_dígitos)_para_consultar_tus_semanas_en_el_sistema_sin_compromiso:',
  'full_name','phone','email','lead_status'
];

function normalizeHeader_(value) {
  return String(value || '').trim().toLowerCase().replace(/\s+/g, '_');
}

function looksLikeCanonicalMetaHeader_(row) {
  const normalized = row.slice(0, 20).map(normalizeHeader_);
  const expected = META_CANONICAL_COLUMNS_.map(normalizeHeader_);
  if (normalized.length < expected.length) return false;
  let matches = 0;
  for (let i = 0; i < expected.length; i++) if (normalized[i] === expected[i]) matches++;
  return matches >= 18 && normalized[0] === 'id' && normalized[1] === 'created_time' && normalized[3] === 'ad_name' && normalized[7] === 'campaign_name' && normalized[16] === 'full_name';
}

function findHeaderRow_(sheet, maxRows) {
  const count = Math.min(maxRows || 5, sheet.getLastRow());
  if (!count) throw new Error('La hoja no contiene filas.');
  const rows = sheet.getRange(1, 1, count, 20).getValues();
  for (let r = 0; r < rows.length; r++) {
    if (looksLikeCanonicalMetaHeader_(rows[r])) return r + 1;
  }
  throw new Error('No se encontró el encabezado canónico A:T de Meta Ads.');
}

function canonicalHeaders_(sheet, headerRow) {
  const headers = sheet.getRange(headerRow, 1, 1, 20).getValues()[0].map(normalizeHeader_);
  headers[0] = 'id';
  return headers;
}

function rowToObject_(headers, values) {
  const out = {};
  headers.forEach((header, index) => {
    const key = normalizeHeader_(header);
    if (key) out[key] = values[index];
  });
  return out;
}

function firstValue_(row, candidates) {
  for (const key of candidates) {
    if (row[key] !== undefined && row[key] !== null && String(row[key]).trim() !== '') return row[key];
  }
  return '';
}

function findQuestionValue_(row, fragment) {
  const wanted = normalizeHeader_(fragment);
  for (const [key, value] of Object.entries(row)) {
    if (normalizeHeader_(key).includes(wanted) && String(value ?? '').trim()) return value;
  }
  return '';
}

function buildLeadPayload_(row, crmAction) {
  const qImss = findQuestionValue_(row, 'actualmente_te_encuentras_sin_cotizar');
  const qSemanas = findQuestionValue_(row, 'calculas_haber_cotizado_al_menos_2_años');
  const qRetiro = findQuestionValue_(row, 'has_tramitado_algún_retiro_por_desempleo');
  return {
    external_id: String(firstValue_(row, ['id', 'lead_id', 'leadgen_id']) || '').trim(),
    created_time: firstValue_(row, ['created_time']),
    campaign_name: String(firstValue_(row, ['campaign_name']) || '').trim(),
    adset_name: String(firstValue_(row, ['adset_name']) || '').trim(),
    ad_name: String(firstValue_(row, ['ad_name']) || '').trim(),
    form_name: String(firstValue_(row, ['form_name']) || '').trim(),
    platform: String(firstValue_(row, ['platform']) || '').trim(),
    full_name: String(firstValue_(row, ['full_name', 'nombre_completo', 'nombre']) || '').trim(),
    phone: String(firstValue_(row, ['phone_number', 'phone', 'telefono', 'teléfono']) || '').trim(),
    email: String(firstValue_(row, ['email', 'correo', 'correo_electronico']) || '').trim(),
    curp: String(firstValue_(row, ['curp', 'ingresa_tu_curp_(18_dígitos)_para_consultar_tus_semanas_en_el_sistema_sin_compromiso:']) || '').trim(),
    city: String(firstValue_(row, ['city', 'ciudad', 'municipio']) || '').trim(),
    crm_action: crmAction || 'auto',
    answers: {
      imss_status_declared: qImss,
      weeks_declared: qSemanas,
      previous_withdrawal_declared: qRetiro,
      raw: row
    },
    source: 'Meta Ads'
  };
}

function parseLeadDate_(value) {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(String(value));
  return Number.isNaN(d.getTime()) ? null : d;
}

function configuredCutoffDate_() {
  const raw = PropertiesService.getScriptProperties().getProperty('CRM_START_DATE') || CRM_DEFAULT_START_DATE_;
  const cutoff = new Date(raw + (String(raw).length <= 10 ? 'T00:00:00' : ''));
  if (Number.isNaN(cutoff.getTime())) throw new Error('CRM_START_DATE no contiene una fecha válida. Usa YYYY-MM-DD.');
  return cutoff;
}

function isAfterCutoff_(payload) {
  const leadDate = parseLeadDate_(payload.created_time);
  if (!leadDate) return false;
  return leadDate.getTime() >= configuredCutoffDate_().getTime();
}

function normalizeAction_(value) {
  const v = String(value || '').trim().toLowerCase();
  if (v === 'importar') return 'import';
  if (v === 'reactivar') return 'reactivate';
  return '';
}

function sendLeadToCrm_(payload) {
  const props = PropertiesService.getScriptProperties();
  const endpoint = props.getProperty('CRM_ENDPOINT');
  const token = props.getProperty('CRM_INTEGRATION_TOKEN');
  if (!endpoint || !token) throw new Error('Falta configurar CRM_ENDPOINT o CRM_INTEGRATION_TOKEN en Script Properties.');

  const response = UrlFetchApp.fetch(endpoint, {
    method: 'post',
    contentType: 'application/json',
    muteHttpExceptions: true,
    headers: { 'X-Lead-Integration-Token': token },
    payload: JSON.stringify(payload)
  });

  const status = response.getResponseCode();
  let body = {};
  try { body = JSON.parse(response.getContentText() || '{}'); } catch (_) {}
  if (status < 200 || status >= 300) throw new Error(body.error || ('CRM respondió HTTP ' + status));
  return body;
}

function syncMetaLeadRow_(sheet, rowNumber, headerRow, action) {
  if (rowNumber <= headerRow) return { skipped: true, reason: 'header' };
  const headers = canonicalHeaders_(sheet, headerRow);
  const values = sheet.getRange(rowNumber, 1, 1, 20).getValues()[0];
  const row = rowToObject_(headers, values);
  const payload = buildLeadPayload_(row, action || 'auto');
  if (!payload.external_id && !payload.phone && !payload.curp && !payload.email) throw new Error('La fila no contiene identificadores suficientes.');

  // Importar / Reactivar ignoran la fecha de corte, pero conservan created_time original.
  if (!action && !isAfterCutoff_(payload)) return { skipped: true, reason: 'before_cutoff' };
  return sendLeadToCrm_(payload);
}

function formatResult_(result, requestedAction) {
  if (result?.reactivated) return 'REACTIVADO';
  if (result?.imported_historical) return 'IMPORTADO · HISTÓRICO';
  if (result?.duplicate) return result?.possible_duplicate ? 'DUPLICADO · YA EXISTE' : 'DUPLICADO';
  if (requestedAction === 'import') return 'IMPORTADO';
  return 'OK · IMPORTADO';
}

function syncPendingMetaLeads() {
  const props = PropertiesService.getScriptProperties();
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const configuredName = props.getProperty('CRM_SHEET_NAME');
  const sheet = configuredName ? ss.getSheetByName(configuredName) : ss.getSheets()[0];
  if (!sheet) throw new Error('No se encontró la hoja configurada.');

  const headerRow = findHeaderRow_(sheet, 5);
  const lastRow = sheet.getLastRow();
  if (lastRow <= headerRow) return;

  for (let rowNumber = headerRow + 1; rowNumber <= lastRow; rowNumber++) {
    const requestedAction = normalizeAction_(sheet.getRange(rowNumber, CRM_ACTION_COL_).getValue());
    const currentState = String(sheet.getRange(rowNumber, CRM_STATUS_COL_).getValue() || '').trim().toUpperCase();

    // Un usuario puede volver a elegir Importar/Reactivar aunque la fila ya tenga estado.
    // Si no hay acción manual, las filas finalizadas se omiten.
    if (!requestedAction && /^(OK|IMPORTADO|REACTIVADO|DUPLICADO)/.test(currentState)) continue;

    try {
      const result = syncMetaLeadRow_(sheet, rowNumber, headerRow, requestedAction);
      if (result?.skipped) {
        if (result.reason === 'before_cutoff') {
          // Los históricos permanecen disponibles para Importar/Reactivar manualmente.
          if (!currentState) sheet.getRange(rowNumber, CRM_STATUS_COL_).setValue('HISTÓRICO · DISPONIBLE');
        }
      } else {
        sheet.getRange(rowNumber, CRM_STATUS_COL_).setValue(formatResult_(result, requestedAction));
        sheet.getRange(rowNumber, CRM_DATE_COL_).setValue(new Date());
        if (requestedAction) sheet.getRange(rowNumber, CRM_ACTION_COL_).clearContent();
      }
    } catch (error) {
      sheet.getRange(rowNumber, CRM_STATUS_COL_).setValue('ERROR · ' + String(error && error.message || error).slice(0, 160));
      sheet.getRange(rowNumber, CRM_DATE_COL_).setValue(new Date());
    }
  }
}

/* Ejecutar manualmente antes de crear el disparador periódico. No envía datos. */
function diagnosticarMetaCRM() {
  const props = PropertiesService.getScriptProperties();
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = props.getProperty('CRM_SHEET_NAME') ? ss.getSheetByName(props.getProperty('CRM_SHEET_NAME')) : ss.getSheets()[0];
  const headerRow = findHeaderRow_(sheet, 5);
  const headers = canonicalHeaders_(sheet, headerRow);
  const firstDataRow = headerRow + 1;
  const row = rowToObject_(headers, sheet.getRange(firstDataRow, 1, 1, 20).getValues()[0]);
  const payload = buildLeadPayload_(row, 'auto');
  const diagnostic = {
    sheet: sheet.getName(),
    headerRow,
    firstDataRow,
    officialCutoff: CRM_DEFAULT_START_DATE_,
    configuredCutoff: PropertiesService.getScriptProperties().getProperty('CRM_START_DATE') || CRM_DEFAULT_START_DATE_,
    externalId: payload.external_id,
    createdTime: payload.created_time,
    curp: payload.curp,
    phone: payload.phone,
    campaign: payload.campaign_name,
    actionColumn: 'W',
    statusColumn: 'X',
    dateColumn: 'Y'
  };
  Logger.log(JSON.stringify(diagnostic, null, 2));
  return diagnostic;
}
