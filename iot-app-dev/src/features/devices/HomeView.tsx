import React from 'react';
import {
  ChevronRight,
  Droplets,
  Flame,
  Plus,
  ShieldCheck,
} from 'lucide-react';
import { cn } from '../../shared/lib/utils';
import { Device, FirebaseUser } from '../../shared/types';
import { Card } from '../../shared/ui/Card';

export const HomeView = ({
  devices,
  user,
  onSelectDevice,
  onAddDevice,
}: {
  devices: Device[];
  user: FirebaseUser | null;
  onSelectDevice: (id: string) => void;
  onAddDevice: () => void;
}) => {
  const shortUid = user?.uid?.slice(0, 8);
  const myDevices = devices.filter((device) => device.ownerId === shortUid);
  const sharedDevices = devices.filter((device) => device.ownerId !== shortUid);

  const renderDeviceList = (list: Device[], title: string) => (
    <div className="space-y-3">
      <h3 className="px-1 text-xs font-bold uppercase tracking-widest text-slate-400">
        {title}
      </h3>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {list.map((device) => (
          <Card
            key={device.id}
            className="cursor-pointer overflow-hidden p-0 transition-transform active:scale-[0.98]"
            onClick={() => onSelectDevice(device.id)}
          >
            <div className="flex items-center justify-between p-5">
              <div className="flex items-center space-x-4">
                <div
                  className={cn(
                    'flex h-14 w-14 items-center justify-center rounded-2xl transition-colors',
                    device.isOn
                      ? 'bg-orange-500 text-white'
                      : 'bg-slate-100 text-slate-400'
                  )}
                >
                  <Flame size={28} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900">{device.name}</h3>
                  <div className="mt-1 flex items-center space-x-2">
                    <span
                      className={cn(
                        'h-2 w-2 rounded-full',
                        device.isOn
                          ? 'bg-emerald-500 animate-pulse'
                          : 'bg-slate-300'
                      )}
                    />
                    <span className="text-xs text-slate-500">
                      {device.isOn ? '运行中' : '待机'}
                    </span>
                  </div>
                </div>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold text-slate-900">
                  {device.temp.toFixed(0)}°C
                </p>
                <p className="text-[10px] uppercase tracking-wider text-slate-400">
                  当前温度
                </p>
              </div>
            </div>
            <div className="flex items-center justify-between bg-slate-50 px-5 py-3">
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-1">
                  <Droplets size={12} className="text-blue-500" />
                  <span className="text-[10px] font-medium text-slate-600">
                    {device.gas.toFixed(2)}% LEL
                  </span>
                </div>
                <div className="flex items-center space-x-1">
                  <ShieldCheck size={12} className="text-emerald-500" />
                  <span className="text-[10px] font-medium text-slate-600">
                    安全
                  </span>
                </div>
              </div>
              <ChevronRight size={16} className="text-slate-300" />
            </div>
          </Card>
        ))}
      </div>
    </div>
  );

  return (
    <div className="space-y-8 pb-20">
      <div className="flex flex-row items-center justify-between gap-2 px-1">
        <div className="min-w-0 flex-1">
          <h2 className="truncate font-display text-xl font-bold sm:text-3xl">
            智能安全灶
          </h2>
          <p className="truncate text-[10px] text-slate-500 sm:text-sm">
            {devices.length > 0
              ? `已连接 ${devices.length} 台设备`
              : '暂无连接设备'}
          </p>
        </div>
        <button
          onClick={onAddDevice}
          className="flex shrink-0 items-center justify-center space-x-2 rounded-2xl bg-orange-500 p-2.5 text-white shadow-lg shadow-orange-500/20 transition-transform active:scale-95 sm:p-3"
        >
          <Plus size={18} />
          <span className="text-xs font-bold">添加设备</span>
        </button>
      </div>

      {devices.length === 0 ? (
        <div className="flex flex-col items-center justify-center space-y-4 py-20 text-slate-400">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-slate-100">
            <Flame size={40} className="opacity-20" />
          </div>
          <p className="text-sm">点击右上角添加您的第一台安全灶</p>
        </div>
      ) : (
        <div className="space-y-8">
          {myDevices.length > 0 && renderDeviceList(myDevices, '我的设备')}
          {sharedDevices.length > 0 && renderDeviceList(sharedDevices, '共享给我的')}
        </div>
      )}

      <Card className="border-0 bg-slate-900 p-5 text-white">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <h4 className="text-sm font-bold">安全小贴士</h4>
            <p className="text-xs leading-relaxed text-slate-400">
              定期检查燃气管路并保持厨房通风良好，AI 安全灶会持续守护您的烹饪安全。
            </p>
          </div>
          <div className="rounded-lg bg-white/10 p-2">
            <ShieldCheck size={20} className="text-orange-500" />
          </div>
        </div>
      </Card>
    </div>
  );
};
