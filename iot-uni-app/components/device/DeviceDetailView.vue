<template>
  <view v-if="device" class="device-detail">
    <view class="device-detail__header">
      <view class="device-detail__header-main">
        <view class="device-detail__back" @tap="$emit('back')">
          <app-icon name="arrowLeft" :size="18" color="#475569" />
        </view>
        <view class="device-detail__head-copy">
          <text class="device-detail__name line-clamp-1">{{ device.name }}</text>
          <text class="device-detail__id">ID: {{ device.id.slice(0, 8).toUpperCase() }}</text>
        </view>
      </view>
      <view class="device-detail__actions">
        <view v-if="isOwner" class="device-detail__action" @tap="openRename">
          <app-icon name="edit" :size="16" color="#64748b" />
        </view>
        <view v-if="isOwner" class="device-detail__action device-detail__action--blue" @tap="isShareModalOpen = true">
          <app-icon name="globe" :size="16" color="#3b82f6" />
        </view>
        <view class="device-detail__action device-detail__action--danger" @tap="requestDelete">
          <app-icon name="trash" :size="16" color="#f43f5e" />
        </view>
      </view>
    </view>

    <card-box custom-style="position:relative; overflow:hidden; border:0; background:#151619; padding:40px 0; box-shadow:0 25px 50px -12px rgba(0,0,0,0.4);">
      <view class="device-detail__pattern"></view>

      <view class="device-detail__control-card">
        <view class="device-detail__chip">
          <view class="device-detail__chip-dot" :class="{ 'device-detail__chip-dot--on': displayIsOn }"></view>
          <text class="device-detail__chip-text">{{ displayIsOn ? '系统运行中' : '系统待机中' }}</text>
        </view>

        <view class="device-detail__flame-shell">
          <view class="device-detail__ring device-detail__ring--outer"></view>
          <view class="device-detail__ring device-detail__ring--inner"></view>
          <view
            v-if="displayIsOn"
            class="device-detail__glow"
            :style="{ backgroundColor: glowColor }"
          ></view>
          <image class="device-detail__progress-image" :src="progressRingSvg" mode="aspectFit" />
          <view
            class="device-detail__flame-core"
            :style="{ transform: flameTransform, opacity: displayIsOn ? 1 : 0.3 }"
          >
            <app-icon
              name="flame"
              :size="80"
              :color="displayIsOn ? flameColor : '#334155'"
              :filled="true"
            />
          </view>
          <view class="device-detail__fire-level">
            <text class="device-detail__fire-value">{{ displayIsOn ? displayFireLevel : '00' }}</text>
            <text class="device-detail__fire-unit">%</text>
          </view>
        </view>

        <view class="device-detail__control-footer">
          <view class="device-detail__step-head">
            <text class="device-detail__step-title">火力调节</text>
            <text class="device-detail__step-meta">步进：20%</text>
          </view>

          <view class="device-detail__step-row">
            <view
              v-for="level in fireLevels"
              :key="level"
              class="device-detail__step"
              :class="{
                'device-detail__step--active': displayFireLevel === level && displayIsOn,
                'device-detail__step--disabled': !displayIsOn || isPending
              }"
              @tap="handleFireLevel(level)"
            >
              <text class="device-detail__step-value">{{ level }}%</text>
              <view class="device-detail__step-dot" :class="{ 'device-detail__step-dot--active': displayIsOn && displayFireLevel >= level }"></view>
            </view>
          </view>

          <view class="device-detail__power-wrap">
            <view
              class="device-detail__power"
              :class="{ 'device-detail__power--on': displayIsOn, 'device-detail__power--disabled': isPending }"
              @tap="handleToggle"
            >
              <view v-if="displayIsOn && !isPending" class="device-detail__power-pulse"></view>
              <app-icon
                :name="isPending ? 'loader' : 'power'"
                :size="32"
                :color="displayIsOn ? '#ffffff' : '#64748b'"
                :animated="isPending"
              />
            </view>
          </view>
        </view>
      </view>
    </card-box>

    <view class="device-detail__stats">
      <card-box custom-style="padding:20px;">
        <view class="device-detail__stat">
          <view class="device-detail__stat-icon device-detail__stat-icon--temp">
            <app-icon name="thermometer" :size="18" color="#f97316" />
          </view>
          <text class="device-detail__stat-label">锅底温度</text>
          <text class="device-detail__stat-value">{{ Number(device.temp || 0).toFixed(1) }}°C</text>
        </view>
      </card-box>
      <card-box custom-style="padding:20px;">
        <view class="device-detail__stat">
          <view class="device-detail__stat-icon device-detail__stat-icon--gas">
            <app-icon name="droplet" :size="18" color="#3b82f6" />
          </view>
          <text class="device-detail__stat-label">燃气浓度</text>
          <text class="device-detail__stat-value">{{ Number(device.gas || 0).toFixed(2) }}% LEL</text>
        </view>
      </card-box>
    </view>

    <view class="device-detail__modes">
      <text class="device-detail__mode-title">智能烹饪模式</text>
      <view class="device-detail__mode-grid">
        <view
          v-for="mode in cookingModes"
          :key="mode.title"
          class="device-detail__mode-card"
          :class="{
            'device-detail__mode-card--active': displayIsOn && displayFireLevel === mode.level,
            'device-detail__mode-card--disabled': !displayIsOn || isPending
          }"
          @tap="handleFireLevel(mode.level)"
        >
          <view
            v-if="displayIsOn && displayFireLevel === mode.level"
            class="device-detail__mode-overlay"
          ></view>
          <view
            class="device-detail__mode-icon"
            :style="{ background: displayIsOn && displayFireLevel === mode.level ? mode.bg : '#f8fafc' }"
          >
            <app-icon :name="mode.icon" :size="20" :color="mode.color" />
          </view>
          <view class="device-detail__mode-copy">
            <view class="device-detail__mode-top">
              <text class="device-detail__mode-name">{{ mode.title }}</text>
              <view
                v-if="displayIsOn && displayFireLevel === mode.level"
                class="device-detail__mode-bars"
              >
                <view class="device-detail__mode-bar"></view>
                <view class="device-detail__mode-bar device-detail__mode-bar--delay-1"></view>
                <view class="device-detail__mode-bar device-detail__mode-bar--delay-2"></view>
              </view>
            </view>
            <text class="device-detail__mode-desc">{{ mode.desc }}</text>
          </view>
          <view
            v-if="displayIsOn && displayFireLevel === mode.level"
            class="device-detail__mode-check"
          >
            <app-icon name="check" :size="14" color="#f97316" />
          </view>
        </view>
      </view>
    </view>

    <view v-if="isRenameModalOpen" class="modal-mask" @tap="isRenameModalOpen = false">
      <view class="device-detail__modal" @tap.stop>
        <text class="device-detail__modal-title">重命名设备</text>
        <text class="device-detail__modal-desc">请输入设备的新名称</text>
        <view class="device-detail__input">
          <input
            v-model="newName"
            class="device-detail__input-core"
            placeholder="例如：厨房主灶"
            placeholder-style="color:#94a3b8"
          />
        </view>
        <view class="device-detail__modal-actions">
          <view class="device-detail__modal-ghost" @tap="isRenameModalOpen = false">
            <text class="device-detail__modal-ghost-text">取消</text>
          </view>
          <view class="device-detail__modal-primary" @tap="handleRename">
            <text class="device-detail__modal-primary-text">{{ isPending ? '修改中...' : '确认修改' }}</text>
          </view>
        </view>
      </view>
    </view>

    <view v-if="isShareModalOpen" class="modal-mask" @tap="isShareModalOpen = false">
      <view class="device-detail__modal" @tap.stop>
        <view class="device-detail__share-head">
          <text class="device-detail__modal-title">设备共享</text>
          <view class="device-detail__close" @tap="isShareModalOpen = false">
            <app-icon name="close" :size="14" color="#94a3b8" />
          </view>
        </view>
        <view class="device-detail__share-field">
          <text class="device-detail__share-label">用户 UID</text>
          <view class="device-detail__share-row">
            <view class="device-detail__input device-detail__input--grow">
              <input
                v-model="shareUid"
                class="device-detail__input-core"
                placeholder="输入对方的 UID"
                placeholder-style="color:#94a3b8"
              />
            </view>
            <view class="device-detail__share-add" @tap="handleShare">
              <text class="device-detail__share-add-text">{{ shareLoading ? '...' : '添加' }}</text>
            </view>
          </view>
        </view>

        <text class="section-kicker">已共享用户</text>
        <view v-if="!(device.sharedWith || []).length" class="device-detail__share-empty">
          <text class="device-detail__share-empty-text">暂无共享用户</text>
        </view>
        <view v-else class="device-detail__share-list">
          <view v-for="sharedUser in sharedUsers" :key="sharedUser.uid" class="device-detail__share-user">
            <text class="device-detail__share-id">{{ sharedUser.displayName }}</text>
            <view class="device-detail__share-remove" @tap="handleRemoveShare(sharedUser.uid)">
              <app-icon name="trash" :size="12" color="#f43f5e" />
            </view>
          </view>
        </view>

        <view class="device-detail__share-tip">
          <app-icon name="info" :size="12" color="#3b82f6" />
          <text class="device-detail__share-tip-text">
            共享后，对方可以查看设备状态并进行基础控制，请仅向可信成员授权。
          </text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import AppIcon from '../ui/AppIcon.vue'
