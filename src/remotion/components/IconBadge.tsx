import React from 'react';
import {
  Activity,
  AlertTriangle,
  Award,
  BarChart3,
  Brain,
  Bug,
  CheckCircle2,
  Clock,
  Code2,
  Cpu,
  Database,
  DollarSign,
  Flame,
  Gauge,
  Globe,
  Layers,
  Lock,
  Rocket,
  Server,
  ShieldAlert,
  Sparkles,
  Terminal,
  TrendingUp,
  Zap,
  type LucideProps,
} from 'lucide-react';

const ICON_MAP: Record<string, React.ComponentType<LucideProps>> = {
  zap: Zap,
  cpu: Cpu,
  flame: Flame,
  alert: AlertTriangle,
  alerttriangle: AlertTriangle,
  'alert-triangle': AlertTriangle,
  trending: TrendingUp,
  trendingup: TrendingUp,
  'trending-up': TrendingUp,
  check: CheckCircle2,
  checkcircle2: CheckCircle2,
  'check-circle-2': CheckCircle2,
  sparkles: Sparkles,
  server: Server,
  clock: Clock,
  shield: ShieldAlert,
  shieldalert: ShieldAlert,
  'shield-alert': ShieldAlert,
  rocket: Rocket,
  terminal: Terminal,
  gauge: Gauge,
  layers: Layers,
  brain: Brain,
  chart: BarChart3,
  barchart3: BarChart3,
  'bar-chart-3': BarChart3,
  award: Award,
  activity: Activity,
  bug: Bug,
  code2: Code2,
  'code-2': Code2,
  database: Database,
  dollarsign: DollarSign,
  'dollar-sign': DollarSign,
  globe: Globe,
  lock: Lock,
};

export const ALLOWED_LUCIDE_ICONS = [
  'Zap',
  'Cpu',
  'Flame',
  'AlertTriangle',
  'TrendingUp',
  'CheckCircle2',
  'Sparkles',
  'Server',
  'Clock',
  'ShieldAlert',
  'Rocket',
  'Terminal',
  'Gauge',
  'Layers',
  'Brain',
  'BarChart3',
  'Award',
  'Activity',
  'Bug',
  'Code2',
  'Database',
  'DollarSign',
  'Globe',
  'Lock',
] as const;

export interface DynamicIconProps extends LucideProps {
  name?: string;
}

export const DynamicIcon: React.FC<DynamicIconProps> = ({
  name = 'Sparkles',
  ...props
}) => {
  const normalized = name.toLowerCase().trim();
  const IconComponent = ICON_MAP[normalized] ?? Sparkles;
  return <IconComponent {...props} />;
};
