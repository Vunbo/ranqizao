<template>
  <view class="modal-mask" @tap="$emit('close')">
    <view class="add-device-modal" @tap.stop>
      <view class="add-device-modal__handle"></view>

      <template v-if="step === 'scan'">
        <view class="add-device-modal__section add-device-modal__section--center">
          <text class="add-device-modal__title">第一步：扫码识别</text>
          <text class="add-device-modal__desc">请扫描设备机身上的二维码进行识别</text>
          <view class="add-device-modal__scanner">
            <app-icon name="scan" :size="52" color="#cbd5e1" />
            <view class="add-device-modal__scanner-line"></view>
          </view>
          <view class="add-device-modal__primary" @tap="handleScan">
            <app-icon v-if="loading" name="loader" :size="18" color="#ffffff" animated />
            <text class="add-device-modal__primary-text">{{ loading ? '识别中...' : '开启摄像头扫码' }}</text>
          </view>
          <text class="add-device-modal__cancel" @tap="$emit('close')">取消</text>
        </view>
      </template>

      <template v-else-if="step === 'location'">
        <view class="add-device-modal__section add-device-modal__section--center">
          <view class="add-device-modal__round add-device-modal__round--blue">
            <app-icon name="map" :size="30" color="#3b82f6" />
          </view>
          <text class="add-device-modal__title">第二步：位置授权</text>
          <text class="add-device-modal__desc">
            根据安全合规要求，绑定设备前需要先获取当前位置，用于判断设备安装环境。
          </text>
          <view class="add-device-modal__primary" @tap="handleGetLocation">
            <app-icon v-if="loading" name="loader" :size="18" color="#ffffff" animated />
            <text class="add-device-modal__primary-text">{{ loading ? '定位中...' : '开启定位并获取位置' }}</text>
          </view>
          <text class="add-device-modal__cancel" @tap="$emit('close')">取消绑定</text>
        </view>
      </template>

      <template v-else-if="step === 'wifi'">
        <view class="add-device-modal__section">
          <text class="add-device-modal__title">第三步：一键配网</text>
          <text class="add-device-modal__desc">请输入当前环境下的 Wi-Fi 信息</text>

          <view class="add-device-modal__field">
            <text class="add-device-modal__label">Wi-Fi 名称 (SSID)</text>
            <view class="add-device-modal__input">
              <view class="add-device-modal__input-icon">
                <app-icon name="wifi" :size="16" color="#94a3b8" />
              </view>
              <input
                v-model="wifiSsid"
                class="add-device-modal__input-core"
                placeholder="请输入 Wi-Fi 名称"
                placeholder-style="color:#94a3b8"
              />
            </view>
          </view>

          <view class="add-device-modal__field">
            <text class="add-device-modal__label">Wi-Fi 密码</text>
            <view class="add-device-modal__input">
              <view class="add-device-modal__input-icon">
                <app-icon name="lock" :size="16" color="#94a3b8" />
              </view>
              <input
                v-model="wifiPassword"
                class="add-device-modal__input-core"
                :password="true"
                placeholder="请输入 Wi-Fi 密码"
                placeholder-style="color:#94a3b8"
              />
            </view>
          </view>

          <view class="add-device-modal__tip">
            <app-icon name="info" :size="14" color="#f59e0b" />
            <text class="add-device-modal__tip-text">
              请确认手机已连接到当前 Wi-Fi，且设备处于待配网状态。建议优先使用 2.4GHz 网络。
            </text>
          </view>

          <view class="add-device-modal__primary" @tap="handleStartConfig">
            <text class="add-device-modal__primary-text">开始一键配网</text>
          </view>
        </view>
      </template>

      <template v-else-if="step === 'configuring'">
        <view class="add-device-modal__section add-device-modal__section--center">
          <view class="add-device-modal__progress-shell">
            <view class="add-device-modal__progress-ring" :style="{ background: progressStyle }">
              <view class="add-device-modal__progress-core">
                <app-icon name="wifi" :size="24" color="#f97316" />
                <text class="add-device-modal__progress-value">{{ Math.round(configProgress) }}%</text>
              </view>
            </view>
          </view>
          <text class="add-device-modal__title">正在配网中...</text>
          <text class="add-device-modal__desc">正在将 Wi-Fi 信息下发给设备，请稍候</text>
          <view class="add-device-modal__wave">
            <view class="add-device-modal__wave-bar"></view>
            <view class="add-device-modal__wave-bar add-device-modal__wave-bar--delay-1"></view>
            <view class="add-device-modal__wave-bar add-device-modal__wave-bar--delay-2"></view>
          </view>
        </view>
      </template>

      <template v-else-if="step === 'naming'">
        <view class="add-device-modal__section">
          <text class="add-device-modal__title">第四步：设备命名</text>
          <text class="add-device-modal__desc">配网成功，请为您的新设备设置名称</text>
          <view class="add-device-modal__field">
            <text class="add-device-modal__label">设备名称</text>
            <view class="add-device-modal__input add-device-modal__input--plain">
              <input
                v-model="deviceName"
                class="add-device-modal__input-core"
                placeholder="例如：厨房主灶"
                placeholder-style="color:#94a3b8"
              />
            </view>
          </view>
          <view class="add-device-modal__primary" @tap="handleBind">
            <app-icon v-if="loading" name="loader" :size="18" color="#ffffff" animated />
            <text class="add-device-modal__primary-text">{{ loading ? '绑定中...' : '完成绑定' }}</text>
          </view>
        </view>
      </template>

      <template v-else-if="step === 'success'">
        <view class="add-device-modal__section add-device-modal__section--center">
          <view class="add-device-modal__round add-device-modal__round--green">
            <app-icon name="check" :size="30" color="#10b981" />
          </view>
          <text class="add-device-modal__title">绑定成功</text>
          <text class="add-device-modal__desc">您的设备已成功接入 AI 智能安全灶平台</text>
          <view class="add-device-modal__dark" @tap="handleFinish">
            <text class="add-device-modal__dark-text">开始使用</text>
          </view>
        </view>
      </template>

      <view
        v-if="permissionDialog.visible"
        class="add-device-modal__permission-mask"
        @tap.stop
      >
        <view class="add-device-modal__permission-dialog">
          <text class="add-device-modal__permission-title">{{ permissionDialog.title }}</text>
          <text class="add-device-modal__permission-desc">{{ permissionDialog.message }}</text>
          <view class="add-device-modal__permission-actions">
            <view class="add-device-modal__permission-ghost" @tap="closePermissionDialog">
              <text class="add-device-modal__permission-ghost-text">取消</text>
            </view>
            <view class="add-device-modal__permission-primary" @tap="openPermissionSettings">
              <text class="add-device-modal__permission-primary-text">去设置</text>
            </view>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import AppIcon from '../ui/AppIcon.vue'
