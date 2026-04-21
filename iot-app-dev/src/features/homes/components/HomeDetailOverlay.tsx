import React from 'react';
import {
  ArrowLeft,
  Check,
  Flame,
  Info,
  Loader2,
  PlusCircle,
  Trash2,
} from 'lucide-react';
import { cn } from '../../../shared/lib/utils';
import { Device, FirebaseUser, Home } from '../../../shared/types';

export const HomeDetailOverlay = ({
  home,
  devices,
  user,
  isAdjusting,
  tempSelectedDeviceIds,
  isSaving,
  isRefreshingLinks,
  onClose,
  onDelete,
  onStartAdjust,
  onCancelAdjust,
  onToggleDevice,
  onSave,
}: {
  home: Home;
  devices: Device[];
  user: FirebaseUser | null;
  isAdjusting: boolean;
  tempSelectedDeviceIds: string[];
  isSaving: boolean;
  isRefreshingLinks: boolean;
  onClose: () => void;
  onDelete: () => void;
  onStartAdjust: () => void;
  onCancelAdjust: () => void;
  onToggleDevice: (deviceId: string) => void;
  onSave: () => void;
}) => (
  <div className="fixed inset-0 z-[160] flex flex-col bg-slate-50">
    <div className="flex items-center justify-between border-b border-slate-100 bg-white p-6">
      <div className="flex items-center space-x-3">
        <button onClick={onClose} className="-ml-2 p-2 text-slate-600">
          <ArrowLeft size={20} />
        </button>
        <h3 className="text-lg font-bold">
          {isAdjusting ? '调整关联' : `${home.name} 详情`}
        </h3>
      </div>
      {!isAdjusting && (
        <button
          onClick={onDelete}
          className="rounded-xl bg-rose-50 p-2 text-rose-500 transition-transform active:scale-90"
        >
          <Trash2 size={20} />
        </button>
      )}
    </div>

    <div className="flex-1 space-y-8 overflow-y-auto p-6 pb-32">
      {!isAdjusting ? (
        <>
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-slate-900">已关联设备</h4>
              <button
                onClick={onStartAdjust}
                disabled={isRefreshingLinks}
                className="rounded-lg bg-orange-50 px-3 py-1 text-xs font-bold text-orange-500 disabled:opacity-50"
              >
                调整关联
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {isRefreshingLinks ? (
                <div className="col-span-2 space-y-3 py-12 text-center">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-50 text-orange-500">
                    <Loader2 size={22} className="animate-spin" />
                  </div>
                  <p className="text-xs text-slate-400">
                    正在刷新关联设备列表...
                  </p>
                </div>
              ) : (
                devices
                  .filter((device) => home.deviceIds?.includes(device.id))
                  .map((device) => (
                    <div
                      key={device.id}
                      className="rounded-2xl border border-slate-100 bg-white p-4"
                    >
                      <Flame size={20} className="mb-2 text-orange-500" />
                      <p className="truncate text-xs font-bold text-slate-700">
                        {device.name}
                      </p>
                    </div>
                  ))
              )}
              {!isRefreshingLinks &&
                (!home.deviceIds || home.deviceIds.length === 0) && (
                  <div className="col-span-2 space-y-2 py-12 text-center">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-50 text-slate-300">
                      <PlusCircle size={24} />
                    </div>
                    <p className="text-xs text-slate-400">暂无关联设备</p>
                  </div>
                )}
            </div>
          </section>

          <section className="space-y-4">
            <h4 className="text-sm font-bold text-slate-900">家庭成员</h4>
            <div className="space-y-2">
              <div className="flex items-center justify-between rounded-2xl border border-slate-100 bg-white p-4">
                <div className="flex items-center space-x-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-orange-100 text-xs font-bold text-orange-600">
                    {user?.displayName?.[0] || 'U'}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-900">
                      {user?.displayName || '我'}
                    </p>
                    <p className="text-[10px] text-slate-400">所有者</p>
                  </div>
                </div>
              </div>
              {home.members?.map((memberId) => (
                <div
                  key={memberId}
                  className="flex items-center justify-between rounded-2xl border border-slate-100 bg-white p-4"
                >
                  <div className="flex items-center space-x-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-400">
                      M
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-900">
                        成员 {memberId.slice(0, 4)}
                      </p>
                      <p className="text-[10px] text-slate-400">家庭成员</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </>
      ) : (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold text-slate-900">选择设备</h4>
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
              已选 {tempSelectedDeviceIds.length}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {devices
              .filter((device) => device.ownerId === user?.uid?.slice(0, 8))
              .map((device) => {
                const isLinked = tempSelectedDeviceIds.includes(device.id);
                return (
                  <button
                    key={device.id}
                    onClick={() => onToggleDevice(device.id)}
                    className={cn(
                      'group relative overflow-hidden rounded-2xl border p-4 text-left transition-all',
                      isLinked
                        ? 'border-orange-200 bg-orange-50 ring-2 ring-orange-500/10'
                        : 'border-slate-100 bg-white hover:border-slate-200'
                    )}
                  >
                    <div
                      className={cn(
                        'absolute right-2 top-2 rounded-full p-1 transition-all',
                        isLinked
                          ? 'scale-100 bg-orange-500 text-white'
                          : 'scale-0 bg-slate-100 text-slate-300 group-hover:scale-100'
                      )}
                    >
                      <Check size={10} />
                    </div>
                    <Flame
                      size={20}
                      className={cn(
                        'mb-2',
                        isLinked ? 'text-orange-500' : 'text-slate-300'
                      )}
                    />
                    <p
                      className={cn(
                        'truncate text-xs font-bold',
                        isLinked ? 'text-orange-700' : 'text-slate-600'
                      )}
                    >
                      {device.name}
                    </p>
                  </button>
                );
              })}
          </div>
        </section>
      )}

      <section className="rounded-2xl border border-blue-100 bg-blue-50 p-4">
        <div className="flex items-start space-x-3">
          <Info size={18} className="mt-0.5 text-blue-500" />
          <div className="space-y-1">
            <p className="text-xs font-bold text-blue-900">关于家庭共享</p>
            <p className="text-[10px] leading-relaxed text-blue-700/70">
              {isAdjusting
                ? '确认后，所选设备将关联到当前家庭，并自动共享给家庭成员。'
                : '关联到当前家庭的设备会自动共享给该家庭的全部成员，你可以在共享管理中继续调整成员权限。'}
            </p>
          </div>
        </div>
      </section>
    </div>

    {isAdjusting && (
      <div className="absolute bottom-0 left-0 right-0 flex space-x-4 border-t border-slate-100 bg-white p-6">
        <button
          onClick={onCancelAdjust}
          className="flex-1 py-4 text-sm font-bold text-slate-500"
        >
          取消
        </button>
        <button
          onClick={onSave}
          disabled={isSaving}
          className="flex flex-[2] items-center justify-center space-x-2 rounded-2xl bg-orange-500 py-4 text-sm font-bold text-white shadow-lg shadow-orange-500/30 disabled:opacity-50"
        >
          {isSaving ? <Loader2 size={18} className="animate-spin" /> : null}
          <span>确认调整</span>
        </button>
      </div>
    )}
  </div>
);
