import { Activity, CalendarClock, Flame, Gauge, Scale, Zap } from 'lucide-react';
import { motion } from 'framer-motion';
import { SpiderCharts } from '../charts/SpiderCharts';
import { Card, CardHeader } from '../ui/Card';
import { Progress } from '../ui/Progress';
import { StatCard } from '../ui/StatCard';
import { Badge } from '../ui/Badge';
import { buildTimeline } from '../../domain/calculations';
import { formatDisplayDate } from '../../domain/date';
import type { SpiderData, SpiderSummary } from '../../domain/types';

export function DashboardView({ data, summary }: { data: SpiderData; summary: SpiderSummary }) {
  const timeline = buildTimeline(data).slice(0, 8);
  const scoreDelta = summary.spiderScore - summary.previousSpiderScore;

  return (
    <div className="space-y-5">
      <section className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
        <Card className="relative overflow-hidden p-5 sm:p-6">
          <div className="absolute inset-0 bg-web opacity-80" aria-hidden="true" />
          <div className="relative grid gap-6 lg:grid-cols-[280px_1fr]">
            <div className="flex flex-col items-center justify-center rounded-lg border border-white/10 bg-black/24 p-6">
              <ScoreRing value={summary.spiderScore} />
              <div className="mt-4 flex items-center gap-2">
                <Badge tone={scoreDelta >= 0 ? 'green' : 'red'}>
                  {scoreDelta >= 0 ? '+' : ''}
                  {scoreDelta}
                </Badge>
                <span className="text-sm text-spider-muted">vs. semana anterior</span>
              </div>
            </div>

            <div className="min-w-0">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-spider-red">Centro de evolução</p>
              <h2 className="mt-2 text-3xl font-black tracking-normal text-white sm:text-5xl">Nível {summary.level}</h2>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-spider-muted sm:text-base">
                {data.settings.userName}, seu painel está pronto para registrar progresso real, sem recomendações automáticas e sem dados locais.
              </p>
              <div className="mt-6">
                <div className="mb-2 flex items-center justify-between text-sm">
                  <span className="font-semibold text-spider-ink">{summary.xpIntoLevel} XP</span>
                  <span className="text-spider-muted">{summary.xpForNextLevel} XP para o próximo nível</span>
                </div>
                <Progress value={(summary.xpIntoLevel / Math.max(summary.xpForNextLevel, 1)) * 100} barClassName="bg-spider-gold" />
              </div>
              <div className="mt-6 grid gap-3 sm:grid-cols-3">
                <MiniMetric label="XP total" value={summary.totalXp.toLocaleString('pt-BR')} />
                <MiniMetric label="Sequência" value={`${summary.streakDays} dias`} />
                <MiniMetric label="Água hoje" value={`${summary.todayWaterPercent}%`} />
              </div>
            </div>
          </div>
        </Card>

        <Card className="p-5 sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-spider-red">Missão diária</p>
              <h2 className="mt-1 text-xl font-bold">Checklist de consistência</h2>
            </div>
            <Zap className="h-5 w-5 text-spider-gold" />
          </div>
          <div className="mt-5 space-y-3">
            <MissionLine label="Treino da semana" value={summary.workoutsThisWeek} goal={data.settings.weeklyWorkoutGoal} />
            <MissionLine label="Corridas da semana" value={summary.runsThisWeek} goal={data.settings.weeklyRunGoal} />
            <MissionLine label="Água de hoje" value={summary.todayWaterMl} goal={data.settings.dailyWaterGoalMl} unit="ml" />
            <MissionLine label="Nutrição registrada" value={summary.nutritionDaysThisWeek} goal={7} />
          </div>
        </Card>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Treinos da semana"
          value={summary.workoutsThisWeek}
          detail={`Meta ${data.settings.weeklyWorkoutGoal}`}
          icon={<Flame className="h-5 w-5" />}
        />
        <StatCard
          label="Peso atual"
          value={summary.currentWeight ? `${summary.currentWeight} kg` : '-'}
          detail={summary.targetWeight ? `Meta ${summary.targetWeight} kg` : 'Meta não definida'}
          icon={<Scale className="h-5 w-5" />}
          accent="blue"
        />
        <StatCard
          label="Última corrida"
          value={summary.lastRun ? `${summary.lastRun.distanceKm} km` : '-'}
          detail={summary.lastRun ? formatDisplayDate(summary.lastRun.date) : 'Ainda sem corrida'}
          icon={<Activity className="h-5 w-5" />}
          accent="green"
        />
        <StatCard
          label="Próximo treino"
          value={summary.nextWorkoutLabel}
          detail="Inferido pelo último treino"
          icon={<CalendarClock className="h-5 w-5" />}
          accent="gold"
        />
      </section>

      <SpiderCharts data={data} summary={summary} />

      <section className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
        <Card>
          <CardHeader title="Recordes em destaque" eyebrow="Conquistas" />
          <div className="space-y-3 p-5">
            {data.records.slice(0, 5).map((record) => (
              <div key={record.id} className="flex items-center justify-between gap-4 rounded-lg border border-white/10 bg-white/[0.055] p-3">
                <div className="min-w-0">
                  <p className="truncate font-semibold text-spider-ink">{record.title}</p>
                  <p className="text-sm text-spider-muted">{formatDisplayDate(record.date)}</p>
                </div>
                <Badge tone="gold">
                  {record.value} {record.unit}
                </Badge>
              </div>
            ))}
            {data.records.length === 0 ? (
              <div className="rounded-lg border border-dashed border-white/12 p-5 text-sm text-spider-muted">
                Os recordes aparecem automaticamente quando treinos e corridas forem registrados.
              </div>
            ) : null}
          </div>
        </Card>

        <Card>
          <CardHeader title="Linha do tempo" eyebrow="Evolução" />
          <div className="p-5">
            <div className="space-y-4">
              {timeline.map((item, index) => (
                <div key={item.id} className="grid grid-cols-[88px_20px_1fr] gap-3">
                  <span className="pt-0.5 text-sm text-spider-muted">{formatDisplayDate(item.date)}</span>
                  <span className="relative flex justify-center">
                    <span className="mt-1.5 h-3 w-3 rounded-full bg-spider-red shadow-glow" />
                    {index < timeline.length - 1 ? <span className="absolute top-5 h-9 w-px bg-white/10" /> : null}
                  </span>
                  <div className="min-w-0 rounded-lg border border-white/10 bg-white/[0.055] p-3">
                    <div className="flex items-center justify-between gap-3">
                      <p className="truncate font-semibold text-spider-ink">{item.title}</p>
                      <Badge tone="blue">{item.type}</Badge>
                    </div>
                    {item.detail ? <p className="mt-1 truncate text-sm text-spider-muted">{item.detail}</p> : null}
                  </div>
                </div>
              ))}
              {timeline.length === 0 ? (
                <div className="rounded-lg border border-dashed border-white/12 p-5 text-sm text-spider-muted">
                  A linha do tempo ganha vida conforme você registra sua evolução.
                </div>
              ) : null}
            </div>
          </div>
        </Card>
      </section>
    </div>
  );
}

