/*
  Google Apps Script · Meta Lead Ads -> C&A CRM

  Compatible con múltiples pestañas Meta dentro de LEADS DE META ADS.
  - Conserva Hoja 1 y su histórico.
  - Detecta automáticamente nuevas pestañas creadas por Meta Forms.
  - Respeta lead_status de Meta (Conversions API).
  - Crea, si faltan, columnas auxiliares CRM al final de cada pestaña:
      Resumen para compartir | Notas manuales | Acción CRM | Estado CRM | Fecha CRM
  - No importa leads de prueba generados por Meta.
  - Prioriza filas recientes, usa LockService y límite interno de tiempo.

  Fecha oficial de inicio automático: 2026-10-27.
  Los leads anteriores NO se importan automáticamente, pero pueden enviarse
  manualmente seleccionando Importar o Reactivar en la columna Acción CRM.

  Propiedades del script (no guardar secretos en celdas):
  - CRM_ENDPOINT
  - CRM_INTEGRATION_TOKEN
  - CRM_SHEET_NAME (opcional; pestaña principal/preferida, p. ej. Hoja 1)
  - CRM_START_DATE (opcional; default 2026-10-27)
*/

const CRM_DEFAULT_START_DATE_ = '2026-10-27';
const CRM_SYNC_MAX_RUNTIME_MS_ = 240000; // 4 min: margen antes del límite duro
const CRM_HELPER_HEADERS_ = [
  'Resumen para compartir',
  'Notas manuales',
  'Acción CRM',
  'Estado CRM',
  'Fecha CRM'
];

