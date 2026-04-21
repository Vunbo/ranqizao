/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Loader2 } from 'lucide-react';
import { Device, Home, FirebaseUser, Tab } from './shared/types';
import { Toast } from './shared/ui/Toast';
import { ConfirmDialog } from './shared/ui/ConfirmDialog';
import { BottomNavigation } from './shared/navigation/BottomNavigation';
import { AuthView, useFirebaseAuthUser } from './features/auth';
import { AddDeviceModal, DeviceDetailView, HomeView, useSelectedDeviceTelemetrySimulation, useUserDevices } from './features/devices';
import { useUserHomes } from './features/homes';
import { ProfileView } from './features/profile';
import { SafetyView } from './features/safety';

type ToastState = {
  message: string;
  type: 'info' | 'error' | 'success';
};

type ConfirmDialogState = {
  title: string;
  message: string;
  onConfirm: () => void;
  confirmText?: string;
};

type ProfileSubView = 'main' | 'devices' | 'sharing' | 'notifications' | 'homes';

export default function App() {
  const { user, authReady } = useFirebaseAuthUser();
  const { devices, refreshDevices } = useUserDevices(user);
  const { homes, refreshHomes } = useUserHomes(user);

  const [activeTab, setActiveTab] = useState<Tab>('home');
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);
  const [activeSubView, setActiveSubView] = useState<ProfileSubView>('main');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState | null>(null);
  const toastTimeoutRef = useRef<number | null>(null);

  useSelectedDeviceTelemetrySimulation(user, selectedDeviceId, devices);

  useEffect(() => {
    if (!selectedDeviceId) return;

    const selectedDeviceExists = devices.some((device) => device.id === selectedDeviceId);
    if (!selectedDeviceExists) {
      setSelectedDeviceId(null);
    }
  }, [devices, selectedDeviceId]);

  useEffect(() => {
    return () => {
      if (toastTimeoutRef.current !== null) {
        window.clearTimeout(toastTimeoutRef.current);
      }
    };
  }, []);

  const showToast = (
    message: string,
    type: ToastState['type'] = 'info'
  ) => {
    if (toastTimeoutRef.current !== null) {
      window.clearTimeout(toastTimeoutRef.current);
    }

    setToast({ message, type });
    toastTimeoutRef.current = window.setTimeout(() => {
      setToast(null);
      toastTimeoutRef.current = null;
    }, 3000);
  };

  const showConfirm = (
    title: string,
    message: string,
    onConfirm: () => void,
    confirmText?: string
  ) => {
    setConfirmDialog({ title, message, onConfirm, confirmText });
  };

  if (!authReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="animate-spin text-orange-500" size={40} />
      </div>
    );
  }

  if (!user) {
    return <AuthView onAuthSuccess={() => {}} showToast={showToast} />;
  }

  return (
    <div className="app-container flex flex-col">
      <AnimatePresence>
        {toast && (
          <Toast
            message={toast.message}
            type={toast.type}
            onClose={() => setToast(null)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {confirmDialog && (
          <ConfirmDialog
            title={confirmDialog.title}
            message={confirmDialog.message}
            confirmText={confirmDialog.confirmText}
            onConfirm={() => {
              confirmDialog.onConfirm();
              setConfirmDialog(null);
            }}
            onCancel={() => setConfirmDialog(null)}
          />
        )}
      </AnimatePresence>

      <div className="flex-1 overflow-y-auto px-5 pt-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {renderActiveView({
              activeTab,
              user,
              devices,
              homes,
              selectedDeviceId,
              activeSubView,
              setActiveSubView,
              onSelectDevice: setSelectedDeviceId,
              onBackFromDevice: () => setSelectedDeviceId(null),
              onAddDevice: () => setIsAddModalOpen(true),
              onRefreshDevices: refreshDevices,
              onRefreshHomes: refreshHomes,
              showToast,
              showConfirm
            })}
          </motion.div>
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {!selectedDeviceId && activeSubView === 'main' && !isAddModalOpen && (
          <BottomNavigation activeTab={activeTab} onChange={setActiveTab} />
        )}
      </AnimatePresence>

      <AddDeviceModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        userId={user?.uid}
        showToast={showToast}
        existingDevices={devices}
        onRefreshDevices={refreshDevices}
      />
    </div>
  );
}

function renderActiveView({
  activeTab,
  user,
  devices,
  homes,
  selectedDeviceId,
  activeSubView,
  setActiveSubView,
  onSelectDevice,
  onBackFromDevice,
  onAddDevice,
  onRefreshDevices,
  onRefreshHomes,
  showToast,
  showConfirm
}: {
  activeTab: Tab;
  user: FirebaseUser | null;
  devices: Device[];
  homes: Home[];
  selectedDeviceId: string | null;
  activeSubView: ProfileSubView;
  setActiveSubView: (view: ProfileSubView) => void;
  onSelectDevice: (id: string) => void;
  onBackFromDevice: () => void;
  onAddDevice: () => void;
  onRefreshDevices: () => Promise<void>;
  onRefreshHomes: () => Promise<void>;
  showToast: (message: string, type?: ToastState['type']) => void;
  showConfirm: (
    title: string,
    message: string,
    onConfirm: () => void,
    confirmText?: string
  ) => void;
}) {
  if (activeTab === 'home') {
    if (selectedDeviceId) {
      return (
        <DeviceDetailView
          device={devices.find((device) => device.id === selectedDeviceId)}
          devices={devices}
          user={user}
          onBack={onBackFromDevice}
          onRefreshDevices={onRefreshDevices}
          onRefreshHomes={onRefreshHomes}
          showToast={showToast}
          showConfirm={showConfirm}
        />
      );
    }

    return (
      <HomeView
        devices={devices}
        user={user}
        onSelectDevice={onSelectDevice}
        onAddDevice={onAddDevice}
      />
    );
  }

  if (activeTab === 'safety') {
    return <SafetyView devices={devices} user={user} />;
  }

  return (
    <ProfileView
      user={user}
      devices={devices}
      homes={homes}
      deviceCount={devices.length}
      showToast={showToast}
      showConfirm={showConfirm}
      activeSubView={activeSubView}
      setActiveSubView={setActiveSubView}
      onRefreshDevices={onRefreshDevices}
      onRefreshHomes={onRefreshHomes}
    />
  );
}
