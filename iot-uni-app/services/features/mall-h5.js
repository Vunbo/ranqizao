import { getRuntimeConfig } from '../../config/runtime'

const DEFAULT_MALL_TITLE = '商城'
const WEBVIEW_PAGE_PATH = '/pages/webview/index'
const WEBVIEW_ROUTE = 'pages/webview/index'

const STORAGE_KEY_URL = '__mall_webview_url__'
const STORAGE_KEY_TITLE = '__mall_webview_title__'

/**
 * Open the mall H5 in a webview.
 *
 * - Passes URL via storage to avoid hash-fragment encoding issues in query params.
 * - Reuses the existing webview page if it's still in the navigation stack.
 * - Otherwise pushes a fresh webview instance.
 */
export function openMallH5(options = {}) {
  const { title = DEFAULT_MALL_TITLE } = options
  const { mallH5Url } = getRuntimeConfig()

  if (!mallH5Url) {
    throw new Error('未配置商城 H5 地址。')
  }

  // Check if we're already on the webview page
  const pages = getCurrentPages()
  const currentPage = pages[pages.length - 1]
  if (currentPage && currentPage.route === WEBVIEW_ROUTE) {
    return
  }

  // Check if the webview page exists earlier in the stack — navigate back to it
  const webviewIndex = pages.findIndex((page) => page.route === WEBVIEW_ROUTE)
  if (webviewIndex >= 0) {
    const delta = pages.length - 1 - webviewIndex
    uni.navigateBack({ delta })
    return
  }

  // Fresh open — pass URL via storage then navigate
  uni.setStorageSync(STORAGE_KEY_URL, mallH5Url)
  uni.setStorageSync(STORAGE_KEY_TITLE, title)

  uni.navigateTo({ url: WEBVIEW_PAGE_PATH })
}
