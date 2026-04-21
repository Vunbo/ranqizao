import React, { useState } from 'react';
import {
  ArrowLeft,
  Check,
  Edit3,
  Flame,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import { devicesApi } from '../../shared/api/devices';
import { cn } from '../../shared/lib/utils';
import { Device, FirebaseUser } from '../../shared/types';
import { Card } from '../../shared/ui/Card';

export const DeviceManagementView = ({
  devices,
  user,
  onBack,
  showToast,
  showConfirm,
  onRefreshDevices,
  onRefreshHomes,
}: {
  devices: Device[];
  user: FirebaseUser | null;
  onBack: () => void;
  showToast: (msg: string, type?: any) => void;
  showConfirm: (
    title: string,
    msg: string,
    onConfirm: () => void,
    confirmText?: string
  ) => void;
  onRefreshDevices: () => Promise<void>;
  onRefreshHomes: () => Promise<void>;
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTab, setFilterTab] = useState<'all' | 'mine' | 'shared'>('all');
  const [isRenaming, setIsRenaming] = useState<string | null>(null);
  const [newName, setNewName] = useState('');

  const shortUid = user?.uid?.slice(0, 8);

  const filteredDevices = devices.filter((device) => {
    const matchesSearch = device.name
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    const isOwner = device.ownerId === shortUid;

    if (filterTab === 'mine') {
      return matchesSearch && isOwner;
    }
    if (filterTab === 'shared') {
      return matchesSearch && !isOwner;
    }
    return matchesSearch;
  });

  const handleRename = async (device: Device) => {
    const normalizedName = newName.trim();
    if (!normalizedName) {
      return;
    }

    const hasDuplicateName = devices.some(
      (item) =>
        item.id !== device.id &&
        item.name.trim().toLowerCase() === normalizedName.toLowerCase()
    );
    if (hasDuplicateName) {
      showToast('设备名称已存在，请更换一个名称', 'error');
      return;
    }

    try {
      await devicesApi.update(device.id, { name: normalizedName });
      await onRefreshDevices();
      showToast('设备重命名成功', 'success');
      setIsRenaming(null);
    } catch (error) {
      showToast(error instanceof Error ? error.message : '重命名失败', 'error');
    }
  };

  const handleDelete = (device: Device) => {
    showConfirm(
      '删除设备',
      `确定要删除设备“${device.name}”吗？此操作不可撤销。`,
      async () => {
        try {
          await devicesApi.remove(device.id);
          await Promise.all([onRefreshDevices(), onRefreshHomes()]);
          showToast('设备已删除', 'success');
        } catch (error) {
          showToast(error instanceof Error ? error.message : '删除失败', 'error');
        }
      },
      '确认删除'
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-3 px-1">
        <button
          onClick={onBack}
          className="rounded-xl border border-slate-100 bg-white p-2 shadow-sm transition-transform active:scale-90"
        >
          <ArrowLeft size={20} className="text-slate-600" />
        </button>
        <h2 className="font-display text-xl font-bold">设备管理</h2>
      </div>

      <div className="space-y-4 px-1">
        <div className="relative">
          <Search
            className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
            size={18}
          />
          <input
            type="text"
            placeholder="搜索设备名称..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-2xl border-0 bg-slate-100 py-3 pl-12 pr-4 text-sm font-medium outline-none transition-all focus:ring-2 focus:ring-orange-500"
          />
        </div>

        <div className="flex rounded-2xl bg-slate-100 p-1">
          {(['all', 'mine', 'shared'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setFilterTab(tab)}
              className={cn(
                'flex-1 rounded-xl py-2 text-xs font-bold capitalize transition-all',
                filterTab === tab
                  ? 'bg-white text-orange-500 shadow-sm'
                  : 'text-slate-500'
              )}
            >
              {tab === 'all' ? '全部' : tab === 'mine' ? '我的' : '共享'}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        {filteredDevices.length === 0 ? (
          <div className="space-y-3 py-12 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-slate-50 text-slate-200">
              <Search size={32} />
            </div>
            <p className="text-xs text-slate-400">未找到相关设备</p>
          </div>
        ) : (
          filteredDevices.map((device) => {
            const isOwner = device.ownerId === shortUid;
            return (
              <Card key={device.id} className="space-y-4 p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div
                      className={cn(
                        'rounded-2xl p-3',
                        device.isOn
                          ? 'bg-orange-50 text-orange-500'
                          : 'bg-slate-50 text-slate-400'
                      )}
                    >
                      <Flame size={24} />
                    </div>
                    <div className="min-w-0">
                      {isRenaming === device.id ? (
                        <div className="flex min-w-0 items-center space-x-1">
                          <input
                            type="text"
                            value={newName}
                            onChange={(e) => setNewName(e.target.value)}
                            className="min-w-0 w-28 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-orange-500/20 sm:w-40"
                            autoFocus
                            onKeyDown={(e) =>
                              e.key === 'Enter' && void handleRename(device)
                            }
                          />
                          <div className="flex shrink-0 items-center">
                            <button
                              onClick={() => void handleRename(device)}
                              className="rounded-lg p-1.5 text-emerald-500 transition-colors hover:bg-emerald-50"
                            >
                              <Check size={16} />
                            </button>
                            <button
                              onClick={() => setIsRenaming(null)}
                              className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100"
                            >
                              <X size={16} />
                            </button>
                          </div>
                        </div>
                      ) : (
                        <p className="text-sm font-bold text-slate-900">
                          {device.name}
                        </p>
                      )}
                      <div className="mt-0.5 flex items-center space-x-2">
                        <span
                          className={cn(
                            'h-1.5 w-1.5 rounded-full',
                            device.isOn
                              ? 'bg-emerald-500 animate-pulse'
                              : 'bg-slate-300'
                          )}
                        />
                        <span className="text-[10px] font-medium text-slate-400">
                          {device.isOn ? '运行中' : '待机中'} ·{' '}
                          {isOwner ? '我的设备' : '共享设备'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {isOwner && !isRenaming && (
                    <div className="flex items-center space-x-1">
                      <button
                        onClick={() => {
                          setNewName(device.name);
                          setIsRenaming(device.id);
                        }}
                        className="p-2 text-slate-400 transition-colors hover:text-blue-500"
                      >
                        <Edit3 size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(device)}
                        className="p-2 text-slate-400 transition-colors hover:text-rose-500"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  )}
                </div>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
};
