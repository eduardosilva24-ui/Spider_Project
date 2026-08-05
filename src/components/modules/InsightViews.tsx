import { useMemo, useState } from 'react';
import { Download, FileJson, FileText, Medal, Settings as SettingsIcon } from 'lucide-react';
import { SpiderCharts } from '../charts/SpiderCharts';
import { Button } from '../ui/Button';
import { Card, CardHeader } from '../ui/Card';
import { EmptyState } from '../ui/EmptyState';
import { Field, Input, Textarea } from '../ui/Field';
import { Badge } from '../ui/Badge';
import { StatCard } from '../ui/StatCard';
import { buildTimeline, createWeekExport } from '../../domain/calculations';
import { formatDisplayDate, formatFullDate, getWeekStart, toISODate } from '../../domain/date';
import { createReport, touch } from '../../domain/factories';
import type { ReportEntry, SpiderData, SpiderSettings, SpiderSummary } from '../../domain/types';

export type ReportSaveRecord = {
  (module: 'reports', record: ReportEntry): Promise<ReportEntry>;
};

export function StatsView({ data, summary }: { data: SpiderData; summary: SpiderSummary }) {
  const bestDistance = data.records.find((record) => record.type === 'run_distance');
  const bestPace = data.records.find((record) => record.type === 'run_pace');
  const plank = data.records.find((record) => record.type === 'plank');
  const weeklyVolume = data.records.find((record) => record.type === 'weekly_volume');

  return (
    <div className="space-y-5">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Spider Score" value={summary.spiderScore} detail="0 a 100" icon={<Medal className="h-5 w-5" />} />
        <StatCard label="Maior distância" value={bestDistance ? `${bestDistance.value} km` : '-'} detail="Corridas" icon={<Medal className="h-5 w-5" />} accent="green" />
        <StatCard label="Melhor pace" value={bestPace ? formatPaceRecord(bestPace.value) : '-'} detail="Corridas" icon={<Medal className="h-5 w-5" />} accent="blue" />
        <StatCard label="Volume semanal" value={weeklyVolume ? Math.round(weeklyVolume.value).toLocaleString('pt-BR') : '-'} detail={plank ? `Prancha ${plank.value}s` : 'Treinos'} icon={<Medal className="h-5 w-5" />} accent="gold" />
      </div>
      <SpiderCharts data={data} summary={summary} />
      <RecordsView records={data.records} />
    </div>
  );
}

export function TimelineView({ data }: { data: SpiderData }) {
  const items = buildTimeline(data);

  return (
    <Card>
      <CardHeader title="Linha do tempo completa" eyebrow="Evolução" />
      <div className="p-5">
        <div className="space-y-4">
          {items.map((item, index) => (
            <div key={item.id} className="grid grid-cols-[100px_22px_1fr] gap-3">
              <span className="pt-0.5 text-sm text-spider-muted">{formatDisplayDate(item.date)}</span>
              <span className="relative flex justify-center">
                <span className="mt-1.5 h-3 w-3 rounded-full bg-spider-red shadow-glow" />
                {index < items.length - 1 ? <span className="absolute top-5 h-10 w-px bg-white/10" /> : null}
              </span>
              <div className="min-w-0 rounded-lg border border-white/10 bg-white/[0.055] p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="font-semibold text-spider-ink">{item.title}</p>
                  <Badge tone="blue">{item.type}</Badge>
                </div>
                {item.detail ? <p className="mt-1 text-sm text-spider-muted">{item.detail}</p> : null}
              </div>
            </div>
          ))}
          {items.length === 0 ? <EmptyState title="Linha do tempo vazia" description="Treinos, corridas, peso, nutrição e diário aparecerão em ordem cronológica." /> : null}
        </div>
      </div>
    </Card>
  );
}

export function RecordsView({ records }: { records: SpiderData['records'] }) {
  return (
    <Card>
      <CardHeader title="Recordes automáticos" eyebrow="Conquistas" />
      <div className="grid gap-3 p-5 md:grid-cols-2 xl:grid-cols-3">
        {records.map((record) => (
          <div key={record.id} className="rounded-lg border border-white/10 bg-white/[0.055] p-4 transition hover:border-yellow-300/25 hover:bg-white/[0.075]">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-semibold text-white">{record.title}</p>
                <p className="mt-1 text-sm text-spider-muted">{formatDisplayDate(record.date)}</p>
              </div>
              <Badge tone="gold">
                {formatRecordValue(record.value, record.unit)} {record.unit !== 'seg/km' ? record.unit : ''}
              </Badge>
            </div>
          </div>
        ))}
        {records.length === 0 ? <EmptyState title="Sem recordes ainda" description="Os recordes são recalculados automaticamente a partir dos seus registros." /> : null}
      </div>
    </Card>
  );
}

