import { computed, ref } from 'vue'
import { logoutCurrentSession, restoreSession } from '../remote/auth'
import { listDevices } from '../remote/devices'
import { listHomes } from '../remote/homes'
import { openMallH5 } from '../features/mall-h5'
import { usePolling } from './usePolling'

const DEFAULT_POLLING_INTERVAL = 3000

export function useAppShellController(options = {}) {
  const { onToast, pollingIntervalMs = DEFAULT_POLLING_INTERVAL } = options

  // ---- auth ----
  const authReady = ref(false)
  const user = ref(null)

  // ---- domain state ----
  const devices = ref([])
  const homes = ref([])

  // ---- navigation ----
  const activeTab = ref('home')
  const selectedDeviceId = ref('')
  const activeSubView = ref('main')
  const isAddModalOpen = ref(false)

  // ---- derived ----
  const currentDevice = computed(() => {
    return devices.value.find((item) => item.id === selectedDeviceId.value) || null
  })

  const showBottomNavigation = computed(() => {
    return !selectedDeviceId.value && activeSubView.value === 'main' && !isAddModalOpen.value
  })

  // ---- polling (extracted deep module) ----
  const pollingEnabled = computed(() => !!user.value)

  const polling = usePolling(
    () => refreshAll(false),
    { intervalMs: pollingIntervalMs, enabled: pollingEnabled }
  )

  // ---- helpers ----
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
        notifyToast({ message: error.message || '数据加载失败', type: 'error' })
      }
    }
  }

  // ---- session management ----
  async function bootstrapSession() {
    authReady.value = false

    try {
      const session = await restoreSession()

      if (session && session.user) {
        user.value = session.user
        await refreshAll(true)
        polling.start()
      } else {
        resetViewState()
      }
    } catch (_error) {
      resetViewState()
      notifyToast({ message: '会话已失效，请重新登录', type: 'info' })
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
    polling.start()
  }

  // ---- navigation ----
  function handleTabChange(tab) {
    if (tab === 'mall') {
      openMallH5()
      return
    }

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
    polling.stop()
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
    stopPolling: polling.stop,
    resetViewState,
    selectDevice,
    clearSelectedDevice,
    openAddDeviceModal,
    closeAddDeviceModal,
    logout,
  }
}
