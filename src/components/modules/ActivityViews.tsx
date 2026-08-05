import { useMemo, useState } from 'react';
import { Activity, Plus, Save, Scale, Trash2 } from 'lucide-react';
import { Button } from '../ui/Button';
import { Card, CardHeader } from '../ui/Card';
import { EmptyState } from '../ui/EmptyState';
import { Field, Input, Select, Textarea } from '../ui/Field';
import { Badge } from '../ui/Badge';
import { createExercise, createMeasurement, createRun, createWeight, createWorkout, touch } from '../../domain/factories';
import { formatDisplayDate, minutesToPace } from '../../domain/date';
import type {
  MeasurementEntry,
  RunEntry,
  WaterEntry,
  WeightEntry,
  WorkoutEntry,
  WorkoutExercise,
} from '../../domain/types';

export type SaveRecord = {
  (module: 'workouts', record: WorkoutEntry): Promise<WorkoutEntry>;
  (module: 'runs', record: RunEntry): Promise<RunEntry>;
  (module: 'weight', record: WeightEntry): Promise<WeightEntry>;
  (module: 'measurements', record: MeasurementEntry): Promise<MeasurementEntry>;
  (module: 'water', record: WaterEntry): Promise<WaterEntry>;
};

export function WorkoutsView({
  workouts,
  onSave,
  saving,
}: {
  workouts: WorkoutEntry[];
  onSave: SaveRecord;
  saving: boolean;
}) {
  const [form, setForm] = useState(() => createWorkout());
  const cleanExercises = form.exercises.filter((exercise) => exercise.name.trim());

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!form.date || !form.type.trim()) return;
    await onSave('workouts', touch({ ...form, exercises: cleanExercises.length ? cleanExercises : form.exercises }));
    setForm(createWorkout({ type: inferNextType(form.type) }));
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
      <Card>
        <CardHeader title="Novo treino" eyebrow="Registro" />
        <form className="space-y-4 p-5" onSubmit={submit}>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Data">
              <Input type="date" value={form.date} onChange={(event) => setForm({ ...form, date: event.target.value })} required />
            </Field>
            <Field label="Tipo">
              <Input value={form.type} onChange={(event) => setForm({ ...form, type: event.target.value })} placeholder="Push, Pull, Legs" required />
            </Field>
            <Field label="Duração">
              <Input
                type="number"
                min={1}
                value={form.durationMinutes}
                onChange={(event) => setForm({ ...form, durationMinutes: toNumber(event.target.value) })}
              />
            </Field>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-semibold text-spider-ink">Exercícios</h3>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setForm({ ...form, exercises: [...form.exercises, createExercise()] })}
              >
                <Plus className="h-4 w-4" />
                Adicionar
              </Button>
            </div>
            {form.exercises.map((exercise, index) => (
              <ExerciseRow
                key={exercise.id}
                exercise={exercise}
                onChange={(next) =>
                  setForm({
                    ...form,
                    exercises: form.exercises.map((item) => (item.id === exercise.id ? next : item)),
                  })
                }
                onRemove={() => setForm({ ...form, exercises: form.exercises.filter((item) => item.id !== exercise.id) })}
                removable={form.exercises.length > 1}
                index={index}
              />
            ))}
          </div>

          <Field label="Observações">
            <Textarea value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} />
          </Field>

          <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
            <Field label="Status">
              <Select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value as WorkoutEntry['status'] })}>
                <option>Concluído</option>
                <option>Parcial</option>
                <option>Planejado</option>
                <option>Pausado</option>
              </Select>
            </Field>
            <Button className="self-end" type="submit" loading={saving}>
              <Save className="h-4 w-4" />
              Salvar treino
            </Button>
          </div>
        </form>
      </Card>

      <HistoryCard title="Treinos recentes" emptyTitle="Nenhum treino registrado" emptyDescription="Registre o primeiro treino para iniciar a linha de evolução.">
        {workouts.slice(0, 8).map((workout) => (
          <div key={workout.id} className="rounded-lg border border-white/10 bg-white/[0.055] p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-semibold text-white">{workout.type}</p>
                <p className="text-sm text-spider-muted">
                  {formatDisplayDate(workout.date)} • {workout.durationMinutes} min
                </p>
              </div>
              <Badge tone={workout.status === 'Concluído' ? 'green' : 'neutral'}>{workout.status}</Badge>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {workout.exercises.slice(0, 5).map((exercise) => (
                <Badge key={exercise.id} tone="blue">
                  {exercise.name || 'Exercício'} {exercise.sets}x{exercise.reps}
                </Badge>
              ))}
            </div>
          </div>
        ))}
      </HistoryCard>
    </div>
  );
}

