<template>
  <view class="home-mgmt">
    <view class="home-mgmt__header">
      <view class="home-mgmt__header-main">
        <view class="home-mgmt__back" @tap="emit('back')">
          <app-icon name="arrowLeft" :size="18" color="#475569" />
        </view>
        <text class="home-mgmt__title">家庭管理</text>
      </view>
      <view class="home-mgmt__add" @tap="isAddModalOpen = true">
        <app-icon name="plus" :size="16" color="#f97316" />
      </view>
    </view>

    <card-box
      v-for="home in homes"
      :key="home.id"
      custom-style="padding:16px; margin-bottom:12px;"
      @tap="openHome(home.id)"
    >
      <view class="home-mgmt__card">
        <view class="home-mgmt__identity">
          <view class="home-mgmt__home-icon">
            <app-icon name="home" :size="18" color="#3b82f6" />
          </view>
          <view>
            <text class="home-mgmt__home-name">{{ home.name }}</text>
            <text class="home-mgmt__home-meta">
              {{ (home.members || []).length }} 位成员 · {{ (home.deviceIds || []).length }} 台设备
            </text>
          </view>
        </view>
        <app-icon name="chevron" :size="16" color="#cbd5e1" />
      </view>
    </card-box>

    <view v-if="isAddModalOpen" class="modal-mask" @tap="isAddModalOpen = false">
      <view class="home-mgmt__modal" @tap.stop>
        <text class="home-mgmt__modal-title">新建家庭</text>
        <text class="home-mgmt__modal-desc">为您的家庭起一个温馨的名称</text>
        <view class="home-mgmt__input">
          <input
            v-model="newHomeName"
            class="home-mgmt__input-core"
            placeholder="例如：幸福小家"
            placeholder-style="color:#94a3b8"
          />
        </view>
        <view class="home-mgmt__modal-actions">
          <view class="home-mgmt__modal-ghost" @tap="isAddModalOpen = false">
            <text class="home-mgmt__modal-ghost-text">取消</text>
          </view>
          <view class="home-mgmt__modal-primary" @tap="handleCreateHome">
            <text class="home-mgmt__modal-primary-text">创建</text>
          </view>
        </view>
      </view>
    </view>

    <view v-if="currentHome" class="home-mgmt__overlay">
      <view class="home-mgmt__overlay-head">
        <view class="home-mgmt__header-main">
          <view class="home-mgmt__back" @tap="closeOverlay">
            <app-icon name="arrowLeft" :size="18" color="#475569" />
          </view>
          <text class="home-mgmt__overlay-title">
            {{ isAdjusting ? '调整关联' : `${currentHome.name} 详情` }}
          </text>
        </view>
        <view class="home-mgmt__delete" v-if="!isAdjusting" @tap="requestDeleteHome">
          <app-icon name="trash" :size="16" color="#f43f5e" />
        </view>
      </view>

      <view class="home-mgmt__overlay-body">
        <template v-if="!isAdjusting">
          <view class="home-mgmt__section">
            <view class="home-mgmt__section-head">
              <text class="home-mgmt__section-title">已关联设备</text>
              <view class="home-mgmt__link-adjust" @tap="startAdjust">
                <text class="home-mgmt__link-adjust-text">调整关联</text>
              </view>
            </view>

            <view v-if="linkedDevices.length" class="home-mgmt__linked-grid">
              <view v-for="device in linkedDevices" :key="device.id" class="home-mgmt__linked-card">
                <app-icon name="flame" :size="18" color="#f97316" />
                <text class="home-mgmt__linked-name line-clamp-1">{{ device.name }}</text>
              </view>
            </view>
            <view v-else class="home-mgmt__no-device">
              <text class="home-mgmt__no-device-text">暂无关联设备</text>
            </view>
          </view>

          <view class="home-mgmt__section">
            <text class="home-mgmt__section-title">家庭成员</text>
            <card-box custom-style="padding:14px; margin-top:10px;">
              <view class="home-mgmt__member-row">
                <view class="home-mgmt__member-avatar">{{ ownerInitial }}</view>
                <view>
                  <text class="home-mgmt__member-name">{{ ownerDisplayName }}</text>
                  <text class="home-mgmt__member-role">所有者</text>
                </view>
              </view>
            </card-box>
            <card-box
              v-for="member in currentHome.members || []"
              :key="member"
              custom-style="padding:14px; margin-top:10px;"
            >
              <view class="home-mgmt__member-row">
                <view class="home-mgmt__member-avatar home-mgmt__member-avatar--ghost">
                  {{ member.slice(0, 1) || 'M' }}
                </view>
                <view>
                  <text class="home-mgmt__member-name">{{ getMemberDisplayName(member) }}</text>
                  <text class="home-mgmt__member-role">家庭成员</text>
                </view>
              </view>
            </card-box>
          </view>
        </template>

        <template v-else>
          <view class="home-mgmt__section">
            <view class="home-mgmt__section-head">
              <text class="home-mgmt__section-title">选择设备</text>
              <text class="home-mgmt__selected-count">已选 {{ tempSelectedDeviceIds.length }}</text>
            </view>
            <view class="home-mgmt__linked-grid">
              <view
                v-for="device in ownedDevices"
                :key="device.id"
                class="home-mgmt__select-card"
                :class="{ 'home-mgmt__select-card--active': tempSelectedDeviceIds.includes(device.id) }"
                @tap="toggleDevice(device.id)"
              >
                <view class="home-mgmt__checkmark" v-if="tempSelectedDeviceIds.includes(device.id)">
                  <app-icon name="check" :size="10" color="#ffffff" />
                </view>
                <app-icon
                  name="flame"
                  :size="18"
                  :color="tempSelectedDeviceIds.includes(device.id) ? '#f97316' : '#94a3b8'"
                />
                <text class="home-mgmt__linked-name line-clamp-1">{{ device.name }}</text>
              </view>
            </view>
          </view>
        </template>

        <view class="home-mgmt__tip">
          <app-icon name="info" :size="14" color="#3b82f6" />
          <text class="home-mgmt__tip-text">
            {{
              isAdjusting
                ? '确认后，所选设备将关联到当前家庭，并自动共享给家庭成员。'
                : '关联到当前家庭的设备会自动共享给该家庭的全部成员，你可以在共享管理中继续调整成员权限。'
            }}
          </text>
        </view>
      </view>

      <view class="home-mgmt__overlay-actions" v-if="isAdjusting">
        <view class="home-mgmt__overlay-ghost" @tap="cancelAdjust">
          <text class="home-mgmt__overlay-ghost-text">取消</text>
        </view>
        <view class="home-mgmt__overlay-primary" @tap="saveLinks">
          <text class="home-mgmt__overlay-primary-text">
            {{ isSaving ? '保存中...' : '确认调整' }}
          </text>
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
  createHome,
  removeHome,
  updateHomeDeviceLinks,
} from '../../services/gateway'

