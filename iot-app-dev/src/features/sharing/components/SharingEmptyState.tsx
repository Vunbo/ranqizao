import React from 'react';
import { type LucideIcon } from 'lucide-react';

export const SharingEmptyState = ({
  icon: Icon,
  message
}: {
  icon: LucideIcon;
  message: string;
}) => (
  <div className="text-center py-12 space-y-3">
    <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto text-slate-200">
      <Icon size={32} />
    </div>
    <p className="text-xs text-slate-400">{message}</p>
  </div>
);