function ScoreRing({ value }: { value: number }) {
  const circumference = 2 * Math.PI * 62;
  const progress = circumference - (value / 100) * circumference;

  return (
    <div className="relative h-44 w-44">
      <svg className="h-full w-full -rotate-90" viewBox="0 0 150 150" role="img" aria-label={`Spider Score ${value}`}>
        <circle cx="75" cy="75" r="62" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="12" />
        <motion.circle
          cx="75"
          cy="75"
          r="62"
          fill="none"
          stroke="url(#scoreGradient)"
          strokeWidth="12"
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: progress }}
          transition={{ duration: 0.9, ease: 'easeOut' }}
        />
        <defs>
          <linearGradient id="scoreGradient" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#d42736" />
            <stop offset="100%" stopColor="#f2b84b" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <Gauge className="mb-1 h-5 w-5 text-spider-red" />
        <span className="text-5xl font-black">{value}</span>
        <span className="text-xs font-semibold uppercase tracking-[0.2em] text-spider-muted">Score</span>
      </div>
    </div>
  );
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.055] p-3">
      <p className="text-xs font-medium text-spider-muted">{label}</p>
      <p className="mt-1 text-lg font-bold text-white">{value}</p>
    </div>
  );
}

function MissionLine({ label, value, goal, unit }: { label: string; value: number; goal: number; unit?: string }) {
  const percent = Math.min(100, (value / Math.max(goal, 1)) * 100);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-4 text-sm">
        <span className="font-medium text-spider-muted">{label}</span>
        <span className="font-semibold text-spider-ink">
          {value}
          {unit ? ` ${unit}` : ''} / {goal}
          {unit ? ` ${unit}` : ''}
        </span>
      </div>
      <Progress value={percent} />
    </div>
  );
}