export function ReportsView({
  reports,
  onSave,
  saving,
}: {
  reports: ReportEntry[];
  onSave: ReportSaveRecord;
  saving: boolean;
}) {
  const [form, setForm] = useState(() => createReport());

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!form.title.trim() || !form.markdown.trim()) return;
    await onSave('reports', touch({ ...form, tags: normalizeTags(form.tags) }));
    setForm(createReport());
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[0.95fr_1.05fr]">
      <Card>
        <CardHeader title="Novo relatório armazenado" eyebrow="Arquivo" />
        <form className="space-y-4 p-5" onSubmit={submit}>
          <Field label="Título">
            <Input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} required />
          </Field>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Semana">
              <Input value={form.week} onChange={(event) => setForm({ ...form, week: event.target.value })} placeholder="2026-W32" />
            </Field>
            <Field label="Mês">
              <Input value={form.month} onChange={(event) => setForm({ ...form, month: event.target.value })} />
            </Field>
            <Field label="Ano">
              <Input value={form.year} onChange={(event) => setForm({ ...form, year: event.target.value })} />
            </Field>
          </div>
          <Field label="Texto em Markdown">
            <Textarea value={form.markdown} onChange={(event) => setForm({ ...form, markdown: event.target.value })} className="min-h-64 font-mono" required />
          </Field>
          <Field label="Tags">
            <Input value={form.tags.join(', ')} onChange={(event) => setForm({ ...form, tags: event.target.value.split(',') })} placeholder="semana, corrida, peso" />
          </Field>
          <Field label="Link do Google Drive">
            <Input type="url" value={form.driveUrl} onChange={(event) => setForm({ ...form, driveUrl: event.target.value })} />
          </Field>
          <Field label="Observações">
            <Textarea value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} />
          </Field>
          <Button type="submit" loading={saving}>
            <FileText className="h-4 w-4" />
            Salvar relatório
          </Button>
        </form>
      </Card>

      <Card>
        <CardHeader title="Relatórios salvos" eyebrow="Histórico" />
        <div className="space-y-3 p-5">
          {reports.map((report) => (
            <article key={report.id} className="rounded-lg border border-white/10 bg-white/[0.055] p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="font-semibold text-white">{report.title}</h3>
                  <p className="text-sm text-spider-muted">
                    {report.week || report.month}/{report.year}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {report.tags.map((tag) => (
                    <Badge key={tag} tone="blue">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
              <p className="mt-3 line-clamp-4 whitespace-pre-wrap text-sm leading-6 text-spider-muted">{report.markdown}</p>
            </article>
          ))}
          {reports.length === 0 ? <EmptyState title="Nenhum relatório salvo" description="Esta página guarda os textos criados fora do app para consulta futura." /> : null}
        </div>
      </Card>
    </div>
  );
}

export function ExportView({ data, summary }: { data: SpiderData; summary: SpiderSummary }) {
  const [weekStart, setWeekStart] = useState(() => toISODate(getWeekStart()));
  const exportData = useMemo(() => createWeekExport(data, weekStart), [data, weekStart]);
  const prettyJson = useMemo(() => JSON.stringify(exportData, null, 2), [exportData]);

  function exportJson() {
    downloadText(`spider-${weekStart}.json`, prettyJson, 'application/json');
  }

  function exportCsv() {
    downloadText(`spider-${weekStart}.csv`, weekExportToCsv(exportData), 'text/csv;charset=utf-8');
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[0.85fr_1.15fr]">
      <Card>
        <CardHeader title="Exportar semana" eyebrow="JSON / CSV" />
        <div className="space-y-5 p-5">
          <Field label="Início da semana">
            <Input type="date" value={weekStart} onChange={(event) => setWeekStart(event.target.value)} />
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Button onClick={exportJson}>
              <FileJson className="h-4 w-4" />
              JSON
            </Button>
            <Button variant="secondary" onClick={exportCsv}>
              <Download className="h-4 w-4" />
              CSV
            </Button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <SummaryPill label="Spider Score" value={String(summary.spiderScore)} />
            <SummaryPill label="XP" value={summary.totalXp.toLocaleString('pt-BR')} />
            <SummaryPill label="Treinos" value={String(exportData.workouts.length)} />
            <SummaryPill label="Corridas" value={String(exportData.runs.length)} />
          </div>
        </div>
      </Card>

      <Card className="overflow-hidden">
        <CardHeader title="Prévia JSON" eyebrow={`${formatFullDate(exportData.weekStart)} a ${formatFullDate(exportData.weekEnd)}`} />
        <pre className="max-h-[640px] overflow-auto p-5 text-xs leading-5 text-spider-muted">{prettyJson}</pre>
      </Card>
    </div>
  );
}

export function SettingsView({
  settings,
  onSave,
  saving,
  apiUrl,
}: {
  settings: SpiderSettings;
  onSave: (settings: SpiderSettings) => Promise<void>;
  saving: boolean;
  apiUrl: string;
}) {
  const [form, setForm] = useState(settings);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    await onSave(form);
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
      <Card>
        <CardHeader title="Configurações" eyebrow="Sistema" />
        <form className="space-y-4 p-5" onSubmit={submit}>
          <Field label="Nome">
            <Input value={form.userName} onChange={(event) => setForm({ ...form, userName: event.target.value })} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <NumberField label="Meta de peso kg" value={form.targetWeightKg} onChange={(value) => setForm({ ...form, targetWeightKg: value })} />
            <NumberField label="Meta de água ml" value={form.dailyWaterGoalMl} onChange={(value) => setForm({ ...form, dailyWaterGoalMl: value })} />
            <NumberField label="Treinos por semana" value={form.weeklyWorkoutGoal} onChange={(value) => setForm({ ...form, weeklyWorkoutGoal: value })} />
            <NumberField label="Corridas por semana" value={form.weeklyRunGoal} onChange={(value) => setForm({ ...form, weeklyRunGoal: value })} />
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <NumberField label="XP treino" value={form.xpWorkout} onChange={(value) => setForm({ ...form, xpWorkout: value })} />
            <NumberField label="XP corrida" value={form.xpRun} onChange={(value) => setForm({ ...form, xpRun: value })} />
            <NumberField label="XP alimentação" value={form.xpNutrition} onChange={(value) => setForm({ ...form, xpNutrition: value })} />
            <NumberField label="XP água" value={form.xpWater} onChange={(value) => setForm({ ...form, xpWater: value })} />
            <NumberField label="XP peso" value={form.xpWeight} onChange={(value) => setForm({ ...form, xpWeight: value })} />
            <NumberField label="XP sequência" value={form.xpStreak} onChange={(value) => setForm({ ...form, xpStreak: value })} />
          </div>
          <Button type="submit" loading={saving}>
            <SettingsIcon className="h-4 w-4" />
            Salvar configurações
          </Button>
        </form>
      </Card>

      <Card>
        <CardHeader title="Integração" eyebrow="Google Apps Script" />
        <div className="space-y-4 p-5">
          <div className="rounded-lg border border-white/10 bg-white/[0.055] p-4">
            <p className="text-sm font-semibold text-spider-muted">Endpoint ativo</p>
            <p className="mt-2 break-all font-mono text-sm text-spider-ink">{apiUrl}</p>
          </div>
          <div className="rounded-lg border border-yellow-400/20 bg-yellow-500/10 p-4 text-sm leading-6 text-yellow-50">
            Depois de colar o arquivo <strong>apps-script/Code.gs</strong> no Google Apps Script, publique uma nova implantação como Web App e mantenha esta URL no <strong>VITE_SPIDER_API_URL</strong>.
          </div>
        </div>
      </Card>
    </div>
  );
}

