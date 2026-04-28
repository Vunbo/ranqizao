<template>
  <view class="binding-view">
    <view v-if="!embedded" class="binding-view__header">
      <view class="binding-view__back" @tap="emit('back')">
        <app-icon name="arrowLeft" :size="18" color="#475569" />
      </view>
      <text class="binding-view__title">账号绑定</text>
    </view>

    <card-box v-if="!embedded" custom-style="padding:16px;">
      <view class="binding-view__summary">
        <text class="binding-view__summary-title">当前 UID</text>
        <text class="binding-view__summary-value">{{ uid }}</text>
      </view>
    </card-box>

    <card-box
      v-for="item in identityCards"
      :key="item.key"
      custom-style="padding:16px; margin-top:12px;"
    >
      <view class="binding-view__card">
        <view class="binding-view__left">
          <view class="binding-view__icon">
            <app-icon
              :name="item.icon"
              :size="18"
              :color="item.color"
              :filled="item.key === 'wechat' || item.key === 'wechatApp'"
            />
          </view>
          <view>
            <text class="binding-view__label">{{ item.label }}</text>
            <text class="binding-view__desc">{{ item.desc }}</text>
          </view>
        </view>
        <view
          class="binding-view__action"
          :class="{
            'binding-view__action--bound': item.bound,
            'binding-view__action--danger': item.bound,
            'binding-view__action--disabled': item.actionDisabled
          }"
          @tap="handleAction(item)"
        >
          <text class="binding-view__action-text">
            {{ item.actionDisabled ? '保留' : (item.bound ? '解绑' : '去绑定') }}
          </text>
        </view>
      </view>
    </card-box>

    <view v-if="emailModalOpen" class="modal-mask" @tap="closeEmailModal">
      <view class="binding-view__modal" @tap.stop>
        <text class="binding-view__modal-title">绑定邮箱</text>
        <view class="binding-view__field">
          <text class="binding-view__field-label">邮箱地址</text>
          <view class="binding-view__input">
            <input
              v-model="bindEmail"
              class="binding-view__input-core"
              placeholder="请输入邮箱"
              placeholder-style="color:#94a3b8"
            />
          </view>
        </view>
        <view class="binding-view__field">
          <text class="binding-view__field-label">设置密码</text>
          <view class="binding-view__input">
            <input
              v-model="bindEmailPassword"
              class="binding-view__input-core"
              :password="true"
              placeholder="请输入密码"
              placeholder-style="color:#94a3b8"
            />
          </view>
        </view>
        <view class="binding-view__actions">
          <view class="binding-view__ghost" @tap="closeEmailModal">
            <text class="binding-view__ghost-text">取消</text>
          </view>
          <view class="binding-view__primary" @tap="submitBindEmail">
            <text class="binding-view__primary-text">{{ submitting ? '提交中...' : '确认绑定' }}</text>
          </view>
        </view>
      </view>
    </view>

    <view v-if="phoneModalOpen" class="modal-mask" @tap="closePhoneModal">
      <view class="binding-view__modal" @tap.stop>
        <text class="binding-view__modal-title">绑定手机号</text>
        <view class="binding-view__field">
          <text class="binding-view__field-label">手机号</text>
          <view class="binding-view__input-row">
            <view class="binding-view__input binding-view__input--grow">
              <input
                v-model="bindPhone"
                class="binding-view__input-core"
                placeholder="请输入手机号"
                placeholder-style="color:#94a3b8"
              />
            </view>
            <view
              class="binding-view__send"
              :class="{ 'binding-view__send--disabled': submitting || phoneCountdown > 0 }"
              @tap="sendBindPhoneVerificationCode"
            >
              <text class="binding-view__send-text">{{ phoneCountdownText }}</text>
            </view>
          </view>
        </view>
        <view class="binding-view__field">
          <text class="binding-view__field-label">验证码</text>
          <view class="binding-view__input">
            <input
              v-model="bindPhoneCode"
              class="binding-view__input-core"
              placeholder="请输入验证码"
              placeholder-style="color:#94a3b8"
            />
          </view>
        </view>
        <view class="binding-view__actions">
          <view class="binding-view__ghost" @tap="closePhoneModal">
            <text class="binding-view__ghost-text">取消</text>
          </view>
          <view class="binding-view__primary" @tap="submitBindPhone">
            <text class="binding-view__primary-text">{{ submitting ? '提交中...' : '确认绑定' }}</text>
          </view>
        </view>
      </view>
    </view>

    <view v-if="unbindModalOpen && unbindTarget" class="modal-mask" @tap="closeUnbindModal">
      <view class="binding-view__modal" @tap.stop>
        <text class="binding-view__modal-title">解绑前二次校验</text>
        <text class="binding-view__modal-desc">
          正在解绑“{{ unbindTarget.label }}”，请先完成安全校验。
        </text>

        <view class="binding-view__method-tabs">
          <view
            v-for="method in availableVerifyMethods"
            :key="method.key"
            class="binding-view__method-tab"
            :class="{ 'binding-view__method-tab--active': unbindVerifyMethod === method.key }"
            @tap="selectVerifyMethod(method.key)"
          >
            <text class="binding-view__method-tab-text">{{ method.label }}</text>
          </view>
        </view>

        <view v-if="unbindVerifyMethod === 'password'" class="binding-view__field">
          <text class="binding-view__field-label">当前密码</text>
          <view class="binding-view__input">
            <input
              v-model="unbindPassword"
              class="binding-view__input-core"
              :password="true"
              placeholder="请输入当前密码"
              placeholder-style="color:#94a3b8"
            />
          </view>
        </view>

        <template v-else-if="unbindVerifyMethod === 'phone_code'">
          <view class="binding-view__field">
            <text class="binding-view__field-label">手机号</text>
            <view class="binding-view__input-row">
              <view class="binding-view__input binding-view__input--grow">
                <input
                  v-model="unbindPhone"
                  class="binding-view__input-core"
                  placeholder="请输入已绑定手机号"
                  placeholder-style="color:#94a3b8"
                />
              </view>
              <view
                class="binding-view__send"
                :class="{ 'binding-view__send--disabled': submitting || unbindPhoneCountdown > 0 }"
                @tap="sendUnbindPhoneVerificationCode"
              >
                <text class="binding-view__send-text">{{ unbindPhoneCountdownText }}</text>
              </view>
            </view>
          </view>
          <view class="binding-view__field">
            <text class="binding-view__field-label">验证码</text>
            <view class="binding-view__input">
              <input
                v-model="unbindCode"
                class="binding-view__input-core"
                placeholder="请输入验证码"
                placeholder-style="color:#94a3b8"
              />
            </view>
          </view>
        </template>

        <text class="binding-view__tip" v-else>
          选择“确认解绑”后将触发对应第三方账号的重新授权校验。
        </text>

        <view class="binding-view__actions">
          <view class="binding-view__ghost" @tap="closeUnbindModal">
            <text class="binding-view__ghost-text">取消</text>
          </view>
          <view class="binding-view__danger" @tap="submitUnbind">
            <text class="binding-view__primary-text">{{ submitting ? '提交中...' : '确认解绑' }}</text>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import AppIcon from '../ui/AppIcon.vue'
