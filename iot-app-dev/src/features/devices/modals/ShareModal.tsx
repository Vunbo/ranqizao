import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Info, Loader2, Trash2, X } from 'lucide-react';
import { devicesApi } from '../../../shared/api/devices';
import { Device } from '../../../shared/types';

export const ShareModal = ({
  device,
  onClose,
  onRefreshDevices,
  showToast,
}: {
  device: Device;
  onClose: () => void;
  onRefreshDevices: () => Promise<void>;
  showToast: (msg: string, type?: any) => void;
}) => {
  const [shareUid, setShareUid] = useState('');
  const [loading, setLoading] = useState(false);

  const handleShare = async () => {
    if (!shareUid.trim()) {
      return;
    }

    setLoading(true);
    try {
      if ((device.sharedWith || []).includes(shareUid.trim())) {
        showToast('该用户已在共享列表中', 'info');
        setLoading(false);
        return;
      }

      await devicesApi.share(device.id, shareUid.trim());
      await onRefreshDevices();
      showToast('设备共享成功', 'success');
      onClose();
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : '共享失败，请检查 UID',
        'error'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveShare = async (uid: string) => {
    setLoading(true);
    try {
      await devicesApi.unshare(device.id, uid);
      await onRefreshDevices();
      showToast('已取消共享', 'success');
    } catch (error) {
      showToast(error instanceof Error ? error.message : '操作失败', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/60 p-6 backdrop-blur-sm">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="w-full max-w-sm space-y-6 rounded-[32px] bg-white p-8 shadow-2xl"
      >
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-bold">设备共享</h3>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 transition-colors hover:text-slate-600"
          >
            <X size={20} />
          </button>
        </div>

        <div className="space-y-4">
          <div className="space-y-1">
            <label className="ml-1 text-xs font-bold text-slate-700">
              用户 UID
            </label>
            <div className="flex space-x-2">
              <input
                type="text"
                value={shareUid}
                onChange={(e) => setShareUid(e.target.value)}
                className="flex-1 rounded-xl border-0 bg-slate-50 px-4 py-3 text-sm outline-none transition-all focus:ring-2 focus:ring-orange-500"
                placeholder="输入对方的 UID"
              />
              <button
                onClick={() => void handleShare()}
                disabled={loading || !shareUid.trim()}
                className="rounded-xl bg-orange-500 px-4 py-3 font-bold text-white transition-transform active:scale-95 disabled:opacity-50"
              >
                {loading ? (
                  <Loader2 className="animate-spin" size={18} />
                ) : (
                  '添加'
                )}
              </button>
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-widest text-slate-400">
              已共享用户
            </h4>
            <div className="max-h-40 space-y-2 overflow-y-auto pr-1">
              {!device.sharedWith || device.sharedWith.length === 0 ? (
                <p className="py-4 text-center text-xs text-slate-400">
                  暂无共享用户
                </p>
              ) : (
                device.sharedWith.map((uid) => (
                  <div
                    key={uid}
                    className="flex items-center justify-between rounded-xl bg-slate-50 p-3"
                  >
                    <span className="mr-2 truncate font-mono text-xs text-slate-600">
                      {uid}
                    </span>
                    <button
                      onClick={() => void handleRemoveShare(uid)}
                      disabled={loading}
                      className="rounded-lg p-1 text-rose-500 transition-colors hover:bg-rose-50 disabled:opacity-50"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="flex items-start space-x-3 rounded-2xl bg-blue-50 p-4">
          <Info size={16} className="mt-0.5 shrink-0 text-blue-500" />
          <p className="text-[10px] leading-relaxed text-blue-700">
            共享后，对方可以查看设备状态并进行基础控制，请仅向可信成员授权。
          </p>
        </div>
      </motion.div>
    </div>
  );
};
