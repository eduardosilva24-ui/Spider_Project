import type { ReactNode } from 'react';
import {
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Filler,
  Legend,
  LineElement,
  LinearScale,
  PointElement,
  RadialLinearScale,
  Tooltip,
} from 'chart.js';
import { Bar, Line, Radar } from 'react-chartjs-2';
import { formatDisplayDate, getWeekEnd, getWeekStart, isBetweenISO, toISODate } from '../../domain/date';
import type { SpiderData, SpiderSummary } from '../../domain/types';
import { Card, CardHeader } from '../ui/Card';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, RadialLinearScale, Filler, Tooltip, Legend);

const gridColor = 'rgba(255,255,255,0.08)';
const labelColor = 'rgba(248,250,252,0.72)';

const baseOptions = {
  responsive: true,
  maintainAspectRatio: false,
  animation: {
    duration: 650,
  },
  plugins: {
    legend: {
      display: false,
      labels: {
        color: labelColor,
      },
    },
    tooltip: {
      backgroundColor: 'rgba(7,9,16,0.94)',
      borderColor: 'rgba(255,255,255,0.12)',
      borderWidth: 1,
      titleColor: '#f8fafc',
      bodyColor: '#cbd5e1',
      padding: 12,
      displayColors: false,
    },
  },
  scales: {
    x: {
      grid: { display: false },
      ticks: { color: labelColor },
    },
    y: {
      grid: { color: gridColor },
      ticks: { color: labelColor },
    },
  },
};

export function SpiderCharts({ data, summary }: { data: SpiderData; summary: SpiderSummary }) {
  return (
    <div className="grid gap-4 xl:grid-cols-3">
      <WeightChart data={data} />
      <ActivityChart data={data} />
      <ScoreRadar data={data} summary={summary} />
    </div>
  );
}

function WeightChart({ data }: { data: SpiderData }) {
  const entries = [...data.weight].sort((a, b) => a.date.localeCompare(b.date)).slice(-10);
  const chartData = {
    labels: entries.map((entry) => formatDisplayDate(entry.date)),
    datasets: [
      {
        label: 'Peso',
        data: entries.map((entry) => entry.weightKg),
        borderColor: '#d42736',
        backgroundColor: 'rgba(212,39,54,0.2)',
        pointBackgroundColor: '#f8fafc',
        pointBorderColor: '#d42736',
        pointRadius: 4,
        fill: true,
        tension: 0.38,
      },
    ],
  };

  return (
    <ChartCard title="Peso" eyebrow="Evolução">
      <Line data={chartData} options={baseOptions} />
    </ChartCard>
  );
}

function ActivityChart({ data }: { data: SpiderData }) {
  const start = getWeekStart();
  const labels = Array.from({ length: 7 }).map((_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return toISODate(date);
  });

  const chartData = {
    labels: labels.map((date) => formatDisplayDate(date, { weekday: 'short' })),
    datasets: [
      {
        label: 'Treinos',
        data: labels.map((date) => data.workouts.filter((entry) => entry.date === date).length),
        backgroundColor: 'rgba(212,39,54,0.72)',
        borderRadius: 8,
      },
      {
        label: 'Corridas',
        data: labels.map((date) => data.runs.filter((entry) => entry.date === date).length),
        backgroundColor: 'rgba(39,110,210,0.72)',
        borderRadius: 8,
      },
      {
        label: 'Água',
        data: labels.map((date) => (data.water.some((entry) => entry.date === date) ? 1 : 0)),
        backgroundColor: 'rgba(55,211,154,0.7)',
        borderRadius: 8,
      },
    ],
  };

  return (
    <ChartCard title="Semana" eyebrow="Atividade">
      <Bar
        data={chartData}
        options={{ ...baseOptions, plugins: { ...baseOptions.plugins, legend: { display: true, labels: { color: labelColor } } } }}
      />
    </ChartCard>
  );
}

function ScoreRadar({ data, summary }: { data: SpiderData; summary: SpiderSummary }) {
  const weekStart = toISODate(getWeekStart());
  const weekEnd = toISODate(getWeekEnd());
  const waterDays = new Set(data.water.filter((entry) => isBetweenISO(entry.date, weekStart, weekEnd)).map((entry) => entry.date)).size;

  const chartData = {
    labels: ['Score', 'Treinos', 'Corridas', 'Nutrição', 'Água', 'Sequência'],
    datasets: [
      {
        label: 'Spider',
        data: [
          summary.spiderScore,
          Math.min(summary.workoutsThisWeek / Math.max(data.settings.weeklyWorkoutGoal, 1), 1) * 100,
          Math.min(summary.runsThisWeek / Math.max(data.settings.weeklyRunGoal, 1), 1) * 100,
          Math.min(summary.nutritionDaysThisWeek / 7, 1) * 100,
          Math.min(waterDays / 7, 1) * 100,
          Math.min(summary.streakDays / 7, 1) * 100,
        ],
        borderColor: '#f2b84b',
        backgroundColor: 'rgba(242,184,75,0.16)',
        pointBackgroundColor: '#f2b84b',
      },
    ],
  };

  return (
    <ChartCard title="Spider Score" eyebrow="Radar">
      <Radar
        data={chartData}
        options={{
          responsive: true,
          maintainAspectRatio: false,
          plugins: baseOptions.plugins,
          scales: {
            r: {
              min: 0,
              max: 100,
              grid: { color: gridColor },
              angleLines: { color: gridColor },
              pointLabels: { color: labelColor },
              ticks: { display: false },
            },
          },
        }}
      />
    </ChartCard>
  );
}

function ChartCard({ title, eyebrow, children }: { title: string; eyebrow: string; children: ReactNode }) {
  return (
    <Card className="chart-shell min-h-[320px] overflow-hidden">
      <CardHeader title={title} eyebrow={eyebrow} className="p-4" />
      <div className="h-64 p-4">{children}</div>
    </Card>
  );
}
