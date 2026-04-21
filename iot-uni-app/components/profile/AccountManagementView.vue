<template>
  <view class="account-mgmt">
    <view class="account-mgmt__header">
      <view class="account-mgmt__back" @tap="emit('back')">
        <app-icon name="arrowLeft" :size="18" color="#475569" />
      </view>
      <text class="account-mgmt__title">账号管理</text>
    </view>

    <card-box custom-style="padding:16px;">
      <view class="account-mgmt__summary">
        <text class="account-mgmt__summary-title">当前 UID</text>
        <text class="account-mgmt__summary-value">{{ uid }}</text>
      </view>
    </card-box>

    <view class="account-mgmt__section">
      <text class="section-kicker">账号绑定</text>
      <account-binding-view
        :user="user"
        :embedded="true"
        @toast="emit('toast', $event)"
        @request-confirm="emit('request-confirm', $event)"
      />
    </view>

    <view class="account-mgmt__section">
      <text class="section-kicker">修改密码</text>
      <card-box custom-style="padding:16px; margin-top:12px;">
        <view class="account-mgmt__field">
          <text class="account-mgmt__label">旧密码</text>
          <view class="account-mgmt__input">
            <input
              v-model="currentPassword"
              class="account-mgmt__input-core"
              :password="true"
              placeholder="请输入旧密码"
              placeholder-style="color:#94a3b8"
            />
          </view>
        </view>

        <view class="account-mgmt__field">
          <text class="account-mgmt__label">新密码</text>
          <view class="account-mgmt__input">
            <input
              v-model="newPassword"
              class="account-mgmt__input-core"
              :password="true"
              placeholder="请输入新密码"
              placeholder-style="color:#94a3b8"
            />
          </view>
        </view>

        <view class="account-mgmt__field">
          <text class="account-mgmt__label">确认新密码</text>
          <view class="account-mgmt__input">
            <input
              v-model="confirmPassword"
              class="account-mgmt__input-core"
              :password="true"
              placeholder="请再次输入新密码"
              placeholder-style="color:#94a3b8"
            />
          </view>
        </view>

        <text class="account-mgmt__error" v-if="error">{{ error }}</text>

        <view class="account-mgmt__submit" @tap="submitChangePassword">
          <text class="account-mgmt__submit-text">{{ submitting ? '提交中...' : '确认修改' }}</text>
        </view>
      </card-box>
    </view>
  </view>
</template>

<script setup>
import { computed, ref } from 'vue'
import AppIcon from '../ui/AppIcon.vue'
import CardBox from '../ui/CardBox.vue'
import AccountBindingView from './AccountBindingView.vue'
import { changePassword } from '../../services/gateway'

const props = defineProps({
  user: {
    type: Object,
    default: null,
  },
})

const emit = defineEmits(['back', 'toast', 'request-confirm'])

const currentPassword = ref('')
const newPassword = ref('')
const confirmPassword = ref('')
const submitting = ref(false)
const error = ref('')

const uid = computed(() => {
  return props.user && props.user.uid ? props.user.uid : ''
})

function resetPasswordForm() {
  currentPassword.value = ''
  newPassword.value = ''
  confirmPassword.value = ''
  error.value = ''
}

async function submitChangePassword() {
  if (submitting.value) {
    return
  }

  if (!currentPassword.value || !newPassword.value || !confirmPassword.value) {
    error.value = '请完整填写密码信息'
    return
  }

  if (newPassword.value !== confirmPassword.value) {
    error.value = '两次输入的新密码不一致'
    return
  }

  submitting.value = true
  error.value = ''

  try {
    await changePassword({
      currentPassword: currentPassword.value,
      newPassword: newPassword.value,
    })
    resetPasswordForm()
    emit('toast', {
      message: '密码修改成功',
      type: 'success',
    })
  } catch (requestError) {
    error.value = requestError.message || '修改密码失败'
  } finally {
    submitting.value = false
  }
}
</script>

<style scoped>
.account-mgmt__header {
  display: flex;
  align-items: center;
  margin-bottom: 18px;
}

.account-mgmt__back {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 14px;
}

.account-mgmt__title {
  margin-left: 12px;
  font-size: 20px;
  font-weight: 700;
  font-family: 'Outfit', sans-serif;
}

.account-mgmt__summary {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.account-mgmt__summary-title {
  font-size: 13px;
  font-weight: 700;
  color: #334155;
}

.account-mgmt__summary-value {
  font-family: 'Courier New', monospace;
  font-size: 13px;
  color: #94a3b8;
}

.account-mgmt__section {
  margin-top: 22px;
}

.account-mgmt__field + .account-mgmt__field {
  margin-top: 14px;
}

.account-mgmt__label {
  display: block;
  margin: 0 0 6px 4px;
  font-size: 12px;
  font-weight: 700;
  color: #334155;
}

.account-mgmt__input {
  display: flex;
  align-items: center;
  min-height: 48px;
  padding: 0 14px;
  background: #f8fafc;
  border-radius: 16px;
}

.account-mgmt__input-core {
  width: 100%;
  font-size: 14px;
  color: #0f172a;
}

.account-mgmt__error {
  display: block;
  margin-top: 12px;
  font-size: 12px;
  font-weight: 600;
  text-align: center;
  color: #f43f5e;
}

.account-mgmt__submit {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 48px;
  margin-top: 18px;
  background: #f97316;
  border-radius: 16px;
}

.account-mgmt__submit-text {
  font-size: 14px;
  font-weight: 700;
  color: #ffffff;
}
</style>
