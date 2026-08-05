import { DEFAULT_SETTINGS } from './constants';
import { todayISO } from './date';
import { createId } from './ids';
import type {
  DiaryEntry,
  MeasurementEntry,
  MissionEntry,
  NutritionEntry,
  ReportEntry,
  RunEntry,
  SpiderSettings,
  WaterEntry,
  WeightEntry,
  WorkoutEntry,
  WorkoutExercise,
} from './types';

export function timestamp() {
  return new Date().toISOString();
}

export function createExercise(overrides: Partial<WorkoutExercise> = {}): WorkoutExercise {
  return {
    id: createId('exercise'),
    name: '',
    sets: 3,
    reps: 10,
    loadKg: 0,
    durationSeconds: 0,
    notes: '',
    ...overrides,
  };
}

export function createWorkout(overrides: Partial<WorkoutEntry> = {}): WorkoutEntry {
  const now = timestamp();
  return {
    id: createId('workout'),
    date: todayISO(),
    type: 'Push',
    durationMinutes: 60,
    exercises: [createExercise()],
    notes: '',
    status: 'Concluído',
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

export function createRun(overrides: Partial<RunEntry> = {}): RunEntry {
  const now = timestamp();
  return {
    id: createId('run'),
    date: todayISO(),
    distanceKm: 5,
    durationMinutes: 30,
    pace: '',
    elevationM: 0,
    location: '',
    temperatureC: 0,
    feeling: 'Boa',
    notes: '',
    stravaUrl: '',
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

export function createWeight(overrides: Partial<WeightEntry> = {}): WeightEntry {
  const now = timestamp();
  return {
    id: createId('weight'),
    date: todayISO(),
    weightKg: 0,
    notes: '',
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

export function createMeasurement(overrides: Partial<MeasurementEntry> = {}): MeasurementEntry {
  const now = timestamp();
  return {
    id: createId('measure'),
    date: todayISO(),
    leftArmCm: 0,
    rightArmCm: 0,
    chestCm: 0,
    waistCm: 0,
    hipCm: 0,
    thighCm: 0,
    calfCm: 0,
    neckCm: 0,
    forearmCm: 0,
    notes: '',
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

export function createNutrition(overrides: Partial<NutritionEntry> = {}): NutritionEntry {
  const now = timestamp();
  return {
    id: createId('meal'),
    date: todayISO(),
    time: currentTime(),
    type: 'Almoço',
    foods: [{ id: createId('food'), name: '', quantity: 100, unit: 'g' }],
    notes: '',
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

export function createWater(amountMl = 250, overrides: Partial<WaterEntry> = {}): WaterEntry {
  const now = timestamp();
  return {
    id: createId('water'),
    date: todayISO(),
    amountMl,
    notes: '',
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

export function createDiary(overrides: Partial<DiaryEntry> = {}): DiaryEntry {
  const now = timestamp();
  return {
    id: createId('diary'),
    date: todayISO(),
    text: '',
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

export function createMission(title: string, key: string, xp: number, notes = ''): MissionEntry {
  const now = timestamp();
  return {
    id: `${key}_${todayISO()}`,
    date: todayISO(),
    key,
    title,
    xp,
    status: 'Concluída',
    completedAt: now,
    notes,
    createdAt: now,
    updatedAt: now,
  };
}

export function createReport(overrides: Partial<ReportEntry> = {}): ReportEntry {
  const now = timestamp();
  const today = new Date();
  return {
    id: createId('report'),
    title: '',
    week: '',
    month: String(today.getMonth() + 1).padStart(2, '0'),
    year: String(today.getFullYear()),
    markdown: '',
    tags: [],
    driveUrl: '',
    notes: '',
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

export function createSettings(overrides: Partial<SpiderSettings> = {}): SpiderSettings {
  return {
    ...DEFAULT_SETTINGS,
    ...overrides,
  };
}

export function touch<T extends { updatedAt: string }>(record: T): T {
  return { ...record, updatedAt: timestamp() };
}

function currentTime() {
  const date = new Date();
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}
