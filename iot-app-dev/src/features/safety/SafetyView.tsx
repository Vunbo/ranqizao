import React from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  Droplets,
  History,
  ShieldCheck,
  Thermometer,
  User,
  Wind,
} from 'lucide-react';
import { cn } from '../../shared/lib/utils';
import { Device, FirebaseUser } from '../../shared/types';
import { Card } from '../../shared/ui/Card';
import { useSafetyMonitor } from './hooks/useSafetyMonitor';

export const SafetyView = ({
  devices,
  user,
}: {
  devices: Device[];
  user: FirebaseUser | null;
}) => {
  const {
    device,
    myDevices,
    sharedDevices,
    selectedDeviceId,
    setSelectedDeviceId,
    isDropdownOpen,
    setIsDropdownOpen,
    logs,
    alertLogs,
    sensors,
  } = useSafetyMonitor(devices, user);

  if (devices.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center space-y-4 py-20 text-slate-400">
        <ShieldCheck size={48} className="opacity-20" />
        <p className="text-sm">请先添加设备以开启安全监控</p>
      </div>
    );
  }

  const sensorIcons = {
    gas: Droplets,
    smoke: Activity,
    temp: Thermometer,
    human: User,
    vibration: AlertTriangle,
    flow: Wind,
  } as const;

  return (
    <div className="space-y-6 pb-20">
      <div className="flex flex-row items-center justify-between gap-2 px-1">
        <div className="min-w-0 flex-1">
          <h2 className="truncate font-display text-xl font-bold sm:text-3xl">
            安全中心
          </h2>
          <p className="truncate text-[10px] text-slate-500 sm:text-sm">
            实时监控全屋厨房安全
          </p>
        </div>
        {devices.length > 1 && (
          <div className="relative shrink-0">
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="flex items-center space-x-1.5 rounded-2xl border border-slate-100 bg-white px-3 py-2 shadow-sm transition-all active:scale-95"
            >
              <span className="max-w-[80px] truncate text-[10px] font-bold text-slate-700 sm:max-w-none sm:text-xs">
                {device?.name}
              </span>
              <ChevronRight
                size={12}
                className={cn(
                  'text-slate-400 transition-transform duration-300',
                  isDropdownOpen ? 'rotate-90' : 'rotate-0'
                )}
              />
            </button>

            <AnimatePresence>
              {isDropdownOpen && (
                <>
                  <div
                    className="fixed inset-0 z-[60]"
                    onClick={() => setIsDropdownOpen(false)}
                  />
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute right-0 z-[70] mt-2 w-56 overflow-hidden rounded-2xl border border-slate-50 bg-white p-2 shadow-xl"
                  >
                    <div className="max-h-[300px] overflow-y-auto">
                      {myDevices.length > 0 && (
                        <div className="mb-2">
                          <div className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                            我的设备
                          </div>
                          {myDevices.map((currentDevice) => (
                            <button
                              key={currentDevice.id}
                              onClick={() => {
                                setSelectedDeviceId(currentDevice.id);
                                setIsDropdownOpen(false);
                              }}
                              className={cn(
                                'flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-xs font-bold transition-colors',
                                selectedDeviceId === currentDevice.id
                                  ? 'bg-orange-50 text-orange-500'
                                  : 'text-slate-600 hover:bg-slate-50'
                              )}
                            >
                              <span className="mr-2 truncate">
                                {currentDevice.name}
                              </span>
                              {selectedDeviceId === currentDevice.id && (
                                <CheckCircle2 size={14} />
                              )}
                            </button>
                          ))}
                        </div>
                      )}

                      {sharedDevices.length > 0 && (
                        <div>
                          <div className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                            共享设备
                          </div>
                          {sharedDevices.map((currentDevice) => (
                            <button
                              key={currentDevice.id}
                              onClick={() => {
                                setSelectedDeviceId(currentDevice.id);
                                setIsDropdownOpen(false);
                              }}
                              className={cn(
                                'flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-xs font-bold transition-colors',
                                selectedDeviceId === currentDevice.id
                                  ? 'bg-orange-50 text-orange-500'
                                  : 'text-slate-600 hover:bg-slate-50'
                              )}
                            >
                              <span className="mr-2 truncate">
                                {currentDevice.name}
                              </span>
                              {selectedDeviceId === currentDevice.id && (
                                <CheckCircle2 size={14} />
                              )}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>

      <Card
        className={cn(
          'border-0 text-white transition-colors duration-500',
          device?.isOn ? 'bg-emerald-500' : 'bg-slate-700'
        )}
      >
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-[10px] font-medium uppercase tracking-wider text-white/70">
              当前安全评分
            </p>
            <p className="font-display text-4xl font-bold">
              {device?.isOn ? '98' : '--'}
            </p>
          </div>
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/20">
            <ShieldCheck size={32} />
          </div>
        </div>
        <div className="mt-4 flex items-center justify-between border-t border-white/10 pt-4 text-[10px]">
          <span>
            {device?.isOn
              ? '所有传感器运行正常'
              : '设备待机中，基础监测仍保持开启'}
          </span>
          <button className="font-medium underline">查看报告</button>
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
        {sensors.map((sensor) => (
          <Card key={sensor.id} className="space-y-3 p-3">
            <div className="flex items-center justify-between">
              {(() => {
                const Icon = sensorIcons[sensor.icon];
                return (
                  <div
                    className={cn(
                      'rounded-lg p-1.5',
                      sensor.status === 'safe'
                        ? 'bg-emerald-50 text-emerald-500'
                        : sensor.status === 'warning'
                        ? 'bg-amber-50 text-amber-500'
                        : 'bg-rose-50 text-rose-500'
                    )}
                  >
                    <Icon size={18} />
                  </div>
                );
              })()}
              <div
                className={cn(
                  'h-2 w-2 rounded-full',
                  sensor.status === 'safe'
                    ? 'bg-emerald-500'
                    : sensor.status === 'warning'
                    ? 'bg-amber-500'
                    : 'bg-rose-500'
                )}
              />
            </div>
            <div>
              <p className="text-[10px] font-medium text-slate-400">
                {sensor.label}
              </p>
              <p className="text-sm font-bold text-slate-900">{sensor.value}</p>
            </div>
          </Card>
        ))}
      </div>

      <Card className="overflow-hidden p-0">
        <div className="flex items-center justify-between border-b border-slate-50 p-4">
          <h3 className="text-sm font-bold">告警记录</h3>
          <AlertCircle size={16} className="text-rose-400" />
        </div>
        <div className="max-h-[200px] divide-y divide-slate-50 overflow-y-auto">
          {alertLogs.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400">
              暂无告警记录
            </div>
          ) : (
            alertLogs.map((log) => (
              <div key={log.id} className="flex items-start space-x-3 p-4">
                <div
                  className={cn(
                    'mt-1 h-2 w-2 shrink-0 rounded-full',
                    log.type === 'warning' ? 'bg-amber-500' : 'bg-rose-500'
                  )}
                />
                <div className="space-y-0.5">
                  <p className="text-xs font-medium text-slate-900">{log.event}</p>
                  <p className="text-[10px] text-slate-400">{log.time}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </Card>

      <Card className="overflow-hidden p-0">
        <div className="flex items-center justify-between border-b border-slate-50 p-4">
          <h3 className="text-sm font-bold">操作记录</h3>
          <History size={16} className="text-slate-400" />
        </div>
        <div className="max-h-[200px] divide-y divide-slate-50 overflow-y-auto">
          {logs.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400">
              暂无操作记录
            </div>
          ) : (
            logs.map((log) => (
              <div key={log.id} className="flex items-start space-x-3 p-4">
                <div
                  className={cn(
                    'mt-1 h-2 w-2 shrink-0 rounded-full',
                    log.type === 'warning'
                      ? 'bg-amber-500'
                      : log.type === 'success'
                      ? 'bg-emerald-500'
                      : 'bg-blue-500'
                  )}
                />
                <div className="space-y-0.5">
                  <p className="text-xs font-medium text-slate-900">{log.event}</p>
                  <p className="text-[10px] text-slate-400">
                    {log.createdAt
                      ? new Date(log.createdAt).toLocaleString()
                      : '刚刚'}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  );
};
