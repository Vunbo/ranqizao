<template>
  <view class="auth-panel page-shell">
    <!-- #ifdef MP-WEIXIN -->
    <view class="auth-panel__mini">
      <view class="auth-panel__brand">
        <view class="auth-panel__logo">
          <app-icon name="flame" :size="28" color="#ffffff" />
        </view>
        <text class="auth-panel__title">AI 安全灶</text>
        <text class="auth-panel__subtitle">微信小程序使用微信平台能力登录</text>
      </view>

      <card-box custom-style="padding: 28px 24px;">
        <view class="auth-panel__mini-card">
          <view class="auth-panel__wechat-mark">
            <app-icon name="message" :size="28" color="#07C160" :filled="true" />
          </view>
          <text class="auth-panel__mini-title">微信授权登录</text>
          <text class="auth-panel__mini-desc">
            前端通过 `uni.login` 获取登录凭证，再由后端完成鉴权并返回用户会话。
          </text>
          <view class="auth-panel__submit" @tap="handleMiniProgramLogin">
            <app-icon v-if="loading" name="loader" :size="18" color="#ffffff" animated />
            <text class="auth-panel__submit-text">{{ loading ? '登录中...' : '微信一键登录' }}</text>
          </view>
        </view>
      </card-box>
    </view>
    <!-- #endif -->

    <!-- #ifndef MP-WEIXIN -->
    <view class="auth-panel__classic">
      <view class="auth-panel__brand">
        <view class="auth-panel__logo">
          <app-icon name="flame" :size="28" color="#ffffff" />
        </view>
        <text class="auth-panel__title">AI 安全灶</text>
        <text class="auth-panel__subtitle">{{ isLogin ? '欢迎回来' : '创建您的账户' }}</text>
      </view>

      <view class="auth-panel__switch" v-if="isLogin">
        <view
          class="auth-panel__switch-item"
          :class="{ 'auth-panel__switch-item--active': authMethod === 'email' }"
          @tap="authMethod = 'email'"
        >
          <text class="auth-panel__switch-text">邮箱登录</text>
        </view>
        <view
          class="auth-panel__switch-item"
          :class="{ 'auth-panel__switch-item--active': authMethod === 'phone' }"
          @tap="authMethod = 'phone'"
        >
          <text class="auth-panel__switch-text">手机号登录</text>
        </view>
      </view>

      <view class="auth-panel__form">
        <template v-if="!isLogin || authMethod === 'email'">
          <view class="auth-field">
            <text class="auth-field__label">邮箱地址</text>
            <view class="auth-field__input-wrap">
              <view class="auth-field__icon">
                <app-icon name="mail" :size="16" color="#94a3b8" />
              </view>
              <input
                v-model="email"
                class="auth-field__input"
                placeholder="请输入邮箱，例如 123@test.com"
                placeholder-style="color:#94a3b8"
              />
            </view>
          </view>

          <view class="auth-field">
            <text class="auth-field__label">密码</text>
            <view class="auth-field__input-wrap">
              <view class="auth-field__icon">
                <app-icon name="lock" :size="16" color="#94a3b8" />
              </view>
              <input
                v-model="password"
                class="auth-field__input"
                :password="true"
                placeholder="请输入密码"
                placeholder-style="color:#94a3b8"
              />
            </view>
          </view>

          <view class="auth-field" v-if="!isLogin">
            <text class="auth-field__label">确认密码</text>
            <view class="auth-field__input-wrap">
              <view class="auth-field__icon">
                <app-icon name="lock" :size="16" color="#94a3b8" />
              </view>
              <input
                v-model="confirmPassword"
                class="auth-field__input"
                :password="true"
                placeholder="请再次输入密码"
                placeholder-style="color:#94a3b8"
              />
            </view>
          </view>
        </template>

        <template v-else>
          <view class="auth-field">
            <text class="auth-field__label">手机号码</text>
            <view class="auth-field__row">
              <view class="auth-field__input-wrap auth-field__input-wrap--grow">
                <view class="auth-field__icon">
                  <app-icon name="phone" :size="16" color="#94a3b8" />
                </view>
                <input
                  v-model="phone"
                  class="auth-field__input"
                  placeholder="+86 138..."
                  placeholder-style="color:#94a3b8"
                />
              </view>
              <view
                class="auth-field__send"
                :class="{ 'auth-field__send--disabled': loading || phoneCountdown > 0 }"
                @tap="handleSendPhoneCode"
              >
                <text class="auth-field__send-text">{{ phoneCountdownText }}</text>
              </view>
            </view>
          </view>

          <view class="auth-field">
            <text class="auth-field__label">验证码</text>
            <view class="auth-field__input-wrap">
              <view class="auth-field__icon">
                <app-icon name="lock" :size="16" color="#94a3b8" />
              </view>
              <input
                v-model="phoneCode"
                class="auth-field__input"
                placeholder="请输入 6 位验证码"
                placeholder-style="color:#94a3b8"
              />
            </view>
          </view>
        </template>

        <text class="auth-panel__error" v-if="error">{{ error }}</text>
        <text
          class="auth-panel__error"
          v-if="!isLogin && password && confirmPassword && password !== confirmPassword"
        >
          两次输入的密码不一致
        </text>

        <view class="auth-panel__submit" @tap="handleAuth">
          <app-icon v-if="loading" name="loader" :size="18" color="#ffffff" animated />
          <text class="auth-panel__submit-text">
            {{ loading ? '处理中...' : submitText }}
          </text>
        </view>
      </view>

      <view class="auth-panel__footer">
        <text class="auth-panel__footer-text">{{ isLogin ? '还没有账号？' : '已经有账号？' }}</text>
        <text class="auth-panel__footer-link" @tap="toggleAuthMode">
          {{ isLogin ? '立即注册' : '立即登录' }}
        </text>
      </view>

      <!-- #ifdef APP-PLUS -->
      <view class="auth-panel__divider" v-if="isLogin">
        <view class="auth-panel__divider-line"></view>
        <text class="auth-panel__divider-text">快捷登录</text>
        <view class="auth-panel__divider-line"></view>
      </view>

      <view class="auth-panel__quick-grid" v-if="isLogin">
        <view
          class="auth-panel__quick-item"
          :class="{ 'auth-panel__quick-item--disabled': !appQuickLoginSupport.wechatApp.supported }"
          @tap="handleWechatAppLogin"
        >
          <app-icon name="message" :size="18" color="#07C160" :filled="true" />
          <text class="auth-panel__quick-text">微信</text>
        </view>
        <view
          class="auth-panel__quick-item"
          :class="{ 'auth-panel__quick-item--disabled': !appQuickLoginSupport.googleApp.supported }"
          @tap="handleGoogleAppLogin"
        >
          <view class="auth-panel__google-badge">G</view>
          <text class="auth-panel__quick-text">Google</text>
        </view>
      </view>

      <text
        class="auth-panel__quick-hint"
        v-if="isLogin && (!appQuickLoginSupport.wechatApp.supported || !appQuickLoginSupport.googleApp.supported)"
      >
        {{ appQuickLoginHint }}
      </text>
      <!-- #endif -->
    </view>
    <!-- #endif -->
  </view>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import AppIcon from '../ui/AppIcon.vue'
