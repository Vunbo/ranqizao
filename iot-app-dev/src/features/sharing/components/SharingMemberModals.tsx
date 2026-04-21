import React from 'react';
import { motion } from 'motion/react';
import { Check, User } from 'lucide-react';
import { cn } from '../../../shared/lib/utils';
import { ShareResourceTarget } from './types';

export const AddMemberModal = ({
  isOpen,
  memberUidInput,
  onInputChange,
  onClose,
  onConfirm,
}: {
  isOpen: boolean;
  memberUidInput: string;
  onInputChange: (value: string) => void;
  onClose: () => void;
  onConfirm: () => void;
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/60 p-6 backdrop-blur-sm">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="w-full max-w-sm space-y-6 rounded-[32px] bg-white p-6"
      >
        <div className="space-y-2 text-center">
          <h3 className="text-lg font-bold">添加成员</h3>
          <p className="text-xs text-slate-500">
            请输入对方的 UID，确认后立即建立共享关系
          </p>
        </div>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="ml-1 text-[10px] font-bold text-slate-400">
              成员 UID
            </label>
            <input
              type="text"
              value={memberUidInput}
              onChange={(event) => onInputChange(event.target.value)}
              placeholder="输入 8 位 UID"
              className="w-full rounded-2xl bg-slate-50 px-4 py-3 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20"
            />
          </div>

          <div className="rounded-xl border border-blue-100 bg-blue-50 p-3">
            <p className="text-[10px] leading-relaxed text-blue-600">
              你可以在“我的”页面顶部复制自己的 UID，再发送给家人或朋友进行关联。
            </p>
          </div>
        </div>

        <div className="flex space-x-3">
          <button
            onClick={onClose}
            className="inline-flex flex-1 items-center justify-center whitespace-nowrap py-3 text-sm font-bold text-slate-500"
          >
            取消
          </button>
          <button
            onClick={onConfirm}
            disabled={!memberUidInput.trim()}
            className="inline-flex flex-1 items-center justify-center whitespace-nowrap rounded-2xl bg-orange-500 px-4 py-3 text-sm font-bold text-white disabled:opacity-50"
          >
            确认添加
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export const RemoveMembersModal = ({
  isOpen,
  targetResource,
  selectedUidsToRemove,
  onToggleUid,
  onClose,
  onConfirm,
}: {
  isOpen: boolean;
  targetResource: ShareResourceTarget | null;
  selectedUidsToRemove: string[];
  onToggleUid: (uid: string) => void;
  onClose: () => void;
  onConfirm: () => void;
}) => {
  if (!isOpen || !targetResource) return null;

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/60 p-6 backdrop-blur-sm">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="w-full max-w-sm space-y-6 rounded-[32px] bg-white p-6"
      >
        <div className="space-y-2 text-center">
          <h3 className="text-lg font-bold">移除成员</h3>
          <p className="text-xs text-slate-500">勾选需要移除的成员</p>
        </div>

        <div className="custom-scrollbar max-h-[300px] space-y-2 overflow-y-auto pr-2">
          {targetResource.currentMembers.map((uid) => (
            <div
              key={uid}
              onClick={() => onToggleUid(uid)}
              className={cn(
                'flex items-center justify-between rounded-2xl border p-3 transition-all active:scale-[0.98]',
                selectedUidsToRemove.includes(uid)
                  ? 'border-rose-200 bg-rose-50'
                  : 'border-transparent bg-slate-50'
              )}
            >
              <div className="flex items-center space-x-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-white text-slate-400 shadow-sm">
                  <User size={16} />
                </div>
                <span className="font-mono text-xs text-slate-600">{uid}</span>
              </div>
              <div
                className={cn(
                  'flex h-5 w-5 items-center justify-center rounded-full border-2 transition-all',
                  selectedUidsToRemove.includes(uid)
                    ? 'border-rose-500 bg-rose-500'
                    : 'border-slate-200'
                )}
              >
                {selectedUidsToRemove.includes(uid) && (
                  <Check size={12} className="text-white" />
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="flex space-x-3 pt-2">
          <button
            onClick={onClose}
            className="inline-flex flex-1 items-center justify-center whitespace-nowrap py-3 text-sm font-bold text-slate-500"
          >
            取消
          </button>
          <button
            onClick={onConfirm}
            disabled={selectedUidsToRemove.length === 0}
            className="inline-flex flex-1 items-center justify-center whitespace-nowrap rounded-2xl bg-rose-500 px-4 py-3 text-sm font-bold text-white disabled:opacity-50"
          >
            确认移除 ({selectedUidsToRemove.length})
          </button>
        </div>
      </motion.div>
    </div>
  );
};
