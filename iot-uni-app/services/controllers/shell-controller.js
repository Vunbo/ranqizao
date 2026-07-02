import { computed, ref } from 'vue'
import { logoutCurrentSession, restoreSession } from '../gateway/auth'
import { remoteDeviceService } from '../api/devices'
import { remoteHomeService } from '../api/homes'

const DEFAULT_POLLING_INTERVAL = 3000

export function useAppShellController(options = {}) {
  const {
    onToast,
    pollingIntervalMs = DEFAULT_POLLING_INTERVAL,
  } = options

  const authReady = ref(false)
  const user = ref(null)
  const devices = ref([])
  const homes = ref([])
  const activeTab = ref('home')
  const selectedDeviceId = ref('')
  const activeSubView = ref('main')
  const isAddModalOpen = ref(false)
  const refreshTimer = ref(null)

  const currentDevice = computed(() => {
    return devices.value.find((item) => item.id === selectedDeviceId.value) || null
  })

  const showBottomNavigation = computed(() => {
    return !selectedDeviceId.value && activeSubView.value === 'main' && !isAddModalOpen.value && activeTab.value !== 'mall'
  })

  function notifyToast(payload) {
    if (payload && typeof onToast === 'function') {
      onToast(payload)
    }
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

  async function refreshAll(showErrors) {
    if (!user.value) {
      devices.value = []
      homes.value = []
      return
    }

    try {
      const [devicesResult, homesResult] = await Promise.all([remoteDeviceService.list(), remoteHomeService.list()])
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
        notifyToast({
          message: error.message || '数据加载失败',
          type: 'error',
        })
      }
    }
  }

  function stopPolling() {
    if (refreshTimer.value) {
      clearInterval(refreshTimer.value)
      refreshTimer.value = null
    }
  }

  function startPolling() {
    stopPolling()
    refreshTimer.value = setInterval(() => {
      refreshAll(false)
    }, pollingIntervalMs)
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
    } catch (_error) {
      resetViewState()
      notifyToast({
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

  function handlePageShow() {
    if (user.value) {
      refreshAll(false)
    }
  }

  function handlePullDownRefresh() {
    return refreshAll(true)
  }

  function selectDevice(deviceId) {
    selectedDeviceId.value = deviceId
  }

  function clearSelectedDevice() {
    selectedDeviceId.value = ''
  }

  function openAddDeviceModal() {
    isAddModalOpen.value = true
  }

  function closeAddDeviceModal() {
    isAddModalOpen.value = false
  }

  async function logout() {
    await logoutCurrentSession()
    stopPolling()
    resetViewState()
  }

  return {
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
    resetViewState,
    selectDevice,
    clearSelectedDevice,
    openAddDeviceModal,
    closeAddDeviceModal,
    logout,
  }
}
