import { computed, ref } from 'vue'

export function useSafetyController(options) {
  const { props } = options

  const selectedDeviceId = ref(null)
  const dropdownOpen = ref(false)

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

  // Mock sensor data — replace with real API when available
  const sensors = computed(() => {
    const device = currentDevice.value
    if (!device) return []

    const isOn = device.isOn
    return [
      {
        id: 'temperature',
        label: '温度',
        value: isOn ? '24°C' : '--',
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
        value: isOn ? '0.02%' : '--',
        icon: 'flame',
        status: 'safe',
      },
      {
        id: 'smoke',
        label: '烟雾浓度',
        value: isOn ? '正常' : '--',
        icon: 'cloud',
        status: 'safe',
      },
    ]
  })

  // Mock alert logs — replace with real API when available
  const alertLogs = computed(() => {
    return []
  })

  // Mock operation logs — replace with real API when available
  const logs = computed(() => {
    return []
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