import CardBox from '../ui/CardBox.vue'
import {
  getAvailableAppQuickLoginProviders,
  loginWithGoogleApp,
  loginWithMiniProgram,
  loginWithWechatApp,
  loginWithPassword,
  loginWithPhoneCode,
  registerWithPassword,
  sendPhoneLoginCode,
} from '../../services/gateway'

const emit = defineEmits(['auth-success', 'toast'])

const isLogin = ref(true)
const authMethod = ref('email')
const email = ref('')
const password = ref('')
const confirmPassword = ref('')
const phone = ref('')
const phoneCode = ref('')
const phoneCountdown = ref(0)
const loading = ref(false)
const error = ref('')
let phoneCountdownTimer = null
const appQuickLoginSupport = ref({
  wechatApp: {
    supported: true,
    reason: '',
  },
  googleApp: {
    supported: true,
    reason: '',
  },
})

const phoneCountdownText = computed(() => {
  if (phoneCountdown.value > 0) {
    return `${phoneCountdown.value}s 后重发`
  }
  return '发送验证码'
})

const submitText = computed(() => {
  if (isLogin.value) {
    return authMethod.value === 'phone' ? '手机号登录' : '登录'
  }
  return '注册'
})

const appQuickLoginHint = computed(() => {
  if (!appQuickLoginSupport.value.wechatApp.supported) {
    return appQuickLoginSupport.value.wechatApp.reason
  }

  if (!appQuickLoginSupport.value.googleApp.supported) {
    return appQuickLoginSupport.value.googleApp.reason
  }

  return ''
})

onMounted(async () => {
  // #ifdef APP-PLUS
  appQuickLoginSupport.value = await getAvailableAppQuickLoginProviders()
  // #endif
})

onBeforeUnmount(() => {
  clearPhoneCountdown()
})

function clearPhoneCountdown() {
  if (phoneCountdownTimer) {
    clearInterval(phoneCountdownTimer)
    phoneCountdownTimer = null
  }
}

