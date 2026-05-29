import { computed, ref } from 'vue'
import {
  addHomeMember,
  removeHomeMembers,
  shareDevice,
  unshareDevice,
} from '../sharing'
import {
  createCallbackTrigger,
  createNotifier,
  formatErrorMessage,
  normalizeText,
} from '../common/controller-helpers'
import {
  buildDisplayMap,
  getOwnerDisplayName,
  resolveDeviceMemberDisplayName,
  resolveHomeMemberDisplayName,
} from '../common/resource-helpers'
import { getUserDisplayName, getUserShortUid, isOwnedByShortUid } from '../common/user-helpers'

export function useSharingManagementController(options) {
  const {
    props,
    notify,
    onRefresh,
  } = options

  const mainTab = ref('my')
  const subTab = ref('home')
  const isAddMemberModalOpen = ref(false)
  const isRemoveMemberModalOpen = ref(false)
  const memberUidInput = ref('')
  const selectedUidsToRemove = ref([])
  const targetResource = ref(null)

  const shortUid = computed(() => {
    return getUserShortUid(props.user)
  })

  const ownerLabel = computed(() => {
    return getUserDisplayName(props.user, shortUid.value || '--------')
  })

  const myHomes = computed(() => {
    return props.homes.filter((home) => isOwnedByShortUid(home, shortUid.value))
  })

  const myDevices = computed(() => {
    return props.devices.filter((device) => isOwnedByShortUid(device, shortUid.value))
  })

  const friendHomes = computed(() => {
    return props.homes.filter((home) => {
      return !isOwnedByShortUid(home, shortUid.value) && (home.members || []).includes(shortUid.value)
    })
  })

  const friendDevices = computed(() => {
    return props.devices.filter((device) => {
      return !isOwnedByShortUid(device, shortUid.value) && (device.sharedWith || []).includes(shortUid.value)
    })
  })

  const notifyUser = createNotifier(notify)
  const triggerRefresh = createCallbackTrigger(onRefresh)

  function getOwnerDisplayNameSafe(resource) {
    return getOwnerDisplayName(resource)
  }

  function getHomeMemberDisplayName(home, uid) {
    return resolveHomeMemberDisplayName(home, uid)
  }

  function getDeviceMemberDisplayName(device, uid) {
    return resolveDeviceMemberDisplayName(device, uid)
  }

  function getTargetMemberDisplayName(uid) {
    if (!targetResource.value || !targetResource.value.displayMap) {
      return uid
    }

    return targetResource.value.displayMap[uid] || uid
  }

  function openAddMember(type, id, currentMembers) {
    targetResource.value = {
      type,
      id,
      currentMembers,
    }
    memberUidInput.value = ''
    isAddMemberModalOpen.value = true
  }

  function openRemoveMember(type, id, currentMembers) {
    if (!currentMembers.length) {
      notifyUser({
        message: '暂无可移除的成员',
        type: 'info',
      })
      return
    }

    targetResource.value = {
      type,
      id,
      currentMembers,
      displayMap:
        type === 'home'
          ? buildDisplayMap(
              currentMembers,
              (uid) => getHomeMemberDisplayName(myHomes.value.find((home) => home.id === id), uid)
            )
          : buildDisplayMap(
              currentMembers,
              (uid) => getDeviceMemberDisplayName(myDevices.value.find((device) => device.id === id), uid)
            ),
    }
    selectedUidsToRemove.value = []
    isRemoveMemberModalOpen.value = true
  }

  async function confirmAddMember() {
    if (!targetResource.value) {
      return
    }

    const uid = normalizeText(memberUidInput.value)

    if (!uid) {
      return
    }

    if (uid === shortUid.value) {
      notifyUser({
        message: '不能添加自己',
        type: 'error',
      })
      return
    }

    if (uid.length !== 8) {
      notifyUser({
        message: '请输入 8 位 UID',
        type: 'error',
      })
      return
    }

    if (targetResource.value.currentMembers.includes(uid)) {
      notifyUser({
        message: '该成员已存在',
        type: 'info',
      })
      return
    }

    try {
      if (targetResource.value.type === 'home') {
        await addHomeMember(targetResource.value.id, uid)
      } else {
        await shareDevice(targetResource.value.id, uid)
      }

      triggerRefresh()
      notifyUser({
        message: targetResource.value.type === 'home' ? '家庭成员添加成功' : '设备共享成功',
        type: 'success',
      })
      isAddMemberModalOpen.value = false
    } catch (error) {
      notifyUser({
        message: formatErrorMessage(error, '添加失败'),
        type: 'error',
      })
    }
  }

  function toggleUid(uid) {
    if (selectedUidsToRemove.value.includes(uid)) {
      selectedUidsToRemove.value = selectedUidsToRemove.value.filter((item) => item !== uid)
      return
    }

    selectedUidsToRemove.value = selectedUidsToRemove.value.concat(uid)
  }

  async function confirmRemoveMember() {
    if (!targetResource.value || !selectedUidsToRemove.value.length) {
      return
    }

    try {
      if (targetResource.value.type === 'home') {
        await removeHomeMembers(targetResource.value.id, selectedUidsToRemove.value.slice())
      } else {
        await Promise.all(
          selectedUidsToRemove.value.map((uid) => unshareDevice(targetResource.value.id, uid))
        )
      }

      triggerRefresh()
      notifyUser({
        message: targetResource.value.type === 'home' ? '家庭成员移除成功' : '已取消共享',
        type: 'success',
      })
      isRemoveMemberModalOpen.value = false
    } catch (error) {
      notifyUser({
        message: formatErrorMessage(error, '操作失败'),
        type: 'error',
      })
    }
  }

  return {
    mainTab,
    subTab,
    isAddMemberModalOpen,
    isRemoveMemberModalOpen,
    memberUidInput,
    selectedUidsToRemove,
    targetResource,
    ownerLabel,
    myHomes,
    myDevices,
    friendHomes,
    friendDevices,
    getOwnerDisplayName: getOwnerDisplayNameSafe,
    getHomeMemberDisplayName,
    getDeviceMemberDisplayName,
    getTargetMemberDisplayName,
    openAddMember,
    openRemoveMember,
    confirmAddMember,
    toggleUid,
    confirmRemoveMember,
  }
}