import { useAddDeviceModalController } from '../../services/features/device/add-device-modal-controller'

const emit = defineEmits(['close', 'toast', 'refresh'])

const props = defineProps({
  visible: {
    type: Boolean,
    default: false,
  },
  user: {
    type: Object,
    default: null,
  },
  existingDevices: {
    type: Array,
    default: () => [],
  },
})

const {
  step,
  deviceName,
  loading,
  wifiSsid,
  wifiPassword,
  configProgress,
  permissionDialog,
  progressStyle,
  closePermissionDialog,
  openPermissionSettings,
  handleScan,
  handleGetLocation,
  handleStartConfig,
  handleBind,
  handleFinish,
} = useAddDeviceModalController({
  props,
  notify: (payload) => emit('toast', payload),
  onClose: () => emit('close'),
  onRefresh: () => emit('refresh'),
})
</script>

<style scoped>
.add-device-modal {
  width: 100%;
  max-width: 420px;
  padding: 18px 24px 28px;
  background: #ffffff;
  border-radius: 32px;
}

.add-device-modal__handle {
  width: 48px;
  height: 6px;
  margin: 0 auto 18px;
  background: #e2e8f0;
  border-radius: 6px;
}

.add-device-modal__section--center {
  text-align: center;
}

.add-device-modal__title {
  display: block;
  font-size: 24px;
  font-weight: 700;
  color: #0f172a;
}

.add-device-modal__desc {
  display: block;
  margin-top: 10px;
  font-size: 13px;
  line-height: 22px;
  color: #64748b;
}

.add-device-modal__scanner {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 192px;
  height: 192px;
  margin: 28px auto 22px;
  overflow: hidden;
  background: #f1f5f9;
  border: 2px solid #f8fafc;
  border-radius: 28px;
}

.add-device-modal__scanner-line {
  position: absolute;
  top: 0;
  right: 0;
  left: 0;
  height: 2px;
  background: #f97316;
  box-shadow: 0 0 12px rgba(249, 115, 22, 0.45);
  animation: shimmer-up 3s linear infinite;
}