const props = defineProps({
  homes: {
    type: Array,
    default: () => [],
  },
  devices: {
    type: Array,
    default: () => [],
  },
  user: {
    type: Object,
    default: null,
  },
})

const emit = defineEmits(['back', 'toast', 'request-confirm', 'refresh'])

const isAddModalOpen = ref(false)
const newHomeName = ref('')
const editingHomeId = ref('')
const isAdjusting = ref(false)
const tempSelectedDeviceIds = ref([])
const isSaving = ref(false)

const currentHome = computed(() => {
  return props.homes.find((home) => home.id === editingHomeId.value) || null
})

const linkedDevices = computed(() => {
  if (!currentHome.value) {
    return []
  }
  return props.devices.filter((device) => (currentHome.value.deviceIds || []).includes(device.id))
})

const shortUidLabel = computed(() => {
  return props.user && props.user.uid ? props.user.uid.slice(0, 8) : '--------'
})

const ownerDisplayName = computed(() => {
  if (currentHome.value && currentHome.value.ownerId !== shortUidLabel.value) {
    return currentHome.value.ownerDisplayName || currentHome.value.ownerId
  }
  return props.user && props.user.displayName ? props.user.displayName : shortUidLabel.value
})

const ownerInitial = computed(() => {
  return ownerDisplayName.value.slice(0, 1) || '-'
})

const ownedDevices = computed(() => {
  const shortUid = props.user && props.user.uid ? props.user.uid.slice(0, 8) : ''
  return props.devices.filter((device) => device.ownerId === shortUid)
})

function getMemberDisplayName(memberUid) {
  const memberProfiles = currentHome.value && Array.isArray(currentHome.value.memberProfiles)
    ? currentHome.value.memberProfiles
    : []
  const matchedProfile = memberProfiles.find((profile) => profile && profile.uid === memberUid)
  return matchedProfile && matchedProfile.displayName ? matchedProfile.displayName : memberUid
}

