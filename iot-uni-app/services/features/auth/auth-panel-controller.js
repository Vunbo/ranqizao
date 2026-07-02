import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import {
  getAvailableAppQuickLoginProviders,
  loginWithGoogleApp,
  loginWithMiniProgram,
  loginWithPassword,
  loginWithPhoneCode,
  loginWithWechatApp,
  registerWithPassword,
  sendPhoneLoginCode,
} from '../../gateway/auth'
import { createCountdownTimer, formatCountdownText } from '../../helpers/auth-helpers'
import {
  createNotifier,
  formatErrorMessage,
} from '../../helpers/shared-helpers'

export function useAuthPanelController(options) {
  const { emitAuthSuccess, notify } = options

  const isLogin = ref(true)
  const authMethod = ref('email')
  const email = ref('')
  const password = ref('')
  const confirmPassword = ref('')
  const phone = ref('')
  const phoneCode = ref('')
  const phoneCountdown = ref(0)
  const loading = ref(false)
  const error = ref('')
  const appQuickLoginSupport = ref({
    wechatApp: {
      supported: true,
      reason: '',
    },
    googleApp: {
      supported: true,
      reason: '',
    },
  })

  const notifyUser = createNotifier(notify)
  const phoneCountdownController = createCountdownTimer(phoneCountdown)

  const phoneCountdownText = computed(() => {
    return formatCountdownText(phoneCountdown.value)
  })

  const submitText = computed(() => {
    if (isLogin.value) {
      return authMethod.value === 'phone' ? '手机号登录' : '登录'
    }

    return '注册'
  })

  const appQuickLoginHint = computed(() => {
    if (!appQuickLoginSupport.value.wechatApp.supported) {
      return appQuickLoginSupport.value.wechatApp.reason
    }

    if (!appQuickLoginSupport.value.googleApp.supported) {
      return appQuickLoginSupport.value.googleApp.reason
    }

    return ''
  })

  function completeAuth(session) {
    if (typeof emitAuthSuccess === 'function') {
      emitAuthSuccess(session)
    }
  }

  function resetCommonErrors() {
    error.value = ''
  }

  function toggleAuthMode() {
    isLogin.value = !isLogin.value
    authMethod.value = 'email'
    resetCommonErrors()
    password.value = ''
    confirmPassword.value = ''
    phoneCode.value = ''
  }

  function isFormValid() {
    if (isLogin.value) {
      if (authMethod.value === 'phone') {
        return Boolean(phone.value && phoneCode.value)
      }

      return Boolean(email.value && password.value)
    }

    return Boolean(email.value && password.value && confirmPassword.value && password.value === confirmPassword.value)
  }

  async function handleSendPhoneCode() {
    if (loading.value || phoneCountdown.value > 0) {
      return
    }

    if (!phone.value) {
      error.value = '请输入手机号'
      return
    }

    loading.value = true

    try {
      const result = await sendPhoneLoginCode({
        phone: phone.value,
      })

      phoneCountdownController.start(60)
      notifyUser({
        message:
          result && result.debugCode
            ? `验证码已发送，当前调试验证码：${result.debugCode}`
            : '验证码已发送',
        type: 'success',
      })
    } catch (errorResponse) {
      error.value = formatErrorMessage(errorResponse, '发送验证码失败')
    } finally {
      loading.value = false
    }
  }

  async function handleAuth() {
    if (loading.value || !isFormValid()) {
      return
    }

    loading.value = true
    resetCommonErrors()

    try {
      let session = null

      if (isLogin.value && authMethod.value === 'phone') {
        session = await loginWithPhoneCode({
          phone: phone.value,
          code: phoneCode.value,
        })
      } else if (isLogin.value) {
        session = await loginWithPassword({
          email: email.value,
          password: password.value,
        })
      } else {
        if (password.value !== confirmPassword.value) {
          throw new Error('两次输入的密码不一致')
        }

        session = await registerWithPassword({
          email: email.value,
          password: password.value,
        })
      }

      completeAuth(session)
    } catch (errorResponse) {
      error.value = formatErrorMessage(errorResponse, '认证失败，请检查输入内容。')
    } finally {
      loading.value = false
    }
  }

  async function handleMiniProgramLogin() {
    if (loading.value) {
      return
    }

    loading.value = true

    try {
      const session = await loginWithMiniProgram()
      notifyUser({
        message: '微信登录成功',
        type: 'success',
      })
      completeAuth(session)
    } catch (errorResponse) {
      notifyUser({
        message: formatErrorMessage(errorResponse, '微信登录失败'),
        type: 'error',
      })
    } finally {
      loading.value = false
    }
  }

  async function handleWechatAppLogin() {
    if (loading.value) {
      return
    }

    if (!appQuickLoginSupport.value.wechatApp.supported) {
      notifyUser({
        message: appQuickLoginSupport.value.wechatApp.reason || '当前环境不可用微信 App 快捷登录',
        type: 'error',
      })
      return
    }

    loading.value = true

    try {
      const session = await loginWithWechatApp()
      notifyUser({
        message: '微信登录成功',
        type: 'success',
      })
      completeAuth(session)
    } catch (errorResponse) {
      notifyUser({
        message: formatErrorMessage(errorResponse, '微信登录失败'),
        type: 'error',
      })
    } finally {
      loading.value = false
    }
  }

  async function handleGoogleAppLogin() {
    if (loading.value) {
      return
    }

    if (!appQuickLoginSupport.value.googleApp.supported) {
      notifyUser({
        message: appQuickLoginSupport.value.googleApp.reason || '当前环境不可用 Google App 快捷登录',
        type: 'error',
      })
      return
    }

    loading.value = true

    try {
      const session = await loginWithGoogleApp()
      notifyUser({
        message: 'Google 登录成功',
        type: 'success',
      })
      completeAuth(session)
    } catch (errorResponse) {
      notifyUser({
        message: formatErrorMessage(errorResponse, 'Google 登录失败'),
        type: 'error',
      })
    } finally {
      loading.value = false
    }
  }

  onMounted(async () => {
    // #ifdef APP-PLUS
    appQuickLoginSupport.value = await getAvailableAppQuickLoginProviders()
    // #endif
  })

  onBeforeUnmount(() => {
    phoneCountdownController.clear()
  })

  return {
    isLogin,
    authMethod,
    email,
    password,
    confirmPassword,
    phone,
    phoneCode,
    phoneCountdown,
    loading,
    error,
    appQuickLoginSupport,
    phoneCountdownText,
    submitText,
    appQuickLoginHint,
    toggleAuthMode,
    handleSendPhoneCode,
    handleAuth,
    handleMiniProgramLogin,
    handleWechatAppLogin,
    handleGoogleAppLogin,
  }
}
