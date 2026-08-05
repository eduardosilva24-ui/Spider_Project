export type ModuleKey =
  | 'dashboard'
  | 'workouts'
  | 'runs'
  | 'weight'
  | 'measurements'
  | 'nutrition'
  | 'water'
  | 'diary'
  | 'missions'
  | 'records'
  | 'reports'
  | 'settings';

export type SheetModule =
  | 'Dashboard'
  | 'Treinos'
  | 'Corridas'
  | 'Peso'
  | 'Medidas'
  | 'Nutrição'
  | 'Água'
  | 'Diário'
  | 'Missões'
  | 'Recordes'
  | 'Relatórios'
  | 'Configurações';

export type RecordStatus = 'Planejado' | 'Concluído' | 'Parcial' | 'Pausado';

export interface BaseRecord {
  id: string;
  createdAt: string;
  updatedAt: string;
}

export interface WorkoutExercise {
  id: string;
  name: string;
  sets: number;
  reps: number;
  loadKg: number;
  durationSeconds: number;
  notes: string;
}

export interface WorkoutEntry extends BaseRecord {
  date: string;
  type: string;
  durationMinutes: number;
  exercises: WorkoutExercise[];
  notes: string;
  status: RecordStatus;
}

export interface RunEntry extends BaseRecord {
  date: string;
  distanceKm: number;
  durationMinutes: number;
  pace: string;
  elevationM: number;
  location: string;
  temperatureC: number;
  feeling: string;
  notes: string;
  stravaUrl: string;
}

export interface WeightEntry extends BaseRecord {
  date: string;
  weightKg: number;
  notes: string;
}

export interface MeasurementEntry extends BaseRecord {
  date: string;
  leftArmCm: number;
  rightArmCm: number;
  chestCm: number;
  waistCm: number;
  hipCm: number;
  thighCm: number;
  calfCm: number;
  neckCm: number;
  forearmCm: number;
  notes: string;
}

export type MealType = 'Café da manhã' | 'Almoço' | 'Lanche' | 'Jantar' | 'Ceia' | 'Outro';

export interface FoodItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
}

export interface NutritionEntry extends BaseRecord {
  date: string;
  time: string;
  type: MealType;
  foods: FoodItem[];
  notes: string;
}

export interface WaterEntry extends BaseRecord {
  date: string;
  amountMl: number;
  notes: string;
}

export interface DiaryEntry extends BaseRecord {
  date: string;
  text: string;
}

export interface MissionEntry extends BaseRecord {
  date: string;
  key: string;
  title: string;
  xp: number;
  status: 'Concluída';
  completedAt: string;
  notes: string;
}

export interface RecordEntry extends BaseRecord {
  type: string;
  title: string;
  value: number;
  unit: string;
  date: string;
  sourceId: string;
}

export interface ReportEntry extends BaseRecord {
  title: string;
  week: string;
  month: string;
  year: string;
  markdown: string;
  tags: string[];
  driveUrl: string;
  notes: string;
}

export interface DashboardMetric {
  key: string;
  value: string;
  updatedAt: string;
}

export interface SpiderSettings {
  userName: string;
  targetWeightKg: number;
  dailyWaterGoalMl: number;
  weeklyWorkoutGoal: number;
  weeklyRunGoal: number;
  xpWorkout: number;
  xpRun: number;
  xpNutrition: number;
  xpWater: number;
  xpWeight: number;
  xpStreak: number;
  xpMission: number;
}

export interface SpiderData {
  dashboard: DashboardMetric[];
  workouts: WorkoutEntry[];
  runs: RunEntry[];
  weight: WeightEntry[];
  measurements: MeasurementEntry[];
  nutrition: NutritionEntry[];
  water: WaterEntry[];
  diary: DiaryEntry[];
  missions: MissionEntry[];
  records: RecordEntry[];
  reports: ReportEntry[];
  settings: SpiderSettings;
  spreadsheetUrl: string;
  lastSyncedAt: string;
}

export interface SpiderSummary {
  spiderScore: number;
  previousSpiderScore: number;
  totalXp: number;
  level: number;
  xpIntoLevel: number;
  xpForNextLevel: number;
  streakDays: number;
  workoutsThisWeek: number;
  runsThisWeek: number;
  currentWeight: number | null;
  targetWeight: number | null;
  lastRun: RunEntry | null;
  nextWorkoutLabel: string;
  todayWaterMl: number;
  todayWaterPercent: number;
  nutritionDaysThisWeek: number;
  weightFresh: boolean;
}

export interface WeekExport {
  weekStart: string;
  weekEnd: string;
  generatedAt: string;
  summary: SpiderSummary;
  workouts: WorkoutEntry[];
  runs: RunEntry[];
  weight: WeightEntry[];
  measurements: MeasurementEntry[];
  nutrition: NutritionEntry[];
  water: WaterEntry[];
  missions: MissionEntry[];
  spiderScore: number;
  xp: number;
  records: RecordEntry[];
  diary: DiaryEntry[];
}
