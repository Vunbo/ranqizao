<template>
  <view class="sharing-view">
    <view class="sharing-view__header">
      <view class="sharing-view__back" @tap="emit('back')">
        <app-icon name="arrowLeft" :size="18" color="#475569" />
      </view>
      <text class="sharing-view__title">共享管理</text>
    </view>

    <view class="sharing-view__main-tabs">
      <view
        class="sharing-view__main-tab"
        :class="{ 'sharing-view__main-tab--active': mainTab === 'my' }"
        @tap="mainTab = 'my'"
      >
        <text class="sharing-view__main-tab-text">我的共享</text>
      </view>
      <view
        class="sharing-view__main-tab"
        :class="{ 'sharing-view__main-tab--active': mainTab === 'friends' }"
        @tap="mainTab = 'friends'"
      >
        <text class="sharing-view__main-tab-text">好友共享</text>
      </view>
    </view>

    <view class="sharing-view__sub-tabs">
      <view
        class="sharing-view__sub-tab"
        :class="{ 'sharing-view__sub-tab--active': subTab === 'home' }"
        @tap="subTab = 'home'"
      >
        <text class="sharing-view__sub-tab-text">家庭共享</text>
      </view>
      <view
        class="sharing-view__sub-tab"
        :class="{ 'sharing-view__sub-tab--active': subTab === 'device' }"
        @tap="subTab = 'device'"
      >
        <text class="sharing-view__sub-tab-text">设备共享</text>
      </view>
    </view>

    <template v-if="mainTab === 'my' && subTab === 'home'">
      <view v-if="!myHomes.length" class="sharing-view__empty">
        <view class="sharing-view__empty-icon">
          <app-icon name="home" :size="26" color="#cbd5e1" />
        </view>
        <text class="sharing-view__empty-text">暂无家庭共享记录</text>
      </view>
      <card-box
        v-for="home in myHomes"
        :key="home.id"
        custom-style="padding:16px; margin-bottom:12px;"
      >
        <view class="sharing-view__owned-card">
          <view class="sharing-view__owned-head">
            <view class="sharing-view__owned-title-wrap">
              <view class="sharing-view__owned-icon sharing-view__owned-icon--blue">
                <app-icon name="home" :size="16" color="#3b82f6" />
              </view>
              <text class="sharing-view__owned-title">{{ home.name }}</text>
            </view>
            <view class="sharing-view__badge sharing-view__badge--blue">
              <text class="sharing-view__badge-text">{{ (home.members || []).length }} 位成员</text>
            </view>
          </view>
          <view class="sharing-view__member-grid">
            <view class="sharing-view__member-card">
              <view class="sharing-view__member-avatar sharing-view__member-avatar--owner">
                <app-icon name="user" :size="18" color="#f97316" />
              </view>
              <text class="sharing-view__member-id line-clamp-1">{{ ownerLabel }}</text>
            </view>
            <view v-for="uid in home.members || []" :key="uid" class="sharing-view__member-card">
              <view class="sharing-view__member-avatar">
                <app-icon name="user" :size="18" color="#94a3b8" />
              </view>
              <text class="sharing-view__member-id line-clamp-1">{{ getHomeMemberDisplayName(home, uid) }}</text>
            </view>
            <view class="sharing-view__member-card" @tap="openAddMember('home', home.id, home.members || [])">
              <view class="sharing-view__member-dashed">
                <app-icon name="plus" :size="16" color="#cbd5e1" />
              </view>
              <text class="sharing-view__member-id">添加</text>
            </view>
            <view class="sharing-view__member-card" @tap="openRemoveMember('home', home.id, home.members || [])">
              <view class="sharing-view__member-dashed">
                <app-icon name="minus" :size="16" color="#cbd5e1" />
              </view>
              <text class="sharing-view__member-id">移除</text>
            </view>
          </view>
        </view>
      </card-box>
    </template>

    <template v-if="mainTab === 'my' && subTab === 'device'">
      <view v-if="!myDevices.length" class="sharing-view__empty">
        <view class="sharing-view__empty-icon">
          <app-icon name="flame" :size="26" color="#cbd5e1" />
        </view>
        <text class="sharing-view__empty-text">暂无设备共享记录</text>
      </view>
      <card-box
        v-for="device in myDevices"
        :key="device.id"
        custom-style="padding:16px; margin-bottom:12px;"
      >
        <view class="sharing-view__owned-card">
          <view class="sharing-view__owned-head">
            <view class="sharing-view__owned-title-wrap">
              <view class="sharing-view__owned-icon sharing-view__owned-icon--orange">
                <app-icon name="flame" :size="16" color="#f97316" />
              </view>
              <text class="sharing-view__owned-title">{{ device.name }}</text>
            </view>
            <view class="sharing-view__badge">
              <text class="sharing-view__badge-text">{{ (device.sharedWith || []).length }} 位成员</text>
            </view>
          </view>
          <view class="sharing-view__member-grid">
            <view class="sharing-view__member-card">
              <view class="sharing-view__member-avatar sharing-view__member-avatar--owner">
                <app-icon name="user" :size="18" color="#f97316" />
              </view>
              <text class="sharing-view__member-id line-clamp-1">{{ ownerLabel }}</text>
            </view>
            <view v-for="uid in device.sharedWith || []" :key="uid" class="sharing-view__member-card">
              <view class="sharing-view__member-avatar">
                <app-icon name="user" :size="18" color="#94a3b8" />
              </view>
              <text class="sharing-view__member-id line-clamp-1">{{ getDeviceMemberDisplayName(device, uid) }}</text>
            </view>
            <view class="sharing-view__member-card" @tap="openAddMember('device', device.id, device.sharedWith || [])">
              <view class="sharing-view__member-dashed">
                <app-icon name="plus" :size="16" color="#cbd5e1" />
              </view>
              <text class="sharing-view__member-id">添加</text>
            </view>
            <view class="sharing-view__member-card" @tap="openRemoveMember('device', device.id, device.sharedWith || [])">
              <view class="sharing-view__member-dashed">
                <app-icon name="minus" :size="16" color="#cbd5e1" />
              </view>
              <text class="sharing-view__member-id">移除</text>
            </view>
          </view>
        </view>
      </card-box>
    </template>

    <template v-if="mainTab === 'friends' && subTab === 'home'">
      <view v-if="!friendHomes.length" class="sharing-view__empty">
        <view class="sharing-view__empty-icon">
          <app-icon name="users" :size="26" color="#cbd5e1" />
        </view>
        <text class="sharing-view__empty-text">暂无好友共享的家庭</text>
      </view>
      <card-box
        v-for="home in friendHomes"
        :key="home.id"
        custom-style="padding:16px; margin-bottom:12px;"
      >
        <view class="sharing-view__friend-row">
          <view class="sharing-view__owned-title-wrap">
            <view class="sharing-view__owned-icon sharing-view__owned-icon--blue">
              <app-icon name="home" :size="16" color="#3b82f6" />
            </view>
            <view>
              <text class="sharing-view__owned-title">{{ home.name }}</text>
              <text class="sharing-view__friend-meta">所有者：{{ getOwnerDisplayName(home) }}</text>
            </view>
          </view>
          <view class="sharing-view__badge sharing-view__badge--blue">
            <text class="sharing-view__badge-text">已加入</text>
          </view>
        </view>
      </card-box>
    </template>

    <template v-if="mainTab === 'friends' && subTab === 'device'">
      <view v-if="!friendDevices.length" class="sharing-view__empty">
        <view class="sharing-view__empty-icon">
          <app-icon name="flame" :size="26" color="#cbd5e1" />
        </view>
        <text class="sharing-view__empty-text">暂无好友共享的设备</text>
      </view>
      <card-box
        v-for="device in friendDevices"
        :key="device.id"
        custom-style="padding:16px; margin-bottom:12px;"
      >
        <view class="sharing-view__friend-row">
          <view class="sharing-view__owned-title-wrap">
            <view class="sharing-view__owned-icon sharing-view__owned-icon--orange">
              <app-icon name="flame" :size="16" color="#f97316" />
            </view>
            <view>
              <text class="sharing-view__owned-title">{{ device.name }}</text>
              <text class="sharing-view__friend-meta">所有者：{{ getOwnerDisplayName(device) }}</text>
            </view>
          </view>
          <view class="sharing-view__badge">
            <text class="sharing-view__badge-text">已共享</text>
          </view>
        </view>
      </card-box>
    </template>

    <view v-if="isAddMemberModalOpen" class="modal-mask" @tap="isAddMemberModalOpen = false">
      <view class="sharing-view__modal" @tap.stop>
        <text class="sharing-view__modal-title">添加成员</text>
        <text class="sharing-view__modal-desc">请输入对方的 UID，确认后立即建立共享关系</text>
        <view class="sharing-view__input">
          <input
            v-model="memberUidInput"
            class="sharing-view__input-core sharing-view__input-core--mono"
            placeholder="输入 8 位 UID"
            placeholder-style="color:#94a3b8"
          />
        </view>
        <view class="sharing-view__help">
          <text class="sharing-view__help-text">
            你可以在“我的”页面顶部复制自己的 UID，再发送给家人或朋友进行关联。
          </text>
        </view>
        <view class="sharing-view__modal-actions">
          <view class="sharing-view__modal-ghost" @tap="isAddMemberModalOpen = false">
            <text class="sharing-view__modal-ghost-text">取消</text>
          </view>
          <view class="sharing-view__modal-primary" @tap="confirmAddMember">
            <text class="sharing-view__modal-primary-text">确认添加</text>
          </view>
        </view>
      </view>
    </view>

    <view v-if="isRemoveMemberModalOpen && targetResource" class="modal-mask" @tap="isRemoveMemberModalOpen = false">
      <view class="sharing-view__modal" @tap.stop>
        <text class="sharing-view__modal-title">移除成员</text>
        <text class="sharing-view__modal-desc">勾选需要移除的成员</text>
        <view v-for="uid in targetResource.currentMembers" :key="uid" class="sharing-view__remove-row" @tap="toggleUid(uid)">
          <view class="sharing-view__remove-user">
            <view class="sharing-view__member-avatar">
              <app-icon name="user" :size="16" color="#94a3b8" />
            </view>
            <text class="sharing-view__remove-id">{{ getTargetMemberDisplayName(uid) }}</text>
          </view>
          <view class="sharing-view__tick" :class="{ 'sharing-view__tick--active': selectedUidsToRemove.includes(uid) }">
            <app-icon v-if="selectedUidsToRemove.includes(uid)" name="check" :size="10" color="#ffffff" />
          </view>
        </view>
        <view class="sharing-view__modal-actions">
          <view class="sharing-view__modal-ghost" @tap="isRemoveMemberModalOpen = false">
            <text class="sharing-view__modal-ghost-text">取消</text>
          </view>
          <view class="sharing-view__modal-danger" @tap="confirmRemoveMember">
            <text class="sharing-view__modal-primary-text">确认移除 ({{ selectedUidsToRemove.length }})</text>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { computed, ref } from 'vue'
