<template>
  <view class="safety-view">
    <view v-if="!devices.length" class="safety-view__empty">
      <app-icon name="shield" :size="36" color="#cbd5e1" />
      <text class="safety-view__empty-text">请先添加设备以开启安全监控</text>
    </view>

    <template v-else>
      <view class="safety-view__header">
        <view>
          <text class="safety-view__title">安全中心</text>
          <text class="safety-view__subtitle">实时监控全屋厨房安全</text>
        </view>

        <view class="safety-view__dropdown-wrap" v-if="devices.length > 1">
          <view class="safety-view__dropdown-btn" @tap="dropdownOpen = !dropdownOpen">
            <text class="safety-view__dropdown-text line-clamp-1">{{ currentDevice ? currentDevice.name : '' }}</text>
            <app-icon name="chevron" :size="14" color="#94a3b8" />
          </view>

          <view class="safety-view__dropdown" v-if="dropdownOpen">
            <view class="safety-view__dropdown-overlay" @tap="dropdownOpen = false"></view>
            <view class="safety-view__dropdown-panel">
              <view v-if="myDevices.length">
                <text class="safety-view__dropdown-kicker">我的设备</text>
                <view
                  v-for="device in myDevices"
                  :key="device.id"
                  class="safety-view__dropdown-item"
                  :class="{ 'safety-view__dropdown-item--active': selectedDeviceId === device.id }"
                  @tap="selectDevice(device.id)"
                >
                  <text class="line-clamp-1">{{ device.name }}</text>
                  <app-icon v-if="selectedDeviceId === device.id" name="check" :size="12" color="#f97316" />
                </view>
              </view>

              <view v-if="sharedDevices.length">
                <text class="safety-view__dropdown-kicker">共享设备</text>
                <view
                  v-for="device in sharedDevices"
                  :key="device.id"
                  class="safety-view__dropdown-item"
                  :class="{ 'safety-view__dropdown-item--active': selectedDeviceId === device.id }"
                  @tap="selectDevice(device.id)"
                >
                  <text class="line-clamp-1">{{ device.name }}</text>
                  <app-icon v-if="selectedDeviceId === device.id" name="check" :size="12" color="#f97316" />
                </view>
              </view>
            </view>
          </view>
        </view>
      </view>

      <card-box custom-style="border:0; padding:16px;" :class="currentDevice && currentDevice.isOn ? 'safety-view__score--on' : 'safety-view__score--off'">
        <view class="safety-view__score">
          <view>
            <text class="safety-view__score-label">当前安全评分</text>
            <text class="safety-view__score-value">{{ currentDevice && currentDevice.isOn ? '98' : '--' }}</text>
          </view>
          <view class="safety-view__score-icon">
            <app-icon name="shield" :size="24" color="#ffffff" />
          </view>
        </view>
        <view class="safety-view__score-foot">
          <text class="safety-view__score-copy">
            {{ currentDevice && currentDevice.isOn ? '所有传感器运行正常' : '设备待机中，基础监测仍保持开启' }}
          </text>
          <text class="safety-view__score-link">查看报告</text>
        </view>
      </card-box>

      <view class="safety-view__sensor-grid">
        <card-box v-for="sensor in sensors" :key="sensor.id" custom-style="padding:12px;">
          <view class="safety-view__sensor-top">
            <view class="safety-view__sensor-icon" :class="`safety-view__sensor-icon--${sensor.status}`">
              <app-icon :name="sensor.icon" :size="16" :color="sensor.status === 'safe' ? '#10b981' : sensor.status === 'warning' ? '#f59e0b' : '#f43f5e'" />
            </view>
            <view class="safety-view__sensor-dot" :class="`safety-view__sensor-dot--${sensor.status}`"></view>
          </view>
          <text class="safety-view__sensor-label">{{ sensor.label }}</text>
          <text class="safety-view__sensor-value">{{ sensor.value }}</text>
        </card-box>
      </view>

      <card-box custom-style="padding:0; overflow:hidden;">
        <view class="safety-view__log-head">
          <text class="safety-view__log-title">告警记录</text>
          <app-icon name="alert" :size="14" color="#f43f5e" />
        </view>
        <view v-if="!alertLogs.length" class="safety-view__log-empty">
          <text class="safety-view__log-empty-text">暂无告警记录</text>
        </view>
        <view v-else>
          <view v-for="log in alertLogs" :key="log.id" class="safety-view__log-row">
            <view class="safety-view__log-dot" :class="log.type === 'warning' ? 'safety-view__log-dot--warning' : 'safety-view__log-dot--danger'"></view>
            <view class="safety-view__log-copy">
              <text class="safety-view__log-event">{{ log.event }}</text>
              <text class="safety-view__log-user">{{ log.displayName }}</text>
              <text class="safety-view__log-time">{{ log.time }}</text>
            </view>
          </view>
        </view>
      </card-box>

      <card-box custom-style="padding:0; overflow:hidden; margin-top:16px;">
        <view class="safety-view__log-head">
          <text class="safety-view__log-title">操作记录</text>
          <app-icon name="history" :size="14" color="#94a3b8" />
        </view>
        <view v-if="!logs.length" class="safety-view__log-empty">
          <text class="safety-view__log-empty-text">暂无操作记录</text>
        </view>
        <view v-else>
          <view v-for="log in logs" :key="log.id" class="safety-view__log-row">
            <view class="safety-view__log-dot" :class="dotClass(log.type)"></view>
            <view class="safety-view__log-copy">
              <text class="safety-view__log-event">{{ log.event }}</text>
              <text class="safety-view__log-user">{{ log.displayName }}</text>
              <text class="safety-view__log-time">{{ formatDate(log.createdAt) }}</text>
            </view>
          </view>
        </view>
      </card-box>
    </template>
  </view>
