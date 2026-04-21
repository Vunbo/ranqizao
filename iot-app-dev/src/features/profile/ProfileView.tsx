import React from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  Bell,
  ChevronRight,
  Copy,
  HelpCircle,
  Home as HomeIcon,
  Info,
  MessageSquare,
  Settings,
  ShieldCheck,
} from 'lucide-react';
import { authApi } from '../../shared/api/auth';
import { Device, FirebaseUser, Home } from '../../shared/types';
import { DeviceManagementView } from '../devices';
import { HomeManagementView } from '../homes';
import { SharingManagementView } from '../sharing';
import { NotificationSettingsView } from './NotificationSettingsView';

type ProfileSubView = 'main' | 'devices' | 'sharing' | 'notifications' | 'homes';

type ProfileViewProps = {
  user: FirebaseUser | null;
  devices: Device[];
  homes: Home[];
  deviceCount: number;
  showToast: (msg: string, type?: any) => void;
  showConfirm: (
    title: string,
    msg: string,
    onConfirm: () => void,
    confirmText?: string
  ) => void;
  activeSubView: ProfileSubView;
  setActiveSubView: (view: ProfileSubView) => void;
  onRefreshDevices: () => Promise<void>;
  onRefreshHomes: () => Promise<void>;
};

export const ProfileView = ({
  user,
  devices,
  homes,
  deviceCount,
  showToast,
  showConfirm,
  activeSubView,
  setActiveSubView,
  onRefreshDevices,
  onRefreshHomes,
}: ProfileViewProps) => {
  const sharedUsersCount = devices
    .filter((device) => device.ownerId === user?.uid?.slice(0, 8))
    .reduce((total, device) => total + (device.sharedWith?.length || 0), 0);

  const handleLogout = () => {
    showConfirm(
      '退出登录',
      '确定要退出当前账号吗？',
      async () => {
        try {
          await authApi.logout();
        } catch (error) {
          showToast('退出失败，请稍后重试', 'error');
        }
      },
      '确认退出'
    );
  };

  const handleCopyUid = async () => {
    if (!user?.uid) {
      return;
    }

    try {
      await navigator.clipboard.writeText(user.uid.slice(0, 8));
      showToast('UID 已复制到剪贴板', 'success');
    } catch (error) {
      showToast('复制失败，请稍后重试', 'error');
    }
  };

  const renderContent = () => {
    if (activeSubView === 'devices') {
      return (
        <DeviceManagementView
          devices={devices}
          user={user}
          onBack={() => setActiveSubView('main')}
          showToast={showToast}
          showConfirm={showConfirm}
          onRefreshDevices={onRefreshDevices}
          onRefreshHomes={onRefreshHomes}
        />
      );
    }

    if (activeSubView === 'sharing') {
      return (
        <SharingManagementView
          devices={devices}
          homes={homes}
          user={user}
          onBack={() => setActiveSubView('main')}
          showToast={showToast}
          showConfirm={showConfirm}
          onRefreshDevices={onRefreshDevices}
          onRefreshHomes={onRefreshHomes}
        />
      );
    }

    if (activeSubView === 'notifications') {
      return <NotificationSettingsView onBack={() => setActiveSubView('main')} />;
    }

    if (activeSubView === 'homes') {
      return (
        <HomeManagementView
          homes={homes}
          devices={devices}
          user={user}
          onBack={() => setActiveSubView('main')}
          showToast={showToast}
          showConfirm={showConfirm}
          onRefreshHomes={onRefreshHomes}
        />
      );
    }

    return (
      <div className="space-y-6 pb-20">
        <div className="flex flex-col items-center space-y-4 px-1 text-center">
          <div className="relative shrink-0">
            <div className="h-24 w-24 overflow-hidden rounded-full border-4 border-white bg-slate-200 shadow-md">
              <img
                src={
                  user?.photoURL ||
                  `https://picsum.photos/seed/${user?.uid || 'user'}/200`
                }
                alt="Avatar"
                referrerPolicy="no-referrer"
              />
            </div>
            <div className="absolute bottom-1 right-1 h-6 w-6 rounded-full border-2 border-white bg-emerald-500" />
          </div>
          <div className="min-w-0">
            <h2 className="font-display text-2xl font-bold">
              {user?.displayName || user?.email?.split('@')[0] || '用户'}
            </h2>
            <div className="mt-1 flex items-center justify-center space-x-2">
              <p className="font-mono text-xs text-slate-400">
                UID: {user?.uid?.slice(0, 8)}
              </p>
              <button
                onClick={() => void handleCopyUid()}
                className="p-1 text-slate-400 transition-colors hover:text-orange-500"
              >
                <Copy size={14} />
              </button>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <h3 className="px-1 text-xs font-bold uppercase tracking-widest text-slate-400">
            通用设置
          </h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {[
              {
                id: 'devices' as const,
                icon: Settings,
                label: '设备管理',
                extra: `${deviceCount} 台设备`,
              },
              {
                id: 'homes' as const,
                icon: HomeIcon,
                label: '家庭管理',
                extra: `${homes.length} 个家庭`,
              },
              {
                id: 'sharing' as const,
                icon: ShieldCheck,
                label: '共享管理',
                extra: `${sharedUsersCount} 位成员`,
              },
              {
                id: 'notifications' as const,
                icon: Bell,
                label: '消息通知',
                extra: '已开启',
              },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveSubView(item.id)}
                className="flex w-full items-center justify-between rounded-2xl border border-slate-50 bg-white p-4 transition-all active:scale-[0.98]"
              >
                <div className="flex items-center space-x-3">
                  <div className="rounded-xl bg-slate-50 p-2 text-slate-600">
                    <item.icon size={18} />
                  </div>
                  <span className="text-sm font-bold text-slate-700">
                    {item.label}
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-xs text-slate-400">{item.extra}</span>
                  <ChevronRight size={16} className="text-slate-300" />
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <h3 className="px-1 text-xs font-bold uppercase tracking-widest text-slate-400">
            支持与反馈
          </h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {[
              { icon: HelpCircle, label: '帮助中心', extra: '' },
              { icon: MessageSquare, label: '意见反馈', extra: '' },
              { icon: Info, label: '关于我们', extra: 'v2.1.0' },
            ].map((item) => (
              <button
                key={item.label}
                className="flex w-full items-center justify-between rounded-2xl border border-slate-50 bg-white p-4 transition-all active:scale-[0.98]"
              >
                <div className="flex items-center space-x-3">
                  <div className="rounded-xl bg-slate-50 p-2 text-slate-600">
                    <item.icon size={18} />
                  </div>
                  <span className="text-sm font-bold text-slate-700">
                    {item.label}
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  {item.extra ? (
                    <span className="text-xs text-slate-400">{item.extra}</span>
                  ) : null}
                  <ChevronRight size={16} className="text-slate-300" />
                </div>
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="mt-4 w-full rounded-2xl bg-rose-50 py-4 text-sm font-bold text-rose-500 transition-all active:scale-[0.98]"
        >
          退出登录
        </button>
      </div>
    );
  };

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={activeSubView}
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        transition={{ duration: 0.2 }}
      >
        {renderContent()}
      </motion.div>
    </AnimatePresence>
  );
};