function openHome(homeId) {
  editingHomeId.value = homeId
  isAdjusting.value = false
  tempSelectedDeviceIds.value = []
}

function closeOverlay() {
  editingHomeId.value = ''
  isAdjusting.value = false
  tempSelectedDeviceIds.value = []
}

async function handleCreateHome() {
  const normalizedName = String(newHomeName.value || '').trim()
  if (!normalizedName || !props.user) {
    return
  }
  const shortUid = props.user.uid.slice(0, 8)
  const duplicated = props.homes.some((home) => {
    return home.ownerId === shortUid && String(home.name || '').trim() === normalizedName
  })
  if (duplicated) {
    emit('toast', {
      message: '家庭名称已存在，请更换一个名称',
      type: 'error',
    })
    return
  }
  try {
    await createHome(normalizedName)
    emit('refresh')
    emit('toast', {
      message: '家庭创建成功',
      type: 'success',
    })
    newHomeName.value = ''
    isAddModalOpen.value = false
  } catch (requestError) {
    emit('toast', {
      message: requestError.message || '创建失败',
      type: 'error',
    })
  }
}

function requestDeleteHome() {
  if (!currentHome.value) {
    return
  }
  const home = currentHome.value
  emit('request-confirm', {
    title: '删除家庭',
    message: `确定要删除家庭“${home.name}”吗？删除后，该家庭成员关系和设备关联关系将被移除。`,
    confirmText: '确认删除',
    onConfirm: async () => {
      try {
        await removeHome(home.id)
        emit('refresh')
        closeOverlay()
        emit('toast', {
          message: '家庭已删除',
          type: 'success',
        })
      } catch (requestError) {
        emit('toast', {
          message: requestError.message || '删除失败',
          type: 'error',
        })
      }
    },
  })
}

function startAdjust() {
  if (!currentHome.value) {
    return
  }
  tempSelectedDeviceIds.value = (currentHome.value.deviceIds || []).slice()
  isAdjusting.value = true
}

function cancelAdjust() {
  isAdjusting.value = false
  tempSelectedDeviceIds.value = []
}

function toggleDevice(deviceId) {
  if (tempSelectedDeviceIds.value.includes(deviceId)) {
    tempSelectedDeviceIds.value = tempSelectedDeviceIds.value.filter((item) => item !== deviceId)
    return
  }
  tempSelectedDeviceIds.value = tempSelectedDeviceIds.value.concat(deviceId)
}

async function saveLinks() {
  if (!currentHome.value || isSaving.value) {
    return
  }
  isSaving.value = true
  try {
    await updateHomeDeviceLinks(currentHome.value.id, tempSelectedDeviceIds.value.slice())
    emit('refresh')
    emit('toast', {
      message: '关联已更新',
      type: 'success',
    })
    isAdjusting.value = false
  } catch (requestError) {
    emit('toast', {
      message: requestError.message || '保存失败',
      type: 'error',
    })
  } finally {
    isSaving.value = false
  }
}
</script>

<style scoped>
.home-mgmt__header,
.home-mgmt__overlay-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 18px;
}

.home-mgmt__header-main {
  display: flex;
  align-items: center;
}

.home-mgmt__back,
.home-mgmt__add,
.home-mgmt__delete {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 14px;
}

.home-mgmt__title,
.home-mgmt__overlay-title {
  margin-left: 12px;
  font-size: 20px;
  font-weight: 700;
  font-family: 'Outfit', sans-serif;
}

.home-mgmt__card {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.home-mgmt__identity {
  display: flex;
  align-items: center;
}

.home-mgmt__home-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  margin-right: 12px;
  background: #eff6ff;
  border-radius: 14px;
}

.home-mgmt__home-name {
  display: block;
  font-size: 15px;
  font-weight: 700;
}

.home-mgmt__home-meta {
  display: block;
  margin-top: 4px;
  font-size: 11px;
  color: #94a3b8;
}

.home-mgmt__modal {
  width: 100%;
  max-width: 320px;
  padding: 24px;
  background: #ffffff;
  border-radius: 28px;
}

.home-mgmt__modal-title {
  display: block;
  font-size: 18px;
  font-weight: 700;
  text-align: center;
}