import AppIcon from '../ui/AppIcon.vue'
import CardBox from '../ui/CardBox.vue'
import {
  addHomeMember,
  removeHomeMembers,
  shareDevice,
  unshareDevice,
} from '../../services/gateway'

const props = defineProps({
  devices: {
    type: Array,
    default: () => [],
  },
  homes: {
    type: Array,
    default: () => [],
  },
  user: {
    type: Object,
    default: null,
  },
})

const emit = defineEmits(['back', 'toast', 'refresh'])

const mainTab = ref('my')
const subTab = ref('home')
const isAddMemberModalOpen = ref(false)
const isRemoveMemberModalOpen = ref(false)
const memberUidInput = ref('')
const selectedUidsToRemove = ref([])
const targetResource = ref(null)

const shortUid = computed(() => {
  return props.user && props.user.uid ? props.user.uid.slice(0, 8) : ''
})

const ownerLabel = computed(() => {
  if (props.user && props.user.displayName) {
    return props.user.displayName
  }
  return shortUid.value || '--------'
})

const myHomes = computed(() => {
  return props.homes.filter((home) => home.ownerId === shortUid.value)
})

const myDevices = computed(() => {
  return props.devices.filter((device) => device.ownerId === shortUid.value)
})

const friendHomes = computed(() => {
  return props.homes.filter((home) => {
    return home.ownerId !== shortUid.value && (home.members || []).includes(shortUid.value)
  })
})

