import React from 'react';
import { ArrowLeft, Edit3, Globe, Trash2 } from 'lucide-react';
import { Device } from '../../../shared/types';

export const DeviceDetailHeader = ({
  device,
  isOwner,
  onBack,
  onRename,
  onShare,
  onDelete,
}: {
  device: Device;
  isOwner: boolean;
  onBack: () => void;
  onRename: () => void;
  onShare: () => void;
  onDelete: () => void;
}) => (
  <div className="flex flex-row items-center justify-between gap-2 px-1">
    <div className="flex min-w-0 flex-1 items-center space-x-2 sm:space-x-3">
      <button
        onClick={onBack}
        className="shrink-0 rounded-xl border border-slate-100 bg-white p-2 shadow-sm transition-transform active:scale-90"
      >
        <ArrowLeft size={18} className="text-slate-600" />
      </button>
      <div className="min-w-0">
        <h2 className="truncate font-display text-lg font-bold sm:text-2xl">
          {device.name}
        </h2>
        <p className="truncate text-[10px] text-slate-500">
          ID: {device.id.slice(0, 8).toUpperCase()}
        </p>
      </div>
    </div>
    <div className="flex shrink-0 items-center space-x-1.5 sm:space-x-2">
      {isOwner && (
        <>
          <button
            onClick={onRename}
            className="rounded-xl bg-slate-50 p-2 text-slate-500 transition-transform active:scale-90"
            title="重命名设备"
          >
            <Edit3 size={20} />
          </button>
          <button
            onClick={onShare}
            className="rounded-xl bg-blue-50 p-2 text-blue-500 transition-transform active:scale-90"
            title="共享设备"
          >
            <Globe size={20} />
          </button>
        </>
      )}
      <button
        onClick={onDelete}
        className="rounded-xl bg-rose-50 p-2 text-rose-500 transition-transform active:scale-90"
      >
        <Trash2 size={20} />
      </button>
    </div>
  </div>
);
