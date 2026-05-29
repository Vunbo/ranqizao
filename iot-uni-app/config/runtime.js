const DEFAULT_RUNTIME_CONFIG = Object.freeze({
  apiBaseUrl: '',
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

const IMPORT_META_ENV = (() => {
  try {
    return import.meta.env || {}
  } catch (_error) {
    return {}
  }
})()

function readProcessEnv(name) {
  if (typeof process === 'undefined' || !process || !process.env) {
    return ''
  }

  return process.env[name] || ''
}

function readRuntimeEnv(...names) {
  for (const name of names) {
    const importMetaValue = IMPORT_META_ENV[name] || ''
    if (importMetaValue) {
      return importMetaValue
    }

    const processValue = readProcessEnv(name)
    if (processValue) {
      return processValue
    }
  }

  return ''
}

function resolveApiBaseUrl() {
  const envValue = readRuntimeEnv(
    'VITE_API_BASE_URL',
    'VITE_APP_API_BASE_URL',
    'UNI_APP_API_BASE_URL',
    'VUE_APP_API_BASE_URL'
  )

  return normalizeBaseUrl(envValue || DEFAULT_RUNTIME_CONFIG.apiBaseUrl)
}

function resolveMiniProgramLoginPath() {
  const envValue = readRuntimeEnv(
    'VITE_MINI_PROGRAM_LOGIN_PATH',
    'VITE_APP_MINI_PROGRAM_LOGIN_PATH',
    'UNI_APP_MINI_PROGRAM_LOGIN_PATH',
    'VUE_APP_MINI_PROGRAM_LOGIN_PATH'
  )

  return String(envValue || DEFAULT_RUNTIME_CONFIG.miniProgramLoginPath).trim()
}

function resolveAppWechatLoginPath() {
  const envValue = readRuntimeEnv(
    'VITE_WECHAT_APP_LOGIN_PATH',
    'VITE_APP_WECHAT_APP_LOGIN_PATH',
    'UNI_APP_WECHAT_APP_LOGIN_PATH',
    'VUE_APP_WECHAT_APP_LOGIN_PATH'
  )

  return String(envValue || DEFAULT_RUNTIME_CONFIG.appWechatLoginPath).trim()
}

function resolveBindWechatAppPath() {
  const envValue = readRuntimeEnv(
    'VITE_BIND_WECHAT_APP_PATH',
    'VITE_APP_BIND_WECHAT_APP_PATH',
    'UNI_APP_BIND_WECHAT_APP_PATH',
    'VUE_APP_BIND_WECHAT_APP_PATH'
  )

  return String(envValue || DEFAULT_RUNTIME_CONFIG.bindWechatAppPath).trim()
}

function resolveAppGoogleLoginPath() {
  const envValue = readRuntimeEnv(
    'VITE_GOOGLE_APP_LOGIN_PATH',
    'VITE_APP_GOOGLE_APP_LOGIN_PATH',
    'UNI_APP_GOOGLE_APP_LOGIN_PATH',
    'VUE_APP_GOOGLE_APP_LOGIN_PATH'
  )

  return String(envValue || DEFAULT_RUNTIME_CONFIG.appGoogleLoginPath).trim()
}

function resolveBindGoogleAppPath() {
  const envValue = readRuntimeEnv(
    'VITE_BIND_GOOGLE_APP_PATH',
    'VITE_APP_BIND_GOOGLE_APP_PATH',
    'UNI_APP_BIND_GOOGLE_APP_PATH',
    'VUE_APP_BIND_GOOGLE_APP_PATH'
  )

  return String(envValue || DEFAULT_RUNTIME_CONFIG.bindGoogleAppPath).trim()
}

const runtimeConfig = Object.freeze({
  apiBaseUrl: resolveApiBaseUrl(),
  miniProgramLoginPath: resolveMiniProgramLoginPath(),
  appWechatLoginPath: resolveAppWechatLoginPath(),
  bindWechatAppPath: resolveBindWechatAppPath(),
  appGoogleLoginPath: resolveAppGoogleLoginPath(),
  bindGoogleAppPath: resolveBindGoogleAppPath(),
})

export function getRuntimeConfig() {
  if (!runtimeConfig.apiBaseUrl) {
    throw new Error(
      '未配置 API_BASE_URL。请在环境文件中设置 VITE_API_BASE_URL 或 VUE_APP_API_BASE_URL，真机和小程序请使用局域网 IP 或正式域名。'
    )
  }

  return runtimeConfig
}
