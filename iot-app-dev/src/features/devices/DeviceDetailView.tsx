import React, { useEffect, useState } from 'react';
import { devicesApi } from '../../shared/api/devices';
import { Device, FirebaseUser } from '../../shared/types';
import { DeviceControlCard } from './components/DeviceControlCard';
import { DeviceCookingModes } from './components/DeviceCookingModes';
import { DeviceDetailHeader } from './components/DeviceDetailHeader';
import { DeviceRenameModal } from './components/DeviceRenameModal';
import { DeviceStatsGrid } from './components/DeviceStatsGrid';
import { ShareModal } from './modals/ShareModal';

export const DeviceDetailView = ({
  device,
  devices,
  user,
  onBack,
  onRefreshDevices,
  onRefreshHomes,
  showToast,
  showConfirm,
}: {
  device?: Device;
  devices: Device[];
  user: FirebaseUser | null;
  onBack: () => void;
  onRefreshDevices: () => Promise<void>;
  onRefreshHomes: () => Promise<void>;
  showToast: (msg: string, type?: any) => void;
  showConfirm: (
    title: string,
    msg: string,
    onConfirm: () => void,
    confirmText?: string
  ) => void;
}) => {
  const [isPending, setIsPending] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isRenameModalOpen, setIsRenameModalOpen] = useState(false);
  const [newName, setNewName] = useState(device?.name ?? '');
  const [confirmedIsOn, setConfirmedIsOn] = useState(device?.isOn ?? false);
  const [confirmedFireLevel, setConfirmedFireLevel] = useState(
    device?.fireLevel ?? 0
  );

  useEffect(() => {
    if (!device || isPending) {
      return;
    }

    setConfirmedIsOn(device.isOn);
    setConfirmedFireLevel(device.fireLevel);
  }, [device, isPending]);

  useEffect(() => {
    if (!device || isRenameModalOpen) {
      return;
    }

    setNewName(device.name);
  }, [device, isRenameModalOpen]);

  if (!device) {
    return null;
  }

  const displayIsOn = isPending ? confirmedIsOn : device.isOn;
  const displayFireLevel = isPending ? confirmedFireLevel : device.fireLevel;
  const isOwner = device.ownerId === user?.uid?.slice(0, 8);

  const logOperation = async (
    event: string,
    type: 'info' | 'warning' | 'success' = 'info'
  ) => {
    try {
      await devicesApi.createLog(device.id, { event, type });
    } catch (error) {
      console.error('Failed to log operation', error);
    }
  };

  const openRenameModal = () => {
    setNewName(device.name);
    setIsRenameModalOpen(true);
  };

  const handleToggle = async () => {
    if (isPending) {
      return;
    }

    if (!device.isOn) {
      showConfirm(
        '安全确认',
        '开启火源前，请确认厨房通风良好、灶台附近没有易燃物，并且现场有人看护。',
        async () => {
          setIsPending(true);
          try {
            await devicesApi.update(device.id, { isOn: true });
            await onRefreshDevices();
            await logOperation('远程开启火源', 'success');
            showToast('设备已开启', 'success');
          } catch (error) {
            showToast(
              error instanceof Error ? error.message : '操作失败，请重试',
              'error'
            );
          } finally {
            setIsPending(false);
          }
        }
      );
      return;
    }

    setIsPending(true);
    try {
      await devicesApi.update(device.id, { isOn: false });
      await onRefreshDevices();
      await logOperation('远程关闭火源', 'info');
      showToast('设备已关闭', 'info');
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : '操作失败，请重试',
        'error'
      );
    } finally {
      setIsPending(false);
    }
  };

  const handleFireLevel = async (level: number) => {
    if (!device.isOn || isPending) {
      return;
    }

    setIsPending(true);
    try {
      await devicesApi.update(device.id, { fireLevel: level });
      await onRefreshDevices();
      await logOperation(`调整火力至 ${level}%`, 'success');
      showToast(`火力已调整至 ${level}%`, 'success');
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : '调节失败，请重试',
        'error'
      );
    } finally {
      setIsPending(false);
    }
  };

  const handleDelete = () => {
    if (isPending) {
      return;
    }

    showConfirm(
      '删除设备',
      `确定要删除设备“${device.name}”吗？此操作不可撤销。`,
      async () => {
        setIsPending(true);
        try {
          await devicesApi.remove(device.id);
          await Promise.all([onRefreshDevices(), onRefreshHomes()]);
          onBack();
          showToast('设备已删除', 'success');
        } catch (error) {
          showToast(
            error instanceof Error ? error.message : '删除失败，请重试',
            'error'
          );
          setIsPending(false);
        }
      },
      '确认删除'
    );
  };

  const handleRename = async () => {
    const normalizedName = newName.trim();
    if (!normalizedName || isPending) {
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

    setIsPending(true);
    try {
      await devicesApi.update(device.id, { name: normalizedName });
      await onRefreshDevices();
      await logOperation(`重命名设备为“${normalizedName}”`, 'info');
      showToast('设备重命名成功', 'success');
      setIsRenameModalOpen(false);
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : '重命名失败，请重试',
        'error'
      );
    } finally {
      setIsPending(false);
    }
  };

  return (
    <div className="space-y-6 pb-20">
      <DeviceDetailHeader
        device={device}
        isOwner={isOwner}
        onBack={onBack}
        onRename={openRenameModal}
        onShare={() => setIsShareModalOpen(true)}
        onDelete={handleDelete}
      />

      <DeviceRenameModal
        isOpen={isRenameModalOpen}
        value={newName}
        isPending={isPending}
        onChange={setNewName}
        onClose={() => setIsRenameModalOpen(false)}
        onConfirm={handleRename}
      />

      {isShareModalOpen && (
        <ShareModal
          device={device}
          onClose={() => setIsShareModalOpen(false)}
          onRefreshDevices={onRefreshDevices}
          showToast={showToast}
        />
      )}

      <DeviceControlCard
        displayIsOn={displayIsOn}
        displayFireLevel={displayFireLevel}
        isPending={isPending}
        onFireLevelChange={handleFireLevel}
        onToggle={handleToggle}
      />

      <DeviceStatsGrid device={device} />

      <DeviceCookingModes
        displayIsOn={displayIsOn}
        displayFireLevel={displayFireLevel}
        isPending={isPending}
        onFireLevelChange={handleFireLevel}
      />
    </div>
  );
};
