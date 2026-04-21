import React from 'react';
import { motion } from 'motion/react';
import { Flame, ShieldCheck, User } from 'lucide-react';
import { cn } from '../lib/utils';
import { Tab } from '../types';

const tabs: { id: Tab; label: string; icon: typeof Flame }[] = [
  { id: 'home', icon: Flame, label: '首页' },
  { id: 'safety', icon: ShieldCheck, label: '安全' },
  { id: 'profile', icon: User, label: '我的' },
];

export const BottomNavigation = ({
  activeTab,
  onChange,
}: {
  activeTab: Tab;
  onChange: (tab: Tab) => void;
}) => (
  <motion.div
    initial={{ y: 100, opacity: 0 }}
    animate={{ y: 0, opacity: 1 }}
    exit={{ y: 100, opacity: 0 }}
    className="fixed bottom-8 left-1/2 z-40 flex h-16 w-[calc(100%-48px)] max-w-lg -translate-x-1/2 items-center justify-between rounded-full border border-slate-200/50 bg-white/90 px-8 shadow-[0_12px_40px_rgba(0,0,0,0.12)] backdrop-blur-xl"
  >
    {tabs.map((tab) => (
      <button
        key={tab.id}
        onClick={() => onChange(tab.id)}
        className={cn(
          'relative flex flex-col items-center space-y-0.5 rounded-full px-4 py-1 transition-all',
          activeTab === tab.id ? 'text-orange-500' : 'text-slate-400'
        )}
      >
        <motion.div
          animate={
            activeTab === tab.id ? { y: -2, scale: 1.1 } : { y: 0, scale: 1 }
          }
          className="relative z-10"
        >
          <tab.icon size={20} strokeWidth={activeTab === tab.id ? 2.5 : 2} />
        </motion.div>
        <span className="z-10 text-[10px] font-bold">{tab.label}</span>

        {activeTab === tab.id && (
          <motion.div
            layoutId="activeTabGlow"
            className="absolute inset-0 -z-0 rounded-full bg-orange-50"
            initial={false}
            transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
          />
        )}

        {activeTab === tab.id && (
          <motion.div
            layoutId="activeTabDot"
            className="absolute -bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-orange-500"
            initial={false}
          />
        )}
      </button>
    ))}
  </motion.div>
);
