import React from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Flame, Loader2, Power } from 'lucide-react';
import { cn } from '../../../shared/lib/utils';
import { Card } from '../../../shared/ui/Card';
import { FIRE_LEVEL_STEPS, getFlameColor, getFlameScale } from './constants';

export const DeviceControlCard = ({
  displayIsOn,
  displayFireLevel,
  isPending,
  onFireLevelChange,
  onToggle,
}: {
  displayIsOn: boolean;
  displayFireLevel: number;
  isPending: boolean;
  onFireLevelChange: (level: number) => void;
  onToggle: () => void;
}) => (
  <Card className="relative overflow-hidden border-0 bg-[#151619] py-10 text-white shadow-2xl">
    <div
      className="pointer-events-none absolute inset-0 opacity-5"
      style={{
        backgroundImage: 'radial-gradient(#fff 1px, transparent 1px)',
        backgroundSize: '20px 20px',
      }}
    />

    <div className="relative z-10 flex flex-col items-center justify-center space-y-10">
      <div className="flex items-center space-x-2 rounded-full border border-white/10 bg-white/5 px-3 py-1">
        <div
          className={cn(
            'h-1.5 w-1.5 rounded-full',
            displayIsOn ? 'bg-emerald-500 animate-pulse' : 'bg-slate-500'
          )}
        />
        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
          {displayIsOn ? '系统运行中' : '系统待机中'}
        </span>
      </div>

      <div className="relative flex items-center justify-center">
        <div className="flex h-56 w-56 items-center justify-center rounded-full border border-dashed border-white/10">
          <div className="flex h-48 w-48 items-center justify-center rounded-full border-2 border-white/5">
            <AnimatePresence>
              {displayIsOn && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.5 }}
                  className={cn(
                    'absolute inset-0 rounded-full opacity-20 blur-3xl transition-colors duration-500',
                    displayFireLevel <= 30
                      ? 'bg-blue-500'
                      : displayFireLevel <= 60
                      ? 'bg-orange-500'
                      : 'bg-rose-500'
                  )}
                />
              )}
            </AnimatePresence>

            <motion.div
              animate={{
                scale: displayIsOn ? getFlameScale(displayFireLevel) : 0.8,
                opacity: displayIsOn ? 1 : 0.3,
              }}
              transition={{ type: 'spring', stiffness: 100 }}
              className={cn(
                'transition-colors duration-500',
                displayIsOn ? getFlameColor(displayFireLevel) : 'text-slate-700'
              )}
            >
              <Flame size={80} fill="currentColor" />
            </motion.div>
          </div>
        </div>

        <svg className="pointer-events-none absolute h-64 w-64 -rotate-90 transform">
          <circle
            cx="128"
            cy="128"
            r="110"
            stroke="currentColor"
            strokeWidth="4"
            fill="transparent"
            className="text-white/5"
          />
          <motion.circle
            cx="128"
            cy="128"
            r="110"
            stroke="currentColor"
            strokeWidth="4"
            fill="transparent"
            strokeDasharray={691}
            initial={{ strokeDashoffset: 691 }}
            animate={{
              strokeDashoffset:
                691 - (691 * (displayIsOn ? displayFireLevel : 0)) / 100,
            }}
            className={cn(
              'transition-colors duration-500',
              displayIsOn
                ? getFlameColor(displayFireLevel).replace('text-', 'stroke-')
                : 'stroke-slate-800'
            )}
          />
        </svg>

        <div className="absolute -bottom-4 rounded-lg border border-white/10 bg-[#151619] px-4 py-1">
          <span className="font-mono text-2xl font-bold tracking-tighter">
            {displayIsOn ? displayFireLevel : '00'}
            <span className="ml-1 text-xs text-slate-500">%</span>
          </span>
        </div>
      </div>

      <div className="w-full space-y-8 px-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
              火力调节
            </span>
            <span className="font-mono text-[10px] text-slate-400">
              步进：20%
            </span>
          </div>
          <div className="flex items-center space-x-2">
            {FIRE_LEVEL_STEPS.map((level) => (
              <button
                key={level}
                onClick={() => onFireLevelChange(level)}
                disabled={!displayIsOn || isPending}
                className={cn(
                  'flex h-12 flex-1 flex-col items-center justify-center space-y-1 rounded-xl border transition-all duration-300',
                  !displayIsOn || isPending
                    ? 'cursor-not-allowed border-white/5 bg-white/5 opacity-50'
                    : displayFireLevel === level
                    ? 'border-orange-400 bg-orange-500 shadow-[0_0_15px_rgba(249,115,22,0.3)]'
                    : 'border-white/10 bg-white/5 hover:bg-white/10'
                )}
              >
                <span className="text-xs font-bold">{level}%</span>
                <div
                  className={cn(
                    'h-1 w-1 rounded-full',
                    displayFireLevel >= level && displayIsOn
                      ? 'bg-white'
                      : 'bg-white/20'
                  )}
                />
              </button>
            ))}
          </div>
        </div>

        <div className="flex justify-center">
          <button
            onClick={onToggle}
            disabled={isPending}
            className={cn(
              'group relative flex h-20 w-20 items-center justify-center rounded-full transition-all duration-500',
              isPending
                ? 'cursor-not-allowed bg-slate-800'
                : displayIsOn
                ? 'scale-110 bg-rose-500 shadow-[0_0_30px_rgba(244,63,94,0.4)]'
                : 'border border-white/10 bg-white/5 hover:bg-white/10'
            )}
          >
            {isPending ? (
              <Loader2 className="animate-spin text-slate-400" size={32} />
            ) : (
              <Power
                size={32}
                className={cn(
                  'transition-colors',
                  displayIsOn
                    ? 'text-white'
                    : 'text-slate-500 group-hover:text-slate-300'
                )}
              />
            )}
            {displayIsOn && !isPending && (
              <motion.div
                aria-hidden="true"
                animate={{
                  scale: [1, 1.08, 1.42],
                  opacity: [0, 0.2, 0],
                }}
                transition={{
                  duration: 2.1,
                  ease: 'easeOut',
                  repeat: Infinity,
                  times: [0, 0.18, 1],
                }}
                className="pointer-events-none absolute inset-0 -z-10 rounded-full bg-rose-500"
              />
            )}
          </button>
        </div>
      </div>
    </div>
  </Card>
);
