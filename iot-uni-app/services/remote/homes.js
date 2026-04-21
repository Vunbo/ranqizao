import { request } from '../http/request'

export const remoteHomeService = {
  async list() {
    const response = await request('/homes')
    return response.homes || []
  },

  async create(name) {
    const response = await request('/homes', {
      method: 'POST',
      body: { name },
    })
    return response.home
  },

  async remove(homeId) {
    await request(`/homes/${homeId}`, { method: 'DELETE' })
  },

  async updateDeviceLinks(homeId, deviceIds) {
    await request(`/homes/${homeId}/device-links`, {
      method: 'PATCH',
      body: { deviceIds },
    })
  },

  async addMember(homeId, userId) {
    await request(`/homes/${homeId}/members`, {
      method: 'POST',
      body: { userId },
    })
  },

  async removeMembers(homeId, userIds) {
    await request(`/homes/${homeId}/members`, {
      method: 'DELETE',
      body: { userIds },
    })
  },
}