function normalizeHeader_(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_');
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
    const normalized = normalizeHeader_(key);
    if (row[normalized] !== undefined && row[normalized] !== null && String(row[normalized]).trim() !== '') {
      return row[normalized];
    }
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

function findAnyQuestionValue_(row, fragments) {
  for (const fragment of fragments) {
    const value = findQuestionValue_(row, fragment);
    if (String(value ?? '').trim()) return value;
  }
  return '';
}

function looksLikeMetaHeader_(row) {
  const keys = new Set(row.map(normalizeHeader_).filter(Boolean));
  const hasPhone = keys.has('phone') || keys.has('phone_number') || keys.has('telefono');
  return keys.has('id') &&
    keys.has('created_time') &&
    keys.has('campaign_name') &&
    keys.has('form_name') &&
    keys.has('full_name') &&
    keys.has('email') &&
    hasPhone;
}

function findHeaderRow_(sheet, maxRows) {
  const lastRow = sheet.getLastRow();
  if (!lastRow) throw new Error('La hoja no contiene filas.');
  const count = Math.min(maxRows || 5, lastRow);
  const width = Math.max(1, Math.min(sheet.getLastColumn() || 1, 40));
  const rows = sheet.getRange(1, 1, count, width).getValues();
  for (let r = 0; r < rows.length; r++) {
    if (looksLikeMetaHeader_(rows[r])) return r + 1;
  }
  throw new Error('No se encontró un encabezado compatible de Meta Ads.');
}

function getHeaderMap_(sheet, headerRow) {
  const width = Math.max(1, sheet.getLastColumn());
  const headers = sheet.getRange(headerRow, 1, 1, width).getValues()[0];
  const map = {};
  headers.forEach((header, index) => {
    const key = normalizeHeader_(header);
    if (key && !map[key]) map[key] = index + 1;
  });
  return { headers, map };
}

function columnLetter_(columnNumber) {
  let n = Number(columnNumber);
  let out = '';
  while (n > 0) {
    const rem = (n - 1) % 26;
    out = String.fromCharCode(65 + rem) + out;
    n = Math.floor((n - 1) / 26);
  }
  return out;
}

function ensureCrmColumns_(sheet, headerRow) {
  let { headers, map } = getHeaderMap_(sheet, headerRow);
  const aliases = {
    summary: ['resumen_para_compartir'],
    notes: ['notas_manuales'],
    action: ['accion_crm'],
    status: ['estado_crm'],
    date: ['fecha_crm']
  };

  const findCol = aliasList => {
    for (const alias of aliasList) if (map[alias]) return map[alias];
    return 0;
  };

  const positions = {
    summary: findCol(aliases.summary),
    notes: findCol(aliases.notes),
    action: findCol(aliases.action),
    status: findCol(aliases.status),
    date: findCol(aliases.date)
  };

  const keys = ['summary', 'notes', 'action', 'status', 'date'];
  const missing = keys.filter(key => !positions[key]);
  if (missing.length) {
    let nextCol = sheet.getLastColumn() + 1;
    missing.forEach(key => {
      const label = CRM_HELPER_HEADERS_[keys.indexOf(key)];
      sheet.getRange(headerRow, nextCol).setValue(label);
      positions[key] = nextCol;
      nextCol++;
    });

    if (missing.includes('action')) {
      const rows = Math.max(1, sheet.getMaxRows() - headerRow);
      const rule = SpreadsheetApp.newDataValidation()
        .requireValueInList(['Importar', 'Reactivar'], true)
        .setAllowInvalid(false)
        .build();
      sheet.getRange(headerRow + 1, positions.action, rows, 1).setDataValidation(rule);
    }

    ({ headers, map } = getHeaderMap_(sheet, headerRow));
  }

  return positions;
}

function getMetaSheetContexts_(ss) {
  const props = PropertiesService.getScriptProperties();
  const preferred = String(props.getProperty('CRM_SHEET_NAME') || '').trim();
  const sheets = ss.getSheets().slice();
  if (preferred) {
    sheets.sort((a, b) => {
      if (a.getName() === preferred) return -1;
      if (b.getName() === preferred) return 1;
      return a.getIndex() - b.getIndex();
    });
  }

  const contexts = [];
  sheets.forEach(sheet => {
    try {
      const headerRow = findHeaderRow_(sheet, 5);
      const helpers = ensureCrmColumns_(sheet, headerRow);
      const width = Math.max(sheet.getLastColumn(), helpers.date);
      const headers = sheet.getRange(headerRow, 1, 1, width).getValues()[0].map(normalizeHeader_);
      contexts.push({ sheet, headerRow, helpers, width, headers });
    } catch (_) {
    }
  });

  if (!contexts.length) throw new Error('No se encontró ninguna pestaña compatible con Meta Lead Ads.');
  return contexts;
}

function buildLeadPayload_(row, crmAction) {
  const qImss = findAnyQuestionValue_(row, [
    'cual_describe_mejor_tu_situacion_actual_ante_el_imss',
    'actualmente_te_encuentras_sin_cotizar'
  ]);
  const qSemanas = findAnyQuestionValue_(row, [
    'acumulaste_al_menos_2_anos_cotizando',
    'calculas_haber_cotizado_al_menos_2_anos'
  ]);
  const qRetiro = findAnyQuestionValue_(row, [
    'has_realizado_antes_un_retiro_por_desempleo_de_tu_afore',
    'has_tramitado_algun_retiro_por_desempleo'
  ]);
  const curp = firstValue_(row, ['curp']) || findQuestionValue_(row, 'curp');

  return {
    external_id: String(firstValue_(row, ['id', 'lead_id', 'leadgen_id']) || '').trim(),
    created_time: firstValue_(row, ['created_time']),
    campaign_name: String(firstValue_(row, ['campaign_name']) || '').trim(),
    adset_name: String(firstValue_(row, ['adset_name']) || '').trim(),
    ad_name: String(firstValue_(row, ['ad_name']) || '').trim(),
    form_name: String(firstValue_(row, ['form_name']) || '').trim(),
    platform: String(firstValue_(row, ['platform']) || '').trim(),
    full_name: String(firstValue_(row, ['full_name', 'nombre_completo', 'nombre']) || '').trim(),
    phone: String(firstValue_(row, ['phone_number', 'phone', 'telefono']) || '').trim(),
    email: String(firstValue_(row, ['email', 'correo', 'correo_electronico']) || '').trim(),
    curp: String(curp || '').trim(),
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

function isMetaTestLead_(row, payload) {
  if (String(payload.email || '').trim().toLowerCase() === 'test@meta.com') return true;
  const values = Object.values(row || {});
  return values.some(value => String(value ?? '').toLowerCase().includes('<test lead:'));
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

function isAfterCutoff_(payload, cutoffDate) {
  const leadDate = parseLeadDate_(payload.created_time);
  if (!leadDate) return false;
  const cutoff = cutoffDate || configuredCutoffDate_();
  return leadDate.getTime() >= cutoff.getTime();
}

function normalizeAction_(value) {
  const v = String(value || '').trim().toLowerCase();
  if (v === 'importar') return 'import';
  if (v === 'reactivar') return 'reactivate';
  return '';
}

function isTerminalCrmState_(value) {
  const state = String(value || '').trim().toUpperCase();
  return /^(OK|IMPORTADO|REACTIVADO|DUPLICADO|HISTORICO|HISTÓRICO|PRUEBA META)/.test(state);
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

function formatResult_(result, requestedAction) {
  if (result?.reactivated) return 'REACTIVADO';
  if (result?.imported_historical) return 'IMPORTADO · HISTÓRICO';
  if (result?.duplicate) return result?.possible_duplicate ? 'DUPLICADO · YA EXISTE' : 'DUPLICADO';
  if (requestedAction === 'import') return 'IMPORTADO';
  return 'OK · IMPORTADO';
}

function syncSheet_(context, startedAt, cutoff) {
  const { sheet, headerRow, helpers, width, headers } = context;
  const lastRow = sheet.getLastRow();
  if (lastRow <= headerRow) {
    return { sheet: sheet.getName(), processed: 0, skipped: 0, rows: 0, stoppedForTime: false };
  }

  const firstDataRow = headerRow + 1;
  const rowCount = lastRow - headerRow;
  const data = sheet.getRange(firstDataRow, 1, rowCount, width).getValues();
  const statusOutput = data.map(row => [row[helpers.status - 1]]);
  const dateOutput = data.map(row => [row[helpers.date - 1]]);
  const actionRowsToClear = [];

  let changed = false;
  let processed = 0;
  let skipped = 0;
  let stoppedForTime = false;

  for (let i = data.length - 1; i >= 0; i--) {
    if (Date.now() - startedAt >= CRM_SYNC_MAX_RUNTIME_MS_) {
      stoppedForTime = true;
      break;
    }

    const rowNumber = firstDataRow + i;
    const values = data[i];
    const requestedAction = normalizeAction_(values[helpers.action - 1]);
    const currentState = String(values[helpers.status - 1] || '').trim().toUpperCase();

    if (!requestedAction && isTerminalCrmState_(currentState)) {
      skipped++;
      continue;
    }

    const row = rowToObject_(headers, values);
    const payload = buildLeadPayload_(row, requestedAction || 'auto');

    if (!payload.external_id && !payload.phone && !payload.curp && !payload.email && !payload.full_name) {
      skipped++;
      continue;
    }

    if (isMetaTestLead_(row, payload)) {
      if (currentState !== 'PRUEBA META · IGNORADA') {
        statusOutput[i][0] = 'PRUEBA META · IGNORADA';
        dateOutput[i][0] = new Date();
        changed = true;
      }
      skipped++;
      continue;
    }

    try {
      if (!payload.external_id && !payload.phone && !payload.curp && !payload.email) {
        throw new Error('La fila no contiene identificadores suficientes.');
      }

      if (!requestedAction && !isAfterCutoff_(payload, cutoff)) {
        if (!currentState) {
          statusOutput[i][0] = 'HISTÓRICO · DISPONIBLE';
          changed = true;
        }
        skipped++;
        continue;
      }

      const result = sendLeadToCrm_(payload);
      statusOutput[i][0] = formatResult_(result, requestedAction);
      dateOutput[i][0] = new Date();
      changed = true;
      processed++;
      if (requestedAction) actionRowsToClear.push(rowNumber);
    } catch (error) {
      statusOutput[i][0] = 'ERROR · ' + String(error && error.message || error).slice(0, 160);
      dateOutput[i][0] = new Date();
      changed = true;
      processed++;
    }
  }

  if (changed) {
    sheet.getRange(firstDataRow, helpers.status, rowCount, 1).setValues(statusOutput);
    sheet.getRange(firstDataRow, helpers.date, rowCount, 1).setValues(dateOutput);
  }

  if (actionRowsToClear.length) {
    const col = columnLetter_(helpers.action);
    sheet.getRangeList(actionRowsToClear.map(rowNumber => col + rowNumber)).clearContent();
  }

  return { sheet: sheet.getName(), processed, skipped, rows: rowCount, stoppedForTime };
}

function syncPendingMetaLeads() {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(5000)) {
    Logger.log('Sincronización omitida: ya existe otra ejecución activa.');
    return;
  }

  const startedAt = Date.now();
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const cutoff = configuredCutoffDate_();
    const contexts = getMetaSheetContexts_(ss);
    const results = [];

    for (const context of contexts) {
      if (Date.now() - startedAt >= CRM_SYNC_MAX_RUNTIME_MS_) {
        results.push({ sheet: context.sheet.getName(), processed: 0, skipped: 0, rows: 0, stoppedForTime: true });
        break;
      }
      const result = syncSheet_(context, startedAt, cutoff);
      results.push(result);
      if (result.stoppedForTime) break;
    }

    const totals = results.reduce((acc, item) => {
      acc.processed += item.processed || 0;
      acc.skipped += item.skipped || 0;
      acc.rows += item.rows || 0;
      acc.stoppedForTime = acc.stoppedForTime || !!item.stoppedForTime;
      return acc;
    }, { processed: 0, skipped: 0, rows: 0, stoppedForTime: false });

    Logger.log(JSON.stringify({
      processed: totals.processed,
      skipped: totals.skipped,
      rows: totals.rows,
      sheets: results,
      stoppedForTime: totals.stoppedForTime,
      elapsedMs: Date.now() - startedAt
    }));
    return results;
  } finally {
    lock.releaseLock();
  }
}

function getContextByName_(ss, sheetName) {
  const contexts = getMetaSheetContexts_(ss);
  if (sheetName) {
    const found = contexts.find(ctx => ctx.sheet.getName() === sheetName);
    if (!found) throw new Error('No se encontró una pestaña Meta compatible con ese nombre.');
    return found;
  }
  return contexts[0];
}

function probarFilaCRM(rowNumber, sheetName) {
  const n = Number(rowNumber);
  if (!Number.isInteger(n) || n < 2) throw new Error('Indica un número de fila válido, mayor o igual a 2.');
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const context = getContextByName_(ss, sheetName);
  const { sheet, headerRow, helpers, width, headers } = context;
  if (n <= headerRow || n > sheet.getLastRow()) throw new Error('La fila indicada está fuera de los datos actuales.');

  const values = sheet.getRange(n, 1, 1, width).getValues()[0];
  const action = normalizeAction_(values[helpers.action - 1]);
  const row = rowToObject_(headers, values);
  const payload = buildLeadPayload_(row, action || 'auto');

  if (isMetaTestLead_(row, payload)) {
    sheet.getRange(n, helpers.status).setValue('PRUEBA META · IGNORADA');
    sheet.getRange(n, helpers.date).setValue(new Date());
    const result = { skipped: true, reason: 'meta_test_lead' };
    Logger.log(JSON.stringify({ sheet: sheet.getName(), row: n, action: action || 'auto', result }, null, 2));
    return result;
  }

  if (!action && !isAfterCutoff_(payload)) {
    sheet.getRange(n, helpers.status).setValue('HISTÓRICO · DISPONIBLE');
    const result = { skipped: true, reason: 'before_cutoff' };
    Logger.log(JSON.stringify({ sheet: sheet.getName(), row: n, action: 'auto', result }, null, 2));
    return result;
  }

  try {
    const result = sendLeadToCrm_(payload);
    sheet.getRange(n, helpers.status).setValue(formatResult_(result, action));
    sheet.getRange(n, helpers.date).setValue(new Date());
    if (action) sheet.getRange(n, helpers.action).clearContent();
    Logger.log(JSON.stringify({ sheet: sheet.getName(), row: n, action: action || 'auto', result }, null, 2));
    return result;
  } catch (error) {
    sheet.getRange(n, helpers.status).setValue('ERROR · ' + String(error && error.message || error).slice(0, 160));
    sheet.getRange(n, helpers.date).setValue(new Date());
    throw error;
  }
}

function diagnosticarMetaCRM() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const contexts = getMetaSheetContexts_(ss);
  const diagnostics = contexts.map(context => {
    const { sheet, headerRow, helpers, width, headers } = context;
    const firstDataRow = headerRow + 1;
    let payload = {};
    if (sheet.getLastRow() >= firstDataRow) {
      const values = sheet.getRange(firstDataRow, 1, 1, width).getValues()[0];
      payload = buildLeadPayload_(rowToObject_(headers, values), 'auto');
    }
    return {
      sheet: sheet.getName(),
      headerRow,
      firstDataRow,
      lastRow: sheet.getLastRow(),
      officialCutoff: CRM_DEFAULT_START_DATE_,
      configuredCutoff: PropertiesService.getScriptProperties().getProperty('CRM_START_DATE') || CRM_DEFAULT_START_DATE_,
      externalId: payload.external_id || '',
      createdTime: payload.created_time || '',
      curp: payload.curp || '',
      phone: payload.phone || '',
      city: payload.city || '',
      campaign: payload.campaign_name || '',
      actionColumn: columnLetter_(helpers.action),
      statusColumn: columnLetter_(helpers.status),
      dateColumn: columnLetter_(helpers.date)
    };
  });
  Logger.log(JSON.stringify(diagnostics, null, 2));
  return diagnostics;
}
