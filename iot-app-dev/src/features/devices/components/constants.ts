import { Droplets, Flame, Thermometer, Zap, type LucideIcon } from 'lucide-react';

export const FIRE_LEVEL_STEPS = [20, 40, 60, 80, 100];

export interface CookingMode {
  title: string;
  desc: string;
  icon: LucideIcon;
  color: string;
  bg: string;
  level: number;
}

export const COOKING_MODES: CookingMode[] = [
  {
    title: '爆炒模式',
    desc: '大火快炒，适合锁住食材鲜香',
    icon: Flame,
    color: 'text-orange-500',
    bg: 'bg-orange-50',
    level: 100,
  },
  {
    title: '文火慢炖',
    desc: '恒温细煮，适合长时间炖煮',
    icon: Thermometer,
    color: 'text-blue-500',
    bg: 'bg-blue-50',
    level: 20,
  },
  {
    title: '蒸煮模式',
    desc: '中高火稳定输出，适合蒸煮类烹饪',
    icon: Droplets,
    color: 'text-cyan-500',
    bg: 'bg-cyan-50',
    level: 60,
  },
  {
    title: '一键煎炸',
    desc: '精准控温，减少焦糊风险',
    icon: Zap,
    color: 'text-amber-500',
    bg: 'bg-amber-50',
    level: 80,
  },
];

export function getFlameColor(level: number) {
  if (level <= 30) return 'text-blue-400';
  if (level <= 60) return 'text-orange-400';
  return 'text-rose-500';
}

export function getFlameScale(level: number) {
  return 0.8 + (level / 100) * 0.7;
}
