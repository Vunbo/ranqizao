import { computed, ref } from 'vue'
import {
  createHome,
  removeHome,
  updateHomeDeviceLinks,
} from '../home'
import {
  createCallbackTrigger,
  createNotifier,
  formatErrorMessage,
  hasDuplicateName,
  normalizeText,
} from '../../common/shared-helpers'
import { getOwnerDisplayName, resolveHomeMemberDisplayName } from '../../common/resource-helpers'
import {
  getDisplayInitial,
  getUserDisplayName,
  getUserShortUid,
  isOwnedByShortUid,
} from '../../common/user-helpers'

export function useHomeManagementController(options) {
  const {
    props,
    notify,
    requestConfirm,
    onRefresh,
  } = options

  const isAddModalOpen = ref(false)
  const newHomeName = ref('')
  const editingHomeId = ref('')
  const isAdjusting = ref(false)
  const tempSelectedDeviceIds = ref([])
  const isSaving = ref(false)

  const shortUid = computed(() => {
    return getUserShortUid(props.user)
  })

  const currentHome = computed(() => {
    return props.homes.find((home) => home.id === editingHomeId.value) || null
  })

  const linkedDevices = computed(() => {
    if (!currentHome.value) {
      return []
    }

    return props.devices.filter((device) => (currentHome.value.deviceIds || []).includes(device.id))
  })

  const ownerDisplayName = computed(() => {
    if (currentHome.value && !isOwnedByShortUid(currentHome.value, shortUid.value)) {
      return getOwnerDisplayName(currentHome.value)
    }

    return getUserDisplayName(props.user, shortUid.value || '--------')
  })

  const ownerInitial = computed(() => {
    return getDisplayInitial(ownerDisplayName.value)
  })

  const ownedDevices = computed(() => {
    return props.devices.filter((device) => isOwnedByShortUid(device, shortUid.value))
  })

  const notifyUser = createNotifier(notify)
  const triggerRefresh = createCallbackTrigger(onRefresh)
  const openConfirm = createCallbackTrigger(requestConfirm)

  function getMemberDisplayName(memberUid) {
    return resolveHomeMemberDisplayName(currentHome.value, memberUid)
  }

  function openHome(homeId) {
    editingHomeId.value = homeId
    isAdjusting.value = false
    tempSelectedDeviceIds.value = []
  }

  function closeOverlay() {
    editingHomeId.value = ''
    isAdjusting.value = false
    tempSelectedDeviceIds.value = []
  }

  async function handleCreateHome() {
    const normalizedName = normalizeText(newHomeName.value)

    if (!normalizedName || !props.user) {
      return
    }

    const duplicated = hasDuplicateName(
      props.homes.filter((home) => home.ownerId === shortUid.value),
      normalizedName
    )

    if (duplicated) {
      notifyUser({
        message: '家庭名称已存在，请更换一个名称。',
        type: 'error',
      })
      return
    }

    try {
      await createHome(normalizedName)
      triggerRefresh()
      notifyUser({
        message: '家庭创建成功',
        type: 'success',
      })
      newHomeName.value = ''
      isAddModalOpen.value = false
    } catch (error) {
      notifyUser({
        message: formatErrorMessage(error, '创建失败'),
        type: 'error',
      })
    }
  }

  function requestDeleteHome() {
    if (!currentHome.value) {
      return
    }

    const home = currentHome.value

    openConfirm({
      title: '删除家庭',
      message: `确定要删除家庭“${home.name}”吗？删除后，该家庭成员关系和设备关联关系将被移除。`,
      confirmText: '确认删除',
      onConfirm: async () => {
        try {
          await removeHome(home.id)
          triggerRefresh()
          closeOverlay()
          notifyUser({
            message: '家庭已删除',
            type: 'success',
          })
        } catch (error) {
          notifyUser({
            message: formatErrorMessage(error, '删除失败'),
            type: 'error',
          })
        }
      },
    })
  }

  function startAdjust() {
    if (!currentHome.value) {
      return
    }

    tempSelectedDeviceIds.value = (currentHome.value.deviceIds || []).slice()
    isAdjusting.value = true
  }

  function cancelAdjust() {
    isAdjusting.value = false
    tempSelectedDeviceIds.value = []
  }

  function toggleDevice(deviceId) {
    if (tempSelectedDeviceIds.value.includes(deviceId)) {
      tempSelectedDeviceIds.value = tempSelectedDeviceIds.value.filter((item) => item !== deviceId)
      return
    }

    tempSelectedDeviceIds.value = tempSelectedDeviceIds.value.concat(deviceId)
  }

  async function saveLinks() {
    if (!currentHome.value || isSaving.value) {
      return
    }

    isSaving.value = true

    try {
      await updateHomeDeviceLinks(currentHome.value.id, tempSelectedDeviceIds.value.slice())
      triggerRefresh()
      notifyUser({
        message: '关联已更新',
        type: 'success',
      })
      isAdjusting.value = false
    } catch (error) {
      notifyUser({
        message: formatErrorMessage(error, '保存失败'),
        type: 'error',
      })
    } finally {
      isSaving.value = false
    }
  }

  return {
    isAddModalOpen,
    newHomeName,
    currentHome,
    isAdjusting,
    tempSelectedDeviceIds,
    isSaving,
    linkedDevices,
    ownerDisplayName,
    ownerInitial,
    ownedDevices,
    getMemberDisplayName,
    openHome,
    closeOverlay,
    handleCreateHome,
    requestDeleteHome,
    startAdjust,
    cancelAdjust,
    toggleDevice,
    saveLinks,
  }
}
