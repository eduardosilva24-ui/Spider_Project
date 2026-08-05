import type { MealType, ModuleKey, SheetModule, SpiderSettings } from './types';

export const DEFAULT_API_URL =
  'https://script.google.com/macros/s/AKfycbwlCmNouFIy1GJeyZycaqIGM6HvKMc3QAPWC1CTbtyTc2EPQ36QDBDEFdAd_31RpzLKnw/exec';

export const DEFAULT_SETTINGS: SpiderSettings = {
  userName: 'Spider',
  targetWeightKg: 0,
  dailyWaterGoalMl: 2500,
  weeklyWorkoutGoal: 4,
  weeklyRunGoal: 2,
  xpWorkout: 100,
  xpRun: 120,
  xpNutrition: 20,
  xpWater: 10,
  xpWeight: 15,
  xpStreak: 50,
  xpMission: 30,
};

export const MODULE_TO_SHEET: Record<ModuleKey, SheetModule> = {
  dashboard: 'Dashboard',
  workouts: 'Treinos',
  runs: 'Corridas',
  weight: 'Peso',
  measurements: 'Medidas',
  nutrition: 'Nutrição',
  water: 'Água',
  diary: 'Diário',
  missions: 'Missões',
  records: 'Recordes',
  reports: 'Relatórios',
  settings: 'Configurações',
};

export const SHEET_TO_MODULE: Record<SheetModule, ModuleKey> = {
  Dashboard: 'dashboard',
  Treinos: 'workouts',
  Corridas: 'runs',
  Peso: 'weight',
  Medidas: 'measurements',
  Nutrição: 'nutrition',
  Água: 'water',
  Diário: 'diary',
  Missões: 'missions',
  Recordes: 'records',
  Relatórios: 'reports',
  Configurações: 'settings',
};

export const MEAL_TYPES: MealType[] = [
  'Café da manhã',
  'Almoço',
  'Lanche',
  'Jantar',
  'Ceia',
  'Outro',
];

export const EMPTY_DATA = {
  dashboard: [],
  workouts: [],
  runs: [],
  weight: [],
  measurements: [],
  nutrition: [],
  water: [],
  diary: [],
  missions: [],
  records: [],
  reports: [],
};
