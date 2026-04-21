import { STORAGE_KEYS } from '../../common/constants/storage'

export function getAuthToken() {
  return uni.getStorageSync(STORAGE_KEYS.authToken) || ''
}

export function persistAuthToken(token) {
  uni.setStorageSync(STORAGE_KEYS.authToken, token)
}

export function clearStoredSession() {
  uni.removeStorageSync(STORAGE_KEYS.authToken)
}
