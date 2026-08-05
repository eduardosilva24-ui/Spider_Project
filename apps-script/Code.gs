const APP_VERSION = '1.0.0';
const DEFAULT_SPREADSHEET_NAME = 'Projeto Spider Dados';
const DEFAULT_SPREADSHEET_ID = '19CqyW44iR_t59coo222aSpyfXZzBuvrFPdcWNR1jSlY';

const DEFAULT_SETTINGS = {
  userName: 'Spider',
  targetWeightKg: 0,
  dailyWaterGoalMl: 2500,
  weeklyWorkoutGoal: 4,
  weeklyRunGoal: 2,
  xpWorkout: 100,
  xpRun: 120,
  xpNutrition: 20,
  xpWater: 10,
  xpWeight: 15,
  xpStreak: 50,
  xpMission: 30,
};

const SHEETS = {
  Dashboard: {
    headers: ['key', 'value', 'updatedAt'],
    json: [],
    numbers: [],
  },
  Treinos: {
    headers: ['id', 'date', 'type', 'durationMinutes', 'exercises', 'notes', 'status', 'createdAt', 'updatedAt'],
    json: ['exercises'],
    numbers: ['durationMinutes'],
  },
  Corridas: {
    headers: [
      'id',
      'date',
      'distanceKm',
      'durationMinutes',
      'pace',
      'elevationM',
      'location',
      'temperatureC',
      'feeling',
      'notes',
      'stravaUrl',
      'createdAt',
      'updatedAt',
    ],
    json: [],
    numbers: ['distanceKm', 'durationMinutes', 'elevationM', 'temperatureC'],
  },
  Peso: {
    headers: ['id', 'date', 'weightKg', 'notes', 'createdAt', 'updatedAt'],
    json: [],
    numbers: ['weightKg'],
  },
  Medidas: {
    headers: [
      'id',
      'date',
      'leftArmCm',
      'rightArmCm',
      'chestCm',
      'waistCm',
      'hipCm',
      'thighCm',
      'calfCm',
      'neckCm',
      'forearmCm',
      'notes',
      'createdAt',
      'updatedAt',
    ],
    json: [],
    numbers: ['leftArmCm', 'rightArmCm', 'chestCm', 'waistCm', 'hipCm', 'thighCm', 'calfCm', 'neckCm', 'forearmCm'],
  },
  'Nutrição': {
    headers: ['id', 'date', 'time', 'type', 'foods', 'notes', 'createdAt', 'updatedAt'],
    json: ['foods'],
    numbers: [],
  },
  'Água': {
    headers: ['id', 'date', 'amountMl', 'notes', 'createdAt', 'updatedAt'],
    json: [],
    numbers: ['amountMl'],
  },
  'Diário': {
    headers: ['id', 'date', 'text', 'createdAt', 'updatedAt'],
    json: [],
    numbers: [],
  },
  'Missões': {
    headers: ['id', 'date', 'key', 'title', 'xp', 'status', 'completedAt', 'notes', 'createdAt', 'updatedAt'],
    json: [],
    numbers: ['xp'],
  },
  Recordes: {
    headers: ['id', 'type', 'title', 'value', 'unit', 'date', 'sourceId', 'createdAt', 'updatedAt'],
    json: [],
    numbers: ['value'],
  },
  'Relatórios': {
    headers: ['id', 'title', 'week', 'month', 'year', 'markdown', 'tags', 'driveUrl', 'notes', 'createdAt', 'updatedAt'],
    json: ['tags'],
    numbers: [],
  },
  'Configurações': {
    headers: ['key', 'value', 'updatedAt'],
    json: [],
    numbers: [],
  },
};

function doGet(e) {
  return handleRequest(e, 'GET');
}

function doPost(e) {
  return handleRequest(e, 'POST');
}

function handleRequest(e, method) {
  try {
    const action = getAction(e, method);

    if (action === 'health') {
      const spreadsheet = getSpreadsheet();
      ensureAllSheets(spreadsheet);
      return jsonResponse({
        ok: true,
        data: {
          version: APP_VERSION,
          spreadsheetUrl: spreadsheet.getUrl(),
        },
      });
    }

    if (action === 'setup') {
      const spreadsheet = getSpreadsheet();
      ensureAllSheets(spreadsheet);
      return jsonResponse({
        ok: true,
        data: {
          spreadsheetUrl: spreadsheet.getUrl(),
          sheets: Object.keys(SHEETS),
        },
      });
    }

    if (action === 'bootstrap') {
      const spreadsheet = getSpreadsheet();
      ensureAllSheets(spreadsheet);
      return jsonResponse({
        ok: true,
        data: readBootstrap(spreadsheet),
      });
    }

    const body = parseBody(e);
    const lock = LockService.getScriptLock();
    lock.waitLock(15000);

    try {
      const spreadsheet = getSpreadsheet();
      ensureAllSheets(spreadsheet);

      if (action === 'upsert') {
        return jsonResponse({ ok: true, data: upsertRecord(spreadsheet, body.sheet, body.record) });
      }

      if (action === 'delete') {
        return jsonResponse({ ok: true, data: deleteRecord(spreadsheet, body.sheet, body.id) });
      }

      if (action === 'replace') {
        return jsonResponse({ ok: true, data: replaceRecords(spreadsheet, body.sheet, body.records || []) });
      }

      if (action === 'settings') {
        return jsonResponse({ ok: true, data: writeSettings(spreadsheet, body.settings || {}) });
      }

      throw new Error('Ação desconhecida: ' + action);
    } finally {
      lock.releaseLock();
    }
  } catch (error) {
    return jsonResponse({
      ok: false,
      error: error && error.message ? error.message : String(error),
    });
  }
}