.home-mgmt__modal-desc {
  display: block;
  margin-top: 8px;
  font-size: 12px;
  text-align: center;
  color: #94a3b8;
}

.home-mgmt__input {
  display: flex;
  align-items: center;
  min-height: 48px;
  margin-top: 18px;
  padding: 0 14px;
  background: #f8fafc;
  border-radius: 16px;
}

.home-mgmt__input-core {
  width: 100%;
  font-size: 14px;
}

.home-mgmt__modal-actions {
  display: flex;
  margin-top: 18px;
}

.home-mgmt__modal-ghost,
.home-mgmt__modal-primary {
  display: flex;
  flex: 1;
  align-items: center;
  justify-content: center;
  height: 46px;
  border-radius: 16px;
}

.home-mgmt__modal-primary {
  background: #f97316;
}

.home-mgmt__modal-primary-text {
  color: #ffffff;
  font-weight: 700;
}

.home-mgmt__modal-ghost-text {
  color: #64748b;
  font-weight: 700;
}

.home-mgmt__overlay {
  position: fixed;
  inset: 0;
  z-index: 90;
  padding: calc(var(--app-safe-top, 0px) + 24px) 20px 110px;
  overflow-y: auto;
  background: #f8fafc;
}

.home-mgmt__section + .home-mgmt__section {
  margin-top: 24px;
}

.home-mgmt__section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.home-mgmt__section-title {
  font-size: 14px;
  font-weight: 700;
  color: #0f172a;
}

.home-mgmt__link-adjust {
  padding: 6px 10px;
  background: #fff7ed;
  border-radius: 12px;
}

.home-mgmt__link-adjust-text,
.home-mgmt__selected-count {
  font-size: 11px;
  font-weight: 700;
  color: #f97316;
}

.home-mgmt__linked-grid {
  display: flex;
  flex-wrap: wrap;
  margin: 12px -6px 0;
}

.home-mgmt__linked-card,
.home-mgmt__select-card {
  position: relative;
  width: calc(50% - 12px);
  margin: 6px;
  padding: 16px;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 18px;
}

.home-mgmt__select-card--active {
  background: #fff7ed;
  border-color: #fed7aa;
}

.home-mgmt__checkmark {
  position: absolute;
  top: 8px;
  right: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  background: #f97316;
  border-radius: 50%;
}

.home-mgmt__linked-name {
  display: block;
  margin-top: 10px;
  font-size: 12px;
  font-weight: 700;
  color: #334155;
}

.home-mgmt__no-device {
  padding: 32px 0;
  text-align: center;
}

.home-mgmt__no-device-text {
  font-size: 12px;
  color: #94a3b8;
}

.home-mgmt__member-row {
  display: flex;
  align-items: center;
}

.home-mgmt__member-avatar {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  margin-right: 12px;
  background: #ffedd5;
  border-radius: 16px;
  font-size: 12px;
  font-weight: 700;
  color: #f97316;
}

.home-mgmt__member-avatar--ghost {
  background: #f1f5f9;
  color: #94a3b8;
}

.home-mgmt__member-name {
  display: block;
  font-size: 13px;
  font-weight: 700;
}

.home-mgmt__member-role {
  display: block;
  margin-top: 4px;
  font-size: 10px;
  color: #94a3b8;
}

.home-mgmt__tip {
  display: flex;
  align-items: flex-start;
  margin-top: 26px;
  padding: 14px;
  background: #eff6ff;
  border-radius: 18px;
}

.home-mgmt__tip-text {
  flex: 1;
  margin-left: 8px;
  font-size: 11px;
  line-height: 18px;
  color: #1d4ed8;
}

.home-mgmt__overlay-actions {
  position: fixed;
  right: 0;
  bottom: 0;
  left: 0;
  display: flex;
  padding: 16px 20px calc(env(safe-area-inset-bottom) + 16px);
  background: #ffffff;
  border-top: 1px solid #e2e8f0;
}

.home-mgmt__overlay-ghost,
.home-mgmt__overlay-primary {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 48px;
  border-radius: 16px;
}

.home-mgmt__overlay-ghost {
  flex: 1;
}

.home-mgmt__overlay-primary {
  flex: 2;
  background: #f97316;
}

.home-mgmt__overlay-primary-text {
  color: #ffffff;
  font-weight: 700;
}

.home-mgmt__overlay-ghost-text {
  color: #64748b;
  font-weight: 700;
}
</style>
