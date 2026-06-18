import { computed, ref } from 'vue'
import { updateCurrentUserProfile } from '../account'
import { getMerchantSummary } from '../merchant'
import {
  createCallbackTrigger,
  createNotifier,
  formatErrorMessage,
  normalizeText,
} from '../../common/shared-helpers'
import {
  getUserDisplayName,
  getUserShortUid,
  isOwnedByShortUid,
} from '../../common/user-helpers'

export function useProfileViewController(options) {
  const {
    props,
    notify,
    onUserUpdated,
    onRefresh,
  } = options

  const isEditNameModalOpen = ref(false)
  const editDisplayName = ref('')
  const isUpdatingDisplayName = ref(false)
  const isLoadingMerchantAccess = ref(false)
  const merchantSummary = ref(null)

  const shortUid = computed(() => {
    return getUserShortUid(props.user)
  })

  const displayName = computed(() => {
    return getUserDisplayName(props.user, shortUid.value || '用户')
  })

  const avatarUrl = computed(() => {
    if (props.user && props.user.photoURL) {
      return props.user.photoURL
    }

    const seed = shortUid.value || 'user'
    return `https://picsum.photos/seed/${seed}/200`
  })

  const sharedUsersCount = computed(() => {
    return props.devices
      .filter((device) => isOwnedByShortUid(device, shortUid.value))
      .reduce((count, device) => count + ((device.sharedWith || []).length || 0), 0)
  })

  const settingsItems = computed(() => {
    return [
      {
        id: 'account',
        icon: 'shield',
        label: '账号管理',
        extra: '绑定与安全',
      },
      {
        id: 'devices',
        icon: 'settings',
        label: '设备管理',
        extra: `${props.devices.length} 台设备`,
      },
      {
        id: 'homes',
        icon: 'home',
        label: '家庭管理',
        extra: `${props.homes.length} 个家庭`,
      },
      {
        id: 'sharing',
        icon: 'shield',
        label: '共享管理',
        extra: `${sharedUsersCount.value} 位成员`,
      },
      {
        id: 'notifications',
        icon: 'bell',
        label: '消息通知',
        extra: '已开启',
      },
    ]
  })

  const supportItems = computed(() => {
    return [
      { icon: 'help', label: '帮助中心', extra: '' },
      { icon: 'message', label: '意见反馈', extra: '' },
      { icon: 'info', label: '关于我们', extra: 'v2.1.0' },
    ]
  })

  const canEnterMerchantPanel = computed(() => {
    return Boolean(merchantSummary.value && merchantSummary.value.canEnterPanel)
  })

  const moreItems = computed(() => {
    const items = [
      {
        id: 'merchant',
        icon: 'globe',
        iconColor: '#3b82f6',
        label: '推广 / 入驻',
        extra: '合作与商户',
      },
    ]

    if (canEnterMerchantPanel.value) {
      items.push({
        id: 'merchant-panel',
        icon: 'home',
        iconColor: '#2563eb',
        label: '进入商户面板',
        extra: '管理商户信息',
      })
    }

    return items
  })

  const notifyUser = createNotifier(notify)
  const emitUserUpdated = createCallbackTrigger(onUserUpdated)
  const triggerRefresh = createCallbackTrigger(onRefresh)

  async function loadMerchantAccess(options = {}) {
    const { silent = true } = options

    if (isLoadingMerchantAccess.value) {
      return
    }

    isLoadingMerchantAccess.value = true

    try {
      merchantSummary.value = await getMerchantSummary()
    } catch (error) {
      merchantSummary.value = null

      if (!silent) {
        notifyUser({
          message: formatErrorMessage(error, '商户状态加载失败'),
          type: 'error',
        })
      }
    } finally {
      isLoadingMerchantAccess.value = false
    }
  }

  function copyUid() {
    if (!shortUid.value) {
      return
    }

    uni.setClipboardData({
      data: shortUid.value,
      success: () => {
        notifyUser({
          message: 'UID 已复制到剪贴板',
          type: 'success',
        })
      },
      fail: () => {
        notifyUser({
          message: '复制失败，请稍后重试',
          type: 'error',
        })
      },
    })
  }

  function openEditName() {
    editDisplayName.value = displayName.value
    isEditNameModalOpen.value = true
  }

  function closeEditName(force = false) {
    if (isUpdatingDisplayName.value && !force) {
      return
    }

    isEditNameModalOpen.value = false
  }

  async function handleUpdateDisplayName() {
    const normalizedName = normalizeText(editDisplayName.value)

    if (!normalizedName) {
      notifyUser({
        message: '名称不能为空',
        type: 'error',
      })
      return
    }

    if (!props.user || isUpdatingDisplayName.value) {
      return
    }

    if (normalizedName === displayName.value) {
      closeEditName()
      return
    }

    isUpdatingDisplayName.value = true

    try {
      const nextUser = await updateCurrentUserProfile({
        displayName: normalizedName,
      })

      emitUserUpdated(nextUser)
      triggerRefresh()
      notifyUser({
        message: '名称修改成功',
        type: 'success',
      })
      closeEditName(true)
    } catch (error) {
      notifyUser({
        message: formatErrorMessage(error, '名称修改失败'),
        type: 'error',
      })
    } finally {
      isUpdatingDisplayName.value = false
    }
  }

  return {
    isEditNameModalOpen,
    editDisplayName,
    isUpdatingDisplayName,
    shortUid,
    displayName,
    avatarUrl,
    settingsItems,
    supportItems,
    moreItems,
    loadMerchantAccess,
    copyUid,
    openEditName,
    closeEditName,
    handleUpdateDisplayName,
  }
}
