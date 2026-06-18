<template>
  <view v-if="!url" class="webview-placeholder">
    <text class="webview-placeholder__text">正在进入商城...</text>
  </view>
  <view v-else class="webview-wrapper">
    <web-view
      :key="webviewKey"
      :src="url"
      class="webview-container"
      @error="handleWebviewError"
      @load="handleWebviewLoad"
    />
    <!-- 悬浮首页按钮 -->
    <view class="home-fab" @click="goHome">
      <text class="home-fab__icon">🏠</text>
    </view>
  </view>
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
      // 显示 App 原生导航栏，带返回首页按钮
      // #ifdef APP-PLUS
      plus.webview.currentWebview().setStyle({
        titleNView: {
          autoBackButton: true,
          backgroundColor: '#FFFFFF',
          titleColor: '#333333',
          homeButton: true,
          buttons: [{
            type: 'none',
            text: '🏠',
            fontSize: '20px',
            float: 'left',
            color: '#f97316',
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
    goHome() {
      uni.reLaunch({ url: '/pages/index/index' })
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
.webview-wrapper {
  position: relative;
  width: 100%;
  height: 100vh;
}
.webview-container {
  width: 100%;
  height: 100%;
}
/* 悬浮首页按钮 */
.home-fab {
  position: fixed;
  right: 20px;
  bottom: 120px;
  width: 50px;
  height: 50px;
  background: linear-gradient(135deg, #ff6b35, #f97316);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 12px rgba(249, 115, 22, 0.4);
  z-index: 9999;
}
.home-fab__icon {
  font-size: 24px;
}
</style>
