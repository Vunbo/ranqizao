<template>
  <view v-if="!url" class="webview-placeholder">
    <text class="webview-placeholder__text">正在进入商城...</text>
  </view>
  <web-view
    v-else
    :key="webviewKey"
    :src="url"
    @error="handleWebviewError"
    @load="handleWebviewLoad"
  />
</template>

<script>
export default {
  name: 'MallWebview',
  data() {
    return {
      url: '',
      webviewKey: 0,
    }
  },
  onReady() {
    const nextUrl = uni.getStorageSync('__mall_webview_url__') || ''
    const nextTitle = uni.getStorageSync('__mall_webview_title__') || '商城'

    if (!nextUrl) {
      uni.showToast({ title: '商城地址无效', icon: 'none' })
      return
    }

    uni.setNavigationBarTitle({ title: nextTitle })
    this.url = nextUrl
  },
  onBackPress() {
    uni.reLaunch({ url: '/pages/index/index' })
    return true
  },
  onUnload() {
    uni.removeStorageSync('__mall_webview_url__')
    uni.removeStorageSync('__mall_webview_title__')
  },
  methods: {
    handleWebviewError(e) {
      console.error('[mall-webview] load error:', e)
    },
    handleWebviewLoad() {
      // Override nav bar after webview fully initializes
      // #ifdef APP-PLUS
      plus.webview.currentWebview().setStyle({
        titleNView: {
          autoBackButton: false,
          backgroundColor: '#F8FAFC',
          titleColor: '#0f172a',
          buttons: [{
            type: 'none',
            text: '⌂',
            fontSize: '28px',
            float: 'left',
            color: '#f97316',
            fontWeight: 'bold',
            onclick: function() {
              uni.reLaunch({ url: '/pages/index/index' })
            }
          }]
        }
      })
      // #endif
    },
    reloadWebview() {
      this.webviewKey += 1
    },
  },
}
</script>

<style scoped>
.webview-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100vh;
  background: #f8fafc;
}
.webview-placeholder__text {
  color: #94a3b8;
  font-size: 14px;
}
</style>
