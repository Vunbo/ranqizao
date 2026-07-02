// uni-app 运行时配置 — 从 import.meta.env.VITE_* 读取，兜底默认值
// 注意：必须使用 import.meta.env.VITE_XXX 静态属性访问，不能用方括号动态 key，
// 否则 Vite/HBuilder 编译器无法在编译时替换环境变量值。
const DEFAULTS = {
  apiBaseUrl: 'http://localhost:3001/api',
  miniProgramLoginPath: '/auth/mini-program/login',
  appWechatLoginPath: '/auth/wechat/app/login',
  bindWechatAppPath: '/auth/bind/wechat/app',
  appGoogleLoginPath: '/auth/google/app/login',
  bindGoogleAppPath: '/auth/bind/google/app',
}

function safeValue(value, fallback) {
  return (typeof value === 'string' && value) ? value : fallback
}

export function getRuntimeConfig() {
  return {
    apiBaseUrl: safeValue(import.meta.env?.VITE_API_BASE_URL, DEFAULTS.apiBaseUrl),
    miniProgramLoginPath: safeValue(import.meta.env?.VITE_MINI_PROGRAM_LOGIN_PATH, DEFAULTS.miniProgramLoginPath),
    appWechatLoginPath: safeValue(import.meta.env?.VITE_WECHAT_APP_LOGIN_PATH, DEFAULTS.appWechatLoginPath),
    bindWechatAppPath: safeValue(import.meta.env?.VITE_BIND_WECHAT_APP_PATH, DEFAULTS.bindWechatAppPath),
    appGoogleLoginPath: safeValue(import.meta.env?.VITE_GOOGLE_APP_LOGIN_PATH, DEFAULTS.appGoogleLoginPath),
    bindGoogleAppPath: safeValue(import.meta.env?.VITE_BIND_GOOGLE_APP_PATH, DEFAULTS.bindGoogleAppPath),
  }
}