</template>

<script setup>
import AppIcon from '../ui/AppIcon.vue'
import CardBox from '../ui/CardBox.vue'
import { useSafetyController } from '../../services/features/safety/safety-controller'

const props = defineProps({
  devices: {
    type: Array,
    default: () => [],
  },
  user: {
    type: Object,
    default: null,
  },
})

const {
  selectedDeviceId,
  dropdownOpen,
  logs,
  currentDevice,
  myDevices,
  sharedDevices,
  alertLogs,
  sensors,
  selectDevice,
  dotClass,
  formatDate,
} = useSafetyController({
  props,
})
</script>

<style scoped>
.safety-view__empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80px 0;
}

.safety-view__empty-text {
  margin-top: 14px;
  font-size: 14px;
  color: #94a3b8;
}

.safety-view__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
}

.safety-view__title {
  display: block;
  font-size: 20px;
  font-weight: 700;
  font-family: 'Outfit', sans-serif;
  color: #0f172a;
}

.safety-view__subtitle {
  display: block;
  margin-top: 6px;
  font-size: 10px;
  color: #64748b;
}

.safety-view__dropdown-wrap {
  position: relative;
}

.safety-view__dropdown-btn {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-width: 120px;
  max-width: 148px;
  min-height: 40px;
  padding: 0 14px;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 16px;
}

.safety-view__dropdown-text {
  max-width: 92px;
  font-size: 12px;
  font-weight: 700;
  color: #334155;
}

.safety-view__dropdown {
  position: absolute;
  top: 48px;
  right: 0;
  z-index: 40;
}

.safety-view__dropdown-overlay {
  position: fixed;
  inset: 0;
}

.safety-view__dropdown-panel {
  position: relative;
  width: 224px;
  max-height: 300px;
  padding: 10px;
  overflow: hidden;
  background: #ffffff;
  border: 1px solid #f1f5f9;
  border-radius: 20px;
  box-shadow: 0 18px 40px rgba(15, 23, 42, 0.12);
}

.safety-view__dropdown-kicker {
  display: block;
  padding: 8px 10px;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 1px;
  color: #94a3b8;
  text-transform: uppercase;
}

