import { DEFAULT_SETTINGS } from './constants';
import {
  daysAgoISO,
  getWeekEnd,
  getWeekStart,
  isBetweenISO,
  paceToSeconds,
  toISODate,
} from './date';
import type {
  RecordEntry,
  SpiderData,
  SpiderSettings,
  SpiderSummary,
  WaterEntry,
  WeekExport,
  WorkoutEntry,
} from './types';

const LEVEL_BASE_XP = 500;
const LEVEL_STEP_XP = 125;

export function normalizeSettings(settings?: Partial<SpiderSettings>): SpiderSettings {
  return {
    ...DEFAULT_SETTINGS,
    userName: String(settings?.userName ?? DEFAULT_SETTINGS.userName).trim() || DEFAULT_SETTINGS.userName,
    targetWeightKg: toNonNegativeNumber(settings?.targetWeightKg, DEFAULT_SETTINGS.targetWeightKg),
    dailyWaterGoalMl: toPositiveNumber(settings?.dailyWaterGoalMl, DEFAULT_SETTINGS.dailyWaterGoalMl),
    weeklyWorkoutGoal: toPositiveNumber(settings?.weeklyWorkoutGoal, DEFAULT_SETTINGS.weeklyWorkoutGoal),
    weeklyRunGoal: toPositiveNumber(settings?.weeklyRunGoal, DEFAULT_SETTINGS.weeklyRunGoal),
    xpWorkout: toNonNegativeNumber(settings?.xpWorkout, DEFAULT_SETTINGS.xpWorkout),
    xpRun: toNonNegativeNumber(settings?.xpRun, DEFAULT_SETTINGS.xpRun),
    xpNutrition: toNonNegativeNumber(settings?.xpNutrition, DEFAULT_SETTINGS.xpNutrition),
    xpWater: toNonNegativeNumber(settings?.xpWater, DEFAULT_SETTINGS.xpWater),
    xpWeight: toNonNegativeNumber(settings?.xpWeight, DEFAULT_SETTINGS.xpWeight),
    xpStreak: toNonNegativeNumber(settings?.xpStreak, DEFAULT_SETTINGS.xpStreak),
    xpMission: toNonNegativeNumber(settings?.xpMission, DEFAULT_SETTINGS.xpMission),
  };
}

export function calculateSummary(data: SpiderData): SpiderSummary {
  const settings = normalizeSettings(data.settings);
  const today = new Date();
  const weekStart = toISODate(getWeekStart(today));
  const weekEnd = toISODate(getWeekEnd(today));
  const previousStart = daysAgoISO(14, today);
  const previousEnd = daysAgoISO(8, today);
  const todayKey = toISODate(today);

  const workoutsThisWeek = data.workouts.filter((entry) => isBetweenISO(entry.date, weekStart, weekEnd)).length;
  const runsThisWeek = data.runs.filter((entry) => isBetweenISO(entry.date, weekStart, weekEnd)).length;
  const nutritionDaysThisWeek = uniqueDates(
    data.nutrition.filter((entry) => isBetweenISO(entry.date, weekStart, weekEnd)),
  ).size;
  const weightFresh = data.weight.some((entry) => entry.date >= daysAgoISO(7, today));
  const todayWaterMl = data.water
    .filter((entry) => entry.date === todayKey)
    .reduce((total, entry) => total + entry.amountMl, 0);

  const totalXp = calculateTotalXp(data, settings);
  const levelState = calculateLevel(totalXp);
  const spiderScore = calculateSpiderScore(data, weekStart, weekEnd, settings);
  const previousSpiderScore = calculateSpiderScore(data, previousStart, previousEnd, settings);

  return {
    spiderScore,
    previousSpiderScore,
    totalXp,
    ...levelState,
    streakDays: calculateStreakDays(data),
    workoutsThisWeek,
    runsThisWeek,
    currentWeight: latestByDate(data.weight)?.weightKg ?? null,
    targetWeight: settings.targetWeightKg > 0 ? settings.targetWeightKg : null,
    lastRun: latestByDate(data.runs) ?? null,
    nextWorkoutLabel: inferNextWorkout(data.workouts),
    todayWaterMl,
    todayWaterPercent: Math.min(100, Math.round((todayWaterMl / Math.max(settings.dailyWaterGoalMl, 1)) * 100)),
    nutritionDaysThisWeek,
    weightFresh,
  };
}

