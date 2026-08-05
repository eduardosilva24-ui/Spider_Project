import { useState } from 'react';
import { AppShell } from './components/layout/AppShell';
import type { ViewKey } from './components/layout/navConfig';
import { DashboardView } from './components/modules/DashboardView';
import {
  MeasurementsView,
  RunsView,
  WeightView,
  WorkoutsView,
  type SaveRecord,
} from './components/modules/ActivityViews';
import {
  DiaryView,
  MissionsView,
  NutritionView,
  WaterView,
  type LifestyleSaveRecord,
} from './components/modules/LifestyleViews';
import {
  ExportView,
  RecordsView,
  ReportsView,
  SettingsView,
  StatsView,
  TimelineView,
  type ReportSaveRecord,
} from './components/modules/InsightViews';
import { Card } from './components/ui/Card';
import { Progress } from './components/ui/Progress';
import { useSpiderData } from './hooks/useSpiderData';

export function App() {
  const [activeView, setActiveView] = useState<ViewKey>('dashboard');
  const { data, summary, status, error, savingKey, apiUrl, refresh, saveRecord, updateSettings } = useSpiderData();
  const save = saveRecord as SaveRecord & LifestyleSaveRecord & ReportSaveRecord;

  return (
    <AppShell
      activeView={activeView}
      onViewChange={setActiveView}
      status={status}
      error={error}
      onRefresh={refresh}
      spreadsheetUrl={data.spreadsheetUrl}
      lastSyncedAt={data.lastSyncedAt}
    >
      {status === 'loading' && !data.lastSyncedAt ? <LoadingPanel /> : null}
      <ActiveView
        view={activeView}
        data={data}
        summary={summary}
        save={save}
        updateSettings={updateSettings}
        savingKey={savingKey}
        apiUrl={apiUrl}
      />
    </AppShell>
  );
}

function ActiveView({
  view,
  data,
  summary,
  save,
  updateSettings,
  savingKey,
  apiUrl,
}: {
  view: ViewKey;
  data: ReturnType<typeof useSpiderData>['data'];
  summary: ReturnType<typeof useSpiderData>['summary'];
  save: SaveRecord & LifestyleSaveRecord & ReportSaveRecord;
  updateSettings: ReturnType<typeof useSpiderData>['updateSettings'];
  savingKey: string | null;
  apiUrl: string;
}) {
  switch (view) {
    case 'dashboard':
      return <DashboardView data={data} summary={summary} />;
    case 'workouts':
      return <WorkoutsView workouts={data.workouts} onSave={save} saving={Boolean(savingKey?.startsWith('workouts'))} />;
    case 'runs':
      return <RunsView runs={data.runs} onSave={save} saving={Boolean(savingKey?.startsWith('runs'))} />;
    case 'weight':
      return <WeightView entries={data.weight} onSave={save} saving={Boolean(savingKey?.startsWith('weight'))} />;
    case 'measurements':
      return <MeasurementsView entries={data.measurements} onSave={save} saving={Boolean(savingKey?.startsWith('measurements'))} />;
    case 'nutrition':
      return <NutritionView entries={data.nutrition} onSave={save} saving={Boolean(savingKey?.startsWith('nutrition'))} />;
    case 'water':
      return (
        <WaterView
          entries={data.water}
          summary={summary}
          settings={data.settings}
          onSave={save}
          saving={Boolean(savingKey?.startsWith('water'))}
        />
      );
    case 'diary':
      return <DiaryView entries={data.diary} onSave={save} saving={Boolean(savingKey?.startsWith('diary'))} />;
    case 'missions':
      return <MissionsView missions={data.missions} settings={data.settings} onSave={save} saving={Boolean(savingKey?.startsWith('missions'))} />;
    case 'stats':
      return <StatsView data={data} summary={summary} />;
    case 'timeline':
      return <TimelineView data={data} />;
    case 'records':
      return <RecordsView records={data.records} />;
    case 'reports':
      return <ReportsView reports={data.reports} onSave={save} saving={Boolean(savingKey?.startsWith('reports'))} />;
    case 'export':
      return <ExportView data={data} summary={summary} />;
    case 'settings':
      return <SettingsView settings={data.settings} onSave={updateSettings} saving={savingKey === 'settings'} apiUrl={apiUrl} />;
    default:
      return <DashboardView data={data} summary={summary} />;
  }
}

function LoadingPanel() {
  return (
    <Card className="mb-5 p-5">
      <div className="mb-3 flex items-center justify-between gap-4">
        <p className="font-semibold text-white">Sincronizando com a planilha</p>
        <span className="text-sm text-spider-muted">Google Sheets</span>
      </div>
      <Progress value={68} />
    </Card>
  );
}
