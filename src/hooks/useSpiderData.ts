import { useCallback, useEffect, useMemo, useState } from 'react';
import { DEFAULT_SETTINGS, EMPTY_DATA } from '../domain/constants';
import { calculateSummary, deriveRecords, normalizeSettings } from '../domain/calculations';
import { spiderApi } from '../services/spiderApi';
import type {
  DiaryEntry,
  MeasurementEntry,
  MissionEntry,
  ModuleKey,
  NutritionEntry,
  RecordEntry,
  ReportEntry,
  RunEntry,
  SpiderData,
  SpiderSettings,
  WaterEntry,
  WeightEntry,
  WorkoutEntry,
} from '../domain/types';

type PersistableModule =
  | 'workouts'
  | 'runs'
  | 'weight'
  | 'measurements'
  | 'nutrition'
  | 'water'
  | 'diary'
  | 'missions'
  | 'reports';

type ModuleRecordMap = {
  workouts: WorkoutEntry;
  runs: RunEntry;
  weight: WeightEntry;
  measurements: MeasurementEntry;
  nutrition: NutritionEntry;
  water: WaterEntry;
  diary: DiaryEntry;
  missions: MissionEntry;
  reports: ReportEntry;
};

type LoadStatus = 'idle' | 'loading' | 'ready' | 'error';

const INITIAL_DATA: SpiderData = {
  ...EMPTY_DATA,
  dashboard: [],
  settings: normalizeSettings(DEFAULT_SETTINGS),
  spreadsheetUrl: '',
  lastSyncedAt: '',
};

export function useSpiderData() {
  const [data, setData] = useState<SpiderData>(INITIAL_DATA);
  const [status, setStatus] = useState<LoadStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [savingKey, setSavingKey] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setStatus('loading');
    setError(null);

    try {
      const remoteData = await spiderApi.bootstrap();
      const records = deriveRecords(remoteData);
      setData({ ...remoteData, records });
      setStatus('ready');
      void spiderApi.replaceDerivedRecords(records).catch(() => undefined);
    } catch (caught) {
      setStatus('error');
      setError(caught instanceof Error ? caught.message : 'Erro desconhecido ao carregar dados.');
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const saveRecord = useCallback(
    async <TModule extends PersistableModule>(module: TModule, record: ModuleRecordMap[TModule]) => {
      setSavingKey(`${module}:${record.id}`);
      setError(null);

      try {
        const saved = await spiderApi.upsertRecord(module, record);
        let derivedRecords: RecordEntry[] | null = null;

        setData((current) => {
          const nextRecords = upsertById(current[module] as ModuleRecordMap[TModule][], saved);
          const nextData: SpiderData = {
            ...current,
            [module]: sortModuleRecords(module, nextRecords),
            lastSyncedAt: new Date().toISOString(),
          };

          if (module !== 'reports' && module !== 'missions') {
            derivedRecords = deriveRecords(nextData);
            nextData.records = derivedRecords;
          }

          return nextData;
        });

        if (derivedRecords) {
          await spiderApi.replaceDerivedRecords(derivedRecords);
        }

        return saved;
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : 'Falha ao salvar registro.');
        throw caught;
      } finally {
        setSavingKey(null);
      }
    },
    [],
  );

  const deleteRecord = useCallback(async (module: Exclude<PersistableModule, 'missions'>, id: string) => {
    setSavingKey(`${module}:${id}`);
    setError(null);

    try {
      await spiderApi.deleteRecord(module, id);
      let derivedRecords: RecordEntry[] | null = null;

      setData((current) => {
        const nextData: SpiderData = {
          ...current,
          [module]: (current[module] as Array<{ id: string }>).filter((entry) => entry.id !== id),
          lastSyncedAt: new Date().toISOString(),
        };
        derivedRecords = deriveRecords(nextData);
        nextData.records = derivedRecords;
        return nextData;
      });

      if (derivedRecords) {
        await spiderApi.replaceDerivedRecords(derivedRecords);
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Falha ao excluir registro.');
      throw caught;
    } finally {
      setSavingKey(null);
    }
  }, []);

  const updateSettings = useCallback(async (settings: SpiderSettings) => {
    setSavingKey('settings');
    setError(null);

    try {
      const normalized = normalizeSettings(settings);
      const saved = await spiderApi.updateSettings(normalized);
      setData((current) => ({
        ...current,
        settings: normalizeSettings(saved),
        lastSyncedAt: new Date().toISOString(),
      }));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Falha ao salvar configurações.');
      throw caught;
    } finally {
      setSavingKey(null);
    }
  }, []);

  const summary = useMemo(() => calculateSummary(data), [data]);

  return {
    data,
    summary,
    status,
    error,
    savingKey,
    apiUrl: spiderApi.apiUrl,
    refresh,
    saveRecord,
    deleteRecord,
    updateSettings,
  };
}

function upsertById<T extends { id: string }>(records: T[], record: T) {
  const exists = records.some((entry) => entry.id === record.id);
  return exists ? records.map((entry) => (entry.id === record.id ? record : entry)) : [record, ...records];
}

function sortModuleRecords<T extends { date?: string; createdAt?: string }>(module: ModuleKey, records: T[]) {
  if (module === 'reports') {
    return [...records].sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''));
  }

  return [...records].sort((a, b) => (b.date ?? b.createdAt ?? '').localeCompare(a.date ?? a.createdAt ?? ''));
}