export function calculateTotalXp(data: SpiderData, settings = normalizeSettings(data.settings)) {
  const nutritionDays = uniqueDates(data.nutrition).size;
  const waterDays = uniqueDates(data.water).size;
  const activeDays = collectActivityDates(data).size;
  const missionXp = data.missions.reduce((total, mission) => total + toSafeNumber(mission.xp, settings.xpMission), 0);

  return (
    data.workouts.length * settings.xpWorkout +
    data.runs.length * settings.xpRun +
    nutritionDays * settings.xpNutrition +
    waterDays * settings.xpWater +
    data.weight.length * settings.xpWeight +
    activeDays * settings.xpStreak +
    missionXp
  );
}

export function calculateLevel(totalXp: number) {
  let remaining = Math.max(totalXp, 0);
  let level = 1;
  let xpForLevel = LEVEL_BASE_XP;

  while (remaining >= xpForLevel) {
    remaining -= xpForLevel;
    level += 1;
    xpForLevel += LEVEL_STEP_XP;
  }

  return {
    level,
    xpIntoLevel: remaining,
    xpForNextLevel: xpForLevel,
  };
}

export function calculateSpiderScore(
  data: SpiderData,
  startISO: string,
  endISO: string,
  settings = normalizeSettings(data.settings),
) {
  const workouts = data.workouts.filter((entry) => isBetweenISO(entry.date, startISO, endISO)).length;
  const runs = data.runs.filter((entry) => isBetweenISO(entry.date, startISO, endISO)).length;
  const nutritionDays = uniqueDates(data.nutrition.filter((entry) => isBetweenISO(entry.date, startISO, endISO))).size;
  const waterDaysHit = countWaterGoalDays(data.water, startISO, endISO, settings.dailyWaterGoalMl);
  const weightUpdated = data.weight.some((entry) => isBetweenISO(entry.date, startISO, endISO));
  const missionDays = uniqueDates(data.missions.filter((entry) => isBetweenISO(entry.date, startISO, endISO))).size;

  const score =
    Math.min(workouts / Math.max(settings.weeklyWorkoutGoal, 1), 1) * 20 +
    Math.min(runs / Math.max(settings.weeklyRunGoal, 1), 1) * 15 +
    Math.min(nutritionDays / 7, 1) * 15 +
    Math.min(waterDaysHit / 7, 1) * 15 +
    (weightUpdated ? 10 : 0) +
    Math.min(calculateStreakDays(data) / 7, 1) * 20 +
    Math.min(missionDays / 7, 1) * 5;

  return Math.max(0, Math.min(100, Math.round(score)));
}

export function deriveRecords(data: SpiderData): RecordEntry[] {
  const now = new Date().toISOString();
  const records: RecordEntry[] = [];
  const bestDistance = maxBy(data.runs, (entry) => entry.distanceKm);
  const bestPace = minBy(data.runs.filter((entry) => entry.pace), (entry) => paceToSeconds(entry.pace));
  const bestElevation = maxBy(data.runs, (entry) => entry.elevationM);
  const bestDuration = maxBy(data.runs, (entry) => entry.durationMinutes);
  const workoutRecords = deriveWorkoutRecords(data.workouts, now);
  const weeklyVolume = deriveBestWeeklyVolume(data.workouts);

  if (bestDistance) {
    records.push(toRecord('run_distance', 'Maior distância', bestDistance.distanceKm, 'km', bestDistance.date, bestDistance.id, now));
  }

  if (bestPace && Number.isFinite(paceToSeconds(bestPace.pace))) {
    records.push(
      toRecord('run_pace', 'Melhor pace', paceToSeconds(bestPace.pace), 'seg/km', bestPace.date, bestPace.id, now),
    );
  }

  if (bestElevation) {
    records.push(toRecord('run_elevation', 'Maior elevação', bestElevation.elevationM, 'm', bestElevation.date, bestElevation.id, now));
  }

  if (bestDuration) {
    records.push(toRecord('run_duration', 'Maior tempo correndo', bestDuration.durationMinutes, 'min', bestDuration.date, bestDuration.id, now));
  }

  if (weeklyVolume) {
    records.push(toRecord('weekly_volume', 'Maior volume semanal', weeklyVolume.value, 'volume', weeklyVolume.date, weeklyVolume.sourceId, now));
  }

  const streak = calculateStreakDays(data);
  if (streak > 0) {
    records.push(toRecord('streak', 'Maior sequência ativa', streak, 'dias', toISODate(new Date()), 'streak', now));
  }

  return [...records, ...workoutRecords].sort((a, b) => a.title.localeCompare(b.title, 'pt-BR'));
}

