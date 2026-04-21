import React, { useEffect, useState } from 'react';
import { AnimatePresence } from 'motion/react';
import { ArrowLeft, Plus } from 'lucide-react';
import { homesApi } from '../../shared/api/homes';
import { Device, FirebaseUser, Home } from '../../shared/types';
import { CreateHomeModal } from './components/CreateHomeModal';
import { HomeDetailOverlay } from './components/HomeDetailOverlay';
import { HomeList } from './components/HomeList';

export const HomeManagementView = ({
  homes,
  devices,
  user,
  onBack,
  showToast,
  showConfirm,
  onRefreshHomes,
}: {
  homes: Home[];
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
  onRefreshHomes: () => Promise<void>;
}) => {
  const [isAddHomeModalOpen, setIsAddHomeModalOpen] = useState(false);
  const [newHomeName, setNewHomeName] = useState('');
  const [editingHomeId, setEditingHomeId] = useState<string | null>(null);
  const [isAdjusting, setIsAdjusting] = useState(false);
  const [tempSelectedDeviceIds, setTempSelectedDeviceIds] = useState<string[]>(
    []
  );
  const [isSaving, setIsSaving] = useState(false);
  const [isRefreshingLinks, setIsRefreshingLinks] = useState(false);
  const [pendingDeviceIds, setPendingDeviceIds] = useState<string[] | null>(null);

  const currentEditingHome = homes.find((home) => home.id === editingHomeId);

  useEffect(() => {
    if (!isRefreshingLinks || !pendingDeviceIds || !currentEditingHome) {
      return;
    }

    const currentIds = [...(currentEditingHome.deviceIds || [])].sort();
    const expectedIds = [...pendingDeviceIds].sort();
    const isSynced =
      currentIds.length === expectedIds.length &&
      currentIds.every((id, index) => id === expectedIds[index]);

    if (isSynced) {
      setIsRefreshingLinks(false);
      setPendingDeviceIds(null);
    }
  }, [currentEditingHome, isRefreshingLinks, pendingDeviceIds]);

  const resetOverlayState = () => {
    setEditingHomeId(null);
    setIsAdjusting(false);
    setTempSelectedDeviceIds([]);
    setIsRefreshingLinks(false);
    setPendingDeviceIds(null);
  };

  const handleStartAdjust = () => {
    setTempSelectedDeviceIds(currentEditingHome?.deviceIds || []);
    setIsAdjusting(true);
  };

  const handleCancelAdjust = () => {
    setIsAdjusting(false);
    setTempSelectedDeviceIds([]);
  };

  const handleCreateHome = async () => {
    if (!newHomeName.trim() || !user) {
      return;
    }

    const shortUid = user.uid.slice(0, 8);
    const isDuplicate = homes.some(
      (home) =>
        home.ownerId === shortUid && home.name.trim() === newHomeName.trim()
    );

    if (isDuplicate) {
      showToast('家庭名称已存在，请更换一个名称', 'error');
      return;
    }

    try {
      await homesApi.create(newHomeName.trim());
      await onRefreshHomes();
      setNewHomeName('');
      setIsAddHomeModalOpen(false);
      showToast('家庭创建成功', 'success');
    } catch (error) {
      showToast(error instanceof Error ? error.message : '创建失败', 'error');
    }
  };

  const handleDeleteHome = (home: Home) => {
    showConfirm(
      '删除家庭',
      `确定要删除家庭“${home.name}”吗？删除后，成员权限将被移除，已关联设备会恢复为未归属状态。`,
      async () => {
        try {
          await homesApi.remove(home.id);
          await onRefreshHomes();
          resetOverlayState();
          showToast('家庭已删除', 'success');
        } catch (error) {
          showToast(error instanceof Error ? error.message : '删除失败', 'error');
        }
      },
      '确认删除'
    );
  };

  const handleSaveDeviceLinks = async () => {
    if (!currentEditingHome) {
      return;
    }

    setIsSaving(true);
    try {
      const nextDeviceIds = [...tempSelectedDeviceIds];
      await homesApi.updateDeviceLinks(currentEditingHome.id, nextDeviceIds);
      void onRefreshHomes();
      showToast('关联已更新', 'success');
      setIsAdjusting(false);
      setTempSelectedDeviceIds([]);
      setPendingDeviceIds(nextDeviceIds);
      setIsRefreshingLinks(true);
    } catch (error) {
      console.error('Save device links error:', error);
      showToast(error instanceof Error ? error.message : '保存失败', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const toggleTempDevice = (deviceId: string) => {
    setTempSelectedDeviceIds((prev) =>
      prev.includes(deviceId)
        ? prev.filter((id) => id !== deviceId)
        : [...prev, deviceId]
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center space-x-3">
          <button
            onClick={onBack}
            className="rounded-xl border border-slate-100 bg-white p-2 shadow-sm transition-transform active:scale-90"
          >
            <ArrowLeft size={20} className="text-slate-600" />
          </button>
          <h2 className="font-display text-xl font-bold">家庭管理</h2>
        </div>
        <button
          onClick={() => setIsAddHomeModalOpen(true)}
          className="rounded-xl bg-orange-50 p-2 text-orange-500 transition-transform active:scale-90"
        >
          <Plus size={20} />
        </button>
      </div>

      <HomeList homes={homes} onSelect={setEditingHomeId} />

      <AnimatePresence>
        {currentEditingHome && (
          <HomeDetailOverlay
            home={currentEditingHome}
            devices={devices}
            user={user}
            isAdjusting={isAdjusting}
            tempSelectedDeviceIds={tempSelectedDeviceIds}
            isSaving={isSaving}
            isRefreshingLinks={isRefreshingLinks}
            onClose={resetOverlayState}
            onDelete={() => handleDeleteHome(currentEditingHome)}
            onStartAdjust={handleStartAdjust}
            onCancelAdjust={handleCancelAdjust}
            onToggleDevice={toggleTempDevice}
            onSave={() => void handleSaveDeviceLinks()}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        <CreateHomeModal
          isOpen={isAddHomeModalOpen}
          value={newHomeName}
          onChange={setNewHomeName}
          onClose={() => setIsAddHomeModalOpen(false)}
          onConfirm={() => void handleCreateHome()}
        />
      </AnimatePresence>
    </div>
  );
};
