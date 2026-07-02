/**
 * Location service — wraps UniApp platform APIs with side effects.
 *
 * Separated from the pure functions in helpers/location-helpers.js so that
 * callers can keep helper-only code free of platform mocking.
 */

import {
  buildLocationPayload,
  hasResolvedAddress,
  isUserCanceled,
  mergeLocationPayload,
} from '../helpers/location-helpers'

export async function requestScanCode() {
  const scanResult = await new Promise((resolve, reject) => {
    uni.scanCode({
      onlyFromCamera: true,
      scanType: ['qrCode'],
      success: resolve,
      fail: reject,
    })
  })

  const qrCode = String(scanResult.result || '').trim()
  if (!qrCode) {
    throw new Error('未识别到有效二维码内容')
  }

  return qrCode
}

export async function requestCurrentLocation() {
  return new Promise((resolve, reject) => {
    uni.getLocation({
      type: 'gcj02',
      geocode: true,
      success: resolve,
      fail: reject,
    })
  })
}

export async function resolveBindingLocation(currentLocation) {
  const normalizedLocation = buildLocationPayload(currentLocation, {
    coordType: 'gcj02',
    source: 'uni.getLocation',
  })

  // #ifdef MP-WEIXIN
  if (
    !hasResolvedAddress(normalizedLocation)
    && typeof uni.chooseLocation === 'function'
  ) {
    try {
      const pickedLocation = await new Promise((resolve, reject) => {
        const chooseOptions = {
          success: resolve,
          fail: reject,
        }

        if (normalizedLocation.latitude !== null) {
          chooseOptions.latitude = normalizedLocation.latitude
        }

        if (normalizedLocation.longitude !== null) {
          chooseOptions.longitude = normalizedLocation.longitude
        }

        uni.chooseLocation(chooseOptions)
      })

      return mergeLocationPayload(
        normalizedLocation,
        buildLocationPayload(pickedLocation, {
          coordType: normalizedLocation.coordType || 'gcj02',
          source: 'uni.chooseLocation',
          capturedAt: normalizedLocation.capturedAt,
        })
      )
    } catch (error) {
      const errorMessage = String(error.message || '')
      const canIgnoreError
        = isUserCanceled(errorMessage)
        || errorMessage.includes('not support')
        || errorMessage.includes('not supported')

      if (!canIgnoreError) {
        throw error
      }
    }
  }
  // #endif

  return normalizedLocation
}

export async function openSystemPermissionSettings() {
  // #ifdef APP-PLUS
  await new Promise((resolve, reject) => {
    if (typeof uni.openAppAuthorizeSetting !== 'function') {
      reject(new Error('当前环境不支持直接打开权限设置页'))
      return
    }

    uni.openAppAuthorizeSetting({
      success: resolve,
      fail: reject,
    })
  })
  // #endif

  // #ifdef MP-WEIXIN
  await new Promise((resolve, reject) => {
    uni.openSetting({
      success: resolve,
      fail: reject,
    })
  })
  // #endif
}
