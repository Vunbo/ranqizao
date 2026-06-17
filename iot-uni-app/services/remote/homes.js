import { request } from '../http/request'

// Internal service object (kept for explicit destructuring use)
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

// Named exports — match the old gateway function signatures
export const listHomes = () => remoteHomeService.list()
export const createHome = (name) => remoteHomeService.create(name)
export const removeHome = (homeId) => remoteHomeService.remove(homeId)
export const updateHomeDeviceLinks = (homeId, deviceIds) => remoteHomeService.updateDeviceLinks(homeId, deviceIds)
export const addHomeMember = (homeId, userId) => remoteHomeService.addMember(homeId, userId)
export const removeHomeMembers = (homeId, userIds) => remoteHomeService.removeMembers(homeId, userIds)
