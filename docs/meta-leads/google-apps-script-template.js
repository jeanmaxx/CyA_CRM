/*
  Google Apps Script template for the Sheet that receives Meta Lead Ads.
  DRAFT: keep disabled until the Supabase endpoint and per-user integration token are deployed.

  Suggested Script Properties (do not store secrets in cells):
  - CRM_ENDPOINT
  - CRM_INTEGRATION_TOKEN
  - CRM_SHEET_NAME (optional)
*/

function normalizeHeader_(value) {
  return String(value || '').trim().toLowerCase().replace(/\s+/g, '_');
}

function findHeaderRow_(sheet, maxRows) {
  const rows = sheet.getRange(1, 1, Math.min(maxRows || 10, sheet.getLastRow()), sheet.getLastColumn()).getValues();
  for (let r = 0; r < rows.length; r++) {
    const normalized = rows[r].map(normalizeHeader_);
    if (normalized.includes('created_time') && normalized.some(v => v === 'full_name' || v.includes('nombre'))) return r + 1;
  }
  throw new Error('No se encontró la fila de encabezados de Meta Ads.');
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

function buildLeadPayload_(row) {
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
    curp: String(firstValue_(row, ['curp']) || '').trim(),
    city: String(firstValue_(row, ['city', 'ciudad', 'municipio']) || '').trim(),
    answers: row,
    source: 'Meta Ads'
  };
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

function syncMetaLeadRow_(sheet, rowNumber) {
  const headerRow = findHeaderRow_(sheet, 10);
  if (rowNumber <= headerRow) return;
  const lastColumn = sheet.getLastColumn();
  const headers = sheet.getRange(headerRow, 1, 1, lastColumn).getValues()[0];
  const values = sheet.getRange(rowNumber, 1, 1, lastColumn).getValues()[0];
  const row = rowToObject_(headers, values);
  const payload = buildLeadPayload_(row);
  if (!payload.external_id && !payload.phone && !payload.curp) throw new Error('La fila no contiene identificadores suficientes.');
  return sendLeadToCrm_(payload);
}

/*
  Use an installable trigger pointing to this function.
  For Sheets populated by an external connector, onEdit is not reliable; a time-driven
  trigger every few minutes is safer. This function processes only rows not previously marked.
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

  const statusHeader = 'CRM_SYNC';
  const dateHeader = 'CRM_SYNC_DATE';
  const lastColumn = sheet.getLastColumn();
  const headers = sheet.getRange(headerRow, 1, 1, lastColumn).getValues()[0];
  let statusCol = headers.findIndex(h => normalizeHeader_(h) === normalizeHeader_(statusHeader)) + 1;
  let dateCol = headers.findIndex(h => normalizeHeader_(h) === normalizeHeader_(dateHeader)) + 1;

  if (!statusCol) { statusCol = sheet.getLastColumn() + 1; sheet.getRange(headerRow, statusCol).setValue(statusHeader); }
  if (!dateCol) { dateCol = sheet.getLastColumn() + 1; sheet.getRange(headerRow, dateCol).setValue(dateHeader); }

  for (let rowNumber = headerRow + 1; rowNumber <= lastRow; rowNumber++) {
    const state = String(sheet.getRange(rowNumber, statusCol).getValue() || '').trim().toUpperCase();
    if (state === 'OK') continue;
    try {
      const result = syncMetaLeadRow_(sheet, rowNumber);
      sheet.getRange(rowNumber, statusCol).setValue(result && result.duplicate ? 'OK · DUPLICADO' : 'OK');
      sheet.getRange(rowNumber, dateCol).setValue(new Date());
    } catch (error) {
      sheet.getRange(rowNumber, statusCol).setValue('ERROR · ' + String(error && error.message || error).slice(0, 160));
      sheet.getRange(rowNumber, dateCol).setValue(new Date());
    }
  }
}
