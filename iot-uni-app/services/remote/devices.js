import { request } from '../http/request'

export const remoteDeviceService = {
  async list() {
    const response = await request('/devices')
    return response.devices || []
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
