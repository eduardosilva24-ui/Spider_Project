import { DEFAULT_API_URL, DEFAULT_SETTINGS, EMPTY_DATA, MODULE_TO_SHEET } from '../domain/constants';
import { normalizeSettings } from '../domain/calculations';
import type { ModuleKey, RecordEntry, SheetModule, SpiderData, SpiderSettings } from '../domain/types';

type ApiEnvelope<T> = {
  ok: boolean;
  data?: T;
  error?: string;
  spreadsheetUrl?: string;
};

type BootstrapPayload = Omit<SpiderData, 'settings'> & {
  settings: Partial<SpiderSettings>;
};

const API_URL = import.meta.env.VITE_SPIDER_API_URL || DEFAULT_API_URL;
const REQUEST_TIMEOUT_MS = 45_000;

export class SpiderApiError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
  ) {
    super(message);
    this.name = 'SpiderApiError';
  }
}

export const spiderApi = {
  apiUrl: API_URL,
  async health() {
    return requestGet<{ version: string; spreadsheetUrl: string }>('health');
  },
  async bootstrap(): Promise<SpiderData> {
    const payload = await requestGet<BootstrapPayload>('bootstrap');
    return normalizeBootstrap(payload);
  },
  async upsertRecord<T extends { id: string }>(module: ModuleKey, record: T): Promise<T> {
    if (module === 'settings' || module === 'dashboard') {
      throw new SpiderApiError(`Módulo ${module} não aceita registros comuns.`);
    }

    return requestPost<T>('upsert', {
      sheet: MODULE_TO_SHEET[module],
      record,
    });
  },
  async deleteRecord(module: ModuleKey, id: string) {
    if (module === 'settings' || module === 'dashboard') {
      throw new SpiderApiError(`Módulo ${module} não aceita exclusão comum.`);
    }

    return requestPost<{ deleted: boolean }>('delete', {
      sheet: MODULE_TO_SHEET[module],
      id,
    });
  },
  async replaceRecords(sheet: SheetModule, records: Record<string, unknown>[]) {
    return requestPost<{ count: number }>('replace', { sheet, records });
  },
  async replaceDerivedRecords(records: RecordEntry[]) {
    return requestPost<{ count: number }>('replace', { sheet: 'Recordes', records });
  },
  async updateSettings(settings: SpiderSettings) {
    return requestPost<SpiderSettings>('settings', { settings });
  },
};

async function requestGet<T>(action: string, params?: Record<string, string>) {
  const url = new URL(API_URL);
  url.searchParams.set('action', action);

  Object.entries(params ?? {}).forEach(([key, value]) => {
    url.searchParams.set(key, value);
  });

  return requestWithEnvelope<T>(url.toString(), { method: 'GET' });
}

async function requestPost<T>(action: string, payload: Record<string, unknown>) {
  const url = new URL(API_URL);
  url.searchParams.set('action', action);

  return requestWithEnvelope<T>(url.toString(), {
    method: 'POST',
    body: JSON.stringify({ action, ...payload }),
  });
}

async function requestWithEnvelope<T>(url: string, init: RequestInit) {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      ...init,
      cache: 'no-store',
      credentials: 'omit',
      redirect: 'follow',
      signal: controller.signal,
    });

    return await readEnvelope<T>(response);
  } catch (caught) {
    if (caught instanceof SpiderApiError) throw caught;
    if (caught instanceof DOMException && caught.name === 'AbortError') {
      throw new SpiderApiError('A planilha demorou mais que o esperado para responder. Tente atualizar novamente.');
    }

    throw new SpiderApiError('Não foi possível alcançar a planilha. Verifique sua conexão e tente novamente.');
  } finally {
    window.clearTimeout(timeout);
  }
}

async function readEnvelope<T>(response: Response) {
  const raw = await response.text();
  let envelope: ApiEnvelope<T>;

  try {
    envelope = JSON.parse(raw) as ApiEnvelope<T>;
  } catch {
    const cleaned = raw.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    throw new SpiderApiError(
      cleaned || 'O Apps Script respondeu em um formato inesperado. Verifique se o doGet/doPost foi publicado.',
      response.status,
    );
  }

  if (!response.ok || !envelope.ok) {
    throw new SpiderApiError(envelope.error || 'Falha ao comunicar com a planilha.', response.status);
  }

  if (typeof envelope.data === 'undefined') {
    throw new SpiderApiError('O Apps Script respondeu sem dados.');
  }

  return envelope.data;
}

function normalizeBootstrap(payload: BootstrapPayload): SpiderData {
  const source = payload ?? ({} as BootstrapPayload);

  return {
    ...EMPTY_DATA,
    dashboard: asArray(source.dashboard),
    workouts: asArray(source.workouts),
    runs: asArray(source.runs),
    weight: asArray(source.weight),
    measurements: asArray(source.measurements),
    nutrition: asArray(source.nutrition),
    water: asArray(source.water),
    diary: asArray(source.diary),
    missions: asArray(source.missions),
    records: asArray(source.records),
    reports: asArray(source.reports),
    settings: normalizeSettings({ ...DEFAULT_SETTINGS, ...(source.settings ?? {}) }),
    spreadsheetUrl: source.spreadsheetUrl || '',
    lastSyncedAt: source.lastSyncedAt || new Date().toISOString(),
  };
}

function asArray<T>(value: T[] | undefined) {
  return Array.isArray(value) ? value : [];
}