import CardBox from '../ui/CardBox.vue'
import {
  bindEmailIdentity,
  bindGoogleAppIdentity,
  bindWechatAppIdentity,
  bindMiniProgramIdentity,
  bindPhoneIdentity,
  getGoogleAppVerificationPayload,
  getWechatAppVerificationCode,
  listAuthIdentities,
  sendPhoneBindCode,
  sendPhoneUnbindCode,
  unbindIdentity,
} from '../../services/gateway'

const props = defineProps({
  user: {
    type: Object,
    default: null,
  },
  embedded: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['back', 'toast', 'request-confirm'])

const identities = ref([])
const loading = ref(false)
const submitting = ref(false)
const emailModalOpen = ref(false)
const phoneModalOpen = ref(false)
const bindEmail = ref('')
const bindEmailPassword = ref('')
const bindPhone = ref('')
const bindPhoneCode = ref('')
const phoneCountdown = ref(0)
let phoneCountdownTimer = null
const unbindModalOpen = ref(false)
const unbindTarget = ref(null)
const unbindVerifyMethod = ref('')
const unbindPassword = ref('')
const unbindPhone = ref('')
const unbindCode = ref('')
const unbindPhoneCountdown = ref(0)
let unbindPhoneCountdownTimer = null

const uid = computed(() => {
  return props.user && props.user.uid ? props.user.uid : ''
})

const identityCards = computed(() => {
  const emailIdentity = identities.value.find((item) => item.provider === 'email_password')
  const phoneIdentity = identities.value.find((item) => item.provider === 'phone_sms')
  const miniIdentity = identities.value.find((item) => item.provider === 'wechat_mini_program')
  const appWechatIdentity = identities.value.find((item) => item.provider === 'wechat_app')
  const googleAppIdentity = identities.value.find((item) => item.provider === 'google_app')
  const boundIdentityCount = identities.value.length

  return [
    {
      key: 'email',
      provider: emailIdentity ? emailIdentity.provider : 'email_password',
      providerUserId: emailIdentity ? emailIdentity.providerUserId : '',
      providerAppId: emailIdentity ? emailIdentity.providerAppId : '',
      icon: 'mail',
      color: '#3b82f6',
      label: '邮箱账号',
      bound: !!emailIdentity,
      actionDisabled: !!emailIdentity && boundIdentityCount <= 1,
      desc: emailIdentity ? emailIdentity.providerUserId : '未绑定邮箱',
    },
    {
      key: 'phone',
      provider: phoneIdentity ? phoneIdentity.provider : 'phone_sms',
      providerUserId: phoneIdentity ? phoneIdentity.providerUserId : '',
      providerAppId: phoneIdentity ? phoneIdentity.providerAppId : '',
      icon: 'phone',
      color: '#10b981',
      label: '手机号',
      bound: !!phoneIdentity,
      actionDisabled: !!phoneIdentity && boundIdentityCount <= 1,
      desc: phoneIdentity ? phoneIdentity.providerUserId : '未绑定手机号',
    },
    {
      key: 'wechatApp',
      provider: appWechatIdentity ? appWechatIdentity.provider : 'wechat_app',
      providerUserId: appWechatIdentity ? appWechatIdentity.providerUserId : '',
      providerAppId: appWechatIdentity ? appWechatIdentity.providerAppId : '',
      icon: 'message',
      color: '#07C160',
      label: '微信 App',
      bound: !!appWechatIdentity,
      actionDisabled: !!appWechatIdentity && boundIdentityCount <= 1,
      desc: appWechatIdentity ? '已绑定微信 App 身份' : '未绑定微信 App 身份',
    },
    {
      key: 'googleApp',
      provider: googleAppIdentity ? googleAppIdentity.provider : 'google_app',
      providerUserId: googleAppIdentity ? googleAppIdentity.providerUserId : '',
      providerAppId: googleAppIdentity ? googleAppIdentity.providerAppId : '',
      icon: 'globe',
      color: '#3b82f6',
      label: 'Google',
      bound: !!googleAppIdentity,
      actionDisabled: !!googleAppIdentity && boundIdentityCount <= 1,
      desc: googleAppIdentity ? '已绑定 Google 身份' : '未绑定 Google 身份',
    },
    {
      key: 'wechat',
      provider: miniIdentity ? miniIdentity.provider : 'wechat_mini_program',
      providerUserId: miniIdentity ? miniIdentity.providerUserId : '',
      providerAppId: miniIdentity ? miniIdentity.providerAppId : '',
      icon: 'message',
      color: '#07C160',
      label: '微信小程序',
      bound: !!miniIdentity,
      actionDisabled: !!miniIdentity && boundIdentityCount <= 1,
      desc: miniIdentity ? '已绑定微信小程序身份' : '未绑定微信小程序身份',
    },
  ]
})

const availableVerifyMethods = computed(() => {
  if (!unbindTarget.value) {
    return []
  }

  const remaining = identities.value.filter((item) => {
    return !(
      item.provider === unbindTarget.value.provider &&
      item.providerUserId === unbindTarget.value.providerUserId &&
      item.providerAppId === unbindTarget.value.providerAppId
    )
  })

  const methods = []
  if (remaining.some((item) => item.provider === 'email_password')) {
    methods.push({ key: 'password', label: '密码校验' })
  }
  if (remaining.some((item) => item.provider === 'phone_sms')) {
    methods.push({ key: 'phone_code', label: '短信验证码' })
  }
  if (remaining.some((item) => item.provider === 'wechat_mini_program')) {
    methods.push({ key: 'wechat_mini_program', label: '微信小程序校验' })
  }
  if (remaining.some((item) => item.provider === 'wechat_app')) {
    methods.push({ key: 'wechat_app', label: '微信 App 校验' })
  }
  if (remaining.some((item) => item.provider === 'google_app')) {
    methods.push({ key: 'google_app', label: 'Google 校验' })
  }
  return methods
})

const phoneCountdownText = computed(() => {
  if (phoneCountdown.value > 0) {
    return `${phoneCountdown.value}s 后重发`
  }
  return '发送验证码'
})

const unbindPhoneCountdownText = computed(() => {
  if (unbindPhoneCountdown.value > 0) {
    return `${unbindPhoneCountdown.value}s 后重发`
  }
  return '发送验证码'
})

onMounted(() => {
  refreshIdentities()
})

onBeforeUnmount(() => {
  clearPhoneCountdown()
  clearUnbindPhoneCountdown()
})

function clearPhoneCountdown() {
  if (phoneCountdownTimer) {
    clearInterval(phoneCountdownTimer)
    phoneCountdownTimer = null
  }
}

function clearUnbindPhoneCountdown() {
  if (unbindPhoneCountdownTimer) {
    clearInterval(unbindPhoneCountdownTimer)
    unbindPhoneCountdownTimer = null
  }
}

function startPhoneCountdown() {
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
}

function startUnbindPhoneCountdown() {
  unbindPhoneCountdown.value = 60
  clearUnbindPhoneCountdown()
  unbindPhoneCountdownTimer = setInterval(() => {
    if (unbindPhoneCountdown.value <= 1) {
      unbindPhoneCountdown.value = 0
      clearUnbindPhoneCountdown()
      return
    }
    unbindPhoneCountdown.value -= 1
  }, 1000)
}

async function refreshIdentities() {
  loading.value = true
  try {
    identities.value = await listAuthIdentities()
  } catch (requestError) {
    emit('toast', {
      message: requestError.message || '加载绑定信息失败',
      type: 'error',
    })
  } finally {
    loading.value = false
  }
}

function handleAction(item) {
  if (item.actionDisabled) {
    return
  }
  if (item.bound) {
    openUnbindModal(item)
    return
  }
  if (item.key === 'email') {
    emailModalOpen.value = true
    return
  }
  if (item.key === 'phone') {
    phoneModalOpen.value = true
    return
  }
  if (item.key === 'wechat') {
    submitBindMiniProgram()
    return
  }
  if (item.key === 'wechatApp') {
    submitBindWechatApp()
    return
  }
  if (item.key === 'googleApp') {
    submitBindGoogleApp()
  }
}

function openUnbindModal(item) {
  unbindTarget.value = item
  unbindModalOpen.value = true
  unbindPassword.value = ''
  unbindPhone.value = ''
  unbindCode.value = ''
  unbindVerifyMethod.value = availableVerifyMethods.value[0]
    ? availableVerifyMethods.value[0].key
    : ''
}

function closeUnbindModal() {
  unbindModalOpen.value = false
  unbindTarget.value = null
  unbindVerifyMethod.value = ''
  unbindPassword.value = ''
  unbindPhone.value = ''
  unbindCode.value = ''
}

function selectVerifyMethod(method) {
  unbindVerifyMethod.value = method
}

function closeEmailModal() {
  emailModalOpen.value = false
  bindEmail.value = ''
  bindEmailPassword.value = ''
}

function closePhoneModal() {
  phoneModalOpen.value = false
  bindPhoneCode.value = ''
}

async function submitBindEmail() {
  if (submitting.value) {
    return
  }
  submitting.value = true
  try {
    await bindEmailIdentity({
      email: bindEmail.value,
      password: bindEmailPassword.value,
    })
    closeEmailModal()
    await refreshIdentities()
    emit('toast', {
      message: '邮箱绑定成功',
      type: 'success',
    })
  } catch (requestError) {
    emit('toast', {
      message: requestError.message || '邮箱绑定失败',
      type: 'error',
    })
  } finally {
    submitting.value = false
  }
}

async function sendBindPhoneVerificationCode() {
  if (submitting.value || phoneCountdown.value > 0) {
    return
  }
  submitting.value = true
  try {
    const result = await sendPhoneBindCode({
      phone: bindPhone.value,
    })
    startPhoneCountdown()
    emit('toast', {
      message:
        result && result.debugCode
          ? `验证码已发送，当前调试验证码：${result.debugCode}`
          : '验证码已发送',
      type: 'success',
    })
  } catch (requestError) {
    emit('toast', {
      message: requestError.message || '发送验证码失败',
      type: 'error',
    })
  } finally {
    submitting.value = false
  }
}

async function sendUnbindPhoneVerificationCode() {
  if (submitting.value || unbindPhoneCountdown.value > 0) {
    return
  }
  submitting.value = true
  try {
    const result = await sendPhoneUnbindCode({
      phone: unbindPhone.value,
    })
    startUnbindPhoneCountdown()
    emit('toast', {
      message:
        result && result.debugCode
          ? `验证码已发送，当前调试验证码：${result.debugCode}`
          : '验证码已发送',
      type: 'success',
    })
  } catch (requestError) {
    emit('toast', {
      message: requestError.message || '发送验证码失败',
      type: 'error',
    })
  } finally {
    submitting.value = false
  }
}

async function submitBindPhone() {
  if (submitting.value) {
    return
  }
  submitting.value = true
  try {
    await bindPhoneIdentity({
      phone: bindPhone.value,
      code: bindPhoneCode.value,
    })
    closePhoneModal()
    await refreshIdentities()
    emit('toast', {
      message: '手机号绑定成功',
      type: 'success',
    })
  } catch (requestError) {
    emit('toast', {
      message: requestError.message || '手机号绑定失败',
      type: 'error',
    })
  } finally {
    submitting.value = false
  }
}

async function submitBindMiniProgram() {
  if (submitting.value) {
    return
  }
  submitting.value = true
  try {
    await bindMiniProgramIdentity()
    await refreshIdentities()
    emit('toast', {
      message: '微信身份绑定成功',
      type: 'success',
    })
  } catch (requestError) {
    emit('toast', {
      message: requestError.message || '微信身份绑定失败',
      type: 'error',
    })
  } finally {
    submitting.value = false
  }
}

async function submitBindWechatApp() {
  if (submitting.value) {
    return
  }
  submitting.value = true
  try {
    await bindWechatAppIdentity()
    await refreshIdentities()
    emit('toast', {
      message: '微信 App 身份绑定成功',
      type: 'success',
    })
  } catch (requestError) {
    emit('toast', {
      message: requestError.message || '微信 App 身份绑定失败',
      type: 'error',
    })
  } finally {
    submitting.value = false
  }
}

async function submitBindGoogleApp() {
  if (submitting.value) {
    return
  }
  submitting.value = true
  try {
    await bindGoogleAppIdentity()
    await refreshIdentities()
    emit('toast', {
      message: 'Google 身份绑定成功',
      type: 'success',
    })
  } catch (requestError) {
    emit('toast', {
      message: requestError.message || 'Google 身份绑定失败',
      type: 'error',
    })
  } finally {
    submitting.value = false
  }
}

async function getWechatVerificationCode(type) {
  if (type === 'wechat_mini_program') {
    // #ifdef MP-WEIXIN
    const loginResult = await new Promise((resolve, reject) => {
      uni.login({
        provider: 'weixin',
        success: resolve,
        fail: reject,
      })
    })
    return loginResult.code
    // #endif
  }

  if (type === 'wechat_app') {
    // #ifdef APP-PLUS
    return getWechatAppVerificationCode()
    // #endif
  }

  throw new Error('当前平台不支持该微信校验方式。')
}

async function submitUnbind() {
  if (submitting.value || !unbindTarget.value || !unbindVerifyMethod.value) {
    return
  }

  submitting.value = true
  const targetLabel = unbindTarget.value.label
  try {
    const payload = {
      provider: unbindTarget.value.provider,
      providerUserId: unbindTarget.value.providerUserId,
      providerAppId: unbindTarget.value.providerAppId || '',
      verificationType: unbindVerifyMethod.value,
    }

    if (unbindVerifyMethod.value === 'password') {
      payload.currentPassword = unbindPassword.value
    } else if (unbindVerifyMethod.value === 'phone_code') {
      payload.phone = unbindPhone.value
      payload.code = unbindCode.value
    } else if (unbindVerifyMethod.value === 'wechat_mini_program') {
      payload.code = await getWechatVerificationCode('wechat_mini_program')
    } else if (unbindVerifyMethod.value === 'wechat_app') {
      payload.code = await getWechatVerificationCode('wechat_app')
    } else if (unbindVerifyMethod.value === 'google_app') {
      const googlePayload = await getGoogleAppVerificationPayload()
      payload.idToken = googlePayload.idToken || ''
      payload.accessToken = googlePayload.accessToken || ''
      payload.authResult = googlePayload.authResult
      payload.userInfo = googlePayload.userInfo
    }

    await unbindIdentity(payload)
    closeUnbindModal()
    await refreshIdentities()
    emit('toast', {
      message: `${targetLabel}解绑成功`,
      type: 'success',
    })
  } catch (requestError) {
    emit('toast', {
      message: requestError.message || `${targetLabel}解绑失败`,
      type: 'error',
    })
  } finally {
    submitting.value = false
  }
}
</script>

<style scoped>
.binding-view__header {
  display: flex;
  align-items: center;
  margin-bottom: 18px;
}

.binding-view__back {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 14px;
}

.binding-view__title {
  margin-left: 12px;
  font-size: 20px;
  font-weight: 700;
  font-family: 'Outfit', sans-serif;
}

.binding-view__summary {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.binding-view__summary-title {
  font-size: 13px;
  font-weight: 700;
  color: #334155;
}

.binding-view__summary-value {
  font-family: 'Courier New', monospace;
  font-size: 13px;
  color: #94a3b8;
}

.binding-view__card {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.binding-view__left {
  display: flex;
  align-items: center;
  flex: 1;
}

.binding-view__icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  margin-right: 12px;
  background: #f8fafc;
  border-radius: 14px;
}

.binding-view__label {
  display: block;
  font-size: 14px;
  font-weight: 700;
  color: #0f172a;
}

.binding-view__desc {
  display: block;
  margin-top: 4px;
  font-size: 11px;
  color: #94a3b8;
}

.binding-view__action {
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 72px;
  height: 34px;
  padding: 0 12px;
  background: #fff7ed;
  border-radius: 12px;
}

.binding-view__action--bound {
  background: #ecfdf5;
}

.binding-view__action--danger {
  background: #fff1f2;
}

.binding-view__action--disabled {
  background: #e2e8f0;
}

.binding-view__action-text {
  font-size: 12px;
  font-weight: 700;
  color: #f97316;
}

.binding-view__action--bound .binding-view__action-text {
  color: #10b981;
}

.binding-view__action--danger .binding-view__action-text {
  color: #f43f5e;
}

.binding-view__action--disabled .binding-view__action-text {
  color: #94a3b8;
}

.binding-view__modal {
  width: 100%;
  max-width: 340px;
  padding: 24px;
  background: #ffffff;
  border-radius: 28px;
}

.binding-view__modal-title {
  display: block;
  font-size: 18px;
  font-weight: 700;
  text-align: center;
}

.binding-view__modal-desc {
  display: block;
  margin-top: 8px;
  font-size: 12px;
  line-height: 18px;
  text-align: center;
  color: #94a3b8;
}

.binding-view__field {
  margin-top: 16px;
}

.binding-view__field-label {
  display: block;
  margin: 0 0 6px 4px;
  font-size: 12px;
  font-weight: 700;
  color: #334155;
}

.binding-view__input {
  display: flex;
  align-items: center;
  min-height: 48px;
  padding: 0 14px;
  background: #f8fafc;
  border-radius: 16px;
}

.binding-view__input--grow {
  flex: 1;
}

.binding-view__input-row {
  display: flex;
  gap: 8px;
}

.binding-view__input-core {
  width: 100%;
  font-size: 14px;
  color: #0f172a;
}

.binding-view__send {
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 104px;
  min-height: 48px;
  padding: 0 14px;
  background: #f1f5f9;
  border-radius: 16px;
}

.binding-view__send--disabled {
  opacity: 0.6;
}

.binding-view__send-text {
  font-size: 12px;
  font-weight: 700;
  color: #334155;
}

.binding-view__method-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 16px;
}

.binding-view__method-tab {
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 86px;
  height: 34px;
  padding: 0 12px;
  background: #f1f5f9;
  border-radius: 12px;
}

.binding-view__method-tab--active {
  background: #fff7ed;
}

.binding-view__method-tab-text {
  font-size: 12px;
  font-weight: 700;
  color: #64748b;
}

.binding-view__method-tab--active .binding-view__method-tab-text {
  color: #f97316;
}

.binding-view__tip {
  display: block;
  margin-top: 16px;
  font-size: 12px;
  line-height: 18px;
  color: #64748b;
}

.binding-view__actions {
  display: flex;
  margin-top: 18px;
}

.binding-view__ghost,
.binding-view__primary,
.binding-view__danger {
  display: flex;
  flex: 1;
  align-items: center;
  justify-content: center;
  height: 46px;
  border-radius: 16px;
}

.binding-view__primary {
  background: #f97316;
}

.binding-view__danger {
  background: #f43f5e;
}

.binding-view__ghost-text {
  color: #64748b;
  font-weight: 700;
}

.binding-view__primary-text {
  color: #ffffff;
  font-weight: 700;
}
</style>