function getAction(e, method) {
  if (e && e.parameter && e.parameter.action) return e.parameter.action;
  if (method === 'POST') {
    const body = parseBody(e);
    if (body.action) return body.action;
  }
  return 'bootstrap';
}

function parseBody(e) {
  if (!e || !e.postData || !e.postData.contents) return {};
  try {
    return JSON.parse(e.postData.contents);
  } catch (error) {
    throw new Error('JSON inválido no corpo da requisição.');
  }
}

function getSpreadsheet() {
  const properties = PropertiesService.getScriptProperties();
  const configuredId = properties.getProperty('SPREADSHEET_ID') || DEFAULT_SPREADSHEET_ID;

  if (configuredId) {
    return SpreadsheetApp.openById(configuredId);
  }

  const active = SpreadsheetApp.getActiveSpreadsheet();
  if (active) {
    properties.setProperty('SPREADSHEET_ID', active.getId());
    return active;
  }

  const created = SpreadsheetApp.create(DEFAULT_SPREADSHEET_NAME);
  properties.setProperty('SPREADSHEET_ID', created.getId());
  return created;
}

function ensureAllSheets(spreadsheet) {
  Object.keys(SHEETS).forEach(function (name) {
    const config = SHEETS[name];
    let sheet = spreadsheet.getSheetByName(name);

    if (!sheet) {
      sheet = spreadsheet.insertSheet(name);
    }

    ensureHeaders(sheet, config.headers);
    styleSheet(sheet, config.headers.length);
  });

  const defaultSheet = spreadsheet.getSheetByName('Sheet1') || spreadsheet.getSheetByName('Página1');
  if (defaultSheet && Object.keys(SHEETS).length > 1 && defaultSheet.getLastRow() === 0) {
    spreadsheet.deleteSheet(defaultSheet);
  }

  ensureDefaultSettings(spreadsheet);
}

function ensureHeaders(sheet, headers) {
  const current = sheet.getRange(1, 1, 1, headers.length).getValues()[0];
  const mismatch = headers.some(function (header, index) {
    return current[index] !== header;
  });

  if (mismatch) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  }
}

function styleSheet(sheet, columns) {
  sheet.setFrozenRows(1);
  sheet.getRange(1, 1, 1, columns).setFontWeight('bold').setBackground('#111827').setFontColor('#ffffff');
  sheet.autoResizeColumns(1, columns);
}

function ensureDefaultSettings(spreadsheet) {
  const sheet = spreadsheet.getSheetByName('Configurações');
  const settings = readSettings(spreadsheet);
  const missing = Object.keys(DEFAULT_SETTINGS).some(function (key) {
    return typeof settings[key] === 'undefined';
  });

  if (!missing && sheet.getLastRow() > 1) return;
  writeSettings(spreadsheet, Object.assign({}, DEFAULT_SETTINGS, settings));
}

function readBootstrap(spreadsheet) {
  return {
    dashboard: readKeyValueSheet(spreadsheet, 'Dashboard').map(function (entry) {
      return { key: entry.key, value: String(entry.value), updatedAt: entry.updatedAt || '' };
    }),
    workouts: readRecords(spreadsheet, 'Treinos'),
    runs: readRecords(spreadsheet, 'Corridas'),
    weight: readRecords(spreadsheet, 'Peso'),
    measurements: readRecords(spreadsheet, 'Medidas'),
    nutrition: readRecords(spreadsheet, 'Nutrição'),
    water: readRecords(spreadsheet, 'Água'),
    diary: readRecords(spreadsheet, 'Diário'),
    missions: readRecords(spreadsheet, 'Missões'),
    records: readRecords(spreadsheet, 'Recordes'),
    reports: readRecords(spreadsheet, 'Relatórios'),
    settings: readSettings(spreadsheet),
    spreadsheetUrl: spreadsheet.getUrl(),
    lastSyncedAt: new Date().toISOString(),
  };
}

function readRecords(spreadsheet, sheetName) {
  const config = getSheetConfig(sheetName);
  const sheet = spreadsheet.getSheetByName(sheetName);
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) return [];

  const values = sheet.getRange(2, 1, lastRow - 1, config.headers.length).getValues();
  return values
    .filter(function (row) {
      return row.some(function (cell) {
        return cell !== '';
      });
    })
    .map(function (row) {
      const record = {};
      config.headers.forEach(function (header, index) {
        record[header] = decodeCell(row[index], header, config);
      });
      return record;
    })
    .sort(function (a, b) {
      const left = b.date || b.createdAt || '';
      const right = a.date || a.createdAt || '';
      return String(left).localeCompare(String(right));
    });
}

