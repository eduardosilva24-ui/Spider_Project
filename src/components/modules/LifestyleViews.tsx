import { useMemo, useState } from 'react';
import { BookOpenText, Check, Droplets, Flag, Plus, Trash2, Utensils } from 'lucide-react';
import { Button } from '../ui/Button';
import { Card, CardHeader } from '../ui/Card';
import { EmptyState } from '../ui/EmptyState';
import { Field, Input, Select, Textarea } from '../ui/Field';
import { Badge } from '../ui/Badge';
import { Progress } from '../ui/Progress';
import { MEAL_TYPES } from '../../domain/constants';
import { formatDisplayDate, todayISO } from '../../domain/date';
import { createDiary, createMission, createNutrition, createWater, touch } from '../../domain/factories';
import { createId } from '../../domain/ids';
import type {
  DiaryEntry,
  FoodItem,
  MissionEntry,
  NutritionEntry,
  SpiderSettings,
  SpiderSummary,
  WaterEntry,
} from '../../domain/types';

export type LifestyleSaveRecord = {
  (module: 'nutrition', record: NutritionEntry): Promise<NutritionEntry>;
  (module: 'water', record: WaterEntry): Promise<WaterEntry>;
  (module: 'diary', record: DiaryEntry): Promise<DiaryEntry>;
  (module: 'missions', record: MissionEntry): Promise<MissionEntry>;
};

export function NutritionView({
  entries,
  onSave,
  saving,
}: {
  entries: NutritionEntry[];
  onSave: LifestyleSaveRecord;
  saving: boolean;
}) {
  const [form, setForm] = useState(() => createNutrition());
  const foods = form.foods.filter((food) => food.name.trim());

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!form.date || !form.time || !foods.length) return;
    await onSave('nutrition', touch({ ...form, foods }));
    setForm(createNutrition({ type: form.type }));
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[1fr_1fr]">
      <Card>
        <CardHeader title="Nova refeição" eyebrow="Nutrição" />
        <form className="space-y-4 p-5" onSubmit={submit}>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Data">
              <Input type="date" value={form.date} onChange={(event) => setForm({ ...form, date: event.target.value })} required />
            </Field>
            <Field label="Horário">
              <Input type="time" value={form.time} onChange={(event) => setForm({ ...form, time: event.target.value })} required />
            </Field>
            <Field label="Tipo">
              <Select value={form.type} onChange={(event) => setForm({ ...form, type: event.target.value as NutritionEntry['type'] })}>
                {MEAL_TYPES.map((type) => (
                  <option key={type}>{type}</option>
                ))}
              </Select>
            </Field>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-semibold text-spider-ink">Alimentos</h3>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setForm({ ...form, foods: [...form.foods, { id: createId('food'), name: '', quantity: 100, unit: 'g' }] })}
              >
                <Plus className="h-4 w-4" />
                Adicionar
              </Button>
            </div>
            {form.foods.map((food) => (
              <FoodRow
                key={food.id}
                food={food}
                onChange={(next) =>
                  setForm({
                    ...form,
                    foods: form.foods.map((item) => (item.id === food.id ? next : item)),
                  })
                }
                onRemove={() => setForm({ ...form, foods: form.foods.filter((item) => item.id !== food.id) })}
                removable={form.foods.length > 1}
              />
            ))}
          </div>

          <Field label="Observações">
            <Textarea value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} />
          </Field>

          <Button type="submit" loading={saving}>
            <Utensils className="h-4 w-4" />
            Salvar refeição
          </Button>
        </form>
      </Card>

      <Card>
        <CardHeader title="Refeições recentes" eyebrow="Histórico" />
        <div className="space-y-3 p-5">
          {entries.slice(0, 10).map((entry) => (
            <div key={entry.id} className="rounded-lg border border-white/10 bg-white/[0.055] p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-semibold text-white">{entry.type}</p>
                  <p className="text-sm text-spider-muted">
                    {formatDisplayDate(entry.date)} • {entry.time}
                  </p>
                </div>
                <Badge tone="gold">{entry.foods.length} itens</Badge>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {entry.foods.map((food) => (
                  <Badge key={food.id} tone="neutral">
                    {food.quantity} {food.unit} {food.name}
                  </Badge>
                ))}
              </div>
            </div>
          ))}
          {entries.length === 0 ? (
            <EmptyState title="Nenhuma refeição registrada" description="A lista diária aparece aqui logo após salvar na planilha." />
          ) : null}
        </div>
      </Card>
    </div>
  );
}