function toggleAuthMode() {
  isLogin.value = !isLogin.value
  authMethod.value = 'email'
  error.value = ''
  password.value = ''
  confirmPassword.value = ''
  phoneCode.value = ''
}

function isFormValid() {
  if (isLogin.value) {
    if (authMethod.value === 'phone') {
      return Boolean(phone.value && phoneCode.value)
    }

    return Boolean(email.value && password.value)
  }

  return Boolean(
    email.value &&
      password.value &&
      confirmPassword.value &&
      password.value === confirmPassword.value
  )
}

async function handleSendPhoneCode() {
  if (loading.value || phoneCountdown.value > 0) {
    return
  }

  if (!phone.value) {
    error.value = '请输入手机号'
    return
  }

  loading.value = true

  try {
    const result = await sendPhoneLoginCode({
      phone: phone.value,
    })

    phoneCountdown.value = 60
    clearPhoneCountdown()
    phoneCountdownTimer = setInterval(() => {
      if (phoneCountdown.value <= 1) {
        phoneCountdown.value = 0
        clearPhoneCountdown()
        return
      }

      phoneCountdown.value -= 1
    }, 1000)

    emit('toast', {
      message:
        result && result.debugCode
          ? `验证码已发送，当前调试验证码：${result.debugCode}`
          : '验证码已发送',
      type: 'success',
    })
  } catch (requestError) {
    error.value = requestError.message || '发送验证码失败'
  } finally {
    loading.value = false
  }
}

async function handleAuth() {
  if (loading.value || !isFormValid()) {
    return
  }

  loading.value = true
  error.value = ''

  try {
    let session = null

    if (isLogin.value && authMethod.value === 'phone') {
      session = await loginWithPhoneCode({
        phone: phone.value,
        code: phoneCode.value,
      })
    } else if (isLogin.value) {
      session = await loginWithPassword({
        email: email.value,
        password: password.value,
      })
    } else {
      if (password.value !== confirmPassword.value) {
        throw new Error('两次输入的密码不一致')
      }

      session = await registerWithPassword({
        email: email.value,
        password: password.value,
      })
    }

    emit('auth-success', session)
  } catch (requestError) {
    error.value = requestError.message || '认证失败，请检查输入内容'
  } finally {
    loading.value = false
  }
}

async function handleMiniProgramLogin() {
  if (loading.value) {
    return
  }

  loading.value = true

  try {
    const session = await loginWithMiniProgram()
    emit('toast', {
      message: '微信登录成功',
      type: 'success',
    })
    emit('auth-success', session)
  } catch (requestError) {
    emit('toast', {
      message: requestError.message || '微信登录失败',
      type: 'error',
    })
  } finally {
    loading.value = false
  }
}

async function handleWechatAppLogin() {
  if (loading.value) {
    return
  }

  if (!appQuickLoginSupport.value.wechatApp.supported) {
    emit('toast', {
      message: appQuickLoginSupport.value.wechatApp.reason || '当前环境不可用微信 App 快捷登录',
      type: 'error',
    })
    return
  }

  loading.value = true

  try {
    const session = await loginWithWechatApp()
    emit('toast', {
      message: '微信登录成功',
      type: 'success',
    })
    emit('auth-success', session)
  } catch (requestError) {
    emit('toast', {
      message: requestError.message || '微信登录失败',
      type: 'error',
    })
  } finally {
    loading.value = false
  }
}

