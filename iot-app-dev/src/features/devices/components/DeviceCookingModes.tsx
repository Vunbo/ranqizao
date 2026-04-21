import React from 'react';
import { motion } from 'motion/react';
import { CheckCircle2 } from 'lucide-react';
import { cn } from '../../../shared/lib/utils';
import { COOKING_MODES } from './constants';

export const DeviceCookingModes = ({
  displayIsOn,
  displayFireLevel,
  isPending,
  onFireLevelChange,
}: {
  displayIsOn: boolean;
  displayFireLevel: number;
  isPending: boolean;
  onFireLevelChange: (level: number) => void;
}) => (
  <div className="space-y-3">
    <h3 className="px-1 text-sm font-bold text-slate-900">智能烹饪模式</h3>
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {COOKING_MODES.map((mode) => {
        const isActive = displayIsOn && displayFireLevel === mode.level;

        return (
          <button
            key={mode.title}
            disabled={!displayIsOn || isPending}
            onClick={() => onFireLevelChange(mode.level)}
            className={cn(
              'relative flex flex-col items-start space-y-2 overflow-hidden rounded-2xl border p-3 text-left transition-all duration-300',
              isActive
                ? 'scale-[1.02] border-orange-200 bg-white shadow-md'
                : 'border-slate-50 bg-white hover:border-slate-200 active:scale-95',
              (!displayIsOn || isPending) && 'cursor-not-allowed opacity-50'
            )}
          >
            {isActive && (
              <motion.div
                layoutId="active-mode-glow"
                className="pointer-events-none absolute inset-0 bg-gradient-to-br from-orange-500/5 to-transparent"
              />
            )}
            <div
              className={cn(
                'rounded-lg p-2 transition-colors',
                isActive ? mode.bg : 'bg-slate-50',
                mode.color
              )}
            >
              <mode.icon size={20} />
            </div>
            <div className="relative z-10">
              <div className="flex items-center space-x-1">
                <p className="text-xs font-bold text-slate-900">{mode.title}</p>
                {isActive && (
                  <div className="flex space-x-0.5">
                    <motion.div
                      animate={{ height: [4, 8, 4] }}
                      transition={{ repeat: Infinity, duration: 0.6 }}
                      className="w-0.5 rounded-full bg-orange-500"
                    />
                    <motion.div
                      animate={{ height: [8, 4, 8] }}
                      transition={{ repeat: Infinity, duration: 0.6, delay: 0.2 }}
                      className="w-0.5 rounded-full bg-orange-500"
                    />
                    <motion.div
                      animate={{ height: [4, 8, 4] }}
                      transition={{ repeat: Infinity, duration: 0.6, delay: 0.4 }}
                      className="w-0.5 rounded-full bg-orange-500"
                    />
                  </div>
                )}
              </div>
              <p className="text-[10px] leading-tight text-slate-400">
                {mode.desc}
              </p>
            </div>

            {isActive && (
              <div className="absolute right-2 top-2">
                <CheckCircle2 size={14} className="text-orange-500" />
              </div>
            )}
          </button>
        );
      })}
    </div>
  </div>
);
