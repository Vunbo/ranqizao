import { request } from '../http/request'

// Internal service object (kept for explicit destructuring use)
export const remoteDeviceService = {
  async list() {
    const response = await request('/devices')
    return response.devices || []
  },

  async scanBindable(qrCode) {
    return request('/devices/bind/scan', {
      method: 'POST',
      body: { qrCode },
    })
  },

  async bindScanned(payload) {
    const response = await request('/devices/bind', {
      method: 'POST',
      body: payload,
    })
    return response.device
  },

  async create(payload) {
    const response = await request('/devices', {
      method: 'POST',
      body: payload,
    })
    return response.device
  },

  async update(deviceId, payload) {
    const response = await request(`/devices/${deviceId}`, {
      method: 'PATCH',
      body: payload,
    })
    return response.device
  },

  async remove(deviceId) {
    await request(`/devices/${deviceId}`, { method: 'DELETE' })
  },

  async listLogs(deviceId) {
    const response = await request(`/devices/${deviceId}/logs`)
    return response.logs || []
  },

  async createLog(deviceId, payload) {
    const response = await request(`/devices/${deviceId}/logs`, {
      method: 'POST',
      body: payload,
    })
    return response.log
  },

  async share(deviceId, userId) {
    await request(`/devices/${deviceId}/share`, {
      method: 'POST',
      body: { userId },
    })
  },

  async unshare(deviceId, userId) {
    await request(`/devices/${deviceId}/share/${userId}`, {
      method: 'DELETE',
    })
  },
}

// Named exports — match the old gateway function signatures
export const listDevices = () => remoteDeviceService.list()
export const scanBindableDevice = (qrCode) => remoteDeviceService.scanBindable(qrCode)
export const bindScannedDevice = (payload) => remoteDeviceService.bindScanned(payload)
export const createDevice = (payload) => remoteDeviceService.create(payload)
export const updateDevice = (deviceId, payload) => remoteDeviceService.update(deviceId, payload)
export const removeDevice = (deviceId) => remoteDeviceService.remove(deviceId)
export const listDeviceLogs = (deviceId) => remoteDeviceService.listLogs(deviceId)
export const createDeviceLog = (deviceId, payload) => remoteDeviceService.createLog(deviceId, payload)
export const shareDevice = (deviceId, userId) => remoteDeviceService.share(deviceId, userId)
export const unshareDevice = (deviceId, userId) => remoteDeviceService.unshare(deviceId, userId)