.add-device-modal__round {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 80px;
  height: 80px;
  margin: 0 auto 18px;
  border-radius: 40px;
}

.add-device-modal__round--blue {
  background: #eff6ff;
}

.add-device-modal__round--green {
  background: #ecfdf5;
}

.add-device-modal__field {
  margin-top: 18px;
}

.add-device-modal__label {
  display: block;
  margin: 0 0 6px 4px;
  font-size: 12px;
  font-weight: 700;
  color: #334155;
}

.add-device-modal__input {
  position: relative;
  display: flex;
  align-items: center;
  min-height: 52px;
  padding: 0 14px 0 42px;
  background: #f8fafc;
  border-radius: 18px;
}

.add-device-modal__input--plain {
  padding-left: 14px;
}

.add-device-modal__input-icon {
  position: absolute;
  top: 50%;
  left: 14px;
  transform: translateY(-50%);
}

.add-device-modal__input-core {
  width: 100%;
  font-size: 14px;
  color: #0f172a;
}

.add-device-modal__tip {
  display: flex;
  align-items: flex-start;
  margin-top: 18px;
  padding: 14px;
  background: #fffbeb;
  border-radius: 18px;
}

.add-device-modal__tip-text {
  flex: 1;
  margin-left: 8px;
  font-size: 11px;
  line-height: 18px;
  color: #b45309;
}

.add-device-modal__primary,
.add-device-modal__dark {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 52px;
  margin-top: 22px;
  border-radius: 18px;
}

.add-device-modal__primary {
  background: #f97316;
  box-shadow: 0 14px 28px rgba(249, 115, 22, 0.2);
}

.add-device-modal__dark {
  background: #0f172a;
}

.add-device-modal__primary-text,
.add-device-modal__dark-text {
  margin-left: 6px;
  font-size: 15px;
  font-weight: 700;
  color: #ffffff;
}

.add-device-modal__cancel {
  display: block;
  margin-top: 14px;
  font-size: 13px;
  color: #94a3b8;
}

.add-device-modal__progress-shell {
  display: flex;
  justify-content: center;
  margin: 12px 0 18px;
}

.add-device-modal__progress-ring {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 132px;
  height: 132px;
  padding: 8px;
  border-radius: 66px;
}

.add-device-modal__progress-core {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  background: #ffffff;
  border-radius: 58px;
}

.add-device-modal__progress-value {
  margin-top: 6px;
  font-size: 18px;
  font-weight: 700;
  color: #0f172a;
}

.add-device-modal__wave {
  display: flex;
  justify-content: center;
  margin-top: 18px;
}

.add-device-modal__wave-bar {
  width: 4px;
  height: 14px;
  margin: 0 3px;
  background: #f97316;
  border-radius: 4px;
  animation: wave-bar 0.7s ease infinite;
}

.add-device-modal__wave-bar--delay-1 {
  animation-delay: 0.14s;
}

.add-device-modal__wave-bar--delay-2 {
  animation-delay: 0.28s;
}

.add-device-modal__permission-mask {
  position: absolute;
  inset: 0;
  z-index: 2;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: rgba(15, 23, 42, 0.28);
  border-radius: 32px;
}

.add-device-modal__permission-dialog {
  width: 100%;
  max-width: 320px;
  padding: 24px;
  background: #ffffff;
  border-radius: 24px;
  box-shadow: 0 24px 48px rgba(15, 23, 42, 0.16);
}

.add-device-modal__permission-title {
  display: block;
  font-size: 18px;
  font-weight: 700;
  text-align: center;
  color: #0f172a;
}

.add-device-modal__permission-desc {
  display: block;
  margin-top: 10px;
  font-size: 13px;
  line-height: 22px;
  text-align: center;
  color: #64748b;
}

.add-device-modal__permission-actions {
  display: flex;
  margin-top: 20px;
  gap: 10px;
}

.add-device-modal__permission-ghost,
.add-device-modal__permission-primary {
  display: flex;
  flex: 1;
  align-items: center;
  justify-content: center;
  min-height: 46px;
  border-radius: 16px;
}

.add-device-modal__permission-ghost {
  background: #f1f5f9;
}

.add-device-modal__permission-primary {
  background: #f97316;
}

.add-device-modal__permission-ghost-text {
  font-size: 14px;
  font-weight: 700;
  color: #475569;
}

.add-device-modal__permission-primary-text {
  font-size: 14px;
  font-weight: 700;
  color: #ffffff;
}
</style>
