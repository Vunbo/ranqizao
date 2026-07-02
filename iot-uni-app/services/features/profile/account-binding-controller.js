import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { listAuthIdentities } from '../../gateway/auth'
import {
  buildIdentityCards,
  buildVerifyMethods,
  createCountdownTimer,
  formatCountdownText,
} from '../../helpers/auth-helpers'
import {
  runEmailBindFlow,
  runPhoneBindFlow,
  runPhoneCodeSendFlow,
  runThirdPartyBindFlow,
  runUnbindFlow,
} from './account-binding-workflows'

export function useAccountBindingController(options) {
  const {
    props,
    notify,
  } = options

  const identities = ref([])
  const loading = ref(false)
  const submitting = ref(false)
  const emailModalOpen = ref(false)
  const phoneModalOpen = ref(false)
  const bindEmail = ref('')
  const bindEmailPassword = ref('')
  const bindPhone = ref('')
  const bindPhoneCode = ref('')
  const phoneCountdown = ref(0)
  const unbindModalOpen = ref(false)
  const unbindTarget = ref(null)
  const unbindVerifyMethod = ref('')
  const unbindPassword = ref('')
  const unbindPhone = ref('')
  const unbindCode = ref('')
  const unbindPhoneCountdown = ref(0)

  const phoneCountdownController = createCountdownTimer(phoneCountdown)
  const unbindPhoneCountdownController = createCountdownTimer(unbindPhoneCountdown)

  const uid = computed(() => {
    return props.user && props.user.uid ? props.user.uid : ''
  })

  const identityCards = computed(() => {
    return buildIdentityCards(identities.value)
  })

  const availableVerifyMethods = computed(() => {
    return buildVerifyMethods(identities.value, unbindTarget.value)
  })

  const phoneCountdownText = computed(() => {
    return formatCountdownText(phoneCountdown.value)
  })

  const unbindPhoneCountdownText = computed(() => {
    return formatCountdownText(unbindPhoneCountdown.value)
  })

  function notifyUser(payload) {
    if (typeof notify === 'function') {
      notify(payload)
    }
  }

  async function refreshIdentities() {
    loading.value = true

    try {
      identities.value = await listAuthIdentities()
    } catch (requestError) {
      notifyUser({
        message: requestError.message || '加载绑定信息失败',
        type: 'error',
      })
    } finally {
      loading.value = false
    }
  }

  function closeEmailModal() {
    emailModalOpen.value = false
    bindEmail.value = ''
    bindEmailPassword.value = ''
  }

  function closePhoneModal() {
    phoneModalOpen.value = false
    bindPhoneCode.value = ''
  }

  function closeUnbindModal() {
    unbindModalOpen.value = false
    unbindTarget.value = null
    unbindVerifyMethod.value = ''
    unbindPassword.value = ''
    unbindPhone.value = ''
    unbindCode.value = ''
  }

  function openUnbindModal(item) {
    unbindTarget.value = item
    unbindModalOpen.value = true
    unbindPassword.value = ''
    unbindPhone.value = ''
    unbindCode.value = ''
    unbindVerifyMethod.value = availableVerifyMethods.value[0]
      ? availableVerifyMethods.value[0].key
      : ''
  }

  function selectVerifyMethod(method) {
    unbindVerifyMethod.value = method
  }

  async function submitBindMiniProgram() {
    return runThirdPartyBindFlow({
      key: 'wechat',
      submittingRef: submitting,
      refreshIdentities,
      notify: notifyUser,
    })
  }

  async function submitBindWechatApp() {
    return runThirdPartyBindFlow({
      key: 'wechatApp',
      submittingRef: submitting,
      refreshIdentities,
      notify: notifyUser,
    })
  }

  async function submitBindGoogleApp() {
    return runThirdPartyBindFlow({
      key: 'googleApp',
      submittingRef: submitting,
      refreshIdentities,
      notify: notifyUser,
    })
  }

  function handleAction(item) {
    if (item.actionDisabled) {
      return
    }

    if (item.bound) {
      openUnbindModal(item)
      return
    }

    if (item.key === 'email') {
      emailModalOpen.value = true
      return
    }

    if (item.key === 'phone') {
      phoneModalOpen.value = true
      return
    }

    if (item.key === 'wechat') {
      submitBindMiniProgram()
      return
    }

    if (item.key === 'wechatApp') {
      submitBindWechatApp()
      return
    }

    if (item.key === 'googleApp') {
      submitBindGoogleApp()
    }
  }

  async function submitBindEmail() {
    return runEmailBindFlow({
      submittingRef: submitting,
      email: bindEmail.value,
      password: bindEmailPassword.value,
      closeModal: closeEmailModal,
      refreshIdentities,
      notify: notifyUser,
    })
  }

  async function sendBindPhoneVerificationCode() {
    return runPhoneCodeSendFlow({
      mode: 'bind',
      submittingRef: submitting,
      countdownRef: phoneCountdown,
      phone: bindPhone.value,
      countdownController: phoneCountdownController,
      notify: notifyUser,
    })
  }

  async function sendUnbindPhoneVerificationCode() {
    return runPhoneCodeSendFlow({
      mode: 'unbind',
      submittingRef: submitting,
      countdownRef: unbindPhoneCountdown,
      phone: unbindPhone.value,
      countdownController: unbindPhoneCountdownController,
      notify: notifyUser,
    })
  }

  async function submitBindPhone() {
    return runPhoneBindFlow({
      submittingRef: submitting,
      phone: bindPhone.value,
      code: bindPhoneCode.value,
      closeModal: closePhoneModal,
      refreshIdentities,
      notify: notifyUser,
    })
  }

  async function submitUnbind() {
    return runUnbindFlow({
      submittingRef: submitting,
      target: unbindTarget.value,
      verifyMethod: unbindVerifyMethod.value,
      currentPassword: unbindPassword.value,
      phone: unbindPhone.value,
      code: unbindCode.value,
      closeModal: closeUnbindModal,
      refreshIdentities,
      notify: notifyUser,
    })
  }

  onMounted(() => {
    refreshIdentities()
  })

  onBeforeUnmount(() => {
    phoneCountdownController.clear()
    unbindPhoneCountdownController.clear()
  })

  return {
    uid,
    identityCards,
    availableVerifyMethods,
    phoneCountdownText,
    unbindPhoneCountdownText,
    submitting,
    emailModalOpen,
    phoneModalOpen,
    bindEmail,
    bindEmailPassword,
    bindPhone,
    bindPhoneCode,
    phoneCountdown,
    unbindModalOpen,
    unbindTarget,
    unbindVerifyMethod,
    unbindPassword,
    unbindPhone,
    unbindCode,
    unbindPhoneCountdown,
    handleAction,
    closeEmailModal,
    closePhoneModal,
    closeUnbindModal,
    selectVerifyMethod,
    submitBindEmail,
    sendBindPhoneVerificationCode,
    sendUnbindPhoneVerificationCode,
    submitBindPhone,
    submitUnbind,
  }
}
