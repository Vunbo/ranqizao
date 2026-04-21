import React from 'react';
import { motion } from 'motion/react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';
import { cn } from '../lib/utils';

export const Toast = ({ message, type, onClose }: { message: string, type: 'info' | 'error' | 'success', onClose: () => void }) => (
  <motion.div 
    initial={{ opacity: 0, y: -20 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -20 }}
    className={cn(
      "fixed top-6 left-1/2 -translate-x-1/2 z-[200] px-4 py-3 rounded-2xl shadow-xl flex items-center space-x-3 min-w-[280px]",
      type === 'success' ? "bg-emerald-500 text-white" : 
      type === 'error' ? "bg-rose-500 text-white" : "bg-slate-800 text-white"
    )}
  >
    {type === 'success' ? <CheckCircle2 size={20} /> : 
     type === 'error' ? <AlertCircle size={20} /> : <Info size={20} />}
    <span className="text-sm font-bold flex-1">{message}</span>
    <button onClick={onClose} className="p-1 hover:bg-white/20 rounded-lg transition-colors">
      <X size={16} />
    </button>
  </motion.div>
);
