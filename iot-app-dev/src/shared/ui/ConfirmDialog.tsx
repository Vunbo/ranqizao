import React from 'react';
import { motion } from 'motion/react';

export const ConfirmDialog = ({
  title,
  message,
  onConfirm,
  onCancel,
  confirmText = '确认',
}: {
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmText?: string;
}) => (
  <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 p-6 backdrop-blur-sm">
    <motion.div
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className="w-full max-w-xs space-y-6 rounded-[32px] bg-white p-6 shadow-2xl"
    >
      <div className="space-y-2 text-center">
        <h3 className="text-lg font-bold text-slate-900">{title}</h3>
        <div className="whitespace-pre-line text-sm leading-relaxed text-slate-500">
          {message}
        </div>
      </div>
      <div className="flex flex-col space-y-2">
        <button
          onClick={onConfirm}
          className="w-full rounded-xl bg-orange-500 py-3 font-bold text-white transition-transform active:scale-95"
        >
          {confirmText}
        </button>
        <button
          onClick={onCancel}
          className="w-full rounded-xl bg-slate-100 py-3 font-bold text-slate-600 transition-transform active:scale-95"
        >
          取消
        </button>
      </div>
    </motion.div>
  </div>
);
