import { request } from '../http/request'

function buildNoCachePath(path) {
  const separator = path.includes('?') ? '&' : '?'
  return `${path}${separator}_t=${Date.now()}`
}

export const remoteMerchantService = {
  async getPage() {
    const response = await request(buildNoCachePath('/merchant/page'))
    return response.page || null
  },

  async getSummary() {
    return request(buildNoCachePath('/merchant/me'))
  },

  async submitApplication(payload) {
    return request('/merchant/applications', {
      method: 'POST',
      body: payload,
    })
  },

  async getPanel() {
    return request(buildNoCachePath('/merchant/panel'))
  },
}