async function handleGoogleAppLogin() {
  if (loading.value) {
    return
  }

  if (!appQuickLoginSupport.value.googleApp.supported) {
    emit('toast', {
      message: appQuickLoginSupport.value.googleApp.reason || '当前环境不可用 Google App 快捷登录',
      type: 'error',
    })
    return
  }

  loading.value = true

  try {
    const session = await loginWithGoogleApp()
    emit('toast', {
      message: 'Google 登录成功',
      type: 'success',
    })
    emit('auth-success', session)
  } catch (requestError) {
    emit('toast', {
      message: requestError.message || 'Google 登录失败',
      type: 'error',
    })
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.auth-panel {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: calc(var(--app-safe-top, 0px) + 34px) 24px 48px;
}

.auth-panel__classic,
.auth-panel__mini {
  width: 100%;
  max-width: 380px;
}

.auth-panel__brand {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 28px;
  text-align: center;
}

.auth-panel__logo {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 64px;
  height: 64px;
  margin-bottom: 12px;
  background: #f97316;
  border-radius: 16px;
  box-shadow: 0 14px 28px rgba(249, 115, 22, 0.24);
}

.auth-panel__title {
  font-size: 24px;
  font-weight: 700;
  font-family: 'Outfit', sans-serif;
  color: #0f172a;
}

.auth-panel__subtitle {
  margin-top: 8px;
  font-size: 14px;
  color: #64748b;
}

.auth-panel__switch {
  display: flex;
  padding: 4px;
  margin-bottom: 18px;
  background: #e2e8f0;
  border-radius: 16px;
}

.auth-panel__switch-item {
  display: flex;
  flex: 1;
  align-items: center;
  justify-content: center;
  height: 40px;
  border-radius: 12px;
}

.auth-panel__switch-item--active {
  background: #ffffff;
  box-shadow: 0 4px 10px rgba(15, 23, 42, 0.06);
}

.auth-panel__switch-text {
  font-size: 12px;
  font-weight: 700;
  color: #64748b;
}

.auth-panel__switch-item--active .auth-panel__switch-text {
  color: #f97316;
}

.auth-panel__form {
  margin-top: 18px;
}

.auth-field + .auth-field {
  margin-top: 14px;
}

.auth-field__label {
  display: block;
  margin: 0 0 6px 4px;
  font-size: 12px;
  font-weight: 700;
  color: #334155;
}

.auth-field__row {
  display: flex;
  gap: 8px;
}

.auth-field__input-wrap {
  position: relative;
  display: flex;
  align-items: center;
  width: 100%;
  min-height: 52px;
  padding: 0 14px 0 42px;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 16px;
}

.auth-field__input-wrap--grow {
  flex: 1;
}

.auth-field__icon {
  position: absolute;
  top: 50%;
  left: 14px;
  transform: translateY(-50%);
}

.auth-field__input {
  width: 100%;
  font-size: 14px;
  color: #0f172a;
}

.auth-field__send {
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 104px;
  min-height: 52px;
  padding: 0 14px;
  background: #f1f5f9;
  border-radius: 16px;
}

.auth-field__send--disabled {
  opacity: 0.6;
}

.auth-field__send-text {
  font-size: 12px;
  font-weight: 700;
  color: #334155;
}

.auth-panel__error {
  display: block;
  margin-top: 12px;
  font-size: 12px;
  font-weight: 600;
  text-align: center;
  color: #f43f5e;
}

.auth-panel__submit {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 52px;
  margin-top: 18px;
  background: #f97316;
  border-radius: 16px;
  box-shadow: 0 14px 28px rgba(249, 115, 22, 0.2);
}

.auth-panel__submit-text {
  margin-left: 6px;
  font-size: 15px;
  font-weight: 700;
  color: #ffffff;
}

.auth-panel__footer {
  margin-top: 24px;
  text-align: center;
}

.auth-panel__footer-text {
  font-size: 14px;
  color: #64748b;
}

.auth-panel__footer-link {
  margin-left: 6px;
  font-size: 14px;
  font-weight: 700;
  color: #f97316;
}

.auth-panel__divider {
  display: flex;
  align-items: center;
  margin-top: 24px;
}

.auth-panel__divider-line {
  flex: 1;
  height: 1px;
  background: #e2e8f0;
}

.auth-panel__divider-text {
  margin: 0 12px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 2px;
  color: #94a3b8;
}

.auth-panel__quick-grid {
  display: flex;
  gap: 12px;
  margin-top: 16px;
}

.auth-panel__quick-item {
  display: flex;
  flex: 1;
  align-items: center;
  justify-content: center;
  min-height: 52px;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 16px;
}

.auth-panel__quick-item--disabled {
  opacity: 0.48;
}

.auth-panel__quick-text {
  margin-left: 8px;
  font-size: 13px;
  font-weight: 700;
  color: #334155;
}

.auth-panel__google-badge {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  background: #4285f4;
  border-radius: 50%;
  font-size: 12px;
  font-weight: 700;
  color: #ffffff;
}

.auth-panel__quick-hint {
  display: block;
  margin-top: 12px;
  font-size: 12px;
  line-height: 20px;
  color: #f43f5e;
}

.auth-panel__mini-card {
  text-align: center;
}

.auth-panel__wechat-mark {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 72px;
  height: 72px;
  margin: 0 auto 18px;
  background: #ecfdf5;
  border-radius: 24px;
}

.auth-panel__mini-title {
  display: block;
  font-size: 22px;
  font-weight: 700;
  font-family: 'Outfit', sans-serif;
  color: #0f172a;
}

.auth-panel__mini-desc {
  display: block;
  margin-top: 10px;
  font-size: 13px;
  line-height: 22px;
  color: #64748b;
}
</style>