export function RunsView({ runs, onSave, saving }: { runs: RunEntry[]; onSave: SaveRecord; saving: boolean }) {
  const [form, setForm] = useState(() => createRun());

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!form.date || form.distanceKm <= 0 || form.durationMinutes <= 0) return;
    const pace = form.pace.trim() || minutesToPace(form.distanceKm, form.durationMinutes);
    await onSave('runs', touch({ ...form, pace }));
    setForm(createRun());
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
      <Card>
        <CardHeader title="Nova corrida" eyebrow="Registro" />
        <form className="space-y-4 p-5" onSubmit={submit}>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Data">
              <Input type="date" value={form.date} onChange={(event) => setForm({ ...form, date: event.target.value })} required />
            </Field>
            <Field label="Distância km">
              <Input type="number" min={0.01} step={0.01} value={form.distanceKm} onChange={(event) => setForm({ ...form, distanceKm: toNumber(event.target.value) })} required />
            </Field>
            <Field label="Tempo min">
              <Input type="number" min={1} value={form.durationMinutes} onChange={(event) => setForm({ ...form, durationMinutes: toNumber(event.target.value) })} required />
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Pace">
              <Input value={form.pace} onChange={(event) => setForm({ ...form, pace: event.target.value })} placeholder="5:48/km" />
            </Field>
            <Field label="Elevação m">
              <Input type="number" value={form.elevationM} onChange={(event) => setForm({ ...form, elevationM: toNumber(event.target.value) })} />
            </Field>
            <Field label="Temperatura °C">
              <Input type="number" value={form.temperatureC} onChange={(event) => setForm({ ...form, temperatureC: toNumber(event.target.value) })} />
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Local">
              <Input value={form.location} onChange={(event) => setForm({ ...form, location: event.target.value })} />
            </Field>
            <Field label="Sensação">
              <Input value={form.feeling} onChange={(event) => setForm({ ...form, feeling: event.target.value })} placeholder="Leve, forte, intensa" />
            </Field>
          </div>
          <Field label="Link do Strava">
            <Input type="url" value={form.stravaUrl} onChange={(event) => setForm({ ...form, stravaUrl: event.target.value })} />
          </Field>
          <Field label="Observações">
            <Textarea value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} />
          </Field>
          <Button type="submit" loading={saving}>
            <Activity className="h-4 w-4" />
            Salvar corrida
          </Button>
        </form>
      </Card>

      <HistoryCard title="Corridas recentes" emptyTitle="Nenhuma corrida registrada" emptyDescription="Distância, pace e sensação aparecem aqui após a sincronização.">
        {runs.slice(0, 8).map((run) => (
          <div key={run.id} className="rounded-lg border border-white/10 bg-white/[0.055] p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-semibold text-white">{run.distanceKm} km</p>
                <p className="text-sm text-spider-muted">
                  {formatDisplayDate(run.date)} • {run.durationMinutes} min • {run.pace || '-'}
                </p>
              </div>
              <Badge tone="green">{run.feeling || 'Registrada'}</Badge>
            </div>
            {run.location || run.notes ? <p className="mt-3 text-sm leading-6 text-spider-muted">{run.location || run.notes}</p> : null}
          </div>
        ))}
      </HistoryCard>
    </div>
  );
}

export function WeightView({ entries, onSave, saving }: { entries: WeightEntry[]; onSave: SaveRecord; saving: boolean }) {
  const [form, setForm] = useState(() => createWeight({ weightKg: entries[0]?.weightKg ?? 0 }));

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!form.date || form.weightKg <= 0) return;
    await onSave('weight', touch(form));
    setForm(createWeight({ weightKg: form.weightKg }));
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[0.7fr_1.3fr]">
      <Card>
        <CardHeader title="Novo peso" eyebrow="Registro" />
        <form className="space-y-4 p-5" onSubmit={submit}>
          <Field label="Data">
            <Input type="date" value={form.date} onChange={(event) => setForm({ ...form, date: event.target.value })} required />
          </Field>
          <Field label="Peso kg">
            <Input type="number" min={1} step={0.1} value={form.weightKg} onChange={(event) => setForm({ ...form, weightKg: toNumber(event.target.value) })} required />
          </Field>
          <Field label="Observações">
            <Textarea value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} />
          </Field>
          <Button type="submit" loading={saving}>
            <Scale className="h-4 w-4" />
            Salvar peso
          </Button>
        </form>
      </Card>
      <HistoryCard title="Histórico de peso" emptyTitle="Nenhum peso registrado" emptyDescription="O gráfico da dashboard será criado automaticamente.">
        {entries.slice(0, 12).map((entry) => (
          <div key={entry.id} className="flex items-center justify-between gap-4 rounded-lg border border-white/10 bg-white/[0.055] p-4">
            <div>
              <p className="font-semibold text-white">{entry.weightKg} kg</p>
              <p className="text-sm text-spider-muted">{formatDisplayDate(entry.date)}</p>
            </div>
            {entry.notes ? <span className="max-w-[50%] truncate text-sm text-spider-muted">{entry.notes}</span> : null}
          </div>
        ))}
      </HistoryCard>
    </div>
  );
}