function upsertRecord(spreadsheet, sheetName, record) {
  if (!record || !record.id) throw new Error('Registro sem id.');
  const config = getSheetConfig(sheetName);
  const sheet = spreadsheet.getSheetByName(sheetName);
  const now = new Date().toISOString();
  const next = Object.assign({}, record, {
    createdAt: record.createdAt || now,
    updatedAt: record.updatedAt || now,
  });
  const row = config.headers.map(function (header) {
    return encodeCell(next[header], header, config);
  });
  const rowIndex = findRowById(sheet, next.id);

  if (rowIndex > 0) {
    sheet.getRange(rowIndex, 1, 1, config.headers.length).setValues([row]);
  } else {
    sheet.appendRow(row);
  }

  return next;
}

function deleteRecord(spreadsheet, sheetName, id) {
  if (!id) throw new Error('Id obrigatório para excluir.');
  const sheet = spreadsheet.getSheetByName(sheetName);
  const rowIndex = findRowById(sheet, id);

  if (rowIndex > 0) {
    sheet.deleteRow(rowIndex);
    return { deleted: true };
  }

  return { deleted: false };
}

function replaceRecords(spreadsheet, sheetName, records) {
  const config = getSheetConfig(sheetName);
  const sheet = spreadsheet.getSheetByName(sheetName);
  const lastRow = sheet.getLastRow();

  if (lastRow > 1) {
    sheet.getRange(2, 1, lastRow - 1, config.headers.length).clearContent();
  }

  if (!records.length) return { count: 0 };

  const rows = records.map(function (record) {
    return config.headers.map(function (header) {
      return encodeCell(record[header], header, config);
    });
  });
  sheet.getRange(2, 1, rows.length, config.headers.length).setValues(rows);
  return { count: rows.length };
}

function writeSettings(spreadsheet, settings) {
  const sheet = spreadsheet.getSheetByName('Configurações');
  const merged = Object.assign({}, DEFAULT_SETTINGS, settings);
  const rows = Object.keys(merged).map(function (key) {
    return [key, encodeSettingValue(merged[key]), new Date().toISOString()];
  });
  const lastRow = sheet.getLastRow();

  if (lastRow > 1) {
    sheet.getRange(2, 1, lastRow - 1, 3).clearContent();
  }

  sheet.getRange(2, 1, rows.length, 3).setValues(rows);
  return merged;
}

function readSettings(spreadsheet) {
  const rows = readKeyValueSheet(spreadsheet, 'Configurações');
  const settings = Object.assign({}, DEFAULT_SETTINGS);

  rows.forEach(function (row) {
    if (!row.key) return;
    settings[row.key] = decodeSettingValue(row.value);
  });

  return settings;
}

function readKeyValueSheet(spreadsheet, sheetName) {
  const sheet = spreadsheet.getSheetByName(sheetName);
  if (!sheet || sheet.getLastRow() <= 1) return [];
  const values = sheet.getRange(2, 1, sheet.getLastRow() - 1, 3).getValues();
  return values
    .filter(function (row) {
      return row[0] !== '';
    })
    .map(function (row) {
      return {
        key: row[0],
        value: row[1],
        updatedAt: row[2],
      };
    });
}

function findRowById(sheet, id) {
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) return -1;

  const values = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
  for (let index = 0; index < values.length; index += 1) {
    if (values[index][0] === id) return index + 2;
  }
  return -1;
}

function getSheetConfig(sheetName) {
  const config = SHEETS[sheetName];
  if (!config) throw new Error('Aba não configurada: ' + sheetName);
  return config;
}

function encodeCell(value, header, config) {
  if (config.json.indexOf(header) >= 0) {
    return JSON.stringify(value || []);
  }
  if (typeof value === 'undefined' || value === null) return '';
  return value;
}

function decodeCell(value, header, config) {
  if (config.json.indexOf(header) >= 0) {
    if (!value) return [];
    try {
      return typeof value === 'string' ? JSON.parse(value) : value;
    } catch (error) {
      return [];
    }
  }

  if (config.numbers.indexOf(header) >= 0) {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : 0;
  }

  if (value instanceof Date) {
    return Utilities.formatDate(value, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  }

  return value === null ? '' : value;
}

function encodeSettingValue(value) {
  if (typeof value === 'object') return JSON.stringify(value);
  return value;
}

function decodeSettingValue(value) {
  if (value === 'true') return true;
  if (value === 'false') return false;
  const numeric = Number(value);
  if (value !== '' && Number.isFinite(numeric)) return numeric;

  if (typeof value === 'string' && /^[\[{]/.test(value)) {
    try {
      return JSON.parse(value);
    } catch (error) {
      return value;
    }
  }

  return value;
}

function jsonResponse(payload) {
  return ContentService.createTextOutput(JSON.stringify(payload)).setMimeType(ContentService.MimeType.JSON);
}