function NumberField({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  return (
    <Field label={label}>
      <Input type="number" value={value} onChange={(event) => onChange(Number(event.target.value))} />
    </Field>
  );
}

function SummaryPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.055] p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-spider-muted">{label}</p>
      <p className="mt-1 text-2xl font-bold text-white">{value}</p>
    </div>
  );
}

function downloadText(filename: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function weekExportToCsv(exportData: ReturnType<typeof createWeekExport>) {
  const rows: string[][] = [['module', 'id', 'date', 'payload']];
  const append = (module: string, entries: Array<{ id: string; date?: string }>) => {
    entries.forEach((entry) => rows.push([module, entry.id, entry.date ?? '', JSON.stringify(entry)]));
  };

  append('treinos', exportData.workouts);
  append('corridas', exportData.runs);
  append('peso', exportData.weight);
  append('medidas', exportData.measurements);
  append('nutricao', exportData.nutrition);
  append('agua', exportData.water);
  append('missoes', exportData.missions);
  append('diario', exportData.diary);
  append('recordes', exportData.records);
  rows.push(['summary', 'spider_score', exportData.generatedAt, JSON.stringify(exportData.summary)]);

  return rows.map((row) => row.map(csvCell).join(',')).join('\n');
}

function csvCell(value: string) {
  return `"${value.replace(/"/g, '""')}"`;
}

function normalizeTags(tags: string[]) {
  return tags.map((tag) => tag.trim()).filter(Boolean);
}

function formatPaceRecord(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const rest = Math.round(seconds % 60);
  return `${minutes}:${String(rest).padStart(2, '0')}/km`;
}

function formatRecordValue(value: number, unit: string) {
  if (unit === 'seg/km') return formatPaceRecord(value);
  return Number.isInteger(value) ? value.toLocaleString('pt-BR') : value.toLocaleString('pt-BR', { maximumFractionDigits: 2 });
}