export function WaterView({
  entries,
  summary,
  settings,
  onSave,
  saving,
}: {
  entries: WaterEntry[];
  summary: SpiderSummary;
  settings: SpiderSettings;
  onSave: LifestyleSaveRecord;
  saving: boolean;
}) {
  const [customAmount, setCustomAmount] = useState(500);
  const todayEntries = entries.filter((entry) => entry.date === todayISO());
  const marks = [0, 25, 50, 75, 100];

  async function addWater(amountMl: number) {
    if (amountMl <= 0) return;
    await onSave('water', createWater(amountMl));
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[0.85fr_1.15fr]">
      <Card className="overflow-hidden">
        <CardHeader title="Água de hoje" eyebrow="Hidratação" />
        <div className="space-y-6 p-5">
          <div className="rounded-lg border border-white/10 bg-gradient-to-br from-blue-500/16 to-emerald-500/10 p-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-4xl font-black text-white">{summary.todayWaterPercent}%</p>
                <p className="mt-1 text-sm text-spider-muted">
                  {summary.todayWaterMl} ml / {settings.dailyWaterGoalMl} ml
                </p>
              </div>
              <Droplets className="h-10 w-10 text-sky-200" />
            </div>
            <Progress className="mt-5 h-3" value={summary.todayWaterPercent} barClassName="bg-sky-400" />
            <div className="mt-3 flex justify-between text-xs font-semibold text-spider-muted">
              {marks.map((mark) => (
                <span key={mark}>{mark}%</span>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[250, 500, 750, 1000].map((amount) => (
              <Button key={amount} variant="secondary" onClick={() => void addWater(amount)} loading={saving}>
                +{amount} ml
              </Button>
            ))}
          </div>
          <form
            className="grid gap-3 sm:grid-cols-[1fr_auto]"
            onSubmit={(event) => {
              event.preventDefault();
              void addWater(customAmount);
            }}
          >
            <Field label="Quantidade personalizada">
              <Input type="number" min={1} value={customAmount} onChange={(event) => setCustomAmount(Number(event.target.value))} />
            </Field>
            <Button className="self-end" type="submit" loading={saving}>
              <Plus className="h-4 w-4" />
              Registrar
            </Button>
          </form>
        </div>
      </Card>

      <Card>
        <CardHeader title="Registros de água" eyebrow="Hoje" />
        <div className="space-y-3 p-5">
          {todayEntries.map((entry) => (
            <div key={entry.id} className="flex items-center justify-between gap-4 rounded-lg border border-white/10 bg-white/[0.055] p-4">
              <p className="font-semibold text-white">{entry.amountMl} ml</p>
              <p className="text-sm text-spider-muted">{new Date(entry.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</p>
            </div>
          ))}
          {todayEntries.length === 0 ? <EmptyState title="Nenhuma água registrada hoje" description="Use os botões rápidos para marcar hidratação em segundos." /> : null}
        </div>
      </Card>
    </div>
  );
}

export function DiaryView({ entries, onSave, saving }: { entries: DiaryEntry[]; onSave: LifestyleSaveRecord; saving: boolean }) {
  const [form, setForm] = useState(() => createDiary());

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!form.date || !form.text.trim()) return;
    await onSave('diary', touch(form));
    setForm(createDiary());
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
      <Card>
        <CardHeader title="Novo diário" eyebrow="Notas" />
        <form className="space-y-4 p-5" onSubmit={submit}>
          <Field label="Data">
            <Input type="date" value={form.date} onChange={(event) => setForm({ ...form, date: event.target.value })} required />
          </Field>
          <Field label="Texto">
            <Textarea value={form.text} onChange={(event) => setForm({ ...form, text: event.target.value })} className="min-h-52" required />
          </Field>
          <Button type="submit" loading={saving}>
            <BookOpenText className="h-4 w-4" />
            Salvar diário
          </Button>
        </form>
      </Card>

      <Card>
        <CardHeader title="Entradas recentes" eyebrow="Histórico" />
        <div className="space-y-3 p-5">
          {entries.slice(0, 8).map((entry) => (
            <article key={entry.id} className="rounded-lg border border-white/10 bg-white/[0.055] p-4">
              <p className="mb-2 text-sm font-semibold text-spider-red">{formatDisplayDate(entry.date)}</p>
              <p className="whitespace-pre-wrap text-sm leading-6 text-spider-muted">{entry.text}</p>
            </article>
          ))}
          {entries.length === 0 ? <EmptyState title="Nenhuma entrada no diário" description="Energia, sono, dor, humor e percepções ficam organizados aqui." /> : null}
        </div>
      </Card>
    </div>
  );
}

export function MissionsView({
  missions,
  settings,
  onSave,
  saving,
}: {
  missions: MissionEntry[];
  settings: SpiderSettings;
  onSave: LifestyleSaveRecord;
  saving: boolean;
}) {
  const today = todayISO();
  const templates = useMemo(
    () => [
      { key: 'weight', title: 'Registrar peso', xp: settings.xpWeight },
      { key: 'water', title: 'Registrar água', xp: settings.xpWater },
      { key: 'workout', title: 'Treino do dia', xp: settings.xpWorkout },
      { key: 'stretch', title: 'Alongamento', xp: settings.xpMission },
      { key: 'nutrition', title: 'Registrar alimentação', xp: settings.xpNutrition },
      { key: 'run', title: 'Concluir corrida', xp: settings.xpRun },
    ],
    [settings],
  );
  const completed = new Set(missions.filter((mission) => mission.date === today).map((mission) => mission.key));

  async function complete(title: string, key: string, xp: number) {
    if (completed.has(key)) return;
    await onSave('missions', createMission(title, key, xp));
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
      <Card>
        <CardHeader title="Missões diárias" eyebrow="XP" />
        <div className="grid gap-3 p-5 sm:grid-cols-2">
          {templates.map((mission) => {
            const done = completed.has(mission.key);
            return (
              <button
                key={mission.key}
                className="focus-ring rounded-lg border border-white/10 bg-white/[0.055] p-4 text-left transition hover:border-red-300/30 hover:bg-white/[0.08] disabled:opacity-70"
                disabled={done || saving}
                onClick={() => void complete(mission.title, mission.key, mission.xp)}
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-black/24 text-spider-red">
                    {done ? <Check className="h-5 w-5" /> : <Flag className="h-5 w-5" />}
                  </span>
                  <Badge tone={done ? 'green' : 'gold'}>{done ? 'Feita' : `+${mission.xp} XP`}</Badge>
                </div>
                <p className="mt-4 font-semibold text-white">{mission.title}</p>
              </button>
            );
          })}
        </div>
      </Card>

      <Card>
        <CardHeader title="XP de missões" eyebrow="Histórico" />
        <div className="space-y-3 p-5">
          {missions.slice(0, 12).map((mission) => (
            <div key={mission.id} className="flex items-center justify-between gap-4 rounded-lg border border-white/10 bg-white/[0.055] p-4">
              <div>
                <p className="font-semibold text-white">{mission.title}</p>
                <p className="text-sm text-spider-muted">{formatDisplayDate(mission.date)}</p>
              </div>
              <Badge tone="gold">+{mission.xp} XP</Badge>
            </div>
          ))}
          {missions.length === 0 ? <EmptyState title="Nenhuma missão concluída" description="Conclua missões para criar uma trilha de XP diária." /> : null}
        </div>
      </Card>
    </div>
  );
}

function FoodRow({
  food,
  onChange,
  onRemove,
  removable,
}: {
  food: FoodItem;
  onChange: (food: FoodItem) => void;
  onRemove: () => void;
  removable: boolean;
}) {
  return (
    <div className="grid gap-3 rounded-lg border border-white/10 bg-white/[0.045] p-3 sm:grid-cols-[1fr_100px_100px_auto]">
      <Input value={food.name} onChange={(event) => onChange({ ...food, name: event.target.value })} placeholder="Arroz, frango, ovos..." />
      <Input type="number" min={0} step={0.1} value={food.quantity} onChange={(event) => onChange({ ...food, quantity: Number(event.target.value) })} aria-label="Quantidade" />
      <Input value={food.unit} onChange={(event) => onChange({ ...food, unit: event.target.value })} placeholder="g, ml, un" aria-label="Unidade" />
      <Button type="button" variant="ghost" size="icon" onClick={onRemove} disabled={!removable} aria-label="Remover alimento">
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}
