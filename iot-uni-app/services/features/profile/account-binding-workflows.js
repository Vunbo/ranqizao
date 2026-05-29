import {
  bindEmailIdentity,
  bindGoogleAppIdentity,
  bindMiniProgramIdentity,
  bindPhoneIdentity,
  bindWechatAppIdentity,
  getGoogleAppVerificationPayload,
  getWechatAppVerificationCode,
  sendPhoneBindCode,
  sendPhoneUnbindCode,
  unbindIdentity,
} from '../account'

const THIRD_PARTY_BIND_CONFIG = {
  wechat: {
    action: bindMiniProgramIdentity,
    successMessage: '微信身份绑定成功',
    failureMessage: '微信身份绑定失败',
  },
  wechatApp: {
    action: bindWechatAppIdentity,
    successMessage: '微信 App 身份绑定成功',
    failureMessage: '微信 App 身份绑定失败',
  },
  googleApp: {
    action: bindGoogleAppIdentity,
    successMessage: 'Google 身份绑定成功',
    failureMessage: 'Google 身份绑定失败',
  },
}

function notifyUser(notify, payload) {
  if (typeof notify === 'function') {
    notify(payload)
  }
}

async function runGuardedSubmission(submittingRef, task) {
  if (submittingRef.value) {
    return null
  }

  submittingRef.value = true

  try {
    return await task()
  } finally {
    submittingRef.value = false
  }
}

async function runRefreshableAction(options) {
  const {
    submittingRef,
    task,
    refreshIdentities,
    notify,
    successMessage,
    failureMessage,
    afterSuccess,
  } = options

  return runGuardedSubmission(submittingRef, async () => {
    try {
      const result = await task()

      if (typeof afterSuccess === 'function') {
        await afterSuccess(result)
      }

      if (typeof refreshIdentities === 'function') {
        await refreshIdentities()
      }

      notifyUser(notify, {
        message: successMessage,
        type: 'success',
      })

      return result
    } catch (requestError) {
      notifyUser(notify, {
        message: requestError.message || failureMessage,
        type: 'error',
      })

      return null
    }
  })
}

async function resolveWechatVerificationCode(type) {
  if (type === 'wechat_mini_program') {
    // #ifdef MP-WEIXIN
    const loginResult = await new Promise((resolve, reject) => {
      uni.login({
        provider: 'weixin',
        success: resolve,
        fail: reject,
      })
    })

    return loginResult.code
    // #endif
  }

  if (type === 'wechat_app') {
    // #ifdef APP-PLUS
    return getWechatAppVerificationCode()
    // #endif
  }

  throw new Error('当前平台不支持该微信校验方式。')
}

async function buildUnbindPayload(options) {
  const {
    target,
    verifyMethod,
    currentPassword,
    phone,
    code,
  } = options

  const payload = {
    provider: target.provider,
    providerUserId: target.providerUserId,
    providerAppId: target.providerAppId || '',
    verificationType: verifyMethod,
  }

  if (verifyMethod === 'password') {
    payload.currentPassword = currentPassword
    return payload
  }

  if (verifyMethod === 'phone_code') {
    payload.phone = phone
    payload.code = code
    return payload
  }

  if (verifyMethod === 'wechat_mini_program') {
    payload.code = await resolveWechatVerificationCode('wechat_mini_program')
    return payload
  }

  if (verifyMethod === 'wechat_app') {
    payload.code = await resolveWechatVerificationCode('wechat_app')
    return payload
  }

  if (verifyMethod === 'google_app') {
    const googlePayload = await getGoogleAppVerificationPayload()
    payload.idToken = googlePayload.idToken || ''
    payload.accessToken = googlePayload.accessToken || ''
    payload.authResult = googlePayload.authResult
    payload.userInfo = googlePayload.userInfo
  }

  return payload
}

export async function runThirdPartyBindFlow(options) {
  const {
    key,
    submittingRef,
    refreshIdentities,
    notify,
  } = options

  const config = THIRD_PARTY_BIND_CONFIG[key]

  if (!config) {
    return null
  }

  return runRefreshableAction({
    submittingRef,
    task: () => config.action(),
    refreshIdentities,
    notify,
    successMessage: config.successMessage,
    failureMessage: config.failureMessage,
  })
}

export async function runEmailBindFlow(options) {
  const {
    submittingRef,
    email,
    password,
    closeModal,
    refreshIdentities,
    notify,
  } = options

  return runRefreshableAction({
    submittingRef,
    task: () =>
      bindEmailIdentity({
        email,
        password,
      }),
    afterSuccess: () => {
      if (typeof closeModal === 'function') {
        closeModal()
      }
    },
    refreshIdentities,
    notify,
    successMessage: '邮箱绑定成功',
    failureMessage: '邮箱绑定失败',
  })
}

export async function runPhoneBindFlow(options) {
  const {
    submittingRef,
    phone,
    code,
    closeModal,
    refreshIdentities,
    notify,
  } = options

  return runRefreshableAction({
    submittingRef,
    task: () =>
      bindPhoneIdentity({
        phone,
        code,
      }),
    afterSuccess: () => {
      if (typeof closeModal === 'function') {
        closeModal()
      }
    },
    refreshIdentities,
    notify,
    successMessage: '手机号绑定成功',
    failureMessage: '手机号绑定失败',
  })
}

export async function runPhoneCodeSendFlow(options) {
  const {
    mode,
    submittingRef,
    countdownRef,
    phone,
    countdownController,
    notify,
  } = options

  if (submittingRef.value || countdownRef.value > 0) {
    return null
  }

  const requestAction = mode === 'unbind' ? sendPhoneUnbindCode : sendPhoneBindCode

  return runGuardedSubmission(submittingRef, async () => {
    try {
      const result = await requestAction({ phone })

      if (countdownController && typeof countdownController.start === 'function') {
        countdownController.start()
      }

      notifyUser(notify, {
        message:
          result && result.debugCode
            ? `验证码已发送，当前调试验证码：${result.debugCode}`
            : '验证码已发送',
        type: 'success',
      })

      return result
    } catch (requestError) {
      notifyUser(notify, {
        message: requestError.message || '发送验证码失败',
        type: 'error',
      })

      return null
    }
  })
}

export async function runUnbindFlow(options) {
  const {
    submittingRef,
    target,
    verifyMethod,
    currentPassword,
    phone,
    code,
    closeModal,
    refreshIdentities,
    notify,
  } = options

  if (!target || !verifyMethod) {
    return null
  }

  return runGuardedSubmission(submittingRef, async () => {
    const targetLabel = target.label

    try {
      const payload = await buildUnbindPayload({
        target,
        verifyMethod,
        currentPassword,
        phone,
        code,
      })

      await unbindIdentity(payload)

      if (typeof closeModal === 'function') {
        closeModal()
      }

      if (typeof refreshIdentities === 'function') {
        await refreshIdentities()
      }

      notifyUser(notify, {
        message: `${targetLabel}解绑成功`,
        type: 'success',
      })

      return payload
    } catch (requestError) {
      notifyUser(notify, {
        message: requestError.message || `${targetLabel}解绑失败`,
        type: 'error',
      })

      return null
    }
  })
}
