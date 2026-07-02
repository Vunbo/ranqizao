import { remoteAuthService } from '../api/auth'
import { clearStoredSession, getAuthToken } from '../store/store'

function normalizePlainObject(value) {
  if (!value || typeof value !== 'object') {
    return {}
  }

  return JSON.parse(JSON.stringify(value))
}

function readCandidateString(...values) {
  for (const value of values) {
    if (typeof value === 'string') {
      const normalized = value.trim()
      if (normalized) {
        return normalized
      }
    }
  }

  return ''
}

const APP_OAUTH_PROVIDER_META = {
  weixin: {
    serviceId: 'weixin',
    label: '微信',
    capabilityName: '微信 App 快捷登录',
    configHint:
      '请在 manifest.json 的 app-plus.distribute.sdkConfigs.oauth.weixin 中填写 appid，iOS 还需填写 UniversalLinks，并重新云打包或制作自定义基座。',
  },
  google: {
    serviceId: 'google',
    label: 'Google',
    capabilityName: 'Google App 快捷登录',
    configHint:
      '请在 manifest.json 的 app-plus.distribute.sdkConfigs.oauth.google 中填写 clientid，并使用启用 Google OAuth 的云打包或自定义基座。',
  },
}

function ensureAppPlusOauthRuntime(providerKey) {
  if (typeof plus !== 'undefined' && plus && plus.oauth && typeof plus.oauth.getServices === 'function') {
    return
  }

  const meta = APP_OAUTH_PROVIDER_META[providerKey]
  throw new Error(
    `当前运行环境未注入 5+ OAuth 原生能力，无法使用${meta.capabilityName}。${meta.configHint}`
  )
}

function normalizeNativeOauthError(providerKey, error, fallbackMessage) {
  const meta = APP_OAUTH_PROVIDER_META[providerKey]
  const message = String((error && error.message) || error || '').trim()

  if (!message) {
    return `${fallbackMessage}。${meta.configHint}`
  }

  if (
    message.includes('cancel') ||
    message.includes('用户取消') ||
    message.includes('auth cancel')
  ) {
    return `已取消${meta.label}授权。`
  }

  if (
    message.includes('install') ||
    message.includes('not installed') ||
    message.includes('未安装')
  ) {
    return `当前设备未安装${meta.label}客户端，无法使用${meta.capabilityName}。`
  }

  if (
    message.includes('not support') ||
    message.includes('unsupported') ||
    message.includes('not found') ||
    message.includes('service not found') ||
    message.includes('no service') ||
    message.includes('oauth')
  ) {
    return `${fallbackMessage}。${meta.configHint}`
  }

  return message
}

function getOauthServices() {
  ensureAppPlusOauthRuntime('weixin')

  return new Promise((resolve, reject) => {
    plus.oauth.getServices(
      (services) => {
        resolve(services || [])
      },
      (error) => {
        reject(
          new Error(
            normalizeNativeOauthError(
              'weixin',
              error,
              '获取 App 原生授权服务失败'
            )
          )
        )
      }
    )
  })
}

async function findOauthService(providerKey) {
  const meta = APP_OAUTH_PROVIDER_META[providerKey]
  const services = await getOauthServices()
  const matchedService = services.find((service) => service.id === meta.serviceId)

  if (!matchedService) {
    throw new Error(
      `当前 App 未启用${meta.capabilityName}。${meta.configHint}`
    )
  }

  return matchedService
}

async function authorizeWechatApp() {
  // #ifdef APP-PLUS
  await findOauthService('weixin')

  const loginResult = await new Promise((resolve, reject) => {
    uni.login({
      provider: 'weixin',
      onlyAuthorize: true,
      success: resolve,
      fail: (error) => {
        reject(
          new Error(
            normalizeNativeOauthError(
              'weixin',
              error,
              '拉起微信授权失败'
            )
          )
        )
      },
    })
  })

  const code = readCandidateString(
    loginResult.code,
    loginResult.authResult && loginResult.authResult.code
  )

  if (!code) {
    throw new Error(
      '微信授权已返回，但未拿到有效授权 code。请确认 manifest.json 中已正确配置微信 AppID，并重新云打包后再测试。'
    )
  }

  return {
    code,
    authResult: normalizePlainObject(loginResult.authResult),
  }
  // #endif

  // #ifndef APP-PLUS
  throw new Error('当前平台不支持 App 微信快捷登录。')
  // #endif
}

function requestGoogleUserInfo(service) {
  return new Promise((resolve, reject) => {
    service.getUserInfo(
      () => resolve(),
      (error) => reject(new Error(error.message || '获取 Google 用户信息失败。'))
    )
  })
}

async function authorizeGoogleApp() {
  // #ifdef APP-PLUS
  const service = await findOauthService('google')

  await new Promise((resolve, reject) => {
    service.login(
      () => resolve(),
      (error) =>
        reject(
          new Error(
            normalizeNativeOauthError(
              'google',
              error,
              '拉起 Google 授权失败'
            )
          )
        )
    )
  })

  try {
    await requestGoogleUserInfo(service)
  } catch (error) {
    const authResult = normalizePlainObject(service.authResult)
    if (!authResult.access_token && !authResult.accessToken && !authResult.id_token && !authResult.idToken) {
      throw error
    }
  }

  const authResult = normalizePlainObject(service.authResult)
  const userInfo = normalizePlainObject(service.userInfo)

  return {
    idToken: readCandidateString(authResult.id_token, authResult.idToken),
    accessToken: readCandidateString(
      authResult.access_token,
      authResult.accessToken,
      authResult.token
    ),
    authResult,
    userInfo,
  }
  // #endif

  // #ifndef APP-PLUS
  throw new Error('当前平台不支持 App Google 快捷登录。')
  // #endif
}