const friendDevices = computed(() => {
  return props.devices.filter((device) => {
    return device.ownerId !== shortUid.value && (device.sharedWith || []).includes(shortUid.value)
  })
})

function getOwnerDisplayName(resource) {
  if (resource && resource.ownerDisplayName) {
    return resource.ownerDisplayName
  }
  return resource && resource.ownerId ? resource.ownerId : '--------'
}

function getHomeMemberDisplayName(home, uid) {
  const memberProfiles = home && Array.isArray(home.memberProfiles) ? home.memberProfiles : []
  const matchedProfile = memberProfiles.find((profile) => profile && profile.uid === uid)
  return matchedProfile && matchedProfile.displayName ? matchedProfile.displayName : uid
}

function getDeviceMemberDisplayName(device, uid) {
  const sharedProfiles = device && Array.isArray(device.sharedWithProfiles) ? device.sharedWithProfiles : []
  const matchedProfile = sharedProfiles.find((profile) => profile && profile.uid === uid)
  return matchedProfile && matchedProfile.displayName ? matchedProfile.displayName : uid
}

function getTargetMemberDisplayName(uid) {
  if (!targetResource.value || !targetResource.value.displayMap) {
    return uid
  }
  return targetResource.value.displayMap[uid] || uid
}

function buildDisplayMap(currentMembers, resolver) {
  return currentMembers.reduce((result, uid) => {
    result[uid] = resolver(uid)
    return result
  }, {})
}

