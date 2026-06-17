import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { listDeviceLogs } from '../../remote/devices'
import { getUserShortUid, isOwnedByShortUid } from '../common/user-helpers'

export function useSafetyViewController(options) {
  const { props } = options

  const selectedDeviceId = ref('')
  const dropdownOpen = ref(false)
  const logs = ref([])
  const logTimer = ref(null)

  const shortUid = computed(() => {
    return getUserShortUid(props.user)
  })

  const currentDevice = computed(() => {
    return props.devices.find((item) => item.id === selectedDeviceId.value) || props.devices[0] || null
  })

  const myDevices = computed(() => {
    return props.devices.filter((item) => isOwnedByShortUid(item, shortUid.value))
  })

  const sharedDevices = computed(() => {
    return props.devices.filter((item) => !isOwnedByShortUid(item, shortUid.value))
  })

  const alertLogs = computed(() => {
    if (!currentDevice.value) {
      return []
    }

    return [
      {
        id: 'alert-1',
        time: '今天 08:30',
        event: '干烧预警：锅底温度过高',
        type: 'warning',
      },
      {
        id: 'alert-2',
        time: '昨天 12:15',
        event: '自动关阀：检测到无人看护',
        type: 'danger',
      },
    ]
  })

  const sensors = computed(() => {
    if (!currentDevice.value) {
      return []
    }

    return [
      {
        id: 'gas',
        label: '燃气监测',
        value: `${Number(currentDevice.value.gas || 0).toFixed(2)}% LEL`,
        status: Number(currentDevice.value.gas || 0) > 20 ? 'warning' : 'safe',
        icon: 'droplet',
      },
      {
        id: 'smoke',
        label: '烟雾监测',
        value: `${currentDevice.value.smoke || 0}%`,
        status: Number(currentDevice.value.smoke || 0) > 10 ? 'warning' : 'safe',
        icon: 'activity',
      },
      {
        id: 'temp',
        label: '超温预警',
        value: `${Number(currentDevice.value.temp || 0).toFixed(1)}°C`,
        status: Number(currentDevice.value.temp || 0) > 250 ? 'danger' : 'safe',
        icon: 'thermometer',
      },
      {
        id: 'human',
        label: '人体感应',
        value: currentDevice.value.humanDetected ? '有人' : '无人',
        status: 'safe',
        icon: 'user',
      },
      {
        id: 'vibration',
        label: '倾倒检测',
        value: currentDevice.value.vibration ? '异常' : '正常',
        status: currentDevice.value.vibration ? 'danger' : 'safe',
        icon: 'alert',
      },
      {
        id: 'flow',
        label: '流量监控',
        value: `${currentDevice.value.flow || 0} L/min`,
        status: 'safe',
        icon: 'wind',
      },
    ]
  })

  function stopLogPolling() {
    if (logTimer.value) {
      clearInterval(logTimer.value)
      logTimer.value = null
    }
  }

  async function loadLogs() {
    if (!currentDevice.value) {
      logs.value = []
      return
    }

    try {
      logs.value = await listDeviceLogs(currentDevice.value.id)
    } catch (error) {
      logs.value = []
    }
  }

  function startLogPolling() {
    stopLogPolling()

    if (!currentDevice.value) {
      return
    }

    loadLogs()
    logTimer.value = setInterval(() => {
      loadLogs()
    }, 3000)
  }

  function selectDevice(deviceId) {
    selectedDeviceId.value = deviceId
    dropdownOpen.value = false
  }

  function dotClass(type) {
    if (type === 'warning') {
      return 'safety-view__log-dot--warning'
    }

    if (type === 'success') {
      return 'safety-view__log-dot--success'
    }

    return 'safety-view__log-dot--info'
  }

  function formatDate(value) {
    if (!value) {
      return '刚刚'
    }

    const date = new Date(value)
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
      date.getDate()
    ).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(
      date.getMinutes()
    ).padStart(2, '0')}`
  }

  watch(
    () => props.devices,
    (nextDevices) => {
      if (!nextDevices.length) {
        selectedDeviceId.value = ''
        stopLogPolling()
        logs.value = []
        return
      }

      if (!nextDevices.some((item) => item.id === selectedDeviceId.value)) {
        selectedDeviceId.value = nextDevices[0].id
      }

      startLogPolling()
    },
    { immediate: true }
  )

  watch(selectedDeviceId, () => {
    startLogPolling()
  })

  onBeforeUnmount(() => {
    stopLogPolling()
  })

  return {
    selectedDeviceId,
    dropdownOpen,
    logs,
    currentDevice,
    myDevices,
    sharedDevices,
    alertLogs,
    sensors,
    selectDevice,
    dotClass,
    formatDate,
  }
}
