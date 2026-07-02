import { computed, ref, watch } from 'vue'
import { remoteDeviceService } from '../../api/devices'

const listDeviceLogs = (...args) => remoteDeviceService.listLogs(...args)

export function useSafetyController(options) {
  const { props } = options

  const selectedDeviceId = ref(null)
  const dropdownOpen = ref(false)
  const alertLogs = ref([])
  const logs = ref([])
  const loadingLogs = ref(false)

  // Derive device lists from user ownership
  const myDevices = computed(() => {
    return props.devices.filter((device) => {
      return device.ownerUid === props.user?.shortUid
    })
  })

  const sharedDevices = computed(() => {
    return props.devices.filter((device) => {
      return device.ownerUid !== props.user?.shortUid
    })
  })

  // Auto-select first device
  const currentDevice = computed(() => {
    const id = selectedDeviceId.value
    if (id) {
      return props.devices.find((d) => d.id === id) || null
    }
    return props.devices[0] || null
  })

  function selectDevice(deviceId) {
    selectedDeviceId.value = deviceId
    dropdownOpen.value = false
  }

  // Fetch logs when current device changes
  async function fetchLogs(deviceId) {
    if (!deviceId) {
      alertLogs.value = []
      logs.value = []
      return
    }

    loadingLogs.value = true
    try {
      const allLogs = await listDeviceLogs(deviceId)
      // Split logs: alert/warning → 告警记录, the rest → 操作记录
      alertLogs.value = allLogs
        .filter((log) => log.type === 'alert' || log.type === 'warning')
        .map((log) => ({
          id: log.id,
          type: log.type,
          event: log.event,
          displayName: log.displayName || log.ownerId,
          time: formatTime(log.createdAt),
        }))
      logs.value = allLogs
        .filter((log) => log.type !== 'alert' && log.type !== 'warning')
        .map((log) => ({
          id: log.id,
          type: log.type || 'info',
          event: log.event,
          displayName: log.displayName || log.ownerId,
          createdAt: log.createdAt,
        }))
    } catch (err) {
      console.error('[safety] 加载日志失败:', err)
      alertLogs.value = []
      logs.value = []
    } finally {
      loadingLogs.value = false
    }
  }

  // Re-fetch when selected device changes
  watch(
    () => currentDevice.value?.id,
    (newId) => {
      fetchLogs(newId)
    },
    { immediate: true }
  )

  // Mock sensor data — replace with real API when available
  const sensors = computed(() => {
    const device = currentDevice.value
    if (!device) return []

    const isOn = device.isOn
    return [
      {
        id: 'temperature',
        label: '温度',
        value: isOn ? (device.temp != null ? `${device.temp}°C` : '24°C') : '--',
        icon: 'thermometer',
        status: 'safe',
      },
      {
        id: 'humidity',
        label: '湿度',
        value: isOn ? '58%' : '--',
        icon: 'droplet',
        status: 'safe',
      },
      {
        id: 'gas',
        label: '燃气泄漏',
        value: isOn ? (device.gas != null ? `${device.gas}%` : '0.02%') : '--',
        icon: 'flame',
        status: 'safe',
      },
      {
        id: 'smoke',
        label: '烟雾浓度',
        value: isOn ? '正常' : '--',
        icon: 'alert',
        status: 'safe',
      },
    ]
  })

  function dotClass(type) {
    const map = {
      success: 'safety-view__log-dot--success',
      info: 'safety-view__log-dot--info',
      warning: 'safety-view__log-dot--warning',
      danger: 'safety-view__log-dot--danger',
    }
    return map[type] || 'safety-view__log-dot--info'
  }

  function formatDate(timestamp) {
    if (!timestamp) return ''
    const date = new Date(timestamp)
    return `${date.getMonth() + 1}/${date.getDate()} ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`
  }

  function formatTime(timestamp) {
    return formatDate(timestamp)
  }

  return {
    selectedDeviceId,
    dropdownOpen,
    logs,
    currentDevice,
    myDevices,
    sharedDevices,
    alertLogs,
    sensors,
    loadingLogs,
    selectDevice,
    dotClass,
    formatDate,
  }
}