import CardBox from '../ui/CardBox.vue'
import {
  createDeviceLog,
  removeDevice,
  shareDevice,
  unshareDevice,
  updateDevice,
} from '../../services/gateway'

const emit = defineEmits(['back', 'toast', 'refresh', 'request-confirm'])

const props = defineProps({
  device: {
    type: Object,
    default: null,
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

const fireLevels = [20, 40, 60, 80, 100]
const cookingModes = [
  {
    title: '爆炒模式',
    desc: '大火快炒，适合锁住食材鲜香',
    icon: 'flame',
    color: '#f97316',
    bg: '#fff7ed',
    level: 100,
  },
  {
    title: '文火慢炖',
    desc: '恒温细煮，适合长时间炖煮',
    icon: 'thermometer',
    color: '#3b82f6',
    bg: '#eff6ff',
    level: 20,
  },
  {
    title: '蒸煮模式',
    desc: '中高火稳定输出，适合蒸煮类烹饪',
    icon: 'droplet',
    color: '#06b6d4',
    bg: '#ecfeff',
    level: 60,
  },
  {
    title: '一键煎炸',
    desc: '精准控温，减少焦糊风险',
    icon: 'activity',
    color: '#f59e0b',
    bg: '#fffbeb',
    level: 80,
  },
]

const isPending = ref(false)
const isShareModalOpen = ref(false)
const isRenameModalOpen = ref(false)
const newName = ref('')
const shareUid = ref('')
const shareLoading = ref(false)

const displayIsOn = computed(() => {
  return props.device ? !!props.device.isOn : false
})

const displayFireLevel = computed(() => {
  return props.device ? Number(props.device.fireLevel || 0) : 0
})

const isOwner = computed(() => {
  const shortUid = props.user && props.user.uid ? props.user.uid.slice(0, 8) : ''
  return props.device && props.device.ownerId === shortUid
})

const sharedUsers = computed(() => {
  if (!props.device) {
    return []
  }

  if (Array.isArray(props.device.sharedWithProfiles) && props.device.sharedWithProfiles.length) {
    return props.device.sharedWithProfiles.map((profile) => ({
      uid: profile.uid,
      displayName: profile.displayName || profile.uid,
    }))
  }

  return (props.device.sharedWith || []).map((uid) => ({
    uid,
    displayName: uid,
  }))
})

const flameColor = computed(() => {
  if (!displayIsOn.value) {
    return '#334155'
  }
  if (displayFireLevel.value <= 30) {
    return '#60a5fa'
  }
  if (displayFireLevel.value <= 60) {
    return '#fb923c'
  }
  return '#f43f5e'
})

const glowColor = computed(() => {
  if (displayFireLevel.value <= 30) {
    return '#3b82f6'
  }
  if (displayFireLevel.value <= 60) {
    return '#f97316'
  }
  return '#f43f5e'
})

const flameTransform = computed(() => {
  const scale = displayIsOn.value ? 0.8 + (displayFireLevel.value / 100) * 0.7 : 0.8
  return `scale(${scale})`
})

const progressRingSvg = computed(() => {
  const percent = displayIsOn.value ? displayFireLevel.value : 0
  const offset = 691 - (691 * percent) / 100
  const strokeColor = displayIsOn.value ? flameColor.value : '#1e293b'
  const svg = [
    '<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256">',
    '<g transform="rotate(-90 128 128)">',
    '<circle cx="128" cy="128" r="110" stroke="rgba(255,255,255,0.05)" stroke-width="4" fill="transparent"/>',
    `<circle cx="128" cy="128" r="110" stroke="${strokeColor}" stroke-width="4" fill="transparent" stroke-dasharray="691" stroke-dashoffset="${offset}"/>`,
    '</g>',
    '</svg>',
  ].join('')
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`
})

function emitToast(message, type) {
  emit('toast', { message, type })
}

async function logOperation(event, type) {
  if (!props.device) {
    return
  }
  try {
    await createDeviceLog(props.device.id, {
      event,
      type,
    })
  } catch (error) {
    return
  }
}

function openRename() {
  newName.value = props.device ? props.device.name : ''
  isRenameModalOpen.value = true
}

function handleToggle() {
  if (!props.device || isPending.value) {
    return
  }

  if (!props.device.isOn) {
    emit('request-confirm', {
      title: '安全确认',
      message: '开启火源前，请确认厨房通风良好、灶台附近没有易燃物，并且现场有人看护。',
      confirmText: '确认开启',
      onConfirm: async () => {
        isPending.value = true
        try {
          await updateDevice(props.device.id, { isOn: true })
          await logOperation('远程开启火源', 'success')
          emit('refresh')
          emitToast('设备已开启', 'success')
        } catch (error) {
          emitToast(error.message || '操作失败，请重试', 'error')
        } finally {
          isPending.value = false
        }
      },
    })
    return
  }

  isPending.value = true
  updateDevice(props.device.id, { isOn: false })
    .then(async () => {
      await logOperation('远程关闭火源', 'info')
      emit('refresh')
      emitToast('设备已关闭', 'info')
    })
    .catch((error) => {
      emitToast(error.message || '操作失败，请重试', 'error')
    })
    .finally(() => {
      isPending.value = false
    })
}

async function handleFireLevel(level) {
  if (!props.device || !displayIsOn.value || isPending.value) {
    return
  }
  isPending.value = true
  try {
    await updateDevice(props.device.id, { fireLevel: level })
    await logOperation(`调整火力至 ${level}%`, 'success')
    emit('refresh')
    emitToast(`火力已调整至 ${level}%`, 'success')
  } catch (error) {
    emitToast(error.message || '调节失败，请重试', 'error')
  } finally {
    isPending.value = false
  }
}

async function handleRename() {
  if (!props.device || isPending.value) {
    return
  }
  const normalizedName = String(newName.value || '').trim()
  if (!normalizedName) {
    return
  }
  const duplicate = props.devices.some((item) => {
    return item.id !== props.device.id && (item.name || '').trim().toLowerCase() === normalizedName.toLowerCase()
  })
  if (duplicate) {
    emitToast('设备名称已存在，请更换一个名称', 'error')
    return
  }
  isPending.value = true
  try {
    await updateDevice(props.device.id, { name: normalizedName })
    await logOperation(`重命名设备为“${normalizedName}”`, 'info')
    emit('refresh')
    isRenameModalOpen.value = false
    emitToast('设备重命名成功', 'success')
  } catch (error) {
    emitToast(error.message || '重命名失败，请重试', 'error')
  } finally {
    isPending.value = false
  }
}

function requestDelete() {
  if (!props.device || isPending.value) {
    return
  }
  const currentDevice = props.device
  emit('request-confirm', {
    title: '删除设备',
    message: `确定要删除设备“${currentDevice.name}”吗？此操作不可撤销。`,
    confirmText: '确认删除',
    onConfirm: async () => {
      isPending.value = true
      try {
        await removeDevice(currentDevice.id)
        emit('refresh')
        emit('back')
        emitToast('设备已删除', 'success')
      } catch (error) {
        emitToast(error.message || '删除失败，请重试', 'error')
      } finally {
        isPending.value = false
      }
    },
  })
}

async function handleShare() {
  if (!props.device || shareLoading.value) {
    return
  }
  const uid = String(shareUid.value || '').trim()
  if (!uid) {
    return
  }
  if ((props.device.sharedWith || []).indexOf(uid) !== -1) {
    emitToast('该用户已在共享列表中', 'info')
    return
  }
  shareLoading.value = true
  try {
    await shareDevice(props.device.id, uid)
    emit('refresh')
    emitToast('设备共享成功', 'success')
    shareUid.value = ''
    isShareModalOpen.value = false
  } catch (error) {
    emitToast(error.message || '共享失败，请检查 UID', 'error')
  } finally {
    shareLoading.value = false
  }
}

async function handleRemoveShare(uid) {
  if (!props.device || shareLoading.value) {
    return
  }
  shareLoading.value = true
  try {
    await unshareDevice(props.device.id, uid)
    emit('refresh')
    emitToast('已取消共享', 'success')
  } catch (error) {
    emitToast(error.message || '操作失败', 'error')
  } finally {
    shareLoading.value = false
  }
}

watch(
  () => props.device,
  (nextDevice) => {
    if (nextDevice) {
      newName.value = nextDevice.name
    }
  },
  { immediate: true }
)
</script>

<style scoped>
.device-detail__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 18px;
}

.device-detail__header-main,
.device-detail__actions {
  display: flex;
  align-items: center;
}

.device-detail__back,
.device-detail__action,
.device-detail__close {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 14px;
}

.device-detail__action + .device-detail__action {
  margin-left: 8px;
}

.device-detail__action--blue {
  background: #eff6ff;
  border-color: #dbeafe;
}

.device-detail__action--danger {
  background: #fff1f2;
  border-color: #ffe4e6;
}

.device-detail__head-copy {
  min-width: 0;
  margin-left: 12px;
}

.device-detail__name {
  display: block;
  font-size: 18px;
  font-weight: 700;
  font-family: 'Outfit', sans-serif;
}

.device-detail__id {
  display: block;
  margin-top: 4px;
  font-size: 10px;
  color: #94a3b8;
}

.device-detail__control-card {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}

.device-detail__chip {
  display: inline-flex;
  align-items: center;
  padding: 4px 12px;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 999px;
}

.device-detail__pattern {
  position: absolute;
  inset: 0;
  opacity: 0.05;
  background-image: radial-gradient(#ffffff 1px, transparent 1px);
  background-size: 20px 20px;
}

.device-detail__chip-dot {
  width: 6px;
  height: 6px;
  background: #64748b;
  border-radius: 50%;
}

.device-detail__chip-dot--on {
  background: #10b981;
  animation: pulse-dot 1.5s ease infinite;
}

.device-detail__chip-text {
  margin-left: 8px;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 2px;
  text-transform: uppercase;
  color: #94a3b8;
}

.device-detail__flame-shell {
  position: relative;
  width: 260px;
  height: 260px;
  margin: 30px auto 40px;
}

.device-detail__ring,
.device-detail__flame-core,
.device-detail__glow,
.device-detail__progress-image {
  position: absolute;
}

.device-detail__ring {
  border-radius: 50%;
}

.device-detail__ring--outer {
  inset: 18px;
  border: 1px dashed rgba(255, 255, 255, 0.12);
}

.device-detail__ring--inner {
  inset: 34px;
  border: 2px solid rgba(255, 255, 255, 0.06);
}

.device-detail__progress-image {
  inset: 0;
  width: 260px;
  height: 260px;
}

.device-detail__glow {
  inset: 44px;
  border-radius: 50%;
  opacity: 0.2;
  filter: blur(64px);
}

.device-detail__flame-core {
  inset: 50px;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2;
  border-radius: 50%;
  transition: transform 0.5s ease, opacity 0.5s ease, color 0.5s ease;
}

.device-detail__fire-level {
  position: absolute;
  right: 50%;
  bottom: -16px;
  z-index: 3;
  display: flex;
  align-items: flex-end;
  padding: 4px 16px;
  background: #151619;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 8px;
  transform: translateX(50%);
}

.device-detail__fire-value {
  font-family: 'Courier New', monospace;
  font-size: 28px;
  font-weight: 700;
  color: #ffffff;
}

.device-detail__fire-unit {
  margin-left: 4px;
  margin-bottom: 4px;
  font-size: 12px;
  color: #64748b;
}

.device-detail__control-footer {
  width: 100%;
  padding: 0 24px;
}

.device-detail__step-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 4px;
}

.device-detail__step-title {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 2px;
  text-transform: uppercase;
  color: #64748b;
}

.device-detail__step-meta {
  font-family: 'Courier New', monospace;
  font-size: 10px;
  color: #94a3b8;
}

.device-detail__step-row {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  margin-top: 16px;
}

.device-detail__step {
  display: flex;
  flex: 1;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 52px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 14px;
  transition: all 0.3s ease;
}

.device-detail__step--active {
  background: #f97316;
  border-color: #fb923c;
  box-shadow: 0 0 18px rgba(249, 115, 22, 0.28);
}

.device-detail__step--disabled {
  opacity: 0.5;
}

.device-detail__step-value {
  font-size: 12px;
  font-weight: 700;
  color: #ffffff;
}

.device-detail__step-dot {
  width: 4px;
  height: 4px;
  margin-top: 6px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 50%;
}

.device-detail__step-dot--active {
  background: #ffffff;
}

.device-detail__power-wrap {
  display: flex;
  justify-content: center;
  margin-top: 26px;
}

.device-detail__power {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 80px;
  height: 80px;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 50%;
  transition: all 0.5s ease;
}

.device-detail__power--on {
  transform: scale(1.1);
  background: #f43f5e;
  box-shadow: 0 0 28px rgba(244, 63, 94, 0.32);
}

.device-detail__power--disabled {
  opacity: 0.65;
}

.device-detail__power-pulse {
  position: absolute;
  inset: 0;
  z-index: 0;
  border-radius: 50%;
  background: #f43f5e;
  animation: device-power-pulse 2.1s ease-out infinite;
}

.device-detail__stats {
  display: flex;
  gap: 12px;
  margin-top: 18px;
}

.device-detail__stats .card-box {
  flex: 1;
}

.device-detail__stat {
  text-align: center;
}

.device-detail__stat-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  margin: 0 auto;
  border-radius: 14px;
}

.device-detail__stat-icon--temp {
  background: #fff7ed;
}

.device-detail__stat-icon--gas {
  background: #eff6ff;
}

.device-detail__stat-label {
  display: block;
  margin-top: 12px;
  font-size: 12px;
  color: #64748b;
}

.device-detail__stat-value {
  display: block;
  margin-top: 6px;
  font-size: 22px;
  font-weight: 700;
}

.device-detail__modes {
  margin-top: 22px;
}

.device-detail__mode-title {
  display: block;
  margin-bottom: 12px;
  font-size: 15px;
  font-weight: 700;
  color: #0f172a;
}

.device-detail__mode-grid {
  display: flex;
  flex-wrap: wrap;
  margin: 0 -6px;
}

.device-detail__mode-card {
  position: relative;
  width: calc(50% - 12px);
  margin: 6px;
  padding: 14px;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 18px;
  overflow: hidden;
  transition: all 0.3s ease;
}

.device-detail__mode-card--active {
  transform: scale(1.02);
  border-color: #fed7aa;
  box-shadow: 0 8px 22px rgba(249, 115, 22, 0.08);
}

.device-detail__mode-card--disabled {
  opacity: 0.55;
}

.device-detail__mode-icon {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 12px;
  transition: background 0.3s ease;
}

.device-detail__mode-copy {
  position: relative;
  z-index: 1;
  margin-top: 10px;
}

.device-detail__mode-top {
  display: flex;
  align-items: center;
}

.device-detail__mode-name {
  font-size: 13px;
  font-weight: 700;
  color: #0f172a;
}

.device-detail__mode-desc {
  display: block;
  margin-top: 6px;
  font-size: 10px;
  line-height: 14px;
  color: #94a3b8;
}

.device-detail__mode-overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, rgba(249, 115, 22, 0.05), rgba(255, 255, 255, 0));
}

.device-detail__mode-bars {
  display: flex;
  margin-left: 4px;
}

.device-detail__mode-bar {
  width: 2px;
  height: 8px;
  margin-left: 2px;
  background: #f97316;
  border-radius: 999px;
  animation: mode-bar-wave 0.6s ease infinite;
}

.device-detail__mode-bar--delay-1 {
  animation-delay: 0.2s;
}

.device-detail__mode-bar--delay-2 {
  animation-delay: 0.4s;
}

.device-detail__mode-check {
  position: absolute;
  top: 8px;
  right: 8px;
  z-index: 1;
}

.device-detail__modal {
  width: 100%;
  max-width: 340px;
  padding: 24px;
  background: #ffffff;
  border-radius: 28px;
}

.device-detail__modal-title {
  display: block;
  font-size: 18px;
  font-weight: 700;
}

.device-detail__modal-desc {
  display: block;
  margin-top: 8px;
  font-size: 12px;
  color: #94a3b8;
}

.device-detail__input {
  display: flex;
  align-items: center;
  min-height: 48px;
  margin-top: 18px;
  padding: 0 14px;
  background: #f8fafc;
  border-radius: 16px;
}

.device-detail__input--grow {
  flex: 1;
}

.device-detail__input-core {
  width: 100%;
  font-size: 14px;
}

.device-detail__modal-actions {
  display: flex;
  margin-top: 18px;
}

.device-detail__modal-ghost,
.device-detail__modal-primary {
  display: flex;
  flex: 1;
  align-items: center;
  justify-content: center;
  height: 46px;
  border-radius: 16px;
}

.device-detail__modal-primary {
  background: #f97316;
}

.device-detail__modal-primary-text {
  color: #ffffff;
  font-weight: 700;
}

.device-detail__modal-ghost-text {
  color: #64748b;
  font-weight: 700;
}

.device-detail__share-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.device-detail__share-field {
  margin-top: 8px;
}

.device-detail__share-label {
  display: block;
  margin: 0 0 6px 4px;
  font-size: 12px;
  font-weight: 700;
}

.device-detail__share-row {
  display: flex;
  gap: 8px;
}

.device-detail__share-add {
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 72px;
  background: #f97316;
  border-radius: 16px;
}

.device-detail__share-add-text {
  color: #ffffff;
  font-size: 13px;
  font-weight: 700;
}

.device-detail__share-empty {
  padding: 24px 0;
  text-align: center;
}

.device-detail__share-empty-text {
  font-size: 12px;
  color: #94a3b8;
}

.device-detail__share-list {
  margin-top: 12px;
}

.device-detail__share-user {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 44px;
  margin-top: 8px;
  padding: 0 12px;
  background: #f8fafc;
  border-radius: 14px;
}

.device-detail__share-id {
  font-family: 'Courier New', monospace;
  font-size: 12px;
  color: #475569;
}

.device-detail__share-remove {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
}

.device-detail__share-tip {
  display: flex;
  align-items: flex-start;
  margin-top: 16px;
  padding: 12px;
  background: #eff6ff;
  border-radius: 16px;
}

.device-detail__share-tip-text {
  flex: 1;
  margin-left: 8px;
  font-size: 10px;
  line-height: 16px;
  color: #1d4ed8;
}

@media screen and (min-width: 640px) {
  .device-detail__mode-card {
    width: calc(25% - 12px);
  }
}

@keyframes device-power-pulse {
  0% {
    transform: scale(1);
    opacity: 0;
  }
  18% {
    opacity: 0.2;
  }
  100% {
    transform: scale(1.42);
    opacity: 0;
  }
}

@keyframes mode-bar-wave {
  0%,
  100% {
    transform: scaleY(0.5);
  }
  50% {
    transform: scaleY(1);
  }
}
</style>
