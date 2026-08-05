import type { ReactNode } from 'react';
import {
  Activity,
  BarChart3,
  BookOpenText,
  Dumbbell,
  Droplets,
  FileJson,
  FileText,
  Flag,
  Gauge,
  LineChart,
  Medal,
  Ruler,
  Scale,
  Settings,
  Utensils,
} from 'lucide-react';

export type ViewKey =
  | 'dashboard'
  | 'workouts'
  | 'runs'
  | 'weight'
  | 'measurements'
  | 'nutrition'
  | 'water'
  | 'diary'
  | 'missions'
  | 'stats'
  | 'timeline'
  | 'records'
  | 'reports'
  | 'export'
  | 'settings';

export const NAV_ITEMS: Array<{
  key: ViewKey;
  label: string;
  icon: ReactNode;
}> = [
  { key: 'dashboard', label: 'Dashboard', icon: <Gauge className="h-4 w-4" /> },
  { key: 'workouts', label: 'Treinos', icon: <Dumbbell className="h-4 w-4" /> },
  { key: 'runs', label: 'Corridas', icon: <Activity className="h-4 w-4" /> },
  { key: 'weight', label: 'Peso', icon: <Scale className="h-4 w-4" /> },
  { key: 'measurements', label: 'Medidas', icon: <Ruler className="h-4 w-4" /> },
  { key: 'nutrition', label: 'Nutrição', icon: <Utensils className="h-4 w-4" /> },
  { key: 'water', label: 'Água', icon: <Droplets className="h-4 w-4" /> },
  { key: 'diary', label: 'Diário', icon: <BookOpenText className="h-4 w-4" /> },
  { key: 'missions', label: 'Missões', icon: <Flag className="h-4 w-4" /> },
  { key: 'stats', label: 'Estatísticas', icon: <BarChart3 className="h-4 w-4" /> },
  { key: 'timeline', label: 'Linha do Tempo', icon: <LineChart className="h-4 w-4" /> },
  { key: 'records', label: 'Recordes', icon: <Medal className="h-4 w-4" /> },
  { key: 'reports', label: 'Relatórios', icon: <FileText className="h-4 w-4" /> },
  { key: 'export', label: 'Exportação', icon: <FileJson className="h-4 w-4" /> },
  { key: 'settings', label: 'Configurações', icon: <Settings className="h-4 w-4" /> },
];
