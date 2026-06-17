const DEFAULT_RUNTIME_CONFIG = Object.freeze({
  apiBaseUrl: '',
  mallH5Url: 'https://zyhskj.shop/addons/yun_shop/?menu#/home?i=1',
  miniProgramLoginPath: '/auth/mini-program/login',
  appWechatLoginPath: '/auth/wechat/app/login',
  bindWechatAppPath: '/auth/bind/wechat/app',
  appGoogleLoginPath: '/auth/google/app/login',
  bindGoogleAppPath: '/auth/bind/google/app',
})

function normalizeBaseUrl(value) {
  return String(value || '')
    .trim()
    .replace(/\/$/, '')
}

function readEnv(key) {
  try {
    const importMetaValue = import.meta.env?.[key]
    if (importMetaValue) return String(importMetaValue).trim()
  } catch { /* not in Vite context */ }

  if (typeof process !== 'undefined' && process?.env) {
    const processValue = process.env[key]
    if (processValue) return String(processValue).trim()
  }

  return ''
}

function resolveApiBaseUrl() {
  const envValue = readEnv('VITE_API_BASE_URL')
  return normalizeBaseUrl(envValue || DEFAULT_RUNTIME_CONFIG.apiBaseUrl)
}

function resolveMallH5Url() {
  return readEnv('VITE_MALL_H5_URL') || DEFAULT_RUNTIME_CONFIG.mallH5Url
}

function resolveMiniProgramLoginPath() {
  return readEnv('VITE_MINI_PROGRAM_LOGIN_PATH') || DEFAULT_RUNTIME_CONFIG.miniProgramLoginPath
}

function resolveAppWechatLoginPath() {
  return readEnv('VITE_WECHAT_APP_LOGIN_PATH') || DEFAULT_RUNTIME_CONFIG.appWechatLoginPath
}

function resolveBindWechatAppPath() {
  return readEnv('VITE_BIND_WECHAT_APP_PATH') || DEFAULT_RUNTIME_CONFIG.bindWechatAppPath
}

function resolveAppGoogleLoginPath() {
  return readEnv('VITE_GOOGLE_APP_LOGIN_PATH') || DEFAULT_RUNTIME_CONFIG.appGoogleLoginPath
}

function resolveBindGoogleAppPath() {
  return readEnv('VITE_BIND_GOOGLE_APP_PATH') || DEFAULT_RUNTIME_CONFIG.bindGoogleAppPath
}

const runtimeConfig = Object.freeze({
  apiBaseUrl: resolveApiBaseUrl(),
  mallH5Url: resolveMallH5Url(),
  miniProgramLoginPath: resolveMiniProgramLoginPath(),
  appWechatLoginPath: resolveAppWechatLoginPath(),
  bindWechatAppPath: resolveBindWechatAppPath(),
  appGoogleLoginPath: resolveAppGoogleLoginPath(),
  bindGoogleAppPath: resolveBindGoogleAppPath(),
})

export function getRuntimeConfig() {
  if (!runtimeConfig.apiBaseUrl) {
    throw new Error(
      '未配置 API_BASE_URL。请在环境文件中设置 VITE_API_BASE_URL，真机和小程序请使用局域网 IP 或正式域名。'
    )
  }

  return runtimeConfig
}
