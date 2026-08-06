import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
    if (refreshRequestRef.current) return refreshRequestRef.current;

    setStatus('loading');
    setError(null);

    const request = (async () => {
      try {
        const remoteData = await spiderApi.bootstrap();
        const records = deriveRecords(remoteData);
        const nextData = { ...remoteData, records };
        dataRef.current = nextData;
        setData(nextData);
        setStatus('ready');
        void queueDerivedSync(records).catch(() => undefined);
      } catch (caught) {
        setStatus('error');
        setError(caught instanceof Error ? caught.message : 'Erro desconhecido ao carregar dados.');
      } finally {
        refreshRequestRef.current = null;
      }
    })();

    refreshRequestRef.current = request;
    return request;
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
        const current = dataRef.current;
        const nextRecords = upsertById(current[module] as ModuleRecordMap[TModule][], saved);
        const nextData: SpiderData = {
          ...current,
          [module]: sortModuleRecords(module, nextRecords),
          lastSyncedAt: new Date().toISOString(),
        };

        if (module !== 'reports' && module !== 'missions') {
          nextData.records = deriveRecords(nextData);
        }

        dataRef.current = nextData;
        setData(nextData);

        if (module !== 'reports' && module !== 'missions') {
          await queueDerivedSync(nextData.records).catch((caught) => {
            setError(caught instanceof Error ? `Registro salvo, mas os recordes não foram sincronizados: ${caught.message}` : 'Registro salvo, mas os recordes não foram sincronizados.');
          });
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
      const current = dataRef.current;
      const nextData: SpiderData = {
        ...current,
        [module]: (current[module] as Array<{ id: string }>).filter((entry) => entry.id !== id),
        lastSyncedAt: new Date().toISOString(),
      };
      nextData.records = deriveRecords(nextData);
      dataRef.current = nextData;
      setData(nextData);

      await queueDerivedSync(nextData.records).catch((caught) => {
        setError(caught instanceof Error ? `Registro excluído, mas os recordes não foram sincronizados: ${caught.message}` : 'Registro excluído, mas os recordes não foram sincronizados.');
      });
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
      const nextData = {
        ...dataRef.current,
        settings: normalizeSettings(saved),
        lastSyncedAt: new Date().toISOString(),
      };
      dataRef.current = nextData;
      setData(nextData);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Falha ao salvar configurações.');
      throw caught;
    } finally {
      setSavingKey(null);
    }
  }, []);

  const summary = useMemo(() => calculateSummary(data), [data]);
  const dataRef = useRef(data);
  const refreshRequestRef = useRef<Promise<void> | null>(null);
  const derivedSyncRef = useRef<Promise<unknown>>(Promise.resolve());

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

  function queueDerivedSync(records: RecordEntry[]) {
    const nextSync = derivedSyncRef.current
      .catch(() => undefined)
      .then(() => spiderApi.replaceDerivedRecords(records));
    derivedSyncRef.current = nextSync.catch(() => undefined);
    return nextSync;
  }
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
