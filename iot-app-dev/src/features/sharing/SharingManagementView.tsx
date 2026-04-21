import React, { useState } from 'react';
import { AnimatePresence } from 'motion/react';
import { ArrowLeft, Home as HomeIcon, Users, Zap } from 'lucide-react';
import { devicesApi } from '../../shared/api/devices';
import { homesApi } from '../../shared/api/homes';
import { cn } from '../../shared/lib/utils';
import { Device, FirebaseUser, Home } from '../../shared/types';
import { FriendShareCard } from './components/FriendShareCard';
import { SharingEmptyState } from './components/SharingEmptyState';
import {
  DeviceShareCardIcon,
  HomeShareCardIcon,
  OwnedShareCard,
} from './components/OwnedShareCard';
import {
  AddMemberModal,
  RemoveMembersModal,
} from './components/SharingMemberModals';
import { ShareResourceTarget } from './components/types';

export const SharingManagementView = ({
  devices,
  homes,
  user,
  onBack,
  showToast,
  showConfirm: _showConfirm,
  onRefreshDevices,
  onRefreshHomes,
}: {
  devices: Device[];
  homes: Home[];
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
  const [mainTab, setMainTab] = useState<'my' | 'friends'>('my');
  const [subTab, setSubTab] = useState<'home' | 'device'>('home');
  const [isAddMemberModalOpen, setIsAddMemberModalOpen] = useState(false);
  const [isRemoveMemberModalOpen, setIsRemoveMemberModalOpen] = useState(false);
  const [memberUidInput, setMemberUidInput] = useState('');
  const [selectedUidsToRemove, setSelectedUidsToRemove] = useState<string[]>([]);
  const [targetResource, setTargetResource] = useState<ShareResourceTarget | null>(
    null
  );

  const shortUid = user?.uid?.slice(0, 8) || '';
  const ownerLabel = user?.displayName || user?.uid?.slice(0, 8) || '我';
  const myHomes = homes.filter((home) => home.ownerId === shortUid);
  const myDevices = devices.filter((device) => device.ownerId === shortUid);
  const friendHomes = homes.filter(
    (home) => home.ownerId !== shortUid && home.members?.includes(shortUid)
  );
  const friendDevices = devices.filter(
    (device) =>
      device.ownerId !== shortUid && device.sharedWith?.includes(shortUid)
  );

  const handleOpenAddMember = (resource: ShareResourceTarget) => {
    setTargetResource(resource);
    setMemberUidInput('');
    setIsAddMemberModalOpen(true);
  };

  const handleOpenRemoveModal = (resource: ShareResourceTarget) => {
    if (resource.currentMembers.length === 0) {
      showToast('暂无可移除的成员', 'info');
      return;
    }

    setTargetResource(resource);
    setSelectedUidsToRemove([]);
    setIsRemoveMemberModalOpen(true);
  };

  const handleConfirmAddMember = async () => {
    if (!memberUidInput.trim() || !targetResource) {
      return;
    }

    const uid = memberUidInput.trim();
    if (uid === shortUid) {
      showToast('不能添加自己', 'error');
      return;
    }

    if (uid.length !== 8) {
      showToast('请输入 8 位 UID', 'error');
      return;
    }

    if (targetResource.currentMembers.includes(uid)) {
      showToast('该成员已存在', 'info');
      return;
    }

    try {
      if (targetResource.type === 'home') {
        await homesApi.addMember(targetResource.id, uid);
        await onRefreshHomes();
        showToast('家庭成员添加成功', 'success');
      } else {
        await devicesApi.share(targetResource.id, uid);
        await onRefreshDevices();
        showToast('设备共享成功', 'success');
      }

      setIsAddMemberModalOpen(false);
    } catch (error) {
      showToast(error instanceof Error ? error.message : '添加失败', 'error');
    }
  };

  const handleConfirmRemoveMembers = async () => {
    if (selectedUidsToRemove.length === 0 || !targetResource) {
      return;
    }

    try {
      if (targetResource.type === 'home') {
        await homesApi.removeMembers(targetResource.id, selectedUidsToRemove);
        await onRefreshHomes();
        showToast('家庭成员移除成功', 'success');
      } else {
        await Promise.all(
          selectedUidsToRemove.map((uid) =>
            devicesApi.unshare(targetResource.id, uid)
          )
        );
        await onRefreshDevices();
        showToast('已取消共享', 'success');
      }

      setIsRemoveMemberModalOpen(false);
    } catch (error) {
      showToast(error instanceof Error ? error.message : '操作失败', 'error');
    }
  };

  const toggleUidSelection = (uid: string) => {
    setSelectedUidsToRemove((prev) =>
      prev.includes(uid) ? prev.filter((id) => id !== uid) : [...prev, uid]
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
        <h2 className="font-display text-xl font-bold">共享管理</h2>
      </div>

      <div className="flex space-x-4 px-1">
        <button
          onClick={() => setMainTab('my')}
          className={cn(
            'border-b-2 pb-2 text-sm font-bold transition-all',
            mainTab === 'my'
              ? 'border-orange-500 text-slate-900'
              : 'border-transparent text-slate-400'
          )}
        >
          我的共享
        </button>
        <button
          onClick={() => setMainTab('friends')}
          className={cn(
            'border-b-2 pb-2 text-sm font-bold transition-all',
            mainTab === 'friends'
              ? 'border-orange-500 text-slate-900'
              : 'border-transparent text-slate-400'
          )}
        >
          好友共享
        </button>
      </div>

      <div className="flex rounded-2xl bg-slate-100 p-1">
        <button
          onClick={() => setSubTab('home')}
          className={cn(
            'flex-1 rounded-xl py-2 text-xs font-bold transition-all',
            subTab === 'home'
              ? 'bg-white text-orange-500 shadow-sm'
              : 'text-slate-500'
          )}
        >
          家庭共享
        </button>
        <button
          onClick={() => setSubTab('device')}
          className={cn(
            'flex-1 rounded-xl py-2 text-xs font-bold transition-all',
            subTab === 'device'
              ? 'bg-white text-orange-500 shadow-sm'
              : 'text-slate-500'
          )}
        >
          设备共享
        </button>
      </div>

      <div className="space-y-4">
        {mainTab === 'my' && subTab === 'home' &&
          (myHomes.length === 0 ? (
            <SharingEmptyState icon={HomeIcon} message="暂无家庭共享记录" />
          ) : (
            myHomes.map((home) => (
              <div key={home.id}>
                <OwnedShareCard
                  title={home.name}
                  memberIds={home.members || []}
                  ownerLabel={ownerLabel}
                  icon={HomeShareCardIcon}
                  accent="blue"
                  onAdd={() =>
                    handleOpenAddMember({
                      type: 'home',
                      id: home.id,
                      currentMembers: home.members || [],
                    })
                  }
                  onRemove={() =>
                    handleOpenRemoveModal({
                      type: 'home',
                      id: home.id,
                      currentMembers: home.members || [],
                    })
                  }
                />
              </div>
            ))
          ))}

        {mainTab === 'my' && subTab === 'device' &&
          (myDevices.length === 0 ? (
            <SharingEmptyState icon={DeviceShareCardIcon} message="暂无设备共享记录" />
          ) : (
            myDevices.map((device) => (
              <div key={device.id}>
                <OwnedShareCard
                  title={device.name}
                  memberIds={device.sharedWith || []}
                  ownerLabel={ownerLabel}
                  icon={DeviceShareCardIcon}
                  accent="orange"
                  onAdd={() =>
                    handleOpenAddMember({
                      type: 'device',
                      id: device.id,
                      currentMembers: device.sharedWith || [],
                    })
                  }
                  onRemove={() =>
                    handleOpenRemoveModal({
                      type: 'device',
                      id: device.id,
                      currentMembers: device.sharedWith || [],
                    })
                  }
                />
              </div>
            ))
          ))}

        {mainTab === 'friends' && subTab === 'home' &&
          (friendHomes.length === 0 ? (
            <SharingEmptyState icon={Users} message="暂无好友共享的家庭" />
          ) : (
            friendHomes.map((home) => (
              <div key={home.id}>
                <FriendShareCard
                  title={home.name}
                  ownerId={home.ownerId}
                  icon={HomeShareCardIcon}
                  accent="blue"
                />
              </div>
            ))
          ))}

        {mainTab === 'friends' && subTab === 'device' &&
          (friendDevices.length === 0 ? (
            <SharingEmptyState icon={Zap} message="暂无好友共享的设备" />
          ) : (
            friendDevices.map((device) => (
              <div key={device.id}>
                <FriendShareCard
                  title={device.name}
                  ownerId={device.ownerId}
                  icon={DeviceShareCardIcon}
                  accent="orange"
                />
              </div>
            ))
          ))}
      </div>

      <AnimatePresence>
        <AddMemberModal
          isOpen={isAddMemberModalOpen}
          memberUidInput={memberUidInput}
          onInputChange={setMemberUidInput}
          onClose={() => setIsAddMemberModalOpen(false)}
          onConfirm={() => void handleConfirmAddMember()}
        />

        <RemoveMembersModal
          isOpen={isRemoveMemberModalOpen}
          targetResource={targetResource}
          selectedUidsToRemove={selectedUidsToRemove}
          onToggleUid={toggleUidSelection}
          onClose={() => setIsRemoveMemberModalOpen(false)}
          onConfirm={() => void handleConfirmRemoveMembers()}
        />
      </AnimatePresence>
    </div>
  );
};