export function createWeekExport(data: SpiderData, weekStartISO: string): WeekExport {
  const start = new Date(`${weekStartISO}T00:00:00`);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  const weekEndISO = toISODate(end);
  const summary = calculateSummary(data);

  return {
    weekStart: weekStartISO,
    weekEnd: weekEndISO,
    generatedAt: new Date().toISOString(),
    summary,
    workouts: data.workouts.filter((entry) => isBetweenISO(entry.date, weekStartISO, weekEndISO)),
    runs: data.runs.filter((entry) => isBetweenISO(entry.date, weekStartISO, weekEndISO)),
    weight: data.weight.filter((entry) => isBetweenISO(entry.date, weekStartISO, weekEndISO)),
    measurements: data.measurements.filter((entry) => isBetweenISO(entry.date, weekStartISO, weekEndISO)),
    nutrition: data.nutrition.filter((entry) => isBetweenISO(entry.date, weekStartISO, weekEndISO)),
    water: data.water.filter((entry) => isBetweenISO(entry.date, weekStartISO, weekEndISO)),
    missions: data.missions.filter((entry) => isBetweenISO(entry.date, weekStartISO, weekEndISO)),
    spiderScore: summary.spiderScore,
    xp: summary.totalXp,
    records: deriveRecords(data),
    diary: data.diary.filter((entry) => isBetweenISO(entry.date, weekStartISO, weekEndISO)),
  };
}

export function buildTimeline(data: SpiderData) {
  const items = [
    ...data.runs.map((entry) => ({
      id: entry.id,
      date: entry.date,
      type: 'Corrida',
      title: `${entry.distanceKm} km`,
      detail: entry.pace || `${entry.durationMinutes} min`,
    })),
    ...data.workouts.map((entry) => ({
      id: entry.id,
      date: entry.date,
      type: 'Treino',
      title: entry.type,
      detail: `${entry.durationMinutes} min`,
    })),
    ...data.weight.map((entry) => ({
      id: entry.id,
      date: entry.date,
      type: 'Peso',
      title: `${entry.weightKg} kg`,
      detail: entry.notes,
    })),
    ...data.nutrition.map((entry) => ({
      id: entry.id,
      date: entry.date,
      type: 'Nutrição',
      title: entry.type,
      detail: `${entry.foods.length} alimento(s)`,
    })),
    ...data.diary.map((entry) => ({
      id: entry.id,
      date: entry.date,
      type: 'Diário',
      title: entry.text.slice(0, 58),
      detail: '',
    })),
  ];

  return items.sort((a, b) => b.date.localeCompare(a.date)).slice(0, 30);
}

function deriveWorkoutRecords(workouts: WorkoutEntry[], now: string) {
  const records: RecordEntry[] = [];
  const exercises = workouts.flatMap((workout) =>
    workout.exercises.map((exercise) => ({
      workout,
      exercise,
    })),
  );
  const bestPushUps = maxBy(
    exercises.filter(({ exercise }) => /flex(ão|ao)|push/i.test(exercise.name)),
    ({ exercise }) => exercise.reps,
  );
  const bestPullUps = maxBy(
    exercises.filter(({ exercise }) => /barra|pull/i.test(exercise.name)),
    ({ exercise }) => exercise.reps,
  );
  const bestPlank = maxBy(
    exercises.filter(({ exercise }) => /prancha|plank/i.test(exercise.name)),
    ({ exercise }) => exercise.durationSeconds,
  );

  if (bestPushUps) {
    records.push(
      toRecord(
        'pushups',
        'Maior número de flexões',
        bestPushUps.exercise.reps,
        'reps',
        bestPushUps.workout.date,
        bestPushUps.workout.id,
        now,
      ),
    );
  }

  if (bestPullUps) {
    records.push(
      toRecord(
        'pullups',
        'Maior número de barras',
        bestPullUps.exercise.reps,
        'reps',
        bestPullUps.workout.date,
        bestPullUps.workout.id,
        now,
      ),
    );
  }

  if (bestPlank && bestPlank.exercise.durationSeconds > 0) {
    records.push(
      toRecord(
        'plank',
        'Maior prancha',
        bestPlank.exercise.durationSeconds,
        'seg',
        bestPlank.workout.date,
        bestPlank.workout.id,
        now,
      ),
    );
  }

  return records;
}

