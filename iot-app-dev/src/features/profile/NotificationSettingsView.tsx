import React, { useState } from 'react';
import { Activity, AlertTriangle, ArrowLeft, Bell } from 'lucide-react';
import { cn } from '../../shared/lib/utils';

export const NotificationSettingsView = ({
  onBack,
}: {
  onBack: () => void;
}) => {
  const [settings, setSettings] = useState({
    safety: true,
    status: true,
    energy: false,
    system: true,
  });

  const toggle = (key: keyof typeof settings) => {
    setSettings((prev) => ({ ...prev, [key]: !prev[key] }));
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
        <h2 className="font-display text-xl font-bold">消息通知</h2>
      </div>

      <div className="space-y-2">
        {[
          {
            id: 'safety',
            label: '安全预警',
            desc: '燃气泄漏、异常高温等紧急告警',
            icon: AlertTriangle,
            color: 'text-rose-500',
          },
          {
            id: 'status',
            label: '设备状态',
            desc: '设备开关机、火力调节等状态变更',
            icon: Activity,
            color: 'text-orange-500',
          },
          {
            id: 'system',
            label: '系统通知',
            desc: '固件更新、功能上线等系统消息',
            icon: Bell,
            color: 'text-blue-500',
          },
        ].map((item) => (
          <div
            key={item.id}
            className="flex items-center justify-between rounded-2xl border border-slate-50 bg-white p-4"
          >
            <div className="flex items-center space-x-3">
              <div className={cn('rounded-xl bg-slate-50 p-2', item.color)}>
                <item.icon size={20} />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-900">{item.label}</p>
                <p className="text-[10px] text-slate-400">{item.desc}</p>
              </div>
            </div>
            <button
              onClick={() => toggle(item.id as keyof typeof settings)}
              className={cn(
                'relative h-6 w-12 rounded-full transition-all',
                settings[item.id as keyof typeof settings]
                  ? 'bg-orange-500'
                  : 'bg-slate-200'
              )}
            >
              <div
                className={cn(
                  'absolute top-1 h-4 w-4 rounded-full bg-white transition-all',
                  settings[item.id as keyof typeof settings] ? 'left-7' : 'left-1'
                )}
              />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
