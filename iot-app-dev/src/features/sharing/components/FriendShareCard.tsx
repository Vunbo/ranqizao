import React from 'react';
import { type LucideIcon } from 'lucide-react';
import { Card } from '../../../shared/ui/Card';

const accentStyles = {
  blue: {
    badge: 'bg-blue-50 text-blue-500',
    iconWrap: 'bg-blue-50 text-blue-500',
    badgeText: '已加入',
  },
  orange: {
    badge: 'bg-orange-50 text-orange-500',
    iconWrap: 'bg-orange-50 text-orange-500',
    badgeText: '已共享',
  },
} as const;

export const FriendShareCard = ({
  title,
  ownerId,
  icon: Icon,
  accent,
}: {
  title: string;
  ownerId: string;
  icon: LucideIcon;
  accent: keyof typeof accentStyles;
}) => {
  const styles = accentStyles[accent];

  return (
    <Card className="space-y-3 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className={`rounded-xl p-2 ${styles.iconWrap}`}>
            <Icon size={18} />
          </div>
          <div>
            <p className="text-sm font-bold">{title}</p>
            <p className="text-[10px] text-slate-400">
              所有者：{ownerId.slice(0, 8)}...
            </p>
          </div>
        </div>
        <span
          className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${styles.badge}`}
        >
          {styles.badgeText}
        </span>
      </div>
    </Card>
  );
};
