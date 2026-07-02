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
          @back="clearSelectedDevice"
          @toast="openToast"
          @request-confirm="openConfirm"
          @refresh="refreshAll(true)"
        />

        <home-view
          v-else-if="activeTab === 'home'"
          :devices="devices"
          :user="user"
          @select-device="selectDevice"
          @open-add-device="openAddDeviceModal"
        />

        <safety-view
          v-else-if="activeTab === 'safety'"
          :devices="devices"
          :user="user"
        />

        <!-- 商城页面 -->
        <view v-else-if="activeTab === 'mall'" class="mall-tab">
          <mall-webview @go-home="goHome" />
        </view>

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
        @close="closeAddDeviceModal"
        @toast="openToast"
        @refresh="refreshAll(true)"
      />
    </view>
  </view>
</template>

<script setup>
import { onMounted, onBeforeUnmount, ref } from 'vue'
import AuthPanel from '../auth/AuthPanel.vue'
import AddDeviceModal from '../device/AddDeviceModal.vue'
import DeviceDetailView from '../device/DeviceDetailView.vue'
import HomeView from '../home/HomeView.vue'
import BottomNavigation from '../navigation/BottomNavigation.vue'
import MallWebview from '../mall/MallWebview.vue'
import ProfileView from '../profile/ProfileView.vue'
import SafetyView from '../safety/SafetyView.vue'
import AppIcon from '../ui/AppIcon.vue'
import ConfirmDialog from '../ui/ConfirmDialog.vue'
import ToastBar from '../ui/ToastBar.vue'
import { useAppShellController } from '../../services/controllers/shell-controller'

const toast = ref(null)
const toastTimer = ref(null)
const confirmDialog = ref(null)

function goHome() {
  activeTab.value = 'home'
}
const {
  authReady,
  user,
  devices,
  homes,
  activeTab,
  selectedDeviceId,
  activeSubView,
  isAddModalOpen,
  currentDevice,
  showBottomNavigation,
  bootstrapSession,
  handleAuthSuccess,
  handleTabChange,
  handleUserUpdated,
  handlePageShow,
  handlePullDownRefresh,
  refreshAll,
  stopPolling,
  selectDevice,
  clearSelectedDevice,
  openAddDeviceModal,
  closeAddDeviceModal,
  logout,
} = useAppShellController({
  onToast: openToast,
})


onMounted(() => {
  bootstrapSession()
})

onBeforeUnmount(() => {
  stopPolling()
  clearToast()
})

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
        await logout()
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

/* 商城 tab 容器 — 脱离 content-shell padding */
.mall-tab {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  padding: 0;
}
</style>