function deriveBestWeeklyVolume(workouts: WorkoutEntry[]) {
  const buckets = new Map<string, { value: number; date: string; sourceId: string }>();

  workouts.forEach((workout) => {
    const start = toISODate(getWeekStart(new Date(`${workout.date}T00:00:00`)));
    const volume = workout.exercises.reduce((total, exercise) => {
      const load = exercise.loadKg > 0 ? exercise.loadKg : 1;
      return total + exercise.sets * exercise.reps * load;
    }, 0);
    const current = buckets.get(start);
    buckets.set(start, {
      value: (current?.value ?? 0) + volume,
      date: workout.date,
      sourceId: workout.id,
    });
  });

  return maxBy([...buckets.values()], (entry) => entry.value);
}

function toRecord(
  type: string,
  title: string,
  value: number,
  unit: string,
  date: string,
  sourceId: string,
  now: string,
): RecordEntry {
  return {
    id: `record_${type}`,
    type,
    title,
    value,
    unit,
    date,
    sourceId,
    createdAt: now,
    updatedAt: now,
  };
}

function calculateStreakDays(data: SpiderData) {
  const activityDates = collectActivityDates(data);
  let streak = 0;
  const cursor = new Date();

  while (activityDates.has(toISODate(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  return streak;
}

function collectActivityDates(data: SpiderData) {
  const dates = new Set<string>();
  const add = (entry: { date: string }) => {
    if (entry.date) dates.add(entry.date);
  };

  data.workouts.forEach(add);
  data.runs.forEach(add);
  data.weight.forEach(add);
  data.measurements.forEach(add);
  data.nutrition.forEach(add);
  data.water.forEach(add);
  data.diary.forEach(add);
  data.missions.forEach(add);

  return dates;
}

function countWaterGoalDays(water: WaterEntry[], startISO: string, endISO: string, goalMl: number) {
  const buckets = new Map<string, number>();
  water
    .filter((entry) => isBetweenISO(entry.date, startISO, endISO))
    .forEach((entry) => {
      buckets.set(entry.date, (buckets.get(entry.date) ?? 0) + entry.amountMl);
    });

  return [...buckets.values()].filter((amount) => amount >= goalMl).length;
}

function uniqueDates(entries: Array<{ date: string }>) {
  return new Set(entries.map((entry) => entry.date).filter(Boolean));
}

function latestByDate<T extends { date: string }>(entries: T[]) {
  return [...entries].sort((a, b) => b.date.localeCompare(a.date))[0] ?? null;
}

function inferNextWorkout(workouts: WorkoutEntry[]) {
  const latestWorkout = latestByDate(workouts);
  if (!latestWorkout) return 'Primeiro treino';

  const nextByType: Record<string, string> = {
    Push: 'Pull',
    Pull: 'Legs',
    Legs: 'Push',
    Superior: 'Inferior',
    Inferior: 'Superior',
  };

  return nextByType[latestWorkout.type] ?? 'Treino livre';
}

function maxBy<T>(entries: T[], selector: (entry: T) => number) {
  return entries.reduce<T | null>((best, entry) => {
    if (!best) return entry;
    return selector(entry) > selector(best) ? entry : best;
  }, null);
}

function minBy<T>(entries: T[], selector: (entry: T) => number) {
  return entries.reduce<T | null>((best, entry) => {
    if (!best) return entry;
    return selector(entry) < selector(best) ? entry : best;
  }, null);
}

function toSafeNumber(value: unknown, fallback: number) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function toNonNegativeNumber(value: unknown, fallback: number) {
  return Math.max(0, toSafeNumber(value, fallback));
}

function toPositiveNumber(value: unknown, fallback: number) {
  return Math.max(1, toSafeNumber(value, fallback));
}
