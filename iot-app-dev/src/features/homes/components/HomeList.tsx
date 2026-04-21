import React from 'react';
import { ChevronRight, Home as HomeIcon } from 'lucide-react';
import { Home } from '../../../shared/types';
import { Card } from '../../../shared/ui/Card';

export const HomeList = ({
  homes,
  onSelect,
}: {
  homes: Home[];
  onSelect: (id: string) => void;
}) => (
  <div className="space-y-4">
    {homes.map((home) => (
      <Card
        key={home.id}
        className="cursor-pointer p-4 transition-all hover:border-orange-200 active:scale-[0.98]"
        onClick={() => onSelect(home.id)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="rounded-xl bg-blue-50 p-2 text-blue-500">
              <HomeIcon size={20} />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900">{home.name}</p>
              <p className="text-[10px] text-slate-400">
                {home.members?.length || 0} 位成员 · {home.deviceIds?.length || 0}{' '}
                台设备
              </p>
            </div>
          </div>
          <ChevronRight size={18} className="text-slate-300" />
        </div>
      </Card>
    ))}
  </div>
);
