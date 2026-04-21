import React from 'react';
import { motion } from 'motion/react';
import {
  CheckCircle2,
  Info,
  Loader2,
  Lock,
  MapPin,
  Scan,
  Wifi,
} from 'lucide-react';
import { Device } from '../../../shared/types';
import { useAddDeviceFlow } from '../hooks/useAddDeviceFlow';

export const AddDeviceModal = ({
  isOpen,
  onClose,
  userId,
  showToast,
  existingDevices,
  onRefreshDevices,
}: {
  isOpen: boolean;
  onClose: () => void;
  userId?: string;
  showToast: (msg: string, type?: any) => void;
  existingDevices: Device[];
  onRefreshDevices: () => Promise<void>;
}) => {
  const {
    step,
    deviceName,
    loading,
    wifiSsid,
    wifiPassword,
    configProgress,
    setDeviceName,
    setWifiSsid,
    setWifiPassword,
    handleScan,
    handleGetLocation,
    handleStartConfig,
    handleBind,
    handleFinish,
  } = useAddDeviceFlow({
    isOpen,
    userId,
    showToast,
    existingDevices,
    onBound: onClose,
    onRefreshDevices,
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/60 p-0 backdrop-blur-sm sm:items-center sm:p-6">
      <motion.div
        initial={{ y: '100%', opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: '100%', opacity: 0 }}
        className="w-full max-w-md space-y-8 rounded-t-[32px] bg-white p-8 sm:rounded-[32px]"
      >
        <div className="flex justify-center">
          <div className="h-1.5 w-12 rounded-full bg-slate-200" />
        </div>

        {step === 'scan' && (
          <div className="space-y-6 text-center">
            <div className="space-y-2">
              <h3 className="text-xl font-bold">第一步：扫码识别</h3>
              <p className="text-sm text-slate-500">
                请扫描设备机身上的二维码进行识别
              </p>
            </div>
            <div className="relative mx-auto flex h-48 w-48 items-center justify-center overflow-hidden rounded-3xl border-2 border-slate-50 bg-slate-100">
              <Scan size={64} className="text-slate-300" />
              <motion.div
                animate={{ y: [0, 192, 0] }}
                transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
                className="absolute left-0 right-0 top-0 h-0.5 bg-orange-500 shadow-[0_0_10px_rgba(249,115,22,0.5)]"
              />
            </div>
            <button
              onClick={handleScan}
              disabled={loading}
              className="flex w-full items-center justify-center space-x-2 rounded-2xl bg-orange-500 py-4 font-bold text-white shadow-lg shadow-orange-500/20"
            >
              {loading ? (
                <Loader2 className="animate-spin" size={20} />
              ) : (
                <span>模拟扫码</span>
              )}
            </button>
            <button onClick={onClose} className="text-sm font-medium text-slate-400">
              取消
            </button>
          </div>
        )}

        {step === 'location' && (
          <div className="space-y-6 text-center">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-blue-50 text-blue-500">
              <MapPin size={40} />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-bold">第二步：位置授权</h3>
              <p className="px-4 text-sm leading-relaxed text-slate-500">
                根据安全合规要求，绑定设备前需要先获取当前位置，用于判断设备安装环境。
              </p>
            </div>
            <div className="space-y-3">
              <button
                onClick={handleGetLocation}
                disabled={loading}
                className="flex w-full items-center justify-center space-x-2 rounded-2xl bg-orange-500 py-4 font-bold text-white shadow-lg shadow-orange-500/20"
              >
                {loading ? (
                  <Loader2 className="animate-spin" size={20} />
                ) : (
                  <span>开启定位并获取位置</span>
                )}
              </button>
            </div>
            <button onClick={onClose} className="text-sm font-medium text-slate-400">
              取消绑定
            </button>
          </div>
        )}

        {step === 'wifi' && (
          <div className="space-y-6">
            <div className="space-y-2 text-center">
              <h3 className="text-xl font-bold">第三步：一键配网</h3>
              <p className="text-sm text-slate-500">
                请输入当前环境下的 Wi-Fi 信息
              </p>
            </div>
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="ml-1 text-xs font-bold text-slate-700">
                  Wi-Fi 名称 (SSID)
                </label>
                <div className="relative">
                  <Wifi
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                    size={18}
                  />
                  <input
                    type="text"
                    value={wifiSsid}
                    onChange={(e) => setWifiSsid(e.target.value)}
                    className="w-full rounded-2xl bg-slate-50 py-4 pl-12 pr-4 font-medium outline-none transition-all focus:ring-2 focus:ring-orange-500"
                    placeholder="请输入 Wi-Fi 名称"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="ml-1 text-xs font-bold text-slate-700">
                  Wi-Fi 密码
                </label>
                <div className="relative">
                  <Lock
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                    size={18}
                  />
                  <input
                    type="password"
                    value={wifiPassword}
                    onChange={(e) => setWifiPassword(e.target.value)}
                    className="w-full rounded-2xl bg-slate-50 py-4 pl-12 pr-4 font-medium outline-none transition-all focus:ring-2 focus:ring-orange-500"
                    placeholder="请输入 Wi-Fi 密码"
                  />
                </div>
              </div>
            </div>
            <div className="flex items-start space-x-3 rounded-2xl bg-amber-50 p-4">
              <Info size={18} className="mt-0.5 shrink-0 text-amber-500" />
              <p className="text-[10px] leading-relaxed text-amber-700">
                请确认手机已连接到当前 Wi-Fi，且设备处于待配网状态。建议优先使用
                2.4GHz 网络。
              </p>
            </div>
            <button
              onClick={handleStartConfig}
              className="w-full rounded-2xl bg-orange-500 py-4 font-bold text-white shadow-lg shadow-orange-500/20"
            >
              开始一键配网
            </button>
          </div>
        )}

        {step === 'configuring' && (
          <div className="space-y-8 py-4 text-center">
            <div className="relative mx-auto h-32 w-32">
              <svg className="h-full w-full -rotate-90 transform">
                <circle
                  cx="64"
                  cy="64"
                  r="58"
                  stroke="currentColor"
                  strokeWidth="8"
                  fill="transparent"
                  className="text-slate-100"
                />
                <motion.circle
                  cx="64"
                  cy="64"
                  r="58"
                  stroke="currentColor"
                  strokeWidth="8"
                  fill="transparent"
                  strokeDasharray={364}
                  animate={{ strokeDashoffset: 364 - (364 * configProgress) / 100 }}
                  className="text-orange-500"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <Wifi size={32} className="animate-pulse text-orange-500" />
                <span className="mt-1 text-lg font-bold">
                  {Math.round(configProgress)}%
                </span>
              </div>
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-bold">正在配网中...</h3>
              <p className="text-sm text-slate-500">
                正在将 Wi-Fi 信息下发给设备，请稍候
              </p>
            </div>
            <div className="flex justify-center space-x-2">
              {[0, 0.2, 0.4].map((delay) => (
                <motion.div
                  key={delay}
                  animate={{ opacity: [0.3, 1, 0.3] }}
                  transition={{ repeat: Infinity, duration: 1, delay }}
                  className="h-2 w-2 rounded-full bg-orange-500"
                />
              ))}
            </div>
          </div>
        )}

        {step === 'naming' && (
          <div className="space-y-6">
            <div className="space-y-2 text-center">
              <h3 className="text-xl font-bold">第四步：设备命名</h3>
              <p className="text-sm text-slate-500">
                配网成功，请为您的新设备设置名称
              </p>
            </div>
            <div className="space-y-1">
              <label className="ml-1 text-xs font-bold text-slate-700">
                设备名称
              </label>
              <input
                type="text"
                value={deviceName}
                onChange={(e) => setDeviceName(e.target.value)}
                className="w-full rounded-2xl bg-slate-50 px-4 py-4 font-bold outline-none transition-all focus:ring-2 focus:ring-orange-500"
                placeholder="例如：厨房主灶"
              />
            </div>
            <button
              onClick={handleBind}
              disabled={loading}
              className="flex w-full items-center justify-center space-x-2 rounded-2xl bg-orange-500 py-4 font-bold text-white shadow-lg shadow-orange-500/20"
            >
              {loading ? (
                <Loader2 className="animate-spin" size={20} />
              ) : (
                <span>完成绑定</span>
              )}
            </button>
          </div>
        )}

        {step === 'success' && (
          <div className="space-y-6 py-4 text-center">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100 text-emerald-500">
              <CheckCircle2 size={48} />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-bold">绑定成功</h3>
              <p className="text-sm text-slate-500">
                您的设备已成功接入 AI 智能安全灶平台
              </p>
            </div>
            <button
              onClick={handleFinish}
              className="w-full rounded-2xl bg-slate-900 py-4 font-bold text-white"
            >
              开始使用
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
};
