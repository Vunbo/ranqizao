import { getAuthToken } from '../store/store'
import { getRuntimeConfig } from '../../config/runtime'

export function request(path, options = {}) {
  const token = getAuthToken()
  const baseUrl = getRuntimeConfig().apiBaseUrl
  const requestUrl = `${baseUrl}${path}`
  const headers = Object.assign(
    {
      'Content-Type': 'application/json',
    },
    options.headers || {}
  )

  if (token) {
    headers.Authorization = `Bearer ${token}`
  }

  return new Promise((resolve, reject) => {
    uni.request({
      url: requestUrl,
      method: options.method || 'GET',
      data: options.body || options.data,
      header: headers,
      success: (response) => {
        const statusCode = response.statusCode || 0
        const responseData = response.data

        if (statusCode >= 200 && statusCode < 300) {
          resolve(responseData)
          return
        }

        reject(
          new Error(
            (responseData && responseData.message) ||
              (typeof responseData === 'string' && responseData) ||
              '请求失败。'
          )
        )
      },
      fail: (error) => {
        reject(new Error(`${error.errMsg || '网络请求失败。'} [${requestUrl}]`))
      },
    })
  })
}