function openAddMember(type, id, currentMembers) {
  targetResource.value = {
    type,
    id,
    currentMembers,
  }
  memberUidInput.value = ''
  isAddMemberModalOpen.value = true
}

function openRemoveMember(type, id, currentMembers) {
  if (!currentMembers.length) {
    emit('toast', {
      message: '暂无可移除的成员',
      type: 'info',
    })
    return
  }
  targetResource.value = {
    type,
    id,
    currentMembers,
    displayMap:
      type === 'home'
        ? buildDisplayMap(
            currentMembers,
            (uid) => getHomeMemberDisplayName(myHomes.value.find((home) => home.id === id), uid)
          )
        : buildDisplayMap(
            currentMembers,
            (uid) => getDeviceMemberDisplayName(myDevices.value.find((device) => device.id === id), uid)
          ),
  }
  selectedUidsToRemove.value = []
  isRemoveMemberModalOpen.value = true
}

async function confirmAddMember() {
  if (!targetResource.value) {
    return
  }
  const uid = String(memberUidInput.value || '').trim()
  if (!uid) {
    return
  }
  if (uid === shortUid.value) {
    emit('toast', {
      message: '不能添加自己',
      type: 'error',
    })
    return
  }
  if (uid.length !== 8) {
    emit('toast', {
      message: '请输入 8 位 UID',
      type: 'error',
    })
    return
  }
  if (targetResource.value.currentMembers.includes(uid)) {
    emit('toast', {
      message: '该成员已存在',
      type: 'info',
    })
    return
  }

  try {
    if (targetResource.value.type === 'home') {
      await addHomeMember(targetResource.value.id, uid)
    } else {
      await shareDevice(targetResource.value.id, uid)
    }
    emit('refresh')
    emit('toast', {
      message: targetResource.value.type === 'home' ? '家庭成员添加成功' : '设备共享成功',
      type: 'success',
    })
    isAddMemberModalOpen.value = false
  } catch (requestError) {
    emit('toast', {
      message: requestError.message || '添加失败',
      type: 'error',
    })
  }
}

function toggleUid(uid) {
  if (selectedUidsToRemove.value.includes(uid)) {
    selectedUidsToRemove.value = selectedUidsToRemove.value.filter((item) => item !== uid)
    return
  }
  selectedUidsToRemove.value = selectedUidsToRemove.value.concat(uid)
}

async function confirmRemoveMember() {
  if (!targetResource.value || !selectedUidsToRemove.value.length) {
    return
  }
  try {
    if (targetResource.value.type === 'home') {
      await removeHomeMembers(targetResource.value.id, selectedUidsToRemove.value.slice())
    } else {
      await Promise.all(
        selectedUidsToRemove.value.map((uid) => unshareDevice(targetResource.value.id, uid))
      )
    }
    emit('refresh')
    emit('toast', {
      message: targetResource.value.type === 'home' ? '家庭成员移除成功' : '已取消共享',
      type: 'success',
    })
    isRemoveMemberModalOpen.value = false
  } catch (requestError) {
    emit('toast', {
      message: requestError.message || '操作失败',
      type: 'error',
    })
  }
}
</script>

<style scoped>
.sharing-view__header {
  display: flex;
  align-items: center;
  margin-bottom: 18px;
}

.sharing-view__back {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 14px;
}

.sharing-view__title {
  margin-left: 12px;
  font-size: 20px;
  font-weight: 700;
  font-family: 'Outfit', sans-serif;
}

.sharing-view__main-tabs {
  display: flex;
  gap: 20px;
  margin-bottom: 12px;
}

.sharing-view__main-tab {
  padding-bottom: 8px;
  border-bottom: 2px solid transparent;
}

.sharing-view__main-tab--active {
  border-bottom-color: #f97316;
}

.sharing-view__main-tab-text {
  font-size: 14px;
  font-weight: 700;
  color: #94a3b8;
}

.sharing-view__main-tab--active .sharing-view__main-tab-text {
  color: #0f172a;
}

.sharing-view__sub-tabs {
  display: flex;
  padding: 4px;
  margin-bottom: 16px;
  background: #e2e8f0;
  border-radius: 16px;
}

.sharing-view__sub-tab {
  display: flex;
  flex: 1;
  align-items: center;
  justify-content: center;
  height: 38px;
  border-radius: 12px;
}

