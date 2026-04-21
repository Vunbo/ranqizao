import React from 'react';
import { cn } from '../lib/utils';

export const Card = ({ children, className, ...props }: { children: React.ReactNode; className?: string; [key: string]: any }) => (
  <div className={cn("bg-white rounded-2xl p-4 shadow-sm border border-slate-100", className)} {...props}>
    {children}
  </div>
);
