import React from 'react';
import {
  Flame,
  Home as HomeIcon,
  Minus,
  Plus,
  User,
  type LucideIcon,
} from 'lucide-react';
import { Card } from '../../../shared/ui/Card';

const accentStyles = {
  blue: {
    badge: 'bg-blue-50 text-blue-500',
    iconWrap: 'bg-blue-50 text-blue-500',
  },
  orange: {
    badge: 'bg-slate-50 text-slate-400',
    iconWrap: 'bg-orange-50 text-orange-500',
  },
} as const;

export const OwnedShareCard = ({
  title,
  memberIds,
  ownerLabel,
  icon: Icon,
  accent,
  onAdd,
  onRemove,
}: {
  title: string;
  memberIds: string[];
  ownerLabel: string;
  icon: LucideIcon;
  accent: keyof typeof accentStyles;
  onAdd: () => void;
  onRemove: () => void;
}) => {
  const styles = accentStyles[accent];

  return (
    <Card className="space-y-4 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className={`rounded-xl p-2 ${styles.iconWrap}`}>
            <Icon size={18} />
          </div>
          <span className="text-sm font-bold">{title}</span>
        </div>
        <span
          className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${styles.badge}`}
        >
          {memberIds.length} 位成员
        </span>
      </div>

      <div className="grid grid-cols-4 gap-4 border-t border-slate-50 pt-2">
        <div className="flex flex-col items-center space-y-1">
          <div className="relative">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-100 text-orange-600">
              <User size={24} />
            </div>
            <div className="absolute -right-2 -top-2 rounded-lg bg-blue-500 px-1.5 py-0.5 text-[8px] font-bold text-white shadow-sm">
              创建者
            </div>
          </div>
          <span className="w-full truncate text-center font-mono text-[10px] text-slate-500">
            {ownerLabel}
          </span>
        </div>

        {memberIds.map((uid) => (
          <div
            key={uid}
            className="group relative flex flex-col items-center space-y-1"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
              <User size={24} />
            </div>
            <span className="w-full truncate text-center font-mono text-[10px] text-slate-500">
              {uid.slice(0, 8)}
            </span>
          </div>
        ))}

        <button onClick={onAdd} className="group flex flex-col items-center space-y-1">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 text-slate-300 transition-colors group-hover:border-orange-200 group-hover:text-orange-300">
            <Plus size={20} />
          </div>
          <span className="text-[10px] text-slate-400">添加</span>
        </button>

        <button
          onClick={onRemove}
          className="group flex flex-col items-center space-y-1"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 text-slate-300 transition-colors group-hover:border-rose-200 group-hover:text-rose-300">
            <Minus size={20} />
          </div>
          <span className="text-[10px] text-slate-400">移除</span>
        </button>
      </div>
    </Card>
  );
};

export const HomeShareCardIcon = HomeIcon;
export const DeviceShareCardIcon = Flame;
