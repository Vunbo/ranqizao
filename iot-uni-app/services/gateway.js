import { remoteAuthService } from './remote/auth'
import { remoteDeviceService } from './remote/devices'
import { remoteHomeService } from './remote/homes'
import {
  clearStoredSession,
  getAuthToken,
} from './session/store'

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

function findGoogleOauthService() {
  return new Promise((resolve, reject) => {
    plus.oauth.getServices(
      (services) => {
        const googleService = services.find((service) => service.id === 'google')
        if (!googleService) {
          reject(
            new Error('当前 App 未启用 Google 登录能力，请使用启用 Google OAuth 的云打包或自定义基座。')
          )
          return
        }

        resolve(googleService)
      },
      (error) => {
        reject(new Error(error.message || '获取 Google 登录服务失败。'))
      }
    )
  })
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
  const service = await findGoogleOauthService()

  await new Promise((resolve, reject) => {
    service.login(
      () => resolve(),
      (error) => reject(new Error(error.message || 'Google 登录失败。'))
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
  // #ifdef APP-PLUS
  const loginResult = await new Promise((resolve, reject) => {
    uni.login({
      provider: 'weixin',
      onlyAuthorize: true,
      success: resolve,
      fail: reject,
    })
  })

  const user = await remoteAuthService.loginWithWechatApp({
    code: loginResult.code,
  })

  return {
    user,
  }
  // #endif

  // #ifndef APP-PLUS
  throw new Error('当前平台不支持 App 微信快捷登录。')
  // #endif
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
  // #ifdef APP-PLUS
  const loginResult = await new Promise((resolve, reject) => {
    uni.login({
      provider: 'weixin',
      onlyAuthorize: true,
      success: resolve,
      fail: reject,
    })
  })

  return remoteAuthService.bindWechatApp({
    code: loginResult.code,
  })
  // #endif

  // #ifndef APP-PLUS
  throw new Error('当前平台不支持 App 微信绑定。')
  // #endif
}

export async function bindGoogleAppIdentity() {
  const payload = await authorizeGoogleApp()
  return remoteAuthService.bindGoogleApp(payload)
}

export async function getGoogleAppVerificationPayload() {
  return authorizeGoogleApp()
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

export async function listDevices() {
  return remoteDeviceService.list()
}

export async function createDevice(payload) {
  return remoteDeviceService.create(payload)
}

export async function updateDevice(deviceId, payload) {
  return remoteDeviceService.update(deviceId, payload)
}

export async function removeDevice(deviceId) {
  return remoteDeviceService.remove(deviceId)
}

export async function listDeviceLogs(deviceId) {
  return remoteDeviceService.listLogs(deviceId)
}

export async function createDeviceLog(deviceId, payload) {
  return remoteDeviceService.createLog(deviceId, payload)
}

export async function shareDevice(deviceId, userId) {
  return remoteDeviceService.share(deviceId, userId)
}

export async function unshareDevice(deviceId, userId) {
  return remoteDeviceService.unshare(deviceId, userId)
}

export async function listHomes() {
  return remoteHomeService.list()
}

export async function createHome(name) {
  return remoteHomeService.create(name)
}

export async function removeHome(homeId) {
  return remoteHomeService.remove(homeId)
}

export async function updateHomeDeviceLinks(homeId, deviceIds) {
  return remoteHomeService.updateDeviceLinks(homeId, deviceIds)
}

export async function addHomeMember(homeId, userId) {
  return remoteHomeService.addMember(homeId, userId)
}

export async function removeHomeMembers(homeId, userIds) {
  return remoteHomeService.removeMembers(homeId, userIds)
}
