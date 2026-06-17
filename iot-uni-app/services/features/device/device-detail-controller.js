import { computed, ref, watch } from 'vue'
import {
  createDeviceLog,
  removeDevice,
  shareDevice,
  unshareDevice,
  updateDevice,
} from '../../remote/devices'
import {
  createCallbackTrigger,
  createNotifier,
  formatErrorMessage,
  hasDuplicateName,
  normalizeText,
} from '../common/controller-helpers'
import { buildSharedUsers } from '../common/resource-helpers'
import { getUserShortUid, isOwnedByShortUid } from '../common/user-helpers'
import {
  buildFlameTransform,
  buildProgressRingSvg,
  cookingModes,
  fireLevels,
  resolveFlameColor,
  resolveGlowColor,
} from './device-detail.helpers'

export function useDeviceDetailController(options) {
  const {
    props,
    notify,
    requestConfirm,
    onRefresh,
    onBack,
  } = options

  const isPending = ref(false)
  const isShareModalOpen = ref(false)
  const isRenameModalOpen = ref(false)
  const newName = ref('')
  const shareUid = ref('')
  const shareLoading = ref(false)

  const shortUid = computed(() => {
    return getUserShortUid(props.user)
  })

  const displayIsOn = computed(() => {
    return props.device ? Boolean(props.device.isOn) : false
  })

  const displayFireLevel = computed(() => {
    return props.device ? Number(props.device.fireLevel || 0) : 0
  })

  const isOwner = computed(() => {
    return isOwnedByShortUid(props.device, shortUid.value)
  })

  const sharedUsers = computed(() => {
    return buildSharedUsers(props.device)
  })

  const flameColor = computed(() => {
    return resolveFlameColor(displayIsOn.value, displayFireLevel.value)
  })

  const glowColor = computed(() => {
    return resolveGlowColor(displayFireLevel.value)
  })

  const flameTransform = computed(() => {
    return buildFlameTransform(displayIsOn.value, displayFireLevel.value)
  })

  const progressRingSvg = computed(() => {
    return buildProgressRingSvg(
      displayIsOn.value,
      displayFireLevel.value,
      displayIsOn.value ? flameColor.value : '#1e293b'
    )
  })

  const notifyUser = createNotifier(notify)
  const openConfirm = createCallbackTrigger(requestConfirm)
  const triggerRefresh = createCallbackTrigger(onRefresh)
  const triggerBack = createCallbackTrigger(onBack)

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

  function closeRename() {
    isRenameModalOpen.value = false
  }

  function openShare() {
    isShareModalOpen.value = true
  }

  function closeShare() {
    isShareModalOpen.value = false
  }

  function handleToggle() {
    if (!props.device || isPending.value) {
      return
    }

    if (!props.device.isOn) {
      openConfirm({
        title: '安全确认',
        message: '开启火源前，请确认厨房通风良好、灶台附近没有易燃物，并且现场有人看护。',
        confirmText: '确认开启',
        onConfirm: async () => {
          isPending.value = true
          try {
            await updateDevice(props.device.id, { isOn: true })
            await logOperation('远程开启火源', 'success')
            triggerRefresh()
            notifyUser({
              message: '设备已开启',
              type: 'success',
            })
          } catch (error) {
            notifyUser({
              message: formatErrorMessage(error, '操作失败，请重试'),
              type: 'error',
            })
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
        triggerRefresh()
        notifyUser({
          message: '设备已关闭',
          type: 'info',
        })
      })
      .catch((error) => {
        notifyUser({
          message: formatErrorMessage(error, '操作失败，请重试'),
          type: 'error',
        })
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
      triggerRefresh()
      notifyUser({
        message: `火力已调整至 ${level}%`,
        type: 'success',
      })
    } catch (error) {
      notifyUser({
        message: formatErrorMessage(error, '调节失败，请重试'),
        type: 'error',
      })
    } finally {
      isPending.value = false
    }
  }

  async function handleRename() {
    if (!props.device || isPending.value) {
      return
    }

    const normalizedName = normalizeText(newName.value)
    if (!normalizedName) {
      return
    }

    if (hasDuplicateName(props.devices, normalizedName, { excludeId: props.device.id })) {
      notifyUser({
        message: '设备名称已存在，请更换一个名称。',
        type: 'error',
      })
      return
    }

    isPending.value = true
    try {
      await updateDevice(props.device.id, { name: normalizedName })
      await logOperation(`重命名设备为“${normalizedName}”`, 'info')
      triggerRefresh()
      closeRename()
      notifyUser({
        message: '设备重命名成功',
        type: 'success',
      })
    } catch (error) {
      notifyUser({
        message: formatErrorMessage(error, '重命名失败，请重试'),
        type: 'error',
      })
    } finally {
      isPending.value = false
    }
  }

  function requestDelete() {
    if (!props.device || isPending.value) {
      return
    }

    const currentDevice = props.device

    openConfirm({
      title: '删除设备',
      message: `确定要删除设备“${currentDevice.name}”吗？此操作不可撤销。`,
      confirmText: '确认删除',
      onConfirm: async () => {
        isPending.value = true
        try {
          await removeDevice(currentDevice.id)
          triggerRefresh()
          triggerBack()
          notifyUser({
            message: '设备已删除',
            type: 'success',
          })
        } catch (error) {
          notifyUser({
            message: formatErrorMessage(error, '删除失败，请重试'),
            type: 'error',
          })
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

    const uid = normalizeText(shareUid.value)
    if (!uid) {
      return
    }

    if ((props.device.sharedWith || []).includes(uid)) {
      notifyUser({
        message: '该用户已在共享列表中。',
        type: 'info',
      })
      return
    }

    shareLoading.value = true
    try {
      await shareDevice(props.device.id, uid)
      triggerRefresh()
      shareUid.value = ''
      closeShare()
      notifyUser({
        message: '设备共享成功',
        type: 'success',
      })
    } catch (error) {
      notifyUser({
        message: formatErrorMessage(error, '共享失败，请检查 UID'),
        type: 'error',
      })
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
      triggerRefresh()
      notifyUser({
        message: '已取消共享',
        type: 'success',
      })
    } catch (error) {
      notifyUser({
        message: formatErrorMessage(error, '操作失败'),
        type: 'error',
      })
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

  return {
    fireLevels,
    cookingModes,
    isPending,
    isShareModalOpen,
    isRenameModalOpen,
    newName,
    shareUid,
    shareLoading,
    displayIsOn,
    displayFireLevel,
    isOwner,
    sharedUsers,
    flameColor,
    glowColor,
    flameTransform,
    progressRingSvg,
    openRename,
    closeRename,
    openShare,
    closeShare,
    handleToggle,
    handleFireLevel,
    handleRename,
    requestDelete,
    handleShare,
    handleRemoveShare,
  }
}
