import { computed, ref } from 'vue'
import { removeDevice, updateDevice } from '../../remote/devices'
import {
  createCallbackTrigger,
  createNotifier,
  formatErrorMessage,
  hasDuplicateName,
  normalizeCompareText,
  normalizeText,
} from '../common/controller-helpers'
import { getUserShortUid, isOwnedByShortUid } from '../common/user-helpers'

const filterTabs = [
  { id: 'all', label: '全部' },
  { id: 'mine', label: '我的' },
  { id: 'shared', label: '共享' },
]

export function useDeviceManagementController(options) {
  const {
    props,
    notify,
    requestConfirm,
    onRefresh,
  } = options

  const searchQuery = ref('')
  const filterTab = ref('all')
  const isRenaming = ref('')
  const newName = ref('')

  const shortUid = computed(() => {
    return getUserShortUid(props.user)
  })

  const filteredDevices = computed(() => {
    const normalizedQuery = normalizeCompareText(searchQuery.value)

    return props.devices.filter((device) => {
      const matchesSearch = normalizeCompareText(device.name).includes(normalizedQuery)
      const owner = isOwnedByShortUid(device, shortUid.value)

      if (filterTab.value === 'mine') {
        return matchesSearch && owner
      }

      if (filterTab.value === 'shared') {
        return matchesSearch && !owner
      }

      return matchesSearch
    })
  })

  const notifyUser = createNotifier(notify)
  const triggerRefresh = createCallbackTrigger(onRefresh)
  const openConfirm = createCallbackTrigger(requestConfirm)

  function isOwner(device) {
    return isOwnedByShortUid(device, shortUid.value)
  }

  function startRename(device) {
    isRenaming.value = device.id
    newName.value = device.name
  }

  function cancelRename() {
    isRenaming.value = ''
    newName.value = ''
  }

  async function handleRename(device) {
    const normalizedName = normalizeText(newName.value)
    if (!normalizedName) {
      return
    }

    if (hasDuplicateName(props.devices, normalizedName, { excludeId: device.id })) {
      notifyUser({
        message: '设备名称已存在，请更换一个名称。',
        type: 'error',
      })
      return
    }

    try {
      await updateDevice(device.id, { name: normalizedName })
      triggerRefresh()
      notifyUser({
        message: '设备重命名成功',
        type: 'success',
      })
      cancelRename()
    } catch (error) {
      notifyUser({
        message: formatErrorMessage(error, '重命名失败'),
        type: 'error',
      })
    }
  }

  function handleDelete(device) {
    openConfirm({
      title: '删除设备',
      message: `确定要删除设备“${device.name}”吗？此操作不可撤销。`,
      confirmText: '确认删除',
      onConfirm: async () => {
        try {
          await removeDevice(device.id)
          triggerRefresh()
          notifyUser({
            message: '设备已删除',
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

  return {
    searchQuery,
    filterTab,
    isRenaming,
    newName,
    filterTabs,
    filteredDevices,
    isOwner,
    startRename,
    cancelRename,
    handleRename,
    handleDelete,
  }
}