.sharing-view__sub-tab--active {
  background: #ffffff;
}

.sharing-view__sub-tab-text {
  font-size: 12px;
  font-weight: 700;
  color: #64748b;
}

.sharing-view__sub-tab--active .sharing-view__sub-tab-text {
  color: #f97316;
}

.sharing-view__empty {
  padding: 46px 0;
  text-align: center;
}

.sharing-view__empty-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 64px;
  height: 64px;
  margin: 0 auto;
  background: #f8fafc;
  border-radius: 32px;
}

.sharing-view__empty-text {
  display: block;
  margin-top: 12px;
  font-size: 12px;
  color: #94a3b8;
}

.sharing-view__owned-head,
.sharing-view__friend-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.sharing-view__owned-title-wrap {
  display: flex;
  align-items: center;
}

.sharing-view__owned-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  margin-right: 12px;
  border-radius: 14px;
}

.sharing-view__owned-icon--blue {
  background: #eff6ff;
}

.sharing-view__owned-icon--orange {
  background: #fff7ed;
}

.sharing-view__owned-title {
  display: block;
  font-size: 14px;
  font-weight: 700;
}

.sharing-view__friend-meta {
  display: block;
  margin-top: 4px;
  font-size: 10px;
  color: #94a3b8;
}

.sharing-view__badge {
  padding: 4px 10px;
  background: #fff7ed;
  border-radius: 999px;
}

.sharing-view__badge--blue {
  background: #eff6ff;
}

.sharing-view__badge-text {
  font-size: 10px;
  font-weight: 700;
  color: #f97316;
}

.sharing-view__badge--blue .sharing-view__badge-text {
  color: #3b82f6;
}

.sharing-view__member-grid {
  display: flex;
  flex-wrap: wrap;
  margin: 16px -6px 0;
}

.sharing-view__member-card {
  width: calc(25% - 12px);
  margin: 6px;
  text-align: center;
}

.sharing-view__member-avatar,
.sharing-view__member-dashed {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  margin: 0 auto;
  background: #f1f5f9;
  border-radius: 18px;
}

.sharing-view__member-avatar--owner {
  background: #ffedd5;
}

.sharing-view__member-dashed {
  background: transparent;
  border: 2px dashed #e2e8f0;
}

.sharing-view__member-id {
  display: block;
  margin-top: 6px;
  font-size: 10px;
  color: #64748b;
}

.sharing-view__modal {
  width: 100%;
  max-width: 340px;
  padding: 24px;
  background: #ffffff;
  border-radius: 28px;
}

.sharing-view__modal-title {
  display: block;
  font-size: 18px;
  font-weight: 700;
  text-align: center;
}

.sharing-view__modal-desc {
  display: block;
  margin-top: 8px;
  font-size: 12px;
  line-height: 18px;
  text-align: center;
  color: #94a3b8;
}

.sharing-view__input {
  display: flex;
  align-items: center;
  min-height: 48px;
  margin-top: 18px;
  padding: 0 14px;
  background: #f8fafc;
  border-radius: 16px;
}

.sharing-view__input-core {
  width: 100%;
  font-size: 14px;
}

.sharing-view__input-core--mono,
.sharing-view__remove-id {
  font-family: 'Courier New', monospace;
}

.sharing-view__help {
  margin-top: 14px;
  padding: 12px;
  background: #eff6ff;
  border-radius: 16px;
}

.sharing-view__help-text {
  font-size: 10px;
  line-height: 18px;
  color: #1d4ed8;
}

.sharing-view__modal-actions {
  display: flex;
  margin-top: 18px;
}

.sharing-view__modal-ghost,
.sharing-view__modal-primary,
.sharing-view__modal-danger {
  display: flex;
  flex: 1;
  align-items: center;
  justify-content: center;
  height: 46px;
  border-radius: 16px;
}

.sharing-view__modal-primary {
  background: #f97316;
}

.sharing-view__modal-danger {
  background: #f43f5e;
}

.sharing-view__modal-primary-text {
  color: #ffffff;
  font-weight: 700;
}

.sharing-view__modal-ghost-text {
  color: #64748b;
  font-weight: 700;
}

.sharing-view__remove-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 52px;
  margin-top: 10px;
  padding: 0 14px;
  background: #f8fafc;
  border: 1px solid #f1f5f9;
  border-radius: 16px;
}

.sharing-view__remove-user {
  display: flex;
  align-items: center;
}

.sharing-view__tick {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  border: 2px solid #cbd5e1;
  border-radius: 50%;
}

.sharing-view__tick--active {
  background: #f43f5e;
  border-color: #f43f5e;
}
</style>
