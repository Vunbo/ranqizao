<template>
  <view class="mall-page">
    <!-- H5 平台：iframe + view 导航条 -->
    <!-- #ifndef APP-PLUS -->
    <iframe
      src="https://zyhskj.shop/addons/yun_shop/?menu#/home?i=1"
      class="mall-iframe"
      :style="{ top: navBarHeight + 'px', height: 'calc(100vh - ' + navBarHeight + 'px)' }"
      frameborder="0"
    />
    <view class="nav-bar" :style="{ height: navBarHeight + 'px', paddingTop: statusBarHeight + 'px' }">
      <view class="nav-bar__inner" :style="{ height: navBarContentHeight + 'px' }">
        <view class="nav-bar__back" @tap="goHome">
          <text class="nav-bar__back-icon">&#8592;</text>
          <text class="nav-bar__back-text">首页</text>
        </view>
        <text class="nav-bar__title">商城</text>
        <view class="nav-bar__placeholder" />
      </view>
    </view>
    <!-- #endif -->
  </view>
</template>

<script>
var MALL_URL = 'https://zyhskj.shop/addons/yun_shop/?menu#/home?i=1'

export default {
  name: 'MallWebview',
  emits: ['go-home'],
  data() {
    return {
      statusBarHeight: 44,
      navBarContentHeight: 44,
      navWV: null,
      h5WV: null,
    }
  },
  computed: {
    navBarHeight() {
      return this.statusBarHeight + this.navBarContentHeight
    },
  },
  mounted() {
    try {
      var info = uni.getSystemInfoSync()
      this.statusBarHeight = info.statusBarHeight || 44
    } catch (e) {
      this.statusBarHeight = 44
    }
    // #ifdef APP-PLUS
    this.createWebviews()
    // #endif
  },
  beforeUnmount() {
    // #ifdef APP-PLUS
    this.destroyWebviews()
    // #endif
  },
  methods: {
    goHome() {
      this.$emit('go-home')
    },
    createWebviews() {
      var _this = this
      setTimeout(function () {
        try {
          var info = uni.getSystemInfoSync()
          var navH = _this.statusBarHeight + _this.navBarContentHeight
          var h5H = (info.screenHeight || 700) - navH

          // 创建导航条 WebView（内联 HTML）
          var oldNav = plus.webview.getWebviewById('mall-nav-wv')
          if (oldNav) oldNav.close('none')

          _this.navWV = plus.webview.create('', 'mall-nav-wv', {
            top: '0px',
            height: navH + 'px',
            width: '100%',
            background: '#ffffff',
            scrollIndicator: 'none',
            bounce: 'none',
          })

          // 获取当前页面的 WebView ID
          var pageId = ''
          try {
            var pages = getCurrentPages()
            var page = pages[pages.length - 1]
            pageId = page.$getAppWebview().id
          } catch (e) {}

          _this.navWV.loadHTML(
            '<!DOCTYPE html><html><head><meta charset="utf-8">'
            + '<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">'
            + '<style>'
            + '*{margin:0;padding:0;box-sizing:border-box;}'
            + 'body{font-family:-apple-system,Helvetica,sans-serif;background:#fff;overflow:hidden;}'
            + '.s{height:' + _this.statusBarHeight + 'px;background:#fff;}'
            + '.r{display:flex;align-items:center;justify-content:space-between;height:' + _this.navBarContentHeight + 'px;padding:0 16px;border-bottom:1px solid #f1f5f9;}'
            + '.b{display:flex;align-items:center;gap:4px;min-width:60px;cursor:pointer;color:#f97316;font-size:15px;font-weight:600;text-decoration:none;}'
            + '.bi{font-size:20px;line-height:1;}'
            + '.t{font-size:17px;font-weight:700;color:#1e293b;}'
            + '.p{min-width:60px;}'
            + '</style></head><body>'
            + '<div class="s"></div>'
            + '<div class="r">'
            + '<a class="b" href="javascript:g()"><span class="bi">&#8592;</span><span>首页</span></a>'
            + '<span class="t">商城</span>'
            + '<span class="p"></span>'
            + '</div>'
            + '<script>'
            + 'function g(){'
            + '  try{plus.webview.postMessageToTargetWindow({a:"g"},"' + pageId + '");}catch(e){}'
            + '}'
            + '<\/script>'
            + '</body></html>'
          )
          _this.navWV.show()

          // 监听消息（如果页面 ID 可用）
          try {
            var pages = getCurrentPages()
            var page = pages[pages.length - 1]
            var pwv = page.$getAppWebview()
            pwv.addEventListener('message', function (e) {
              if (e.data && e.data.a === 'g') {
                _this.goHome()
              }
            })
          } catch (e) {}

          // 创建 H5 WebView
          var oldH5 = plus.webview.getWebviewById('mall-h5-wv')
          if (oldH5) oldH5.close('none')

          _this.h5WV = plus.webview.create('', 'mall-h5-wv', {
            top: navH + 'px',
            height: h5H + 'px',
            width: '100%',
            background: '#ffffff',
          })
          _this.h5WV.loadURL(MALL_URL)
          _this.h5WV.show()

        } catch (e) {
          console.error('[mall] create error:', e)
        }
      }, 500)
    },
    destroyWebviews() {
      if (this.h5WV) {
        this.h5WV.close('none')
        this.h5WV = null
      }
      if (this.navWV) {
        this.navWV.close('none')
        this.navWV = null
      }
    },
  },
}
</script>

<style scoped>
.mall-page {
  width: 100%;
  height: 100%;
  background: #ffffff;
}

/* H5 模式 */
/* #ifndef APP-PLUS */
.nav-bar {
  position: relative;
  z-index: 100;
  width: 100%;
  background: #ffffff;
  border-bottom: 1px solid #f1f5f9;
  box-sizing: border-box;
}
.nav-bar__inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 16px;
}
.nav-bar__back {
  display: flex;
  align-items: center;
  gap: 4px;
  min-width: 60px;
}
.nav-bar__back-icon {
  font-size: 20px;
  color: #f97316;
  line-height: 1;
}
.nav-bar__back-text {
  font-size: 15px;
  color: #f97316;
  font-weight: 600;
}
.nav-bar__title {
  font-size: 17px;
  font-weight: 700;
  color: #1e293b;
  flex-shrink: 0;
}
.nav-bar__placeholder {
  min-width: 60px;
}
.mall-iframe {
  position: fixed;
  left: 0;
  right: 0;
  width: 100%;
  border: none;
}
/* #endif */
</style>
