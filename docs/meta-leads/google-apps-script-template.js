/*
  Google Apps Script template for the Sheet that receives Meta Lead Ads.
  DRAFT: keep disabled until the Supabase endpoint and per-user integration token are deployed.

  Adapted to the real LEADS DE META ADS workbook:
  - the canonical Meta header is currently on row 2;
  - column A contains the Meta lead id even when its header cell is blank;
  - manual tracking columns can contain duplicated Meta-like labels and must not be
    used to decide which row is the source header.

  Suggested Script Properties (do not store secrets in cells):
  - CRM_ENDPOINT
  - CRM_INTEGRATION_TOKEN
  - CRM_SHEET_NAME (optional; current tab: Hoja 1)
  - CRM_START_DATE (optional ISO date; only rows on/after this date are sent)
*/

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
  // The live workbook has the actual Meta table beginning in A:T. A2 is blank,
  // so B:T are used as the strong signature and A is restored to "id" below.
  const bToT = row.slice(1, 20).map(normalizeHeader_);
  const expected = META_CANONICAL_COLUMNS_.slice(1);
  if (bToT.length < expected.length) return false;
  let matches = 0;
  for (let i = 0; i < expected.length; i++) if (bToT[i] === expected[i]) matches++;
  return matches >= 17 && bToT[0] === 'created_time' && bToT[2] === 'ad_name' && bToT[6] === 'campaign_name' && bToT[15] === 'full_name';
}

function findHeaderRow_(sheet, maxRows) {
  const count = Math.min(maxRows || 10, sheet.getLastRow());
  if (!count) throw new Error('La hoja no contiene filas.');
  const rows = sheet.getRange(1, 1, count, Math.min(20, sheet.getLastColumn())).getValues();
  for (let r = 0; r < rows.length; r++) {
    if (looksLikeCanonicalMetaHeader_(rows[r])) return r + 1;
  }
  throw new Error('No se encontró el encabezado canónico A:T de Meta Ads.');
}

function canonicalHeaders_(sheet, headerRow) {
  const headers = sheet.getRange(headerRow, 1, 1, 20).getValues()[0].map(normalizeHeader_);
  // Meta writes the lead id in column A but the current workbook has A2 blank.
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

function buildLeadPayload_(row) {
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

function isAfterCutoff_(payload) {
  const raw = PropertiesService.getScriptProperties().getProperty('CRM_START_DATE');
  if (!raw) return true;
  const cutoff = new Date(raw + (String(raw).length <= 10 ? 'T00:00:00' : ''));
  const leadDate = parseLeadDate_(payload.created_time);
  if (Number.isNaN(cutoff.getTime()) || !leadDate) return true;
  return leadDate.getTime() >= cutoff.getTime();
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

function syncMetaLeadRow_(sheet, rowNumber, headerRow) {
  if (rowNumber <= headerRow) return { skipped: true, reason: 'header' };
  const headers = canonicalHeaders_(sheet, headerRow);
  const values = sheet.getRange(rowNumber, 1, 1, 20).getValues()[0];
  const row = rowToObject_(headers, values);
  const payload = buildLeadPayload_(row);
  if (!payload.external_id && !payload.phone && !payload.curp && !payload.email) throw new Error('La fila no contiene identificadores suficientes.');
  if (!isAfterCutoff_(payload)) return { skipped: true, reason: 'before_cutoff' };
  return sendLeadToCrm_(payload);
}

function ensureTechnicalColumns_(sheet, headerRow) {
  const lastColumn = sheet.getLastColumn();
  const headers = sheet.getRange(headerRow, 1, 1, lastColumn).getValues()[0].map(normalizeHeader_);
  let statusCol = headers.findIndex(h => h === 'crm_sync') + 1;
  let dateCol = headers.findIndex(h => h === 'crm_sync_date') + 1;
  if (!statusCol) {
    statusCol = sheet.getLastColumn() + 1;
    sheet.getRange(headerRow, statusCol).setValue('CRM_SYNC');
  }
  if (!dateCol) {
    dateCol = sheet.getLastColumn() + 1;
    sheet.getRange(headerRow, dateCol).setValue('CRM_SYNC_DATE');
  }
  return { statusCol, dateCol };
}

/*
  Install a time-driven trigger pointing to this function. Meta's external connector
  does not reliably fire onEdit. Rows already marked OK / DUPLICADO / OMITIDO are skipped.
*/
function syncPendingMetaLeads() {
  const props = PropertiesService.getScriptProperties();
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const configuredName = props.getProperty('CRM_SHEET_NAME');
  const sheet = configuredName ? ss.getSheetByName(configuredName) : ss.getSheets()[0];
  if (!sheet) throw new Error('No se encontró la hoja configurada.');

  const headerRow = findHeaderRow_(sheet, 10);
  const lastRow = sheet.getLastRow();
  if (lastRow <= headerRow) return;
  const { statusCol, dateCol } = ensureTechnicalColumns_(sheet, headerRow);

  for (let rowNumber = headerRow + 1; rowNumber <= lastRow; rowNumber++) {
    const state = String(sheet.getRange(rowNumber, statusCol).getValue() || '').trim().toUpperCase();
    if (state === 'OK' || state.startsWith('OK · DUPLICADO') || state.startsWith('OMITIDO')) continue;
    try {
      const result = syncMetaLeadRow_(sheet, rowNumber, headerRow);
      if (result?.skipped) {
        sheet.getRange(rowNumber, statusCol).setValue(result.reason === 'before_cutoff' ? 'OMITIDO · ANTERIOR A FECHA DE INICIO' : 'OMITIDO');
      } else {
        sheet.getRange(rowNumber, statusCol).setValue(result && result.duplicate ? 'OK · DUPLICADO' : 'OK');
      }
      sheet.getRange(rowNumber, dateCol).setValue(new Date());
    } catch (error) {
      sheet.getRange(rowNumber, statusCol).setValue('ERROR · ' + String(error && error.message || error).slice(0, 160));
      sheet.getRange(rowNumber, dateCol).setValue(new Date());
    }
  }
}

/* Read-only diagnostic helper. Run manually before enabling the trigger. */
function diagnosticarMetaCRM() {
  const props = PropertiesService.getScriptProperties();
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = props.getProperty('CRM_SHEET_NAME') ? ss.getSheetByName(props.getProperty('CRM_SHEET_NAME')) : ss.getSheets()[0];
  const headerRow = findHeaderRow_(sheet, 10);
  const headers = canonicalHeaders_(sheet, headerRow);
  const firstDataRow = headerRow + 1;
  const row = rowToObject_(headers, sheet.getRange(firstDataRow, 1, 1, 20).getValues()[0]);
  const payload = buildLeadPayload_(row);
  Logger.log(JSON.stringify({ sheet: sheet.getName(), headerRow, firstDataRow, externalId: payload.external_id, createdTime: payload.created_time, curp: payload.curp, phone: payload.phone, campaign: payload.campaign_name }, null, 2));
  return { sheet: sheet.getName(), headerRow, firstDataRow, payload };
}
