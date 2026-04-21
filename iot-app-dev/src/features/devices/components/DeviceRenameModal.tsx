import React from 'react';
import { motion } from 'motion/react';
import { Loader2 } from 'lucide-react';

export const DeviceRenameModal = ({
  isOpen,
  value,
  isPending,
  onChange,
  onClose,
  onConfirm,
}: {
  isOpen: boolean;
  value: string;
  isPending: boolean;
  onChange: (value: string) => void;
  onClose: () => void;
  onConfirm: () => void;
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 p-6 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="w-full max-w-sm space-y-6 rounded-3xl bg-white p-6 shadow-2xl"
      >
        <div className="space-y-2">
          <h3 className="text-xl font-bold text-slate-900">重命名设备</h3>
          <p className="text-sm text-slate-500">请输入设备的新名称</p>
        </div>

        <div className="space-y-4">
          <input
            type="text"
            value={value}
            onChange={(event) => onChange(event.target.value)}
            placeholder="例如：厨房主灶"
            className="w-full rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm font-medium transition-all focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
            autoFocus
          />

          <div className="flex space-x-3">
            <button
              onClick={onClose}
              className="flex-1 rounded-2xl py-3 text-sm font-bold text-slate-500 transition-colors hover:bg-slate-50"
            >
              取消
            </button>
            <button
              onClick={onConfirm}
              disabled={!value.trim() || isPending}
              className="flex-1 rounded-2xl bg-orange-500 py-3 text-sm font-bold text-white shadow-lg shadow-orange-500/20 transition-all active:scale-95 disabled:opacity-50"
            >
              {isPending ? (
                <Loader2 className="mx-auto animate-spin" size={18} />
              ) : (
                '确认修改'
              )}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
