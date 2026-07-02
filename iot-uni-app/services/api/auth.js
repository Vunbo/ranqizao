import { request } from '../http/request'
import { getRuntimeConfig } from '../../config/runtime'
import { clearStoredSession, persistAuthToken } from '../store/store'

export const remoteAuthService = {
  async register(payload) {
    const response = await request('/auth/register', {
      method: 'POST',
      body: payload,
    })
    persistAuthToken(response.token)
    return response.user
  },

  async login(payload) {
    const response = await request('/auth/login', {
      method: 'POST',
      body: payload,
    })
    persistAuthToken(response.token)
    return response.user
  },

  async sendPhoneCode(payload) {
    return request('/auth/phone/send-code', {
      method: 'POST',
      body: payload,
    })
  },

  async loginWithPhone(payload) {
    const response = await request('/auth/phone/login', {
      method: 'POST',
      body: payload,
    })
    persistAuthToken(response.token)
    return response.user
  },

  async loginWithMiniProgram(payload) {
    const response = await request(getRuntimeConfig().miniProgramLoginPath, {
      method: 'POST',
      body: payload,
    })
    persistAuthToken(response.token)
    return response.user
  },

  async loginWithWechatApp(payload) {
    const response = await request(getRuntimeConfig().appWechatLoginPath, {
      method: 'POST',
      body: payload,
    })
    persistAuthToken(response.token)
    return response.user
  },

  async loginWithGoogleApp(payload) {
    const response = await request(getRuntimeConfig().appGoogleLoginPath, {
      method: 'POST',
      body: payload,
    })
    persistAuthToken(response.token)
    return response.user
  },

  async getCurrentUser() {
    const response = await request('/auth/me')
    return response.user
  },

  async updateCurrentUserProfile(payload) {
    const response = await request('/auth/me', {
      method: 'PATCH',
      body: payload,
    })
    return response.user
  },

  async listIdentities() {
    const response = await request('/auth/identities')
    return response.identities || []
  },

  async bindEmail(payload) {
    return request('/auth/bind/email', {
      method: 'POST',
      body: payload,
    })
  },

  async sendPhoneBindCode(payload) {
    return request('/auth/bind/phone/send-code', {
      method: 'POST',
      body: payload,
    })
  },

  async sendPhoneUnbindCode(payload) {
    return request('/auth/unbind/phone/send-code', {
      method: 'POST',
      body: payload,
    })
  },

  async bindPhone(payload) {
    return request('/auth/bind/phone', {
      method: 'POST',
      body: payload,
    })
  },

  async bindMiniProgram(payload) {
    return request('/auth/bind/mini-program', {
      method: 'POST',
      body: payload,
    })
  },

  async bindWechatApp(payload) {
    return request(getRuntimeConfig().bindWechatAppPath, {
      method: 'POST',
      body: payload,
    })
  },

  async bindGoogleApp(payload) {
    return request(getRuntimeConfig().bindGoogleAppPath, {
      method: 'POST',
      body: payload,
    })
  },

  async changePassword(payload) {
    return request('/auth/password/change', {
      method: 'POST',
      body: payload,
    })
  },

  async unbindIdentity(payload) {
    return request('/auth/unbind', {
      method: 'POST',
      body: payload,
    })
  },

  async logout() {
    try {
      await request('/auth/logout', { method: 'POST' })
    } finally {
      clearStoredSession()
    }
  },
}