export async function getAvailableAppQuickLoginProviders() {
  // #ifdef APP-PLUS
  try {
    const services = await getOauthServices()
    const serviceIds = new Set(services.map((service) => service.id))

    return {
      wechatApp: {
        supported: serviceIds.has(APP_OAUTH_PROVIDER_META.weixin.serviceId),
        reason: serviceIds.has(APP_OAUTH_PROVIDER_META.weixin.serviceId)
          ? ''
          : APP_OAUTH_PROVIDER_META.weixin.configHint,
      },
      googleApp: {
        supported: serviceIds.has(APP_OAUTH_PROVIDER_META.google.serviceId),
        reason: serviceIds.has(APP_OAUTH_PROVIDER_META.google.serviceId)
          ? ''
          : APP_OAUTH_PROVIDER_META.google.configHint,
      },
    }
  } catch (error) {
    const reason = String(error.message || '获取 App 原生授权服务失败。')
    return {
      wechatApp: {
        supported: false,
        reason,
      },
      googleApp: {
        supported: false,
        reason,
      },
    }
  }
  // #endif

  // #ifndef APP-PLUS
  return {
    wechatApp: {
      supported: false,
      reason: '当前平台不支持 App 原生快捷登录。',
    },
    googleApp: {
      supported: false,
      reason: '当前平台不支持 App 原生快捷登录。',
    },
  }
  // #endif
}

export async function restoreSession() {
  const token = getAuthToken()

  if (!token) {
    return null
  }

  try {
    const user = await remoteAuthService.getCurrentUser()
    return {
      user,
    }
  } catch (error) {
    clearStoredSession()
    throw error
  }
}

export async function loginWithPassword(payload) {
  const user = await remoteAuthService.login(payload)
  return {
    user,
  }
}

export async function sendPhoneLoginCode(payload) {
  return remoteAuthService.sendPhoneCode(payload)
}

export async function loginWithPhoneCode(payload) {
  const user = await remoteAuthService.loginWithPhone(payload)
  return {
    user,
  }
}

export async function registerWithPassword(payload) {
  const user = await remoteAuthService.register(payload)
  return {
    user,
  }
}

export async function loginWithMiniProgram() {
  // #ifdef MP-WEIXIN
  const loginResult = await new Promise((resolve, reject) => {
    uni.login({
      provider: 'weixin',
      success: resolve,
      fail: reject,
    })
  })

  const user = await remoteAuthService.loginWithMiniProgram({
    code: loginResult.code,
  })

  return {
    user,
  }
  // #endif

  // #ifndef MP-WEIXIN
  throw new Error('当前平台不支持微信小程序登录。')
  // #endif
}

export async function loginWithWechatApp() {
  const loginResult = await authorizeWechatApp()
  const user = await remoteAuthService.loginWithWechatApp({
    code: loginResult.code,
  })

  return {
    user,
  }
}

export async function loginWithGoogleApp() {
  const payload = await authorizeGoogleApp()
  const user = await remoteAuthService.loginWithGoogleApp(payload)

  return {
    user,
  }
}

export async function listAuthIdentities() {
  return remoteAuthService.listIdentities()
}

export async function updateCurrentUserProfile(payload) {
  return remoteAuthService.updateCurrentUserProfile(payload)
}

export async function bindEmailIdentity(payload) {
  return remoteAuthService.bindEmail(payload)
}

export async function sendPhoneBindCode(payload) {
  return remoteAuthService.sendPhoneBindCode(payload)
}

export async function sendPhoneUnbindCode(payload) {
  return remoteAuthService.sendPhoneUnbindCode(payload)
}

export async function bindPhoneIdentity(payload) {
  return remoteAuthService.bindPhone(payload)
}

export async function bindMiniProgramIdentity() {
  // #ifdef MP-WEIXIN
  const loginResult = await new Promise((resolve, reject) => {
    uni.login({
      provider: 'weixin',
      success: resolve,
      fail: reject,
    })
  })

  return remoteAuthService.bindMiniProgram({
    code: loginResult.code,
  })
  // #endif

  // #ifndef MP-WEIXIN
  throw new Error('当前平台不支持微信小程序绑定。')
  // #endif
}

export async function bindWechatAppIdentity() {
  const loginResult = await authorizeWechatApp()

  return remoteAuthService.bindWechatApp({
    code: loginResult.code,
  })
}

export async function bindGoogleAppIdentity() {
  const payload = await authorizeGoogleApp()
  return remoteAuthService.bindGoogleApp(payload)
}

export async function getGoogleAppVerificationPayload() {
  return authorizeGoogleApp()
}

export async function getWechatAppVerificationCode() {
  const loginResult = await authorizeWechatApp()
  return loginResult.code
}

export async function changePassword(payload) {
  return remoteAuthService.changePassword(payload)
}

export async function unbindIdentity(payload) {
  return remoteAuthService.unbindIdentity(payload)
}

export async function logoutCurrentSession() {
  await remoteAuthService.logout()
}