.safety-view__dropdown-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 40px;
  padding: 0 12px;
  border-radius: 14px;
  font-size: 12px;
  font-weight: 700;
  color: #475569;
}

.safety-view__dropdown-item--active {
  background: #fff7ed;
  color: #f97316;
}

.safety-view__score--on {
  background: #10b981;
}

.safety-view__score--off {
  background: #334155;
}

.safety-view__score {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.safety-view__score-label {
  display: block;
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 1px;
  color: rgba(255, 255, 255, 0.72);
  text-transform: uppercase;
}

.safety-view__score-value {
  display: block;
  margin-top: 8px;
  font-size: 44px;
  font-weight: 700;
  color: #ffffff;
}

.safety-view__score-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 64px;
  height: 64px;
  background: rgba(255, 255, 255, 0.18);
  border-radius: 32px;
}

.safety-view__score-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 18px;
  padding-top: 18px;
  border-top: 1px solid rgba(255, 255, 255, 0.12);
}

.safety-view__score-copy,
.safety-view__score-link {
  font-size: 11px;
  color: #ffffff;
}

.safety-view__score-link {
  text-decoration: underline;
}

.safety-view__sensor-grid {
  display: flex;
  flex-wrap: wrap;
  margin: 16px -6px 0;
}

.safety-view__sensor-grid .card-box {
  width: calc(50% - 12px);
  margin: 6px;
}

.safety-view__sensor-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.safety-view__sensor-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 12px;
}

.safety-view__sensor-icon--safe {
  background: #ecfdf5;
}

.safety-view__sensor-icon--warning {
  background: #fffbeb;
}

.safety-view__sensor-icon--danger {
  background: #fff1f2;
}

.safety-view__sensor-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.safety-view__sensor-dot--safe {
  background: #10b981;
}

.safety-view__sensor-dot--warning {
  background: #f59e0b;
}

.safety-view__sensor-dot--danger {
  background: #f43f5e;
}

.safety-view__sensor-label {
  display: block;
  margin-top: 12px;
  font-size: 11px;
  color: #94a3b8;
}

.safety-view__sensor-value {
  display: block;
  margin-top: 6px;
  font-size: 15px;
  font-weight: 700;
  color: #0f172a;
}

.safety-view__log-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  border-bottom: 1px solid #f1f5f9;
}

.safety-view__log-title {
  font-size: 14px;
  font-weight: 700;
  color: #0f172a;
}

.safety-view__log-empty {
  padding: 30px 0;
  text-align: center;
}

.safety-view__log-empty-text {
  font-size: 12px;
  color: #94a3b8;
}

.safety-view__log-row {
  display: flex;
  align-items: flex-start;
  padding: 14px 16px;
}

.safety-view__log-row + .safety-view__log-row {
  border-top: 1px solid #f8fafc;
}

.safety-view__log-dot {
  width: 8px;
  height: 8px;
  margin-top: 6px;
  border-radius: 50%;
}

.safety-view__log-dot--warning {
  background: #f59e0b;
}

.safety-view__log-dot--danger {
  background: #f43f5e;
}

.safety-view__log-dot--success {
  background: #10b981;
}

.safety-view__log-dot--info {
  background: #3b82f6;
}

.safety-view__log-copy {
  flex: 1;
  margin-left: 12px;
}

.safety-view__log-event {
  display: block;
  font-size: 12px;
  font-weight: 600;
  color: #0f172a;
}

.safety-view__log-user {
  display: block;
  margin-top: 2px;
  font-size: 10px;
  color: #64748b;
}

.safety-view__log-time {
  display: block;
  margin-top: 4px;
  font-size: 10px;
  color: #94a3b8;
}

@media screen and (min-width: 640px) {
  .safety-view__sensor-grid .card-box {
    width: calc(33.3333% - 12px);
  }
}

@media screen and (min-width: 1024px) {
  .safety-view__sensor-grid .card-box {
    width: calc(25% - 12px);
  }
}

@media screen and (min-width: 1280px) {
  .safety-view__sensor-grid .card-box {
    width: calc(16.6667% - 12px);
  }
}
</style>
