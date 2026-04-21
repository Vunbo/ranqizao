<template>
  <view class="page-shell">
    <toast-bar
      v-if="toast"
      :message="toast.message"
      :type="toast.type"
      @close="clearToast"
    />

    <confirm-dialog
      v-if="confirmDialog"
      :title="confirmDialog.title"
      :message="confirmDialog.message"
      :confirm-text="confirmDialog.confirmText || '确认'"
      @confirm="confirmCurrentDialog"
      @cancel="confirmDialog = null"
    />

    <view v-if="!authReady" class="app-container__loading">
      <app-icon name="loader" :size="34" color="#f97316" animated />
    </view>

    <auth-panel
      v-else-if="!user"
      @auth-success="handleAuthSuccess"
      @toast="openToast"
    />

    <view v-else class="app-shell">
      <view class="content-shell">
        <device-detail-view
          v-if="activeTab === 'home' && selectedDeviceId"
          :device="currentDevice"
          :devices="devices"
          :user="user"
          @back="selectedDeviceId = ''"
          @toast="openToast"
          @request-confirm="openConfirm"
          @refresh="refreshAll(true)"
        />

        <home-view
          v-else-if="activeTab === 'home'"
          :devices="devices"
          :user="user"
          @select-device="selectedDeviceId = $event"
          @open-add-device="isAddModalOpen = true"
        />

        <safety-view
          v-else-if="activeTab === 'safety'"
          :devices="devices"
          :user="user"
        />

        <profile-view
          v-else
          :user="user"
          :devices="devices"
          :homes="homes"
          :active-sub-view="activeSubView"
          @change-sub-view="activeSubView = $event"
          @user-updated="handleUserUpdated"
          @toast="openToast"
          @request-confirm="openConfirm"
          @refresh="refreshAll(true)"
          @logout="requestLogout"
        />
      </view>

      <bottom-navigation
        v-if="showBottomNavigation"
        :active-tab="activeTab"
        @change="handleTabChange"
      />

      <add-device-modal
        v-if="isAddModalOpen"
        :visible="isAddModalOpen"
        :user="user"
        :existing-devices="devices"
        @close="isAddModalOpen = false"
        @toast="openToast"
        @refresh="refreshAll(true)"
      />
    </view>
  </view>
</template>

<script setup>
import { computed, onMounted, onBeforeUnmount, ref } from 'vue'
import AuthPanel from '../auth/AuthPanel.vue'
import AddDeviceModal from '../device/AddDeviceModal.vue'
import DeviceDetailView from '../device/DeviceDetailView.vue'
import HomeView from '../home/HomeView.vue'
import BottomNavigation from '../navigation/BottomNavigation.vue'
import ProfileView from '../profile/ProfileView.vue'
import SafetyView from '../safety/SafetyView.vue'
import AppIcon from '../ui/AppIcon.vue'
import ConfirmDialog from '../ui/ConfirmDialog.vue'
import ToastBar from '../ui/ToastBar.vue'
import {
  listDevices,
  listHomes,
  logoutCurrentSession,
  restoreSession,
} from '../../services/gateway'

const authReady = ref(false)
const user = ref(null)
const devices = ref([])
const homes = ref([])
const activeTab = ref('home')
const selectedDeviceId = ref('')
const activeSubView = ref('main')
const isAddModalOpen = ref(false)
const toast = ref(null)
const toastTimer = ref(null)
const confirmDialog = ref(null)
const refreshTimer = ref(null)

const currentDevice = computed(() => {
  return devices.value.find((item) => item.id === selectedDeviceId.value) || null
})

const showBottomNavigation = computed(() => {
  return !selectedDeviceId.value && activeSubView.value === 'main' && !isAddModalOpen.value
})

onMounted(() => {
  bootstrapSession()
})

onBeforeUnmount(() => {
  stopPolling()
  clearToast()
})

function handlePageShow() {
  if (user.value) {
    refreshAll(false)
  }
}

function handlePullDownRefresh() {
  return refreshAll(true)
}

async function bootstrapSession() {
  authReady.value = false
  try {
    const session = await restoreSession()
    if (session && session.user) {
      user.value = session.user
      await refreshAll(true)
      startPolling()
    } else {
      resetViewState()
    }
  } catch (error) {
    resetViewState()
    openToast({
      message: '会话已失效，请重新登录',
      type: 'info',
    })
  } finally {
    authReady.value = true
  }
}

async function handleAuthSuccess(session) {
  user.value = session.user
  activeTab.value = 'home'
  activeSubView.value = 'main'
  selectedDeviceId.value = ''
  isAddModalOpen.value = false
  authReady.value = true
  await refreshAll(true)
  startPolling()
}

function handleTabChange(tab) {
  activeTab.value = tab
  if (tab !== 'profile') {
    activeSubView.value = 'main'
  }
}

function handleUserUpdated(nextUser) {
  user.value = nextUser
}

async function refreshAll(showErrors) {
  if (!user.value) {
    devices.value = []
    homes.value = []
    return
  }

  try {
    const [devicesResult, homesResult] = await Promise.all([listDevices(), listHomes()])
    devices.value = devicesResult
    homes.value = homesResult

    if (
      selectedDeviceId.value &&
      !devicesResult.some((device) => device.id === selectedDeviceId.value)
    ) {
      selectedDeviceId.value = ''
    }
  } catch (error) {
    if (showErrors) {
      openToast({
        message: error.message || '数据加载失败',
        type: 'error',
      })
    }
  }
}

function startPolling() {
  stopPolling()
  refreshTimer.value = setInterval(() => {
    refreshAll(false)
  }, 3000)
}

function stopPolling() {
  if (refreshTimer.value) {
    clearInterval(refreshTimer.value)
    refreshTimer.value = null
  }
}

function openToast(payload) {
  if (!payload) {
    return
  }

  const normalized = typeof payload === 'string' ? { message: payload, type: 'info' } : payload
  toast.value = {
    message: normalized.message,
    type: normalized.type || 'info',
  }

  if (toastTimer.value) {
    clearTimeout(toastTimer.value)
  }

  toastTimer.value = setTimeout(() => {
    toast.value = null
    toastTimer.value = null
  }, 3000)
}

function clearToast() {
  if (toastTimer.value) {
    clearTimeout(toastTimer.value)
    toastTimer.value = null
  }
  toast.value = null
}

function openConfirm(payload) {
  confirmDialog.value = payload
}

async function confirmCurrentDialog() {
  const dialog = confirmDialog.value
  confirmDialog.value = null

  if (dialog && typeof dialog.onConfirm === 'function') {
    await dialog.onConfirm()
  }
}

function requestLogout() {
  openConfirm({
    title: '退出登录',
    message: '确定要退出当前账号吗？',
    confirmText: '确认退出',
    onConfirm: async () => {
      try {
        await logoutCurrentSession()
        stopPolling()
        resetViewState()
        openToast({
          message: '已退出登录',
          type: 'success',
        })
      } catch (error) {
        openToast({
          message: error.message || '退出失败，请稍后重试',
          type: 'error',
        })
      }
    },
  })
}

function resetViewState() {
  user.value = null
  devices.value = []
  homes.value = []
  activeTab.value = 'home'
  activeSubView.value = 'main'
  selectedDeviceId.value = ''
  isAddModalOpen.value = false
}

defineExpose({
  handlePageShow,
  handlePullDownRefresh,
})
</script>

<style scoped>
.app-container__loading {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
}
</style>