export function MeasurementsView({
  entries,
  onSave,
  saving,
}: {
  entries: MeasurementEntry[];
  onSave: SaveRecord;
  saving: boolean;
}) {
  const [form, setForm] = useState(() => createMeasurement());
  const fields = useMemo(
    () => [
      ['leftArmCm', 'Braço esquerdo'],
      ['rightArmCm', 'Braço direito'],
      ['chestCm', 'Peitoral'],
      ['waistCm', 'Cintura'],
      ['hipCm', 'Quadril'],
      ['thighCm', 'Coxa'],
      ['calfCm', 'Panturrilha'],
      ['neckCm', 'Pescoço'],
      ['forearmCm', 'Antebraço'],
    ] as const,
    [],
  );

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!form.date) return;
    await onSave('measurements', touch(form));
    setForm(createMeasurement());
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[0.95fr_1.05fr]">
      <Card>
        <CardHeader title="Novas medidas" eyebrow="Registro" />
        <form className="space-y-4 p-5" onSubmit={submit}>
          <Field label="Data">
            <Input type="date" value={form.date} onChange={(event) => setForm({ ...form, date: event.target.value })} required />
          </Field>
          <div className="grid gap-4 sm:grid-cols-3">
            {fields.map(([key, label]) => (
              <Field key={key} label={`${label} cm`}>
                <Input type="number" min={0} step={0.1} value={form[key]} onChange={(event) => setForm({ ...form, [key]: toNumber(event.target.value) })} />
              </Field>
            ))}
          </div>
          <Field label="Observações">
            <Textarea value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} />
          </Field>
          <Button type="submit" loading={saving}>
            <Save className="h-4 w-4" />
            Salvar medidas
          </Button>
        </form>
      </Card>

      <HistoryCard title="Medidas recentes" emptyTitle="Nenhuma medida registrada" emptyDescription="Registre medidas periodicamente para comparar sua evolução.">
        {entries.slice(0, 8).map((entry) => (
          <div key={entry.id} className="rounded-lg border border-white/10 bg-white/[0.055] p-4">
            <div className="mb-3 flex items-center justify-between gap-4">
              <p className="font-semibold text-white">{formatDisplayDate(entry.date)}</p>
              <Badge tone="blue">9 pontos</Badge>
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-3">
              {fields.slice(0, 6).map(([key, label]) => (
                <span key={key} className="rounded-md bg-black/18 px-2 py-1 text-spider-muted">
                  {label}: <strong className="text-spider-ink">{entry[key]} cm</strong>
                </span>
              ))}
            </div>
          </div>
        ))}
      </HistoryCard>
    </div>
  );
}

function ExerciseRow({
  exercise,
  onChange,
  onRemove,
  removable,
  index,
}: {
  exercise: WorkoutExercise;
  onChange: (exercise: WorkoutExercise) => void;
  onRemove: () => void;
  removable: boolean;
  index: number;
}) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.045] p-3">
      <div className="mb-3 flex items-center justify-between gap-3">
        <Badge tone="red">#{index + 1}</Badge>
        <Button type="button" variant="ghost" size="icon" onClick={onRemove} disabled={!removable} aria-label="Remover exercício">
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
      <div className="grid gap-3 md:grid-cols-[minmax(0,1.3fr)_repeat(4,minmax(76px,0.55fr))]">
        <Input value={exercise.name} onChange={(event) => onChange({ ...exercise, name: event.target.value })} placeholder="Exercício" />
        <Input type="number" min={0} value={exercise.sets} onChange={(event) => onChange({ ...exercise, sets: toNumber(event.target.value) })} aria-label="Séries" />
        <Input type="number" min={0} value={exercise.reps} onChange={(event) => onChange({ ...exercise, reps: toNumber(event.target.value) })} aria-label="Repetições" />
        <Input type="number" min={0} step={0.5} value={exercise.loadKg} onChange={(event) => onChange({ ...exercise, loadKg: toNumber(event.target.value) })} aria-label="Carga" />
        <Input type="number" min={0} value={exercise.durationSeconds} onChange={(event) => onChange({ ...exercise, durationSeconds: toNumber(event.target.value) })} aria-label="Segundos" />
      </div>
    </div>
  );
}

function HistoryCard({
  title,
  emptyTitle,
  emptyDescription,
  children,
}: {
  title: string;
  emptyTitle: string;
  emptyDescription: string;
  children: React.ReactNode;
}) {
  const hasItems = Array.isArray(children) ? children.length > 0 : Boolean(children);

  return (
    <Card>
      <CardHeader title={title} eyebrow="Histórico" />
      <div className="space-y-3 p-5">
        {hasItems ? children : <EmptyState title={emptyTitle} description={emptyDescription} />}
      </div>
    </Card>
  );
}

function inferNextType(type: string) {
  const normalized = type.trim().toLowerCase();
  if (normalized === 'push') return 'Pull';
  if (normalized === 'pull') return 'Legs';
  if (normalized === 'legs') return 'Push';
  return type || 'Push';
}

function toNumber(value: string | number) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
}
