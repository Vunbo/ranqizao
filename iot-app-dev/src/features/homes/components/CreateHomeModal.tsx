import React from 'react';
import { motion } from 'motion/react';

export const CreateHomeModal = ({
  isOpen,
  value,
  onChange,
  onClose,
  onConfirm,
}: {
  isOpen: boolean;
  value: string;
  onChange: (value: string) => void;
  onClose: () => void;
  onConfirm: () => void;
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/60 p-6 backdrop-blur-sm">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="w-full max-w-xs space-y-6 rounded-[32px] bg-white p-6"
      >
        <div className="space-y-2 text-center">
          <h3 className="text-lg font-bold">新建家庭</h3>
          <p className="text-xs text-slate-500">为您的家庭起一个温馨的名称</p>
        </div>
        <input
          type="text"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="例如：幸福小家"
          className="w-full rounded-2xl bg-slate-50 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20"
        />
        <div className="flex space-x-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 text-sm font-bold text-slate-500"
          >
            取消
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 rounded-2xl bg-orange-500 py-3 text-sm font-bold text-white shadow-lg shadow-orange-500/30"
          >
            创建
          </button>
        </div>
      </motion.div>
    </div>
  );
};
