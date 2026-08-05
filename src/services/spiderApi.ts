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

  const response = await fetch(url.toString(), {
    method: 'GET',
    redirect: 'follow',
  });

  return readEnvelope<T>(response);
}

async function requestPost<T>(action: string, payload: Record<string, unknown>) {
  const url = new URL(API_URL);
  url.searchParams.set('action', action);

  const response = await fetch(url.toString(), {
    method: 'POST',
    redirect: 'follow',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ action, ...payload }),
  });

  return readEnvelope<T>(response);
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
  return {
    ...EMPTY_DATA,
    ...payload,
    settings: normalizeSettings({ ...DEFAULT_SETTINGS, ...payload.settings }),
    spreadsheetUrl: payload.spreadsheetUrl || '',
    lastSyncedAt: payload.lastSyncedAt || new Date().toISOString(),
  };
}
