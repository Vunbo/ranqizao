import { computed, onBeforeUnmount, ref, watch } from 'vue'
import {
  bindScannedDevice,
  createDevice,
  scanBindableDevice,
} from '../device'
import {
  createCallbackTrigger,
  createNotifier,
  formatErrorMessage,
  hasDuplicateName,
  normalizeText,
} from '../../common/shared-helpers'
import {
  buildEmptyPermissionDialog,
  buildPermissionDialog,
  isPermissionDenied,
  isUserCanceled,
  openSystemPermissionSettings,
  requestCurrentLocation,
  requestScanCode,
  resolveBindingLocation,
  resolveScanBindingMode,
} from '../../common/location-helpers'

export function useAddDeviceModalController(options) {
  const {
    props,
    notify,
    onClose,
    onRefresh,
  } = options

  const step = ref('scan')
  const deviceName = ref('智能安全灶')
  const loading = ref(false)
  const location = ref(null)
  const wifiSsid = ref('')
  const wifiPassword = ref('')
  const configProgress = ref(0)
  const configTimer = ref(null)
  const scannedQrCode = ref('')
  const scanBindingMode = ref('inventory')
  const permissionDialog = ref(buildEmptyPermissionDialog())

  const progressStyle = computed(() => {
    return `conic-gradient(#f97316 0 ${configProgress.value}%, #f1f5f9 ${configProgress.value}% 100%)`
  })

  const notifyUser = createNotifier(notify)
  const emitClose = createCallbackTrigger(onClose)
  const triggerRefresh = createCallbackTrigger(onRefresh)

  function clearTimers() {
    if (configTimer.value) {
      clearInterval(configTimer.value)
      configTimer.value = null
    }
  }

  function resetFlow() {
    clearTimers()
    step.value = 'scan'
    deviceName.value = '智能安全灶'
    loading.value = false
    location.value = null
    wifiSsid.value = ''
    wifiPassword.value = ''
    configProgress.value = 0
    scannedQrCode.value = ''
    scanBindingMode.value = 'inventory'
    permissionDialog.value = buildEmptyPermissionDialog()
  }

  function closePermissionDialog() {
    permissionDialog.value = buildEmptyPermissionDialog()
  }

  function showPermissionDialog(type) {
    permissionDialog.value = buildPermissionDialog(type)
  }

  async function openPermissionSettings() {
    try {
      await openSystemPermissionSettings()
      notifyUser({
        message: '已打开系统权限设置，请完成授权后重试。',
        type: 'info',
      })
    } catch (error) {
      notifyUser({
        message: formatErrorMessage(error, '打开系统权限设置失败'),
        type: 'error',
      })
    } finally {
      closePermissionDialog()
    }
  }

  async function handleScan() {
    if (loading.value) {
      return
    }

    loading.value = true

    try {
      const qrCode = await requestScanCode()
      const scanResult = await resolveScanBindingMode(qrCode, scanBindableDevice)

      scannedQrCode.value = qrCode
      scanBindingMode.value = scanResult.mode

      if (scanResult.notice) {
        notifyUser({
          message: scanResult.notice,
          type: 'info',
        })
      }

      step.value = 'location'
    } catch (error) {
      const errorMessage = String(error.message || '')

      if (isUserCanceled(errorMessage)) {
        notifyUser({
          message: '已取消扫码。',
          type: 'info',
        })
        return
      }

      if (isPermissionDenied(errorMessage)) {
        showPermissionDialog('camera')
        return
      }

      notifyUser({
        message: formatErrorMessage(error, '扫码识别失败'),
        type: 'error',
      })
    } finally {
      loading.value = false
    }
  }

  async function handleGetLocation() {
    if (loading.value) {
      return
    }

    loading.value = true

    try {
      const currentLocation = await requestCurrentLocation()
      location.value = await resolveBindingLocation(currentLocation)
      step.value = 'wifi'
    } catch (error) {
      const errorMessage = String(error.message || '')

      if (isPermissionDenied(errorMessage)) {
        showPermissionDialog('location')
        return
      }

      notifyUser({
        message: formatErrorMessage(error, '定位获取失败，请检查定位权限。'),
        type: 'error',
      })
    } finally {
      loading.value = false
    }
  }

  function handleStartConfig() {
    if (!normalizeText(wifiSsid.value)) {
      notifyUser({
        message: '请输入 Wi-Fi 名称。',
        type: 'error',
      })
      return
    }

    step.value = 'configuring'
    configProgress.value = 0
    clearTimers()
    configTimer.value = setInterval(() => {
      configProgress.value = Math.min(100, configProgress.value + Math.random() * 15)
      if (configProgress.value >= 100) {
        clearTimers()
        setTimeout(() => {
          step.value = 'naming'
        }, 500)
      }
    }, 400)
  }

  async function handleBind() {
    if (!props.user || loading.value) {
      return
    }

    const normalizedName = normalizeText(deviceName.value)

    if (!normalizedName) {
      notifyUser({
        message: '请输入设备名称。',
        type: 'error',
      })
      return
    }

    if (hasDuplicateName(props.existingDevices, normalizedName)) {
      notifyUser({
        message: '设备名称已存在，请修改后重试。',
        type: 'error',
      })
      return
    }

    loading.value = true

    try {
      if (!scannedQrCode.value) {
        throw new Error('缺少扫码识别结果，请重新扫码。')
      }

      const payload = {
        name: normalizedName,
        location: location.value,
      }

      if (scanBindingMode.value === 'mock') {
        await createDevice(payload)
      } else {
        await bindScannedDevice({
          ...payload,
          qrCode: scannedQrCode.value,
          wifiSsid: normalizeText(wifiSsid.value),
          wifiPassword: wifiPassword.value,
        })
      }

      triggerRefresh()
      step.value = 'success'
    } catch (error) {
      notifyUser({
        message: formatErrorMessage(error, '设备绑定失败'),
        type: 'error',
      })
    } finally {
      loading.value = false
    }
  }

  function handleFinish() {
    emitClose()
    resetFlow()
  }

  watch(
    () => props.visible,
    (visible) => {
      if (!visible) {
        resetFlow()
      }
    }
  )

  onBeforeUnmount(() => {
    clearTimers()
  })

  return {
    step,
    deviceName,
    loading,
    wifiSsid,
    wifiPassword,
    configProgress,
    permissionDialog,
    progressStyle,
    closePermissionDialog,
    openPermissionSettings,
    handleScan,
    handleGetLocation,
    handleStartConfig,
    handleBind,
    handleFinish,
  }
}
